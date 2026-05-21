using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using SecureSchoolForms.Core;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Events;
using SecureSchoolForms.Core.Infrastructure;

namespace SecureSchoolForms.AuditService.Workers;

public class AuditBackgroundWorker : BackgroundService
{
    private static readonly string DataDir = Path.Combine(SolutionDirectory.Path, ".data");
    private static readonly string AuditFile = Path.Combine(DataDir, "audit_logs.json");
    private static readonly object FileLock = new();

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // 1. Subscribe to forms.submitted
        JsonFileMessageBus.Subscribe<FormSubmittedEvent>("forms.submitted", async (submittedEvent) =>
        {
            var auditLog = new AuditLog
            {
                LogId = Guid.NewGuid(),
                ActionType = "FormSubmitted",
                UserId = submittedEvent.UserId,
                Timestamp = submittedEvent.SubmittedAt,
                Metadata = JsonSerializer.Serialize(submittedEvent)
            };
            
            await AppendAuditLogAsync(auditLog);
        });

        // 2. Subscribe to workflow.stepCompleted
        JsonFileMessageBus.Subscribe<WorkflowStepCompletedEvent>("workflow.stepCompleted", async (completedEvent) =>
        {
            var action = completedEvent.NextStep == "Completed" ? "WorkflowCompleted" : $"StepApproved: {completedEvent.CompletedStep}";
            var auditLog = new AuditLog
            {
                LogId = Guid.NewGuid(),
                ActionType = action,
                UserId = completedEvent.ApprovedBy,
                Timestamp = completedEvent.CompletedAt,
                Metadata = JsonSerializer.Serialize(completedEvent)
            };

            await AppendAuditLogAsync(auditLog);
        });

        return Task.CompletedTask;
    }

    private Task AppendAuditLogAsync(AuditLog log)
    {
        lock (FileLock)
        {
            if (!Directory.Exists(DataDir))
            {
                Directory.CreateDirectory(DataDir);
            }

            var logs = LoadAuditLogs();
            logs.Add(log);
            SaveAuditLogs(logs);
            Console.WriteLine($"[AuditService] Logged action: {log.ActionType} by user {log.UserId}");
        }
        return Task.CompletedTask;
    }

    private List<AuditLog> LoadAuditLogs()
    {
        if (!File.Exists(AuditFile)) return new List<AuditLog>();
        try
        {
            var json = File.ReadAllText(AuditFile);
            return JsonSerializer.Deserialize<List<AuditLog>>(json) ?? new List<AuditLog>();
        }
        catch
        {
            return new List<AuditLog>();
        }
    }

    private void SaveAuditLogs(List<AuditLog> logs)
    {
        var json = JsonSerializer.Serialize(logs, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(AuditFile, json);
    }
}
