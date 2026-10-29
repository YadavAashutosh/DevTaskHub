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
        /// Retrieves all active projects with real-time task statistics.
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
                    CompletedTasks = p.Tasks.Count(t => t.DeletedAtUtc == null && t.Status == "Done")
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
                    CompletedTasks = p.Tasks.Count(t => t.DeletedAtUtc == null && t.Status == "Done")
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
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(ProjectDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
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
                CompletedTasks = 0
            };

            return CreatedAtAction(nameof(GetProjectById), new { id = project.Id }, responseDto);
        }

        /// <summary>
        /// Updates an existing project's metadata.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(ProjectDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateProject(int id, [FromBody] CreateProjectDto dto)
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
            project.GitHubRepoOwner = dto.GitHubRepoOwner?.Trim();
            project.GitHubRepoName = dto.GitHubRepoName?.Trim();
            project.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetProjectById(id);
        }

        /// <summary>
        /// Soft-deletes a project record.
        /// </summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
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
    }
}