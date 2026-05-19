namespace SecureSchoolForms.Core.Entities;

public class FormSubmission
{
    public Guid SubmissionId { get; set; }
    public Guid FormId { get; set; }
    public Guid UserId { get; set; }
    public required string Data { get; set; } // JSON format
    public required string Status { get; set; } // e.g. Submitted, Approved, Rejected
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
