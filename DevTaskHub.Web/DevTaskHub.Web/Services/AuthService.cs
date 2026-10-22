using DevTaskHub.Web.Data;
using DevTaskHub.Web.DTOs.Auth;
using DevTaskHub.Web.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DevTaskHub.Web.Services
{
    /// <summary>
    /// Production implementation of authentication services with PBKDF2 password hashing.
    /// </summary>
       public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly PasswordHasher<User> _passwordHasher;
        private readonly ILogger<AuthService> _logger;

        public AuthService(AppDbContext context, ILogger<AuthService> logger)
        {
            _context = context;
            _logger = logger;
            _passwordHasher = new PasswordHasher<User>();
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            var normalizedEmail = email.Trim().ToLower();
            return await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        }

        public async Task<UserDto> RegisterAsync(RegisterRequestDto request)
        {
            var normalizedEmail = request.Email.Trim().ToLower();

            // 1. Enforce unique corporate/user identity
            if (await EmailExistsAsync(normalizedEmail))
            {
                _logger.LogWarning("Registration failed: Email {Email} is already registered.", normalizedEmail);
                throw new InvalidOperationException($"The email address '{request.Email}' is already registered.");
            }

            // 2. Instantiate user entity
            var user = new User
            {
                Email = normalizedEmail,
                Role = "Developer", // Enterprise default role
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            // 3. Cryptographically hash password using PBKDF2 with salted HMAC-SHA512
            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

            // 4. Persist to SQL Server
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("New user registered successfully with ID {UserId} and Role {Role}", user.Id, user.Role);

            // 5. Return sanitized UserDto (Zero secret exposure)
            return new UserDto
            {
                UserId = user.Id,
                FullName = request.FullName.Trim(),
                Email = user.Email,
                Role = user.Role,
                CreatedAt = user.CreatedAt
            };
        }
    }
}