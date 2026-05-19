namespace SecureSchoolForms.Core.Entities;

public class Document
{
    public Guid DocumentId { get; set; }
    public required string FileUrl { get; set; }
    public required string EncryptedKey { get; set; } // Key Vault reference or similar for AES
    public Guid UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }
    public string? Status { get; set; }
}
