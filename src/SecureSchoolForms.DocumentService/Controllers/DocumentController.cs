using Microsoft.AspNetCore.Mvc;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.DocumentService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentController : ControllerBase
{
    private readonly IStorageProvider _storageProvider;

    // Mock Azure Key Vault endpoint — simulates envelope encryption key resolution
    // In production, this would call Azure.Security.KeyVault.Keys to unwrap the DEK.
    private const string MockKeyVaultUri = "https://shield-keyvault.vault.azure.net/keys/envelope-key";

    public DocumentController(IStorageProvider storageProvider)
    {
        _storageProvider = storageProvider;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadDocument([FromForm] IFormFile file, [FromForm] Guid uploadedBy)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { Message = "No file provided or file is empty." });
        }

        try
        {
            // ── Mock Key Vault: resolve envelope encryption key ────────────────
            var mockAesKey = Convert.ToBase64String(
                System.Text.Encoding.UTF8.GetBytes($"key_{Guid.NewGuid().ToString()[..10]}"));

            Console.WriteLine($"[DocumentService] Resolving envelope key from Key Vault:");
            Console.WriteLine($"  URI:    {MockKeyVaultUri}");
            Console.WriteLine($"  KeyRef: {mockAesKey[..12]}... (truncated for security)");

            // ── Upload via IStorageProvider (local or cloud) ───────────────────
            using var stream = file.OpenReadStream();
            var fileUrl = await _storageProvider.UploadFileAsync(stream, file.FileName);

            // Extract the document GUID from the returned URL path
            var documentId = Guid.Parse(fileUrl.Split('/')[^1]);

            var doc = new Document
            {
                DocumentId = documentId,
                FileUrl = fileUrl,
                EncryptedKey = mockAesKey,
                UploadedBy = uploadedBy,
                UploadedAt = DateTime.UtcNow,
                Status = "Uploaded"
            };

            Console.WriteLine($"[DocumentService] Document {documentId} stored via {_storageProvider.GetType().Name}");
            return Ok(doc);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { Message = "File upload failed.", Details = ex.Message });
        }
    }

    [HttpGet("download/{id}")]
    public async Task<IActionResult> DownloadDocument(Guid id)
    {
        try
        {
            // ── Mock Key Vault: log key retrieval for audit trail ──────────────
            Console.WriteLine($"[DocumentService] Key Vault access for document {id}:");
            Console.WriteLine($"  URI: {MockKeyVaultUri}/versions/latest");

            var fileUrl = $"/api/document/download/{id}";
            var stream = await _storageProvider.DownloadFileAsync(fileUrl);

            // Determine MIME type from the file extension stored on disk
            // (the LocalStorageProvider preserves the original extension)
            var mimeType = "application/octet-stream";
            return File(stream, mimeType, $"{id}");
        }
        catch (FileNotFoundException)
        {
            return NotFound(new { Message = "Document not found." });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { Message = "Download failed.", Details = ex.Message });
        }
    }
}
