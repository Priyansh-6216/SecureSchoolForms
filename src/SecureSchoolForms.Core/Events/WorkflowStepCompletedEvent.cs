namespace SecureSchoolForms.Core.Events;

public class WorkflowStepCompletedEvent
{
    public Guid WorkflowId { get; set; }
    public Guid SubmissionId { get; set; }
    public required string CompletedStep { get; set; }
    public required string NextStep { get; set; }
    public Guid ApprovedBy { get; set; }
    public DateTime CompletedAt { get; set; }
}
