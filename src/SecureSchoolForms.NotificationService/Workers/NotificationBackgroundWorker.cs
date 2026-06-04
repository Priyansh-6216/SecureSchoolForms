using SecureSchoolForms.Core.Events;
using SecureSchoolForms.Core.Infrastructure;
using SecureSchoolForms.NotificationService.Consumers;

namespace SecureSchoolForms.NotificationService.Workers;

/// <summary>
/// JsonFile-mode background worker. Active when <c>MessageBusSettings:Provider = "JsonFile"</c>.
/// Subscribes to the static <see cref="JsonFileMessageBus"/> topic watcher and delegates
/// notification persistence to the shared <see cref="NotificationStore"/>.
/// In RabbitMQ mode this worker is not registered — consumers handle messages instead.
/// </summary>
public class NotificationBackgroundWorker : BackgroundService
{
    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // 1. Subscribe to forms.submitted
        JsonFileMessageBus.Subscribe<FormSubmittedEvent>("forms.submitted", async (evt) =>
        {
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
        });

        // 2. Subscribe to workflow.stepCompleted
        JsonFileMessageBus.Subscribe<WorkflowStepCompletedEvent>("workflow.stepCompleted", async (evt) =>
        {
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
        });

        // 3. Subscribe to workflow.stepRejected
        JsonFileMessageBus.Subscribe<WorkflowStepRejectedEvent>("workflow.stepRejected", async (evt) =>
        {
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
        });

        // 4. Subscribe to workflow.stepReturned
        JsonFileMessageBus.Subscribe<WorkflowStepReturnedEvent>("workflow.stepReturned", async (evt) =>
        {
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
        });

        return Task.CompletedTask;
    }
}
