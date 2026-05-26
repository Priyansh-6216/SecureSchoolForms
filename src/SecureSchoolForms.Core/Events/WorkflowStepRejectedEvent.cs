using System;

namespace SecureSchoolForms.Core.Events;

public class WorkflowStepRejectedEvent
{
    public Guid WorkflowId { get; set; }
    public Guid SubmissionId { get; set; }
    public required string RejectedStep { get; set; }
    public Guid RejectedBy { get; set; }
    public required string Reason { get; set; }
    public DateTime RejectedAt { get; set; }
}
