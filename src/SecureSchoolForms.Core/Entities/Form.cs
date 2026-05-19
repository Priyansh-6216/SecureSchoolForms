namespace SecureSchoolForms.Core.Entities;

public class Form
{
    public Guid FormId { get; set; }
    public required string Type { get; set; } // e.g. Enrollment, Transfer, Transcript
    public required string Status { get; set; } // e.g. Draft, Published, Archived
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}
