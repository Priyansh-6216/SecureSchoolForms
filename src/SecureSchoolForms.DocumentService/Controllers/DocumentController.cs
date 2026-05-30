using Microsoft.AspNetCore.Mvc;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.DocumentService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentController : ControllerBase
{
    private readonly IStorageProvider _storageProvider;
    private readonly IKeyVaultProvider _keyVaultProvider;

    public DocumentController(IStorageProvider storageProvider, IKeyVaultProvider keyVaultProvider)
    {
        _storageProvider = storageProvider;
        _keyVaultProvider = keyVaultProvider;
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
            // ── Upload via IStorageProvider (local or cloud) ───────────────────
            using var stream = file.OpenReadStream();
            var fileUrl = await _storageProvider.UploadFileAsync(stream, file.FileName);

            // Extract the document GUID from the returned URL path
            var documentId = Guid.Parse(fileUrl.Split('/')[^1]);

            // ── Key Vault: store envelope encryption key ───────────────────────
            var mockAesKey = Convert.ToBase64String(
                System.Text.Encoding.UTF8.GetBytes($"key_{Guid.NewGuid().ToString()[..10]}"));
            var keyName = $"envelope-key-{documentId}";
            await _keyVaultProvider.SetSecretAsync(keyName, mockAesKey);

            Console.WriteLine($"[DocumentService] Storing envelope key in Key Vault:");
            Console.WriteLine($"  SecretName: {keyName}");
            Console.WriteLine($"  KeyRef:     {mockAesKey[..12]}... (truncated for security)");

            var doc = new Document
            {
                DocumentId = documentId,
                FileUrl = fileUrl,
                EncryptedKey = keyName, // Save the secret reference
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
            // ── Key Vault: retrieve envelope key for decryption ────────────────
            var keyName = $"envelope-key-{id}";
            string resolvedKey;
            try
            {
                resolvedKey = await _keyVaultProvider.GetSecretAsync(keyName);
            }
            catch (Exception)
            {
                resolvedKey = "Key-Not-Found";
            }

            Console.WriteLine($"[DocumentService] Key Vault access for document {id}:");
            Console.WriteLine($"  SecretName: {keyName}");
            Console.WriteLine($"  ResolvedKey: {resolvedKey[..Math.Min(12, resolvedKey.Length)]}... (truncated for security)");

            var fileUrl = $"/api/document/download/{id}";
            var stream = await _storageProvider.DownloadFileAsync(fileUrl);

            // Determine MIME type from the file extension stored on disk
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
