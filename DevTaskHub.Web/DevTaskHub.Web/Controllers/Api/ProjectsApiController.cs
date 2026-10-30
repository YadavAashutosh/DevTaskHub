using DevTaskHub.Web.Data;
using DevTaskHub.Web.DTOs.Projects;
using DevTaskHub.Web.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevTaskHub.Web.Controllers.Api
{
    [ApiController]
    [Route("api/projects")]
    [Produces("application/json")]
    [Authorize] // 🛡️ Authenticated users only
    public class ProjectsApiController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ProjectsApiController> _logger;

        public ProjectsApiController(AppDbContext context, ILogger<ProjectsApiController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Retrieves all active projects with real-time task and member statistics.
        /// Zero Seed Policy: Returns empty list if no projects exist in the database.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<ProjectDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetProjects()
        {
            var projects = await _context.Projects
                .Where(p => p.DeletedAtUtc == null)
                .AsNoTracking()
                .Select(p => new ProjectDto
                {
                    Id = p.Id,
                    ProjectKey = p.ProjectKey,
                    Name = p.Name,
                    Description = p.Description,
                    Status = p.Status,
                    GitHubRepoOwner = p.GitHubRepoOwner,
                    GitHubRepoName = p.GitHubRepoName,
                    CreatedAt = p.CreatedAt,
                    TotalTasks = p.Tasks.Count(t => t.DeletedAtUtc == null),
                    CompletedTasks = p.Tasks.Count(t => t.DeletedAtUtc == null && t.Status == "Done"),
                    TotalMembers = p.Members.Count(m => m.User.DeletedAtUtc == null && m.User.IsActive)
                })
                .ToListAsync();

            return Ok(projects);
        }

        /// <summary>
        /// Retrieves a single project by its ID.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(ProjectDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetProjectById(int id)
        {
            var project = await _context.Projects
                .Where(p => p.Id == id && p.DeletedAtUtc == null)
                .AsNoTracking()
                .Select(p => new ProjectDto
                {
                    Id = p.Id,
                    ProjectKey = p.ProjectKey,
                    Name = p.Name,
                    Description = p.Description,
                    Status = p.Status,
                    GitHubRepoOwner = p.GitHubRepoOwner,
                    GitHubRepoName = p.GitHubRepoName,
                    CreatedAt = p.CreatedAt,
                    TotalTasks = p.Tasks.Count(t => t.DeletedAtUtc == null),
                    CompletedTasks = p.Tasks.Count(t => t.DeletedAtUtc == null && t.Status == "Done"),
                    TotalMembers = p.Members.Count(m => m.User.DeletedAtUtc == null && m.User.IsActive)
                })
                .FirstOrDefaultAsync();

            if (project == null)
            {
                return NotFound(new { message = $"Project with ID {id} was not found." });
            }

            return Ok(project);
        }

        /// <summary>
        /// Creates a new engineering project workspace in the database.
        /// RBAC: Admin and ProjectManager only.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin,ProjectManager")]
        [ProducesResponseType(typeof(ProjectDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> CreateProject([FromBody] CreateProjectDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var trimmedKey = dto.ProjectKey.Trim().ToUpperInvariant();

            // Enforce unique project key among active projects
            var keyExists = await _context.Projects
                .AnyAsync(p => p.ProjectKey == trimmedKey && p.DeletedAtUtc == null);

            if (keyExists)
            {
                return BadRequest(new { message = $"Project key '{trimmedKey}' is already in use." });
            }

            var project = new Project
            {
                Name = dto.Name.Trim(),
                ProjectKey = trimmedKey,
                Description = dto.Description?.Trim(),
                GitHubRepoOwner = dto.GitHubRepoOwner?.Trim(),
                GitHubRepoName = dto.GitHubRepoName?.Trim(),
                Status = "Active",
                CreatedAt = DateTime.UtcNow
            };

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            var responseDto = new ProjectDto
            {
                Id = project.Id,
                ProjectKey = project.ProjectKey,
                Name = project.Name,
                Description = project.Description,
                Status = project.Status,
                GitHubRepoOwner = project.GitHubRepoOwner,
                GitHubRepoName = project.GitHubRepoName,
                CreatedAt = project.CreatedAt,
                TotalTasks = 0,
                CompletedTasks = 0,
                TotalMembers = 0
            };

            return CreatedAtAction(nameof(GetProjectById), new { id = project.Id }, responseDto);
        }

        /// <summary>
        /// Updates an existing project's metadata.
        /// RBAC: Admin and ProjectManager only.
        /// </summary>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,ProjectManager")]
        [ProducesResponseType(typeof(ProjectDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateProject(int id, [FromBody] UpdateProjectDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id && p.DeletedAtUtc == null);
            if (project == null)
            {
                return NotFound(new { message = $"Project with ID {id} was not found." });
            }

            project.Name = dto.Name.Trim();
            project.Description = dto.Description?.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                project.Status = dto.Status.Trim();
            }
            project.GitHubRepoOwner = dto.GitHubRepoOwner?.Trim();
            project.GitHubRepoName = dto.GitHubRepoName?.Trim();
            project.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetProjectById(id);
        }

        /// <summary>
        /// Soft-deletes a project record.
        /// RBAC: Admin only.
        /// </summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteProject(int id)
        {
            var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id && p.DeletedAtUtc == null);
            if (project == null)
            {
                return NotFound(new { message = $"Project with ID {id} was not found." });
            }

            project.Status = "Archived";
            project.DeletedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // =========================================================================
        // PROJECT MEMBERS MANAGEMENT (dbo.ProjectMembers)
        // =========================================================================

        /// <summary>
        /// Retrieves all team members assigned to a specific project.
        /// </summary>
        [HttpGet("{projectId:int}/members")]
        [ProducesResponseType(typeof(IEnumerable<ProjectMemberDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetProjectMembers(int projectId)
        {
            var projectExists = await _context.Projects.AnyAsync(p => p.Id == projectId && p.DeletedAtUtc == null);
            if (!projectExists)
            {
                return NotFound(new { message = $"Project with ID {projectId} was not found." });
            }

            var members = await _context.ProjectMembers
                .Where(pm => pm.ProjectId == projectId && pm.User.DeletedAtUtc == null && pm.User.IsActive)
                .Include(pm => pm.User)
                .OrderBy(pm => pm.JoinedAtUtc)
                .Select(pm => new ProjectMemberDto
                {
                    ProjectId = pm.ProjectId,
                    UserId = pm.UserId,
                    FullName = pm.User.FullName ?? pm.User.Email,
                    Email = pm.User.Email,
                    Role = pm.User.Role,
                    ProjectRole = pm.ProjectRole,
                    GitHubUsername = pm.User.GitHubUsername,
                    JoinedAtUtc = pm.JoinedAtUtc
                })
                .ToListAsync();

            return Ok(members);
        }

        /// <summary>
        /// Adds a user as a team member to the project.
        /// RBAC: Admin and ProjectManager only.
        /// </summary>
        [HttpPost("{projectId:int}/members")]
        [Authorize(Roles = "Admin,ProjectManager")]
        [ProducesResponseType(typeof(ProjectMemberDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AddProjectMember(int projectId, [FromBody] AddProjectMemberDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == projectId && p.DeletedAtUtc == null);
            if (project == null)
            {
                return NotFound(new { message = $"Project with ID {projectId} was not found." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == dto.UserId && u.DeletedAtUtc == null && u.IsActive);
            if (user == null)
            {
                return NotFound(new { message = $"User with ID {dto.UserId} was not found or is deactivated." });
            }

            var existingMember = await _context.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == dto.UserId);

            if (existingMember != null)
            {
                return BadRequest(new { message = $"User '{user.FullName ?? user.Email}' is already a member of this project." });
            }

            var projectMember = new ProjectMember
            {
                ProjectId = projectId,
                UserId = dto.UserId,
                ProjectRole = string.IsNullOrWhiteSpace(dto.ProjectRole) ? "Developer" : dto.ProjectRole.Trim(),
                JoinedAtUtc = DateTime.UtcNow
            };

            _context.ProjectMembers.Add(projectMember);
            await _context.SaveChangesAsync();

            var response = new ProjectMemberDto
            {
                ProjectId = projectMember.ProjectId,
                UserId = projectMember.UserId,
                FullName = user.FullName ?? user.Email,
                Email = user.Email,
                Role = user.Role,
                ProjectRole = projectMember.ProjectRole,
                GitHubUsername = user.GitHubUsername,
                JoinedAtUtc = projectMember.JoinedAtUtc
            };

            return CreatedAtAction(nameof(GetProjectMembers), new { projectId }, response);
        }

        /// <summary>
        /// Removes a team member from the project.
        /// RBAC: Admin and ProjectManager only.
        /// </summary>
        [HttpDelete("{projectId:int}/members/{userId:int}")]
        [Authorize(Roles = "Admin,ProjectManager")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> RemoveProjectMember(int projectId, int userId)
        {
            var membership = await _context.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (membership == null)
            {
                return NotFound(new { message = $"User #{userId} is not assigned to Project #{projectId}." });
            }

            _context.ProjectMembers.Remove(membership);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
