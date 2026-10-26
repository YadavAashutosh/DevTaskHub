using DevTaskHub.Web.Models;

namespace DevTaskHub.Web.Services
{
    /// <summary>
    /// Contract for minting cryptographically-signed JWT Bearer tokens with embedded enterprise claims.
    /// </summary>
    public interface IJwtTokenGenerator
    {
        string GenerateToken(User user);
    }
}