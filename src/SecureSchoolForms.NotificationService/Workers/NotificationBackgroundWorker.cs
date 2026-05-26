using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using SecureSchoolForms.Core;
using SecureSchoolForms.Core.Events;
using SecureSchoolForms.Core.Infrastructure;

namespace SecureSchoolForms.NotificationService.Workers;

public class NotificationBackgroundWorker : BackgroundService
{
    private static readonly string DataDir = Path.Combine(SolutionDirectory.Path, ".data");
    private static readonly string NotificationFile = Path.Combine(DataDir, "notifications.json");
    private static readonly object FileLock = new();

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // 1. Subscribe to forms.submitted
        JsonFileMessageBus.Subscribe<FormSubmittedEvent>("forms.submitted", async (submittedEvent) =>
        {
            var notification = new SimulatedNotification
            {
                Id = Guid.NewGuid(),
                Type = "Email",
                Recipient = $"user_{submittedEvent.UserId.ToString().Substring(0, 8)}@school.edu",
                Subject = "Form Submitted Successfully",
                Body = $"Dear Student/Parent, your form (Submission: {submittedEvent.SubmissionId}) was submitted successfully on {submittedEvent.SubmittedAt} and is now entering the workflow engine.",
                Timestamp = DateTime.UtcNow
            };

            await SendAndSaveNotificationAsync(notification);
        });

        // 2. Subscribe to workflow.stepCompleted
        JsonFileMessageBus.Subscribe<WorkflowStepCompletedEvent>("workflow.stepCompleted", async (completedEvent) =>
        {
            var isFinal = completedEvent.NextStep == "Completed";
            var subject = isFinal ? "Your School Form is Fully Approved!" : "Form Step Approved & Advanced";
            var body = isFinal 
                ? $"Great news! Your form submission {completedEvent.SubmissionId} has completed all review steps (Final approval by User: {completedEvent.ApprovedBy})!"
                : $"Your form submission {completedEvent.SubmissionId} has completed the '{completedEvent.CompletedStep}' step (Approved by User: {completedEvent.ApprovedBy}) and is now moving to '{completedEvent.NextStep}'.";

            var notification = new SimulatedNotification
            {
                Id = Guid.NewGuid(),
                Type = "SMS",
                Recipient = $"+1 (555) 019-8732 (Linked User: {completedEvent.ApprovedBy})",
                Subject = subject,
                Body = body,
                Timestamp = DateTime.UtcNow
            };

            await SendAndSaveNotificationAsync(notification);
        });

        // 3. Subscribe to workflow.stepRejected
        JsonFileMessageBus.Subscribe<WorkflowStepRejectedEvent>("workflow.stepRejected", async (rejectedEvent) =>
        {
            var notification = new SimulatedNotification
            {
                Id = Guid.NewGuid(),
                Type = "Email",
                Recipient = $"student_linked_to_{rejectedEvent.SubmissionId.ToString().Substring(0, 8)}@school.edu",
                Subject = "Form Request Rejected",
                Body = $"Important: Your form submission {rejectedEvent.SubmissionId} has been rejected at the '{rejectedEvent.RejectedStep}' stage by User {rejectedEvent.RejectedBy}. Reason: {rejectedEvent.Reason}",
                Timestamp = DateTime.UtcNow
            };

            await SendAndSaveNotificationAsync(notification);
        });

        return Task.CompletedTask;
    }

    private Task SendAndSaveNotificationAsync(SimulatedNotification notification)
    {
        lock (FileLock)
        {
            if (!Directory.Exists(DataDir))
            {
                Directory.CreateDirectory(DataDir);
            }

            var notifications = LoadNotifications();
            notifications.Add(notification);
            SaveNotifications(notifications);

            // Log mock dispatch details to console
            Console.WriteLine($"[NotificationService] SIMULATED {notification.Type} DISPATCHED:");
            Console.WriteLine($"  To:      {notification.Recipient}");
            Console.WriteLine($"  Subject: {notification.Subject}");
            Console.WriteLine($"  Body:    {notification.Body}");
            Console.WriteLine($"--------------------------------------------------");
        }
        return Task.CompletedTask;
    }

    private List<SimulatedNotification> LoadNotifications()
    {
        if (!File.Exists(NotificationFile)) return new List<SimulatedNotification>();
        try
        {
            var json = File.ReadAllText(NotificationFile);
            return JsonSerializer.Deserialize<List<SimulatedNotification>>(json) ?? new List<SimulatedNotification>();
        }
        catch
        {
            return new List<SimulatedNotification>();
        }
    }

    private void SaveNotifications(List<SimulatedNotification> notifications)
    {
        var json = JsonSerializer.Serialize(notifications, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(NotificationFile, json);
    }
}

public class SimulatedNotification
{
    public Guid Id { get; set; }
    public required string Type { get; set; }
    public required string Recipient { get; set; }
    public required string Subject { get; set; }
    public required string Body { get; set; }
    public DateTime Timestamp { get; set; }
}
