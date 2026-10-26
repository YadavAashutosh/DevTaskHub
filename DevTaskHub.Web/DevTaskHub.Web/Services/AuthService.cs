using System.Security.Cryptography;
using DevTaskHub.Web.Data;
using DevTaskHub.Web.DTOs.Auth;
using DevTaskHub.Web.Models;
using DevTaskHub.Web.Settings;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DevTaskHub.Web.Services
{
    /// <summary>
    /// Production implementation of authentication services with PBKDF2 verification,
    /// JWT token minting, and RefreshSession lifecycle management.
    /// </summary>
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly PasswordHasher<User> _passwordHasher;
        private readonly IJwtTokenGenerator _jwtTokenGenerator;
        private readonly JwtSettings _jwtSettings;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            AppDbContext context, 
            IJwtTokenGenerator jwtTokenGenerator,
            IOptions<JwtSettings> jwtOptions,
            ILogger<AuthService> logger)
        {
            _context = context;
            _jwtTokenGenerator = jwtTokenGenerator;
            _jwtSettings = jwtOptions.Value;
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
                FullName = request.FullName.Trim(),
                Role = string.IsNullOrWhiteSpace(request.Role) ? "Developer" : request.Role.Trim(),
                GitHubUsername = string.IsNullOrWhiteSpace(request.GitHubUsername) ? null : request.GitHubUsername.Trim(),
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
                FullName = user.FullName ?? string.Empty,
                Email = user.Email,
                Role = user.Role,
                GitHubUsername = user.GitHubUsername,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
        {
            var normalizedEmail = request.Email.Trim().ToLower();

            // 1. Locate User in SQL Server
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail && u.IsActive);

            if (user == null)
            {
                _logger.LogWarning("Login failed: User with email {Email} not found or deactivated.", normalizedEmail);
                throw new UnauthorizedAccessException("Invalid email or password.");
            }

            // 2. Cryptographic PBKDF2 Password Verification
            var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
            if (verificationResult == PasswordVerificationResult.Failed)
            {
                _logger.LogWarning("Login failed: Password mismatch for user {Email}.", normalizedEmail);
                throw new UnauthorizedAccessException("Invalid email or password.");
            }

            // 3. Generate Signed JWT Access Token
            var jwtToken = _jwtTokenGenerator.GenerateToken(user);
            var expiresAtUtc = DateTime.UtcNow.AddMinutes(_jwtSettings.DurationInMinutes);

            // 4. Generate & Persist RefreshSession
            var rawRefreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
            var refreshSession = new RefreshSession
            {
                UserId = user.Id,
                TokenHash = rawRefreshToken,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(7), // 7-day refresh lifetime
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.RefreshSessions.Add(refreshSession);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} logged in successfully. New RefreshSession created.", user.Id);

            // 5. Return Authenticated Token Payload
            return new AuthResponseDto
            {
                Token = jwtToken,
                TokenType = "Bearer",
                ExpiresAtUtc = expiresAtUtc,
                User = new UserDto
                {
                    UserId = user.Id,
                    FullName = user.FullName ?? string.Empty,
                    Email = user.Email,
                    Role = user.Role,
                    GitHubUsername = user.GitHubUsername,
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt
                }
            };
        }
    }
}
