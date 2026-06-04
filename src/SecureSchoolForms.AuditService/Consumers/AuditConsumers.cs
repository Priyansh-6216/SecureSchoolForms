using System.Text.Json;
using MassTransit;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Events;
using SecureSchoolForms.Core.Infrastructure;

namespace SecureSchoolForms.AuditService.Consumers;

/// <summary>
/// Handles <see cref="FormSubmittedEvent"/> messages in MassTransit mode,
/// logging the submission action to the audit store.
/// </summary>
public class FormSubmittedAuditConsumer : IConsumer<FormSubmittedEvent>
{
    private readonly SchoolFormsDbContext _db;

    public FormSubmittedAuditConsumer(SchoolFormsDbContext db)
    {
        _db = db;
    }

    public async Task Consume(ConsumeContext<FormSubmittedEvent> context)
    {
        var evt = context.Message;
        var log = new AuditLog
        {
            LogId = Guid.NewGuid(),
            ActionType = "FormSubmitted",
            UserId = evt.UserId,
            Timestamp = evt.SubmittedAt,
            Metadata = JsonSerializer.Serialize(evt)
        };

        await _db.AuditLogs.AddAsync(log);
        await _db.SaveChangesAsync();
        Console.WriteLine($"[AuditService/Consumer] Logged FormSubmitted by user {evt.UserId}");
    }
}

/// <summary>
/// Handles <see cref="WorkflowStepCompletedEvent"/> messages in MassTransit mode.
/// </summary>
public class WorkflowStepCompletedAuditConsumer : IConsumer<WorkflowStepCompletedEvent>
{
    private readonly SchoolFormsDbContext _db;

    public WorkflowStepCompletedAuditConsumer(SchoolFormsDbContext db)
    {
        _db = db;
    }

    public async Task Consume(ConsumeContext<WorkflowStepCompletedEvent> context)
    {
        var evt = context.Message;
        var action = evt.NextStep == "Completed"
            ? "WorkflowCompleted"
            : $"StepApproved: {evt.CompletedStep}";

        var log = new AuditLog
        {
            LogId = Guid.NewGuid(),
            ActionType = action,
            UserId = evt.ApprovedBy,
            Timestamp = evt.CompletedAt,
            Metadata = JsonSerializer.Serialize(evt)
        };

        await _db.AuditLogs.AddAsync(log);
        await _db.SaveChangesAsync();
        Console.WriteLine($"[AuditService/Consumer] Logged {action} by user {evt.ApprovedBy}");
    }
}

/// <summary>
/// Handles <see cref="WorkflowStepRejectedEvent"/> messages in MassTransit mode.
/// </summary>
public class WorkflowStepRejectedAuditConsumer : IConsumer<WorkflowStepRejectedEvent>
{
    private readonly SchoolFormsDbContext _db;

    public WorkflowStepRejectedAuditConsumer(SchoolFormsDbContext db)
    {
        _db = db;
    }

    public async Task Consume(ConsumeContext<WorkflowStepRejectedEvent> context)
    {
        var evt = context.Message;
        var log = new AuditLog
        {
            LogId = Guid.NewGuid(),
            ActionType = "WorkflowRejected",
            UserId = evt.RejectedBy,
            Timestamp = evt.RejectedAt,
            Metadata = JsonSerializer.Serialize(evt)
        };

        await _db.AuditLogs.AddAsync(log);
        await _db.SaveChangesAsync();
        Console.WriteLine($"[AuditService/Consumer] Logged WorkflowRejected by user {evt.RejectedBy}");
    }
}

/// <summary>
/// Handles <see cref="DocumentDownloadedEvent"/> messages in MassTransit mode.
/// </summary>
public class DocumentDownloadedAuditConsumer : IConsumer<DocumentDownloadedEvent>
{
    private readonly SchoolFormsDbContext _db;

    public DocumentDownloadedAuditConsumer(SchoolFormsDbContext db)
    {
        _db = db;
    }

    public async Task Consume(ConsumeContext<DocumentDownloadedEvent> context)
    {
        var evt = context.Message;
        var log = new AuditLog
        {
            LogId = Guid.NewGuid(),
            ActionType = "DocumentDownloaded",
            UserId = evt.DownloadedBy,
            Timestamp = evt.DownloadedAt,
            Metadata = JsonSerializer.Serialize(evt)
        };

        await _db.AuditLogs.AddAsync(log);
        await _db.SaveChangesAsync();
        Console.WriteLine($"[AuditService/Consumer] Logged DocumentDownloaded for file {evt.FileName} by user {evt.DownloadedBy}");
    }
}

/// <summary>
/// Handles <see cref="WorkflowStepReturnedEvent"/> messages in MassTransit mode.
/// </summary>
public class WorkflowStepReturnedAuditConsumer : IConsumer<WorkflowStepReturnedEvent>
{
    private readonly SchoolFormsDbContext _db;

    public WorkflowStepReturnedAuditConsumer(SchoolFormsDbContext db)
    {
        _db = db;
    }

    public async Task Consume(ConsumeContext<WorkflowStepReturnedEvent> context)
    {
        var evt = context.Message;
        var log = new AuditLog
        {
            LogId = Guid.NewGuid(),
            ActionType = "WorkflowReturned",
            UserId = evt.ReturnedBy,
            Timestamp = evt.ReturnedAt,
            Metadata = JsonSerializer.Serialize(evt)
        };

        await _db.AuditLogs.AddAsync(log);
        await _db.SaveChangesAsync();
        Console.WriteLine($"[AuditService/Consumer] Logged WorkflowReturned by user {evt.ReturnedBy}");
    }
}
