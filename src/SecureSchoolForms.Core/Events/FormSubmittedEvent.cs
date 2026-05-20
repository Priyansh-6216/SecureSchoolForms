namespace SecureSchoolForms.Core.Events;

public class FormSubmittedEvent
{
    public Guid SubmissionId { get; set; }
    public Guid FormId { get; set; }
    public Guid UserId { get; set; }
    public DateTime SubmittedAt { get; set; }
    public required string InitialStatus { get; set; }
}
