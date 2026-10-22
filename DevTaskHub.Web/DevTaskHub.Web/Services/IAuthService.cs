using DevTaskHub.Web.DTOs.Auth;

namespace DevTaskHub.Web.Services
{
    /// <summary>
    /// Contract for enterprise authentication, user identity management, and credential verification.
    /// </summary>
    public interface IAuthService
    {
        /// <summary>
        /// Registers a new user with PBKDF2 salted password hashing and default role assignment.
        /// </summary>
        Task<UserDto> RegisterAsync(RegisterRequestDto request);

        /// <summary>
        /// Checks whether an email is already registered in the system (case-insensitive).
        /// </summary>
        Task<bool> EmailExistsAsync(string email);
    }
}