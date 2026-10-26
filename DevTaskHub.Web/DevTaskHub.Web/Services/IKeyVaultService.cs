namespace DevTaskHub.Web.Services
{
    /// <summary>
    /// Contract for enterprise secret retrieval from Azure Key Vault.
    /// Eliminates plaintext credentials across configuration files and source code.
    /// </summary>
    public interface IKeyVaultService
    {
        Task<string> GetSecretAsync(string secretName);
    }
}