using System.Text.Json;
using MassTransit;
using SecureSchoolForms.Core.Events;

namespace SecureSchoolForms.NotificationService.Consumers;

/// <summary>
/// Handles <see cref="FormSubmittedEvent"/> in MassTransit mode,
/// dispatching a simulated Email notification to the submitting user.
/// </summary>
public class FormSubmittedNotificationConsumer : IConsumer<FormSubmittedEvent>
{
    public async Task Consume(ConsumeContext<FormSubmittedEvent> context)
    {
        var evt = context.Message;
        var notification = new SimulatedNotification
        {
            Id = Guid.NewGuid(),
            Type = "Email",
            Recipient = $"user_{evt.UserId.ToString()[..8]}@school.edu",
            Subject = "Form Submitted Successfully",
            Body = $"Dear Student/Parent, your form (Submission: {evt.SubmissionId}) was submitted successfully on {evt.SubmittedAt} and is now entering the workflow engine.",
            Timestamp = DateTime.UtcNow
        };

        await NotificationStore.SaveAsync(notification);
    }
}

/// <summary>
/// Handles <see cref="WorkflowStepCompletedEvent"/> in MassTransit mode,
/// dispatching a simulated SMS notification for each step advance or final approval.
/// </summary>
public class WorkflowStepCompletedNotificationConsumer : IConsumer<WorkflowStepCompletedEvent>
{
    public async Task Consume(ConsumeContext<WorkflowStepCompletedEvent> context)
    {
        var evt = context.Message;
        var isFinal = evt.NextStep == "Completed";
        var subject = isFinal ? "Your School Form is Fully Approved!" : "Form Step Approved & Advanced";
        var body = isFinal
            ? $"Great news! Your form submission {evt.SubmissionId} has completed all review steps (Final approval by User: {evt.ApprovedBy})!"
            : $"Your form submission {evt.SubmissionId} has completed the '{evt.CompletedStep}' step (Approved by User: {evt.ApprovedBy}) and is now moving to '{evt.NextStep}'.";

        var notification = new SimulatedNotification
        {
            Id = Guid.NewGuid(),
            Type = "SMS",
            Recipient = $"+1 (555) 019-8732 (Linked User: {evt.ApprovedBy})",
            Subject = subject,
            Body = body,
            Timestamp = DateTime.UtcNow
        };

        await NotificationStore.SaveAsync(notification);
    }
}

/// <summary>
/// Handles <see cref="WorkflowStepRejectedEvent"/> in MassTransit mode.
/// </summary>
public class WorkflowStepRejectedNotificationConsumer : IConsumer<WorkflowStepRejectedEvent>
{
    public async Task Consume(ConsumeContext<WorkflowStepRejectedEvent> context)
    {
        var evt = context.Message;
        var notification = new SimulatedNotification
        {
            Id = Guid.NewGuid(),
            Type = "Email",
            Recipient = $"student_linked_to_{evt.SubmissionId.ToString()[..8]}@school.edu",
            Subject = "Form Request Rejected",
            Body = $"Important: Your form submission {evt.SubmissionId} has been rejected at the '{evt.RejectedStep}' stage by User {evt.RejectedBy}. Reason: {evt.Reason}",
            Timestamp = DateTime.UtcNow
        };

        await NotificationStore.SaveAsync(notification);
    }
}

/// <summary>
/// Handles <see cref="WorkflowStepReturnedEvent"/> in MassTransit mode.
/// </summary>
public class WorkflowStepReturnedNotificationConsumer : IConsumer<WorkflowStepReturnedEvent>
{
    public async Task Consume(ConsumeContext<WorkflowStepReturnedEvent> context)
    {
        var evt = context.Message;
        var notification = new SimulatedNotification
        {
            Id = Guid.NewGuid(),
            Type = "Email",
            Recipient = $"student_linked_to_{evt.SubmissionId.ToString()[..8]}@school.edu",
            Subject = "Form Returned for Changes",
            Body = $"Notice: Your form submission {evt.SubmissionId} has been returned for changes at the '{evt.ReturnedStep}' stage by User {evt.ReturnedBy}. Reason: {evt.Reason}",
            Timestamp = DateTime.UtcNow
        };

        await NotificationStore.SaveAsync(notification);
    }
}
