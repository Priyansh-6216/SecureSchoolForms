namespace SecureSchoolForms.Core.Entities;

public class WorkflowInstance
{
    public Guid WorkflowId { get; set; }
    public Guid SubmissionId { get; set; }
    public required string CurrentStep { get; set; }
    public required string Status { get; set; } // e.g. InProgress, Completed, Rejected
    public Guid? AssignedTo { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
