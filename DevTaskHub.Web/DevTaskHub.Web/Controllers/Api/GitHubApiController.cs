using DevTaskHub.Web.DTOs.GitHub;
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
        /// Links a GitHub Pull Request to a specific sprint task and syncs status.
        /// </summary>
        [HttpPost("tasks/{taskId:int}/github/link")]
        [ProducesResponseType(typeof(TaskPullRequest), StatusCodes.Status200OK)]
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
                return Ok(linkedPr);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
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
        [ProducesResponseType(typeof(List<TaskPullRequest>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetTaskPullRequests(int taskId, CancellationToken cancellationToken)
        {
            var prs = await _gitHubService.GetTaskPullRequestsAsync(taskId, cancellationToken);
            return Ok(prs);
        }

        /// <summary>
        /// Manually triggers a real-time status re-sync with GitHub for a task's linked PR.
        /// </summary>
        [HttpPost("tasks/{taskId:int}/github/sync")]
        [ProducesResponseType(typeof(TaskPullRequest), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> SyncTaskPullRequest(
            int taskId,
            [FromQuery] int? prNumber,
            CancellationToken cancellationToken)
        {
            var syncedPr = await _gitHubService.SyncPullRequestAsync(taskId, prNumber, cancellationToken);
            if (syncedPr == null)
            {
                return NotFound(new { message = $"No pull request found to synchronize for task #{taskId}." });
            }

            return Ok(syncedPr);
        }
    }
}