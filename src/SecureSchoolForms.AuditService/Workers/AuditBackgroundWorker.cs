using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Events;
using SecureSchoolForms.Core.Infrastructure;

namespace SecureSchoolForms.AuditService.Workers;

public class AuditBackgroundWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;

    public AuditBackgroundWorker(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

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

        // 3. Subscribe to workflow.stepRejected
        JsonFileMessageBus.Subscribe<WorkflowStepRejectedEvent>("workflow.stepRejected", async (rejectedEvent) =>
        {
            var auditLog = new AuditLog
            {
                LogId = Guid.NewGuid(),
                ActionType = "WorkflowRejected",
                UserId = rejectedEvent.RejectedBy,
                Timestamp = rejectedEvent.RejectedAt,
                Metadata = JsonSerializer.Serialize(rejectedEvent)
            };

            await AppendAuditLogAsync(auditLog);
        });

        // 4. Subscribe to document.downloaded
        JsonFileMessageBus.Subscribe<DocumentDownloadedEvent>("document.downloaded", async (downloadEvent) =>
        {
            var auditLog = new AuditLog
            {
                LogId = Guid.NewGuid(),
                ActionType = "DocumentDownloaded",
                UserId = downloadEvent.DownloadedBy,
                Timestamp = downloadEvent.DownloadedAt,
                Metadata = JsonSerializer.Serialize(downloadEvent)
            };

            await AppendAuditLogAsync(auditLog);
        });

        // 5. Subscribe to workflow.stepReturned
        JsonFileMessageBus.Subscribe<WorkflowStepReturnedEvent>("workflow.stepReturned", async (returnedEvent) =>
        {
            var auditLog = new AuditLog
            {
                LogId = Guid.NewGuid(),
                ActionType = "WorkflowReturned",
                UserId = returnedEvent.ReturnedBy,
                Timestamp = returnedEvent.ReturnedAt,
                Metadata = JsonSerializer.Serialize(returnedEvent)
            };

            await AppendAuditLogAsync(auditLog);
        });

        return Task.CompletedTask;
    }

    private async Task AppendAuditLogAsync(AuditLog log)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SchoolFormsDbContext>();
            await db.AuditLogs.AddAsync(log);
            await db.SaveChangesAsync();
            Console.WriteLine($"[AuditService] Logged action: {log.ActionType} by user {log.UserId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AuditService] Error saving audit log: {ex.Message}");
        }
    }
}
