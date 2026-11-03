using System.Security.Claims;
using DevTaskHub.Web.Data;
using DevTaskHub.Web.DTOs.Auth;
using DevTaskHub.Web.Services;
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
        private readonly IGitHubService _gitHubService;
        private readonly ILogger<UsersApiController> _logger;

        public UsersApiController(
            AppDbContext context, 
            IGitHubService gitHubService,
            ILogger<UsersApiController> logger)
        {
            _context = context;
            _gitHubService = gitHubService;
            _logger = logger;
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
        /// Returns team members. Admins can view both active and inactive members.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] string? role, [FromQuery] bool? isActive, [FromQuery] string? search)
        {
            var isAdmin = User.IsInRole("Admin");
            var query = _context.Users.Where(u => u.DeletedAtUtc == null);

            // Developers only see active members
            if (!isAdmin)
            {
                query = query.Where(u => u.IsActive);
            }
            else if (isActive.HasValue)
            {
                query = query.Where(u => u.IsActive == isActive.Value);
            }

            if (!string.IsNullOrWhiteSpace(role))
            {
                query = query.Where(u => u.Role.ToLower() == role.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(u => (u.FullName != null && u.FullName.ToLower().Contains(term))
                                      || u.Email.ToLower().Contains(term)
                                      || (u.GitHubUsername != null && u.GitHubUsername.ToLower().Contains(term)));
            }

            var users = await query
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
        /// Updates the current user's GitHub username with LIVE validation against GitHub API.
        /// Rejects with 400 if user does not exist on GitHub.
        /// </summary>
        [HttpPatch("me/github")]
        public async Task<IActionResult> UpdateMyGitHubUsername([FromBody] UpdateGitHubUsernameDto dto)
        {
            var userId = GetCurrentUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            var username = dto?.GitHubUsername?.Trim();
            if (!string.IsNullOrWhiteSpace(username))
            {
                try
                {
                    var exists = await _gitHubService.VerifyUserExistsAsync(username);
                    if (!exists)
                    {
                        return BadRequest(new { message = $"GitHub user '{username}' does not exist on GitHub or is unavailable." });
                    }
                }
                catch (InvalidOperationException ex)
                {
                    // Rate limit on GitHub API
                    _logger.LogWarning("GitHub verification hit rate limit: {Msg}", ex.Message);
                }
            }

            user.GitHubUsername = string.IsNullOrWhiteSpace(username) ? null : username;
            user.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "GitHub username updated successfully.", gitHubUsername = user.GitHubUsername });
        }

        /// <summary>
        /// Admin Only: Change a user's role (Admin, ProjectManager, Developer).
        /// </summary>
        [HttpPatch("{id:int}/role")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateUserRole(int id, [FromBody] UpdateUserRoleDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.Role))
                return BadRequest(new { message = "Role cannot be empty." });

            var allowedRoles = new[] { "Admin", "ProjectManager", "Developer" };
            var targetRole = allowedRoles.FirstOrDefault(r => string.Equals(r, dto.Role.Trim(), StringComparison.OrdinalIgnoreCase));
            if (targetRole == null)
                return BadRequest(new { message = "Invalid role. Allowed roles are: Admin, ProjectManager, Developer." });

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.DeletedAtUtc == null);
            if (user == null) return NotFound(new { message = $"User with ID {id} was not found." });

            user.Role = targetRole;
            user.UpdatedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Role for {user.FullName ?? user.Email} updated to {targetRole}.", role = targetRole });
        }

        /// <summary>
        /// Admin Only: Activate or Deactivate a user.
        /// </summary>
        [HttpPatch("{id:int}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateUserStatus(int id, [FromBody] UpdateUserStatusDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.DeletedAtUtc == null);
            if (user == null) return NotFound(new { message = $"User with ID {id} was not found." });

            var currentUserId = GetCurrentUserId();
            if (user.Id == currentUserId && !dto.IsActive)
            {
                return BadRequest(new { message = "You cannot deactivate your own account." });
            }

            user.IsActive = dto.IsActive;
            user.UpdatedAtUtc = DateTime.UtcNow;

            // Revoke active refresh sessions if deactivated
            if (!dto.IsActive)
            {
                var sessions = await _context.RefreshSessions.Where(s => s.UserId == user.Id && s.RevokedAtUtc == null).ToListAsync();
                foreach (var s in sessions) s.RevokedAtUtc = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"User {user.FullName ?? user.Email} status updated to {(user.IsActive ? "Active" : "Deactivated")}.", isActive = user.IsActive });
        }

        /// <summary>
        /// Admin Only: Soft-delete a user.
        /// </summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.DeletedAtUtc == null);
            if (user == null) return NotFound(new { message = $"User with ID {id} was not found." });

            var currentUserId = GetCurrentUserId();
            if (user.Id == currentUserId)
            {
                return BadRequest(new { message = "You cannot delete your own account." });
            }

            user.DeletedAtUtc = DateTime.UtcNow;
            user.IsActive = false;

            var sessions = await _context.RefreshSessions.Where(s => s.UserId == user.Id && s.RevokedAtUtc == null).ToListAsync();
            foreach (var s in sessions) s.RevokedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class UpdateGitHubUsernameDto
    {
        public string? GitHubUsername { get; set; }
    }

    public class UpdateUserRoleDto
    {
        public string Role { get; set; } = string.Empty;
    }

    public class UpdateUserStatusDto
    {
        public bool IsActive { get; set; }
    }
}
