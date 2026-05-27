namespace SecureSchoolForms.Core.Interfaces;

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
    Task<Stream> DownloadFileAsync(string fileUrl);
}
