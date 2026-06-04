using System;

namespace SecureSchoolForms.Core.Events;

/// <summary>
/// Domain event published when an administrative reviewer returns a form submission
/// back to the submitter for requested changes.
/// </summary>
public class WorkflowStepReturnedEvent
{
    public Guid WorkflowId { get; set; }
    public Guid SubmissionId { get; set; }
    public required string ReturnedStep { get; set; }
    public Guid ReturnedBy { get; set; }
    public required string Reason { get; set; }
    public DateTime ReturnedAt { get; set; }
}
