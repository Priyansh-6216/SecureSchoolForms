using System;
using System.IO;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Configuration;
using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.Core.Infrastructure;

public class AzureBlobStorageProvider : IStorageProvider
{
    private readonly BlobServiceClient _blobServiceClient;
    private const string ContainerName = "school-documents";

    public AzureBlobStorageProvider(IConfiguration configuration)
    {
        var connString = configuration["StorageSettings:AzureBlob:ConnectionString"] 
                         ?? "UseDevelopmentStorage=true";

        Console.WriteLine($"[AzureBlobStorageProvider] Initializing BlobServiceClient...");
        _blobServiceClient = new BlobServiceClient(connString);
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName)
    {
        var extension = Path.GetExtension(fileName);
        var documentId = Guid.NewGuid();
        var targetBlobName = $"{documentId}{extension}";

        var containerClient = _blobServiceClient.GetBlobContainerClient(ContainerName);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.None);

        var blobClient = containerClient.GetBlobClient(targetBlobName);
        await blobClient.UploadAsync(fileStream, overwrite: true);

        Console.WriteLine($"[AzureBlobStorageProvider] Stored file '{fileName}' → Blob '{targetBlobName}'");
        return $"/api/document/download/{documentId}";
    }

    public async Task<Stream> DownloadFileAsync(string fileUrl)
    {
        var parts = fileUrl.TrimEnd('/').Split('/');
        var idPart = parts[^1];

        if (!Guid.TryParse(idPart, out var documentId))
        {
            throw new FileNotFoundException($"Invalid document URL: {fileUrl}");
        }

        var containerClient = _blobServiceClient.GetBlobContainerClient(ContainerName);
        
        // Find the blob that matches the document GUID prefix (since extension is unknown)
        string? targetBlobName = null;
        await foreach (var blobItem in containerClient.GetBlobsAsync(prefix: documentId.ToString()))
        {
            targetBlobName = blobItem.Name;
            break;
        }

        if (string.IsNullOrEmpty(targetBlobName))
        {
            throw new FileNotFoundException($"Document '{documentId}' not found in blob storage.");
        }

        var blobClient = containerClient.GetBlobClient(targetBlobName);
        
        Console.WriteLine($"[AzureBlobStorageProvider] Downloading blob stream for '{targetBlobName}'");
        return await blobClient.OpenReadAsync();
    }
}
