using DevTaskHub.Web.Data;
using DevTaskHub.Web.DTOs.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevTaskHub.Web.Controllers.Api
{
    [ApiController]
    [Route("api/dashboard")]
    [Authorize]
    public class DashboardApiController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardApiController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("stats")]
        [ProducesResponseType(typeof(DashboardStatsDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetDashboardStats()
        {
            var activeTasks = await _context.Tasks
                .Where(t => t.DeletedAtUtc == null)
                .Include(t => t.Project)
                .AsNoTracking()
                .ToListAsync();

            var totalTasks = activeTasks.Count;
            var todoCount = activeTasks.Count(t => string.Equals(t.Status, "Todo", StringComparison.OrdinalIgnoreCase));
            var inProgressCount = activeTasks.Count(t => string.Equals(t.Status, "InProgress", StringComparison.OrdinalIgnoreCase));
            var inReviewCount = activeTasks.Count(t => string.Equals(t.Status, "InReview", StringComparison.OrdinalIgnoreCase));
            var doneCount = activeTasks.Count(t => string.Equals(t.Status, "Done", StringComparison.OrdinalIgnoreCase));

            var completionRate = totalTasks > 0 ? Math.Round((double)doneCount / totalTasks * 100, 1) : 0.0;

            // Project summaries
            var projects = await _context.Projects
                .Where(p => p.DeletedAtUtc == null)
                .AsNoTracking()
                .ToListAsync();

            var projectSummaries = projects.Select(p =>
            {
                var pTasks = activeTasks.Where(t => t.ProjectId == p.Id).ToList();
                var pTotal = pTasks.Count;
                var pDone = pTasks.Count(t => string.Equals(t.Status, "Done", StringComparison.OrdinalIgnoreCase));
                var pRate = pTotal > 0 ? Math.Round((double)pDone / pTotal * 100, 1) : 0.0;

                return new ProjectProgressSummaryDto
                {
                    ProjectId = p.Id,
                    ProjectName = p.Name,
                    ProjectKey = p.ProjectKey,
                    GitHubRepoOwner = p.GitHubRepoOwner,
                    GitHubRepoName = p.GitHubRepoName,
                    TotalTasks = pTotal,
                    CompletedTasks = pDone,
                    CompletionRate = pRate
                };
            }).ToList();

            // Recent activity from TaskStatusHistories
            var recentTransitions = await _context.TaskStatusHistories
                .Include(h => h.Task)
                .Include(h => h.ChangedByUser)
                .OrderByDescending(h => h.ChangedAtUtc)
                .Take(8)
                .Select(h => new RecentActivityDto
                {
                    Id = h.Id,
                    Type = "StatusChange",
                    TaskId = h.TaskId,
                    TaskTitle = h.Task != null ? h.Task.Title : "Task",
                    ActorName = h.ChangedByUser != null ? (h.ChangedByUser.FullName ?? h.ChangedByUser.Email) : "Developer",
                    Details = $"Moved to {h.NewStatus} (from {h.OldStatus})",
                    TimestampUtc = h.ChangedAtUtc
                })
                .ToListAsync();

            // Recent comments
            var recentComments = await _context.TaskComments
                .Where(c => c.DeletedAtUtc == null)
                .Include(c => c.Task)
                .Include(c => c.AuthorUser)
                .OrderByDescending(c => c.CreatedAtUtc)
                .Take(5)
                .Select(c => new RecentActivityDto
                {
                    Id = c.Id,
                    Type = "Comment",
                    TaskId = c.TaskId,
                    TaskTitle = c.Task != null ? c.Task.Title : "Task",
                    ActorName = c.AuthorUser != null ? (c.AuthorUser.FullName ?? c.AuthorUser.Email) : "Developer",
                    Details = c.Body.Length > 60 ? c.Body.Substring(0, 60) + "..." : c.Body,
                    TimestampUtc = c.CreatedAtUtc
                })
                .ToListAsync();

            var combinedActivity = recentTransitions
                .Concat(recentComments)
                .OrderByDescending(a => a.TimestampUtc)
                .Take(10)
                .ToList();

            return Ok(new DashboardStatsDto
            {
                TotalTasks = totalTasks,
                TodoTasks = todoCount,
                InProgressTasks = inProgressCount,
                InReviewTasks = inReviewCount,
                DoneTasks = doneCount,
                CompletionRate = completionRate,
                ProjectSummaries = projectSummaries,
                RecentActivity = combinedActivity
            });
        }
    }
}

