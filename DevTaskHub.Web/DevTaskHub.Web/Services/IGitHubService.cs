using DevTaskHub.Web.DTOs.GitHub;
using DevTaskHub.Web.DTOs.Github;
using DevTaskHub.Web.Models;

namespace DevTaskHub.Web.Services
{
    public interface IGitHubService
    {
        /// <summary>
        /// Queries the GitHub REST API v3 for a specific Pull Request.
        /// </summary>
        Task<GitHubPullRequestDto?> GetPullRequestAsync(string owner, string repo, int prNumber, CancellationToken cancellationToken = default);

        /// <summary>
        /// Links a GitHub PR to a task, fetches live metadata, and records it in TaskPullRequests.
        /// Throws KeyNotFoundException if PR does not exist on GitHub.
        /// </summary>
        Task<TaskPullRequest> LinkPullRequestToTaskAsync(int taskId, LinkPullRequestDto dto, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets all pull requests associated with a sprint task.
        /// </summary>
        Task<List<TaskPullRequest>> GetTaskPullRequestsAsync(int taskId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Synchronizes the latest status (Open, Merged, Closed) of a task's linked PR from GitHub.
        /// </summary>
        Task<TaskPullRequest?> SyncPullRequestAsync(int taskId, int? prNumber = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// Disassociates/unlinks the Pull Request from the task without deleting the task.
        /// </summary>
        Task<bool> UnlinkPullRequestAsync(int taskId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Fetches full repository details (stars, forks, issues, language, default branch).
        /// </summary>
        Task<GitHubRepoDetailsDto?> GetRepositoryAsync(string owner, string repo, CancellationToken cancellationToken = default);

        /// <summary>
        /// Fetches all public repositories for a given GitHub username.
        /// </summary>
        Task<List<GitHubRepoDetailsDto>> GetUserRepositoriesAsync(string username, CancellationToken cancellationToken = default);

        /// <summary>
        /// Fetches recent commits for a repository.
        /// </summary>
        Task<List<GitHubCommitDto>> GetRepositoryCommitsAsync(string owner, string repo, int limit = 10, CancellationToken cancellationToken = default);
    }
}
