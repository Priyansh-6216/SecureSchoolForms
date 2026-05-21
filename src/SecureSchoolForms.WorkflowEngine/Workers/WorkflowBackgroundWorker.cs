using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SecureSchoolForms.Core.Events;
using SecureSchoolForms.Core.Infrastructure;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.WorkflowEngine.Workers;

public class WorkflowBackgroundWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;

    public WorkflowBackgroundWorker(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Subscribe to forms.submitted topic
        JsonFileMessageBus.Subscribe<FormSubmittedEvent>("forms.submitted", async (submittedEvent) =>
        {
            using var scope = _serviceProvider.CreateScope();
            var workflowRepository = scope.ServiceProvider.GetRequiredService<IWorkflowRepository>();

            // Initialize multi-step workflow logic
            var instance = new WorkflowInstance
            {
                WorkflowId = Guid.NewGuid(),
                SubmissionId = submittedEvent.SubmissionId,
                CurrentStep = "Teacher Review",
                Status = "InProgress",
                CreatedAt = DateTime.UtcNow
            };

            await workflowRepository.CreateWorkflowInstanceAsync(instance);
            Console.WriteLine($"[WorkflowEngine] Automatically started workflow {instance.WorkflowId} for submission {submittedEvent.SubmissionId}");
        });

        return Task.CompletedTask;
    }
}
