using System.Security.Claims;
using DevTaskHub.Web.Data;
using DevTaskHub.Web.DTOs.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevTaskHub.Web.Controllers.Api
{
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public class UsersApiController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersApiController(AppDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? User.FindFirst("sub")?.Value;
            if (int.TryParse(claim, out var id)) return id;
            var email = User.FindFirst(ClaimTypes.Email)?.Value;
            if (!string.IsNullOrWhiteSpace(email))
            {
                var u = _context.Users.FirstOrDefault(x => x.Email.ToLower() == email.ToLower());
                if (u != null) return u.Id;
            }
            return 0;
        }

        /// <summary>
        /// Returns all active team members.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .Where(u => u.IsActive && u.DeletedAtUtc == null)
                .OrderBy(u => u.FullName)
                .Select(u => new UserDto
                {
                    UserId = u.Id,
                    FullName = u.FullName ?? string.Empty,
                    Email = u.Email,
                    Role = u.Role,
                    GitHubUsername = u.GitHubUsername,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        /// <summary>
        /// Returns the currently authenticated user's profile.
        /// </summary>
        [HttpGet("me")]
        public async Task<IActionResult> GetMyProfile()
        {
            var userId = GetCurrentUserId();
            var user = await _context.Users
                .Where(u => u.Id == userId && u.DeletedAtUtc == null)
                .Select(u => new UserDto
                {
                    UserId = u.Id,
                    FullName = u.FullName ?? string.Empty,
                    Email = u.Email,
                    Role = u.Role,
                    GitHubUsername = u.GitHubUsername,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt
                })
                .FirstOrDefaultAsync();

            if (user == null) return NotFound(new { message = "User not found." });
            return Ok(user);
        }

        /// <summary>
        /// Updates the current user's GitHub username.
        /// </summary>
        [HttpPatch("me/github")]
        public async Task<IActionResult> UpdateMyGitHubUsername([FromBody] UpdateGitHubUsernameDto dto)
        {
            var userId = GetCurrentUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            user.GitHubUsername = string.IsNullOrWhiteSpace(dto.GitHubUsername) ? null : dto.GitHubUsername.Trim();
            if (user.UpdatedAtUtc.HasValue || true) // always update
                user.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "GitHub username updated.", gitHubUsername = user.GitHubUsername });
        }
    }

    public class UpdateGitHubUsernameDto
    {
        public string? GitHubUsername { get; set; }
    }
}
