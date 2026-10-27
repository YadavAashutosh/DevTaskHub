using System;

namespace DevTaskHub.Web.DTOs.Auth
{
    /// <summary>
    /// Authenticated token payload returned to authorized clients.
    /// Delivers the JWT Bearer token, persistent refresh token, exact expiration timestamp, and sanitized user profile.
    /// </summary>
    public class AuthResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public string TokenType { get; set; } = "Bearer";
        public DateTime ExpiresAtUtc { get; set; }
        public UserDto User { get; set; } = null!;
    }
}
