using System;
using System.Collections.Concurrent;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using Microsoft.Extensions.Configuration;
using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.Core.Infrastructure;

public class AzureKeyVaultProvider : IKeyVaultProvider
{
    private readonly SecretClient? _secretClient;
    private readonly bool _useMock;
    private readonly string _mockFilePath = Path.Combine(SolutionDirectory.Path, ".data", "mock_key_vault.json");
    private readonly ConcurrentDictionary<string, string> _mockVault = new();

    public AzureKeyVaultProvider(IConfiguration configuration)
    {
        var section = configuration.GetSection("KeyVaultSettings");
        var vaultUri = section["VaultUri"];
        _useMock = string.IsNullOrEmpty(vaultUri) || 
                   bool.TryParse(section["UseMock"], out var mock) && mock;

        if (!_useMock && !string.IsNullOrEmpty(vaultUri))
        {
            try
            {
                Console.WriteLine($"[AzureKeyVaultProvider] Initializing real Key Vault Client for URI: {vaultUri}");
                _secretClient = new SecretClient(new Uri(vaultUri), new DefaultAzureCredential());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AzureKeyVaultProvider] Failed to initialize Key Vault Client. Falling back to Mock. Error: {ex.Message}");
                _useMock = true;
            }
        }

        if (_useMock)
        {
            Console.WriteLine("[AzureKeyVaultProvider] Running in MOCK Mode. Local key resolution active.");
            LoadMockVault();
        }
    }

    public async Task<string> GetSecretAsync(string secretName)
    {
        if (_useMock || _secretClient == null)
        {
            if (_mockVault.TryGetValue(secretName, out var value))
            {
                return value;
            }
            // Generate a deterministic or random key if it doesn't exist yet
            var newKey = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"mock_key_{Guid.NewGuid().ToString()[..8]}"));
            await SetSecretAsync(secretName, newKey);
            return newKey;
        }

        KeyVaultSecret secret = await _secretClient.GetSecretAsync(secretName);
        return secret.Value;
    }

    public async Task SetSecretAsync(string secretName, string secretValue)
    {
        if (_useMock || _secretClient == null)
        {
            _mockVault[secretName] = secretValue;
            SaveMockVault();
            await Task.CompletedTask;
            return;
        }

        await _secretClient.SetSecretAsync(secretName, secretValue);
    }

    private void LoadMockVault()
    {
        try
        {
            var dataDir = Path.GetDirectoryName(_mockFilePath);
            if (!string.IsNullOrEmpty(dataDir) && !Directory.Exists(dataDir))
            {
                Directory.CreateDirectory(dataDir);
            }

            if (File.Exists(_mockFilePath))
            {
                var content = File.ReadAllText(_mockFilePath);
                var data = JsonSerializer.Deserialize<ConcurrentDictionary<string, string>>(content);
                if (data != null)
                {
                    foreach (var kvp in data)
                    {
                        _mockVault[kvp.Key] = kvp.Value;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AzureKeyVaultProvider] Error loading mock key vault file: {ex.Message}");
        }
    }

    private void SaveMockVault()
    {
        try
        {
            var content = JsonSerializer.Serialize(_mockVault, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(_mockFilePath, content);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AzureKeyVaultProvider] Error saving mock key vault file: {ex.Message}");
        }
    }
}
