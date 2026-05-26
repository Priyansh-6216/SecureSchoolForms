using Microsoft.AspNetCore.Mvc;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Interfaces;
using SecureSchoolForms.Core.Events;

namespace SecureSchoolForms.WorkflowEngine.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkflowController : ControllerBase
{
    private readonly IWorkflowRepository _workflowRepository;
    private readonly IMessageBus _messageBus;

    public WorkflowController(IWorkflowRepository workflowRepository, IMessageBus messageBus)
    {
        _workflowRepository = workflowRepository;
        _messageBus = messageBus;
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartWorkflow([FromBody] FormSubmittedEvent submittedEvent)
    {
        // 1. Initialize multi-step workflow logic
        var instance = new WorkflowInstance
        {
            WorkflowId = Guid.NewGuid(),
            SubmissionId = submittedEvent.SubmissionId,
            CurrentStep = "Teacher Review",
            Status = "InProgress",
            CreatedAt = DateTime.UtcNow
        };

        await _workflowRepository.CreateWorkflowInstanceAsync(instance);

        // Optional: Publish a notification event or trigger next action
        return Accepted(instance);
    }

    [HttpPost("{workflowId}/approve")]
    public async Task<IActionResult> ApproveStep(Guid workflowId, [FromBody] Guid approvedBy)
    {
        var instance = await _workflowRepository.GetWorkflowInstanceAsync(workflowId);
        if (instance == null) return NotFound();

        // 1. Advance the workflow step (e.g., from Teacher -> School Admin -> District)
        string nextStep = instance.CurrentStep switch 
        {
            "Teacher Review" => "School Admin Review",
            "School Admin Review" => "District Approval",
            "District Approval" => "Completed",
            _ => "Completed"
        };
        
        await _workflowRepository.UpdateWorkflowStatusAsync(workflowId, nextStep, nextStep == "Completed" ? "Completed" : "InProgress", null);

        // 2. Publish step completed event for audit & notification
        var stepCompletedEvent = new WorkflowStepCompletedEvent
        {
            WorkflowId = workflowId,
            SubmissionId = instance.SubmissionId,
            CompletedStep = instance.CurrentStep,
            NextStep = nextStep,
            ApprovedBy = approvedBy,
            CompletedAt = DateTime.UtcNow
        };
        
        await _messageBus.PublishMessageAsync(stepCompletedEvent, "workflow.stepCompleted");

        return Ok(new { Message = "Workflow step advanced.", NextStep = nextStep });
    }

    [HttpPost("{workflowId}/reject")]
    public async Task<IActionResult> RejectStep(Guid workflowId, [FromBody] RejectRequest request)
    {
        var instance = await _workflowRepository.GetWorkflowInstanceAsync(workflowId);
        if (instance == null) return NotFound();

        // 1. Update workflow to Rejected
        await _workflowRepository.UpdateWorkflowStatusAsync(workflowId, instance.CurrentStep, "Rejected", null);

        // 2. Publish step rejected event for audit & notification
        var stepRejectedEvent = new WorkflowStepRejectedEvent
        {
            WorkflowId = workflowId,
            SubmissionId = instance.SubmissionId,
            RejectedStep = instance.CurrentStep,
            RejectedBy = request.RejectedBy,
            Reason = request.Reason,
            RejectedAt = DateTime.UtcNow
        };

        await _messageBus.PublishMessageAsync(stepRejectedEvent, "workflow.stepRejected");

        return Ok(new { Message = "Workflow step rejected.", Status = "Rejected" });
    }

    [HttpGet("pending/{userId}")]
    public async Task<IActionResult> GetPendingApprovals(Guid userId)
    {
        var pending = await _workflowRepository.GetPendingApprovalsForUserAsync(userId);
        return Ok(pending);
    }
}

public class RejectRequest
{
    public Guid RejectedBy { get; set; }
    public required string Reason { get; set; }
}
