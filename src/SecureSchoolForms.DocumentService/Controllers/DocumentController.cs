using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SecureSchoolForms.Core;
using SecureSchoolForms.Core.Entities;

namespace SecureSchoolForms.DocumentService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentController : ControllerBase
{
    private static readonly string DocumentsDir = Path.Combine(SolutionDirectory.Path, ".data", "documents");
    private static readonly object FileLock = new();

    public DocumentController()
    {
        lock (FileLock)
        {
            if (!Directory.Exists(DocumentsDir))
            {
                Directory.CreateDirectory(DocumentsDir);
            }
        }
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadDocument([FromForm] IFormFile file, [FromForm] Guid uploadedBy)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { Message = "No file provided or file is empty." });
        }

        var documentId = Guid.NewGuid();
        var fileExtension = Path.GetExtension(file.FileName);
        // Save the file with its GUID to prevent collision
        var targetFileName = $"{documentId}{fileExtension}";
        var targetFilePath = Path.Combine(DocumentsDir, targetFileName);

        try
        {
            using (var stream = new FileStream(targetFilePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Generate mock AES Encryption Key for zero-trust demonstration
            var mockAesKey = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"key_{Guid.NewGuid().ToString().Substring(0, 10)}"));

            var doc = new Document
            {
                DocumentId = documentId,
                FileUrl = $"/api/document/download/{documentId}",
                EncryptedKey = mockAesKey,
                UploadedBy = uploadedBy,
                UploadedAt = DateTime.UtcNow,
                Status = "Uploaded"
            };

            return Ok(doc);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { Message = "File upload failed.", Details = ex.Message });
        }
    }

    [HttpGet("download/{id}")]
    public IActionResult DownloadDocument(Guid id)
    {
        // Find file starting with the Guid
        var files = Directory.GetFiles(DocumentsDir, $"{id}.*");
        if (files.Length == 0)
        {
            return NotFound(new { Message = "Document not found." });
        }

        var filePath = files[0];
        var fileBytes = System.IO.File.ReadAllBytes(filePath);
        var mimeType = "application/octet-stream";
        
        if (filePath.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            mimeType = "application/pdf";
        }
        else if (filePath.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
        {
            mimeType = "image/png";
        }
        else if (filePath.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) || filePath.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase))
        {
            mimeType = "image/jpeg";
        }

        return File(fileBytes, mimeType, Path.GetFileName(filePath));
    }
}
