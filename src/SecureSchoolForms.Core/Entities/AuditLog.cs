namespace SecureSchoolForms.Core.Entities;

public class AuditLog
{
    public Guid LogId { get; set; }
    public required string ActionType { get; set; } // e.g. FormSubmitted, Approved, Rejected
    public Guid UserId { get; set; }
    public DateTime Timestamp { get; set; }
    public string? Metadata { get; set; } // JSON format containing context/IP/changes
}
