using MassTransit;
using Microsoft.Extensions.DependencyInjection;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Events;
using SecureSchoolForms.Core.Infrastructure;
using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.WorkflowEngine.Consumers;

/// <summary>
/// MassTransit consumer that handles <see cref="FormSubmittedEvent"/> messages.
/// When running with RabbitMQ transport, MassTransit routes messages here automatically
/// via a dedicated queue bound to the exchange for this message type.
/// The workflow logic mirrors what the legacy <c>WorkflowBackgroundWorker</c> did,
/// but is now expressed as a clean, testable consumer class.
/// </summary>
public class FormSubmittedConsumer : IConsumer<FormSubmittedEvent>
{
    private readonly IWorkflowRepository _workflowRepository;

    public FormSubmittedConsumer(IWorkflowRepository workflowRepository)
    {
        _workflowRepository = workflowRepository;
    }

    public async Task Consume(ConsumeContext<FormSubmittedEvent> context)
    {
        var submittedEvent = context.Message;

        // Initialize the multi-step approval workflow
        var instance = new WorkflowInstance
        {
            WorkflowId = Guid.NewGuid(),
            SubmissionId = submittedEvent.SubmissionId,
            CurrentStep = "Teacher Review",
            Status = "InProgress",
            CreatedAt = DateTime.UtcNow
        };

        await _workflowRepository.CreateWorkflowInstanceAsync(instance);
        Console.WriteLine($"[WorkflowEngine/Consumer] Started workflow {instance.WorkflowId} for submission {submittedEvent.SubmissionId}");
    }
}
