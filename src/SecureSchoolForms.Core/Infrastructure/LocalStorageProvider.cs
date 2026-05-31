using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.Core.Infrastructure;

/// <summary>
/// Local filesystem implementation of <see cref="IStorageProvider"/>.
/// Stores files in the solution's .data/documents directory.
/// In production, swap this out for AzureBlobStorageProvider or S3StorageProvider.
/// </summary>
public class LocalStorageProvider : IStorageProvider
{
    private static readonly string DocumentsDir = Path.Combine(SolutionDirectory.Path, ".data", "documents");

    public LocalStorageProvider()
    {
        if (!Directory.Exists(DocumentsDir))
        {
            Directory.CreateDirectory(DocumentsDir);
        }
    }

    /// <summary>
    /// Saves the file stream locally under .data/documents and returns a
    /// logical URL in the format /api/document/download/{guid}.
    /// </summary>
    public async Task<string> UploadFileAsync(Stream fileStream, string fileName)
    {
        var extension = Path.GetExtension(fileName);
        var documentId = Guid.NewGuid();
        var targetFileName = $"{documentId}{extension}";
        var targetPath = Path.Combine(DocumentsDir, targetFileName);

        using var fs = new FileStream(targetPath, FileMode.Create, FileAccess.Write, FileShare.None);
        await fileStream.CopyToAsync(fs);

        Console.WriteLine($"[LocalStorageProvider] Stored file '{fileName}' → '{targetFileName}'");
        return $"/api/document/download/{documentId}";
    }

    /// <summary>
    /// Resolves the logical URL (e.g., /api/document/download/{guid}) back
    /// to a physical path and returns a read-only stream and file name.
    /// </summary>
    public Task<StorageDownloadResult> DownloadFileAsync(string fileUrl)
    {
        // Extract the GUID segment from the URL
        var parts = fileUrl.TrimEnd('/').Split('/');
        var idPart = parts[^1];

        if (!Guid.TryParse(idPart, out var documentId))
        {
            throw new FileNotFoundException($"Invalid document URL: {fileUrl}");
        }

        var matchingFiles = Directory.GetFiles(DocumentsDir, $"{documentId}.*");
        if (matchingFiles.Length == 0)
        {
            throw new FileNotFoundException($"Document '{documentId}' not found in local storage.");
        }

        var physicalPath = matchingFiles[0];
        Stream stream = new FileStream(physicalPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult(new StorageDownloadResult
        {
            Stream = stream,
            FileName = Path.GetFileName(physicalPath)
        });
    }
}
