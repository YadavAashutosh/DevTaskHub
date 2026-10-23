using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DevTaskHub.Web.Models;
using DevTaskHub.Web.Settings;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DevTaskHub.Web.Services
{
    /// <summary>
    /// Production implementation of JWT token minting using HMAC-SHA256 signatures.
    /// Strictly enforces non-empty cryptographic keys loaded from Azure Key Vault or User Secrets.
    /// </summary>
    public class JwtTokenGenerator : IJwtTokenGenerator
    {
        private readonly JwtSettings _jwtSettings;

        public JwtTokenGenerator(IOptions<JwtSettings> jwtOptions)
        {
            _jwtSettings = jwtOptions.Value;
        }

        public string GenerateToken(User user)
        {
            // Strict Enterprise Gate: Zero hardcoded fallback. 
            // If the key is missing from Azure Key Vault / Secrets, fail immediately!
            if (string.IsNullOrWhiteSpace(_jwtSettings.Key) || _jwtSettings.Key.Length < 32)
            {
                throw new InvalidOperationException(
                    "CRITICAL SECURITY FAILURE: JWT Signing Key is missing or does not meet the 256-bit cryptographic minimum length (32 characters). Verify Azure Key Vault or Secret Manager configuration.");
            }

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Key));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            // Enterprise Claims Payload
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_jwtSettings.DurationInMinutes),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}