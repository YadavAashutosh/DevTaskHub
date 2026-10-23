using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

namespace DevTaskHub.Web.Services
{
    /// <summary>
    /// Production implementation of Azure Key Vault secret management using Azure.Identity.
    /// Connects via DefaultAzureCredential to fetch DB connection strings and JWT signing keys.
    /// </summary>
    public class KeyVaultService : IKeyVaultService
    {
        private readonly SecretClient? _secretClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<KeyVaultService> _logger;

        public KeyVaultService(IConfiguration configuration, ILogger<KeyVaultService> logger)
        {
            _configuration = configuration;
            _logger = logger;

            var keyVaultUri = _configuration["KeyVault:VaultUri"];

            if (!string.IsNullOrWhiteSpace(keyVaultUri) && Uri.TryCreate(keyVaultUri, UriKind.Absolute, out var vaultUri))
            {
                try
                {
                    _secretClient = new SecretClient(vaultUri, new DefaultAzureCredential());
                    _logger.LogInformation("Connected to Azure Key Vault successfully at {VaultUri}", keyVaultUri);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to initialize Azure Key Vault client for {VaultUri}", keyVaultUri);
                }
            }
        }

        public async Task<string> GetSecretAsync(string secretName)
        {
            // 1. Fetch from Azure Key Vault if client is connected
            if (_secretClient != null)
            {
                try
                {
                    KeyVaultSecret secret = await _secretClient.GetSecretAsync(secretName);
                    return secret.Value;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to retrieve secret {SecretName} from Azure Key Vault.", secretName);
                }
            }

            // 2. Fallback to Configuration provider if Vault is unreachable
            return _configuration[secretName] ?? string.Empty;
        }
    }
}