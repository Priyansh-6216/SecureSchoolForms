namespace SecureSchoolForms.Core.Interfaces;

/// <summary>
/// Result returned by storage providers when a file is downloaded.
/// </summary>
public sealed class StorageDownloadResult
{
    public required Stream Stream { get; init; }
    public required string FileName { get; init; }
}

/// <summary>
/// Abstraction for cloud/local file storage, enabling seamless swap between
/// local filesystem and cloud providers (e.g., Azure Blob Storage, AWS S3).
/// </summary>
public interface IStorageProvider
{
    /// <summary>
    /// Uploads a file stream and returns the logical URL/path reference.
    /// </summary>
    Task<string> UploadFileAsync(Stream fileStream, string fileName);

    /// <summary>
    /// Downloads a file as a stream given its logical URL/path reference.
    /// </summary>
    Task<StorageDownloadResult> DownloadFileAsync(string fileUrl);
}
