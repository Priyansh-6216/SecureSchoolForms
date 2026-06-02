using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Interfaces;
using SecureSchoolForms.Core.Events;

namespace SecureSchoolForms.DocumentService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentController : ControllerBase
{
    private readonly IStorageProvider _storageProvider;
    private readonly IKeyVaultProvider _keyVaultProvider;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMessageBus _messageBus;

    public DocumentController(
        IStorageProvider storageProvider, 
        IKeyVaultProvider keyVaultProvider,
        IHttpClientFactory httpClientFactory,
        IMessageBus messageBus)
    {
        _storageProvider = storageProvider;
        _keyVaultProvider = keyVaultProvider;
        _httpClientFactory = httpClientFactory;
        _messageBus = messageBus;
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
                OriginalFileName = file.FileName,
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
    public async Task<IActionResult> DownloadDocument(Guid id, [FromQuery] Guid userId)
    {
        try
        {
            // ── Zero-Trust RBAC Check: Contact AuthService ────────────────────
            var client = _httpClientFactory.CreateClient();
            List<UserDto>? users = null;
            try
            {
                users = await client.GetFromJsonAsync<List<UserDto>>("http://localhost:5005/api/auth/users");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DocumentService] Error communicating with AuthService: {ex.Message}");
                return StatusCode(StatusCodes.Status503ServiceUnavailable, 
                    new { Message = "AuthService unavailable. Zero-Trust policy requires active identity verification." });
            }

            var user = users?.FirstOrDefault(u => u.UserId == userId);
            if (user == null)
            {
                return Unauthorized(new { Message = "User identity verification failed. Access Denied." });
            }

            if (!user.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase) && 
                !user.Role.Equals("District", StringComparison.OrdinalIgnoreCase))
            {
                Console.WriteLine($"[DocumentService] Security policy block: User {user.Name} (Role: {user.Role}) blocked from downloading document {id}.");
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    Message = "Access Denied",
                    Details = $"Zero-Trust security policies restrict document retrieval to Admin or District roles. Your role is: {user.Role}."
                });
            }

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
            var download = await _storageProvider.DownloadFileAsync(fileUrl);

            // ── Publish security audit trail event ──────────────────────────────
            var downloadEvent = new DocumentDownloadedEvent
            {
                DocumentId = id,
                DownloadedBy = userId,
                FileName = download.FileName,
                DownloadedAt = DateTime.UtcNow,
                SecurityKeyRef = keyName
            };
            await _messageBus.PublishMessageAsync(downloadEvent, "document.downloaded");

            var contentTypeProvider = new FileExtensionContentTypeProvider();
            var mimeType = contentTypeProvider.TryGetContentType(download.FileName, out var detectedType)
                ? detectedType
                : "application/octet-stream";

            return File(download.Stream, mimeType, download.FileName);
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

public record UserDto(Guid UserId, string Name, string Email, string Role);
