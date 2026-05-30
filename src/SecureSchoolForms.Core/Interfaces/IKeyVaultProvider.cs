using System.Threading.Tasks;

namespace SecureSchoolForms.Core.Interfaces;

/// <summary>
/// Defines an abstraction for Key Vault operations, allowing swappable real Azure Key Vault
/// and local mock secret resolutions for zero-dependency local runs.
/// </summary>
public interface IKeyVaultProvider
{
    /// <summary>
    /// Gets the secret value for the specified secret name from Key Vault.
    /// </summary>
    Task<string> GetSecretAsync(string secretName);

    /// <summary>
    /// Sets a secret value in Key Vault for the specified secret name.
    /// </summary>
    Task SetSecretAsync(string secretName, string secretValue);
}
