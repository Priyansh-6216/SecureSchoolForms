using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.Core.Infrastructure;

public class JsonFileFormRepository : IFormRepository
{
    private static readonly string DataDir = Path.Combine(SolutionDirectory.Path, ".data");
    private static readonly string FormsFile = Path.Combine(DataDir, "forms.json");
    private static readonly string SubmissionsFile = Path.Combine(DataDir, "submissions.json");
    private static readonly object FileLock = new();

    public JsonFileFormRepository()
    {
        lock (FileLock)
        {
            if (!Directory.Exists(DataDir))
            {
                Directory.CreateDirectory(DataDir);
            }

            SeedDefaultForms();
        }
    }

    private void SeedDefaultForms()
    {
        if (!File.Exists(FormsFile) || new FileInfo(FormsFile).Length < 10)
        {
            var defaultForms = new List<Form>
            {
                new()
                {
                    FormId = Guid.Parse("d3b07384-d113-49be-a5d6-5c1b528bfe01"),
                    Type = "Enrollment Form",
                    Status = "Published",
                    CreatedBy = Guid.Empty,
                    CreatedAt = DateTime.UtcNow
                },
                new()
                {
                    FormId = Guid.Parse("d3b07384-d113-49be-a5d6-5c1b528bfe02"),
                    Type = "Transfer Form",
                    Status = "Published",
                    CreatedBy = Guid.Empty,
                    CreatedAt = DateTime.UtcNow
                },
                new()
                {
                    FormId = Guid.Parse("d3b07384-d113-49be-a5d6-5c1b528bfe03"),
                    Type = "Transcript Request",
                    Status = "Published",
                    CreatedBy = Guid.Empty,
                    CreatedAt = DateTime.UtcNow
                }
            };
            var json = JsonSerializer.Serialize(defaultForms, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(FormsFile, json);
        }
    }

    public Task<Form?> GetFormByIdAsync(Guid formId)
    {
        lock (FileLock)
        {
            var forms = LoadForms();
            var form = forms.FirstOrDefault(f => f.FormId == formId);
            return Task.FromResult(form);
        }
    }

    public Task<IEnumerable<Form>> GetAllFormsAsync()
    {
        lock (FileLock)
        {
            var forms = LoadForms();
            return Task.FromResult<IEnumerable<Form>>(forms);
        }
    }

    public Task<FormSubmission> SubmitFormAsync(FormSubmission submission)
    {
        lock (FileLock)
        {
            var submissions = LoadSubmissions();
            
            // Check if existing submission to update status, else add
            var existing = submissions.FirstOrDefault(s => s.SubmissionId == submission.SubmissionId);
            if (existing != null)
            {
                submissions.Remove(existing);
            }
            
            submissions.Add(submission);
            SaveSubmissions(submissions);
            return Task.FromResult(submission);
        }
    }

    public Task<FormSubmission?> GetSubmissionByIdAsync(Guid submissionId)
    {
        lock (FileLock)
        {
            var submissions = LoadSubmissions();
            var sub = submissions.FirstOrDefault(s => s.SubmissionId == submissionId);
            return Task.FromResult(sub);
        }
    }

    public Task<IEnumerable<FormSubmission>> GetSubmissionsByUserAsync(Guid userId)
    {
        lock (FileLock)
        {
            var submissions = LoadSubmissions();
            var userSubs = submissions.Where(s => s.UserId == userId).ToList();
            return Task.FromResult<IEnumerable<FormSubmission>>(userSubs);
        }
    }

    private List<Form> LoadForms()
    {
        if (!File.Exists(FormsFile)) return new List<Form>();
        try
        {
            var json = File.ReadAllText(FormsFile);
            return JsonSerializer.Deserialize<List<Form>>(json) ?? new List<Form>();
        }
        catch
        {
            return new List<Form>();
        }
    }

    private List<FormSubmission> LoadSubmissions()
    {
        if (!File.Exists(SubmissionsFile)) return new List<FormSubmission>();
        try
        {
            var json = File.ReadAllText(SubmissionsFile);
            return JsonSerializer.Deserialize<List<FormSubmission>>(json) ?? new List<FormSubmission>();
        }
        catch
        {
            return new List<FormSubmission>();
        }
    }

    private void SaveSubmissions(List<FormSubmission> submissions)
    {
        var json = JsonSerializer.Serialize(submissions, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(SubmissionsFile, json);
    }
}
