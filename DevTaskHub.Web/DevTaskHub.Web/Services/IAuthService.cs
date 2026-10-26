using DevTaskHub.Web.DTOs.Auth;

namespace DevTaskHub.Web.Services
{
    /// <summary>
    /// Contract for enterprise authentication, user identity management, and credential verification.
    /// </summary>
    public interface IAuthService
    {
        Task<UserDto> RegisterAsync(RegisterRequestDto request);
        Task<AuthResponseDto> LoginAsync(LoginRequestDto request);
        Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequestDto request);
        Task<bool> EmailExistsAsync(string email);
    }
}
