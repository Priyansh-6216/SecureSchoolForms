using System;

namespace SecureSchoolForms.Core.Events;

public class DocumentDownloadedEvent
{
    public Guid DocumentId { get; set; }
    public Guid DownloadedBy { get; set; }
    public required string FileName { get; set; }
    public DateTime DownloadedAt { get; set; }
    public required string SecurityKeyRef { get; set; }
}
