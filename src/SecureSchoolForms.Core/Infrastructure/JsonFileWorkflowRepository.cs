using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.Core.Infrastructure;

public class JsonFileWorkflowRepository : IWorkflowRepository
{
    private static readonly string DataDir = Path.Combine(SolutionDirectory.Path, ".data");
    private static readonly string WorkflowsFile = Path.Combine(DataDir, "workflows.json");
    private static readonly string SubmissionsFile = Path.Combine(DataDir, "submissions.json");
    private static readonly object FileLock = new();

    public JsonFileWorkflowRepository()
    {
        lock (FileLock)
        {
            if (!Directory.Exists(DataDir))
            {
                Directory.CreateDirectory(DataDir);
            }
        }
    }

    public Task<WorkflowInstance> CreateWorkflowInstanceAsync(WorkflowInstance instance)
    {
        lock (FileLock)
        {
            var workflows = LoadWorkflows();
            var existing = workflows.FirstOrDefault(w => w.WorkflowId == instance.WorkflowId);
            if (existing != null)
            {
                workflows.Remove(existing);
            }
            workflows.Add(instance);
            SaveWorkflows(workflows);
            return Task.FromResult(instance);
        }
    }

    public Task<WorkflowInstance?> GetWorkflowInstanceAsync(Guid workflowId)
    {
        lock (FileLock)
        {
            var workflows = LoadWorkflows();
            var instance = workflows.FirstOrDefault(w => w.WorkflowId == workflowId);
            return Task.FromResult(instance);
        }
    }

    public Task UpdateWorkflowStatusAsync(Guid workflowId, string step, string status, Guid? nextAssignee)
    {
        lock (FileLock)
        {
            var workflows = LoadWorkflows();
            var instance = workflows.FirstOrDefault(w => w.WorkflowId == workflowId);
            if (instance != null)
            {
                instance.CurrentStep = step;
                instance.Status = status;
                instance.AssignedTo = nextAssignee;
                instance.UpdatedAt = DateTime.UtcNow;
                SaveWorkflows(workflows);

                // Also update the form submission status to match!
                UpdateSubmissionStatus(instance.SubmissionId, status == "Completed" ? "Approved" : status == "Rejected" ? "Rejected" : status == "ReturnedForChanges" ? "ReturnedForChanges" : $"Review ({step})");
            }
            return Task.CompletedTask;
        }
    }

    private void UpdateSubmissionStatus(Guid submissionId, string newStatus)
    {
        try
        {
            if (File.Exists(SubmissionsFile))
            {
                var json = File.ReadAllText(SubmissionsFile);
                var submissions = JsonSerializer.Deserialize<List<FormSubmission>>(json) ?? new List<FormSubmission>();
                var submission = submissions.FirstOrDefault(s => s.SubmissionId == submissionId);
                if (submission != null)
                {
                    submission.Status = newStatus;
                    submission.UpdatedAt = DateTime.UtcNow;
                    var updatedJson = JsonSerializer.Serialize(submissions, new JsonSerializerOptions { WriteIndented = true });
                    File.WriteAllText(SubmissionsFile, updatedJson);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to update submission status: {ex.Message}");
        }
    }

    public Task<IEnumerable<WorkflowInstance>> GetPendingApprovalsForUserAsync(Guid userId)
    {
        lock (FileLock)
        {
            var workflows = LoadWorkflows();
            // A pending approval is InProgress. For simplicity of demonstration, if assigned to null, any role can see/approve it
            // or we filter by assigning to specific actors. In this mockup, we return workflows with status "InProgress".
            var pending = workflows.Where(w => w.Status == "InProgress").ToList();
            return Task.FromResult<IEnumerable<WorkflowInstance>>(pending);
        }
    }

    private List<WorkflowInstance> LoadWorkflows()
    {
        if (!File.Exists(WorkflowsFile)) return new List<WorkflowInstance>();
        try
        {
            var json = File.ReadAllText(WorkflowsFile);
            return JsonSerializer.Deserialize<List<WorkflowInstance>>(json) ?? new List<WorkflowInstance>();
        }
        catch
        {
            return new List<WorkflowInstance>();
        }
    }

    private void SaveWorkflows(List<WorkflowInstance> workflows)
    {
        var json = JsonSerializer.Serialize(workflows, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(WorkflowsFile, json);
    }
}
