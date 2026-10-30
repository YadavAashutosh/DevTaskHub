using DevTaskHub.Web.DTOs.GitHub;
using DevTaskHub.Web.DTOs.Github;
using DevTaskHub.Web.Models;
using DevTaskHub.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DevTaskHub.Web.Controllers.Api
{
    [ApiController]
    [Route("api")]
    [Authorize] // Bank-grade security gate: requires authenticated JWT session
    public class GitHubApiController : ControllerBase
    {
        private readonly IGitHubService _gitHubService;
        private readonly ILogger<GitHubApiController> _logger;

        public GitHubApiController(
            IGitHubService gitHubService,
            ILogger<GitHubApiController> logger)
        {
            _gitHubService = gitHubService;
            _logger = logger;
        }

        private static TaskPullRequestDto MapToDto(TaskPullRequest pr) => new()
        {
            Id = pr.Id,
            TaskId = pr.TaskId,
            PullRequestNumber = pr.PullRequestNumber,
            PullRequestUrl = pr.PullRequestUrl,
            Title = pr.Title,
            State = pr.State,
            IsMerged = pr.IsMerged,
            LastSyncedAtUtc = pr.LastSyncedAtUtc
        };

        /// <summary>
        /// Proxies GitHub REST API v3 to fetch live Pull Request details.
        /// </summary>
        [HttpGet("github/repos/{owner}/{repo}/pulls/{number:int}")]
        [ProducesResponseType(typeof(GitHubPullRequestDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetPullRequest(
            string owner,
            string repo,
            int number,
            CancellationToken cancellationToken)
        {
            var pr = await _gitHubService.GetPullRequestAsync(owner, repo, number, cancellationToken);
            if (pr == null)
            {
                return NotFound(new { message = $"GitHub Pull Request #{number} was not found on repository '{owner}/{repo}'." });
            }

            return Ok(pr);
        }

        /// <summary>
        /// Fetches full repository metadata (stars, forks, open issues, language, default branch).
        /// </summary>
        [HttpGet("github/repos/{owner}/{repo}")]
        [ProducesResponseType(typeof(GitHubRepoDetailsDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetRepository(
            string owner,
            string repo,
            CancellationToken cancellationToken)
        {
            var details = await _gitHubService.GetRepositoryAsync(owner, repo, cancellationToken);
            if (details == null)
            {
                return NotFound(new { message = $"Repository '{owner}/{repo}' was not found on GitHub." });
            }
            return Ok(details);
        }

        /// <summary>
        /// Fetches all public repositories for a specified GitHub user (e.g. 'YadavAashutosh').
        /// </summary>
        [HttpGet("github/users/{username}/repos")]
        [ProducesResponseType(typeof(List<GitHubRepoDetailsDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetUserRepositories(
            string username,
            CancellationToken cancellationToken)
        {
            var repos = await _gitHubService.GetUserRepositoriesAsync(username, cancellationToken);
            return Ok(repos);
        }

        /// <summary>
        /// Fetches recent commits for a repository.
        /// </summary>
        [HttpGet("github/repos/{owner}/{repo}/commits")]
        [ProducesResponseType(typeof(List<GitHubCommitDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetRepositoryCommits(
            string owner,
            string repo,
            [FromQuery] int limit = 10,
            CancellationToken cancellationToken = default)
        {
            var commits = await _gitHubService.GetRepositoryCommitsAsync(owner, repo, limit, cancellationToken);
            return Ok(commits);
        }

        /// <summary>
        /// Links a GitHub Pull Request to a specific sprint task and syncs status.
        /// </summary>
        [HttpPost("tasks/{taskId:int}/github/link")]
        [ProducesResponseType(typeof(TaskPullRequestDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> LinkPullRequest(
            int taskId,
            [FromBody] LinkPullRequestDto dto,
            CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var linkedPr = await _gitHubService.LinkPullRequestToTaskAsync(taskId, dto, cancellationToken);
                return Ok(MapToDto(linkedPr));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                // Rate limit or cannot determine owner/repo
                return StatusCode(429, new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(401, new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error linking PR #{PrNumber} to Task {TaskId}", dto.PullRequestNumber, taskId);
                return StatusCode(500, new { message = "An error occurred while linking the GitHub pull request." });
            }
        }

        /// <summary>
        /// Gets all pull requests currently linked to a sprint task.
        /// </summary>
        [HttpGet("tasks/{taskId:int}/github/prs")]
        [ProducesResponseType(typeof(List<TaskPullRequestDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetTaskPullRequests(int taskId, CancellationToken cancellationToken)
        {
            var prs = await _gitHubService.GetTaskPullRequestsAsync(taskId, cancellationToken);
            return Ok(prs.Select(MapToDto).ToList());
        }

        /// <summary>
        /// Manually triggers a real-time status re-sync with GitHub for a task's linked PR.
        /// </summary>
        [HttpPost("tasks/{taskId:int}/github/sync")]
        [ProducesResponseType(typeof(TaskPullRequestDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> SyncTaskPullRequest(
            int taskId,
            [FromQuery] int? prNumber,
            CancellationToken cancellationToken)
        {
            try
            {
                var syncedPr = await _gitHubService.SyncPullRequestAsync(taskId, prNumber, cancellationToken);
                if (syncedPr == null)
                {
                    return NotFound(new { message = $"No pull request found to synchronize for task #{taskId}." });
                }

                return Ok(MapToDto(syncedPr));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(429, new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(401, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Disassociates the Pull Request from a task.
        /// </summary>
        [HttpPost("tasks/{taskId:int}/github/unlink")]
        [HttpDelete("tasks/{taskId:int}/github/unlink")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UnlinkPullRequest(int taskId, CancellationToken cancellationToken)
        {
            var unlinked = await _gitHubService.UnlinkPullRequestAsync(taskId, cancellationToken);
            if (!unlinked)
            {
                return NotFound(new { message = $"Task #{taskId} was not found." });
            }

            return Ok(new { message = $"Pull Request unlinked from Task #{taskId} successfully." });
        }
    }
}
