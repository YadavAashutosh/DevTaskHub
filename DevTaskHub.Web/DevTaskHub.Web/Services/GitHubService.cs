using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using DevTaskHub.Web.Data;
using DevTaskHub.Web.DTOs.GitHub;
using DevTaskHub.Web.Models;
using Microsoft.EntityFrameworkCore;

namespace DevTaskHub.Web.Services
{
    public class GitHubService : IGitHubService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly AppDbContext _context;
        private readonly ILogger<GitHubService> _logger;

        public GitHubService(
            IHttpClientFactory httpClientFactory,
            AppDbContext context,
            ILogger<GitHubService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _context = context;
            _logger = logger;
        }

        public async Task<GitHubPullRequestDto?> GetPullRequestAsync(
            string owner,
            string repo,
            int prNumber,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("GitHubClient");
                var requestUrl = $"https://api.github.com/repos/{owner}/{repo}/pulls/{prNumber}";

                using var request = new HttpRequestMessage(HttpMethod.Get, requestUrl);
                request.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevTaskHub-Platform", "1.0"));
                request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github.v3+json"));

                using var response = await client.SendAsync(request, cancellationToken);

                if (response.StatusCode == HttpStatusCode.NotFound)
                {
                    _logger.LogWarning("GitHub PR #{PrNumber} not found on {Owner}/{Repo}", prNumber, owner, repo);
                    return null;
                }

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("GitHub API returned {StatusCode} for {Owner}/{Repo} PR #{PrNumber}",
                        response.StatusCode, owner, repo, prNumber);
                    return null;
                }

                var jsonStream = await response.Content.ReadAsStreamAsync(cancellationToken);
                using var jsonDoc = await JsonDocument.ParseAsync(jsonStream, cancellationToken: cancellationToken);
                var root = jsonDoc.RootElement;

                var isMerged = false;
                if (root.TryGetProperty("merged", out var mergedProp))
                {
                    isMerged = mergedProp.GetBoolean();
                }

                string state = root.TryGetProperty("state", out var stateProp)
                    ? (isMerged ? "merged" : stateProp.GetString() ?? "open")
                    : "open";

                DateTime? mergedAt = null;
                if (root.TryGetProperty("merged_at", out var mergedAtProp) && mergedAtProp.ValueKind == JsonValueKind.String)
                {
                    if (DateTime.TryParse(mergedAtProp.GetString(), out var parsedMerged))
                    {
                        mergedAt = parsedMerged;
                        isMerged = true;
                        state = "merged";
                    }
                }

                DateTime? createdAt = null;
                if (root.TryGetProperty("created_at", out var createdAtProp) && createdAtProp.ValueKind == JsonValueKind.String)
                {
                    if (DateTime.TryParse(createdAtProp.GetString(), out var parsedCreated))
                    {
                        createdAt = parsedCreated;
                    }
                }

                string? authorLogin = null;
                if (root.TryGetProperty("user", out var userProp) && userProp.TryGetProperty("login", out var loginProp))
                {
                    authorLogin = loginProp.GetString();
                }

                return new GitHubPullRequestDto
                {
                    PullRequestNumber = root.GetProperty("number").GetInt32(),
                    Title = root.TryGetProperty("title", out var titleProp) ? titleProp.GetString() ?? string.Empty : string.Empty,
                    HtmlUrl = root.TryGetProperty("html_url", out var urlProp) ? urlProp.GetString() ?? string.Empty : string.Empty,
                    State = state,
                    IsMerged = isMerged,
                    MergedAtUtc = mergedAt,
                    CreatedAtUtc = createdAt,
                    AuthorLogin = authorLogin,
                    LastSyncedAtUtc = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch GitHub PR #{PrNumber} from {Owner}/{Repo}", prNumber, owner, repo);
                return null;
            }
        }

        public async Task<TaskPullRequest> LinkPullRequestToTaskAsync(
            int taskId,
            LinkPullRequestDto dto,
            CancellationToken cancellationToken = default)
        {
            var task = await _context.Tasks
                .Include(t => t.Project)
                .FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);

            if (task == null)
            {
                throw new KeyNotFoundException($"Task with ID {taskId} was not found.");
            }

            var owner = !string.IsNullOrWhiteSpace(dto.Owner)
                ? dto.Owner
                : task.Project?.GitHubRepoOwner ?? "dotnet";

            var repo = !string.IsNullOrWhiteSpace(dto.Repo)
                ? dto.Repo
                : task.Project?.GitHubRepoName ?? "aspnetcore";

            // Attempt live sync from GitHub API
            var livePr = await GetPullRequestAsync(owner, repo, dto.PullRequestNumber, cancellationToken);

            var prEntity = await _context.TaskPullRequests
                .FirstOrDefaultAsync(p => p.TaskId == taskId && p.PullRequestNumber == dto.PullRequestNumber, cancellationToken);

            var prUrl = livePr?.HtmlUrl ?? dto.PullRequestUrl ?? $"https://github.com/{owner}/{repo}/pull/{dto.PullRequestNumber}";
            var prTitle = livePr?.Title ?? $"Pull Request #{dto.PullRequestNumber}";
            var prState = livePr?.State ?? "Open";
            var prMerged = livePr?.IsMerged ?? false;

            if (prEntity == null)
            {
                prEntity = new TaskPullRequest
                {
                    TaskId = taskId,
                    PullRequestNumber = dto.PullRequestNumber,
                    PullRequestUrl = prUrl,
                    Title = prTitle,
                    State = prState,
                    IsMerged = prMerged,
                    LastSyncedAtUtc = DateTime.UtcNow
                };
                _context.TaskPullRequests.Add(prEntity);
            }
            else
            {
                prEntity.PullRequestUrl = prUrl;
                prEntity.Title = prTitle;
                prEntity.State = prState;
                prEntity.IsMerged = prMerged;
                prEntity.LastSyncedAtUtc = DateTime.UtcNow;
            }

            // Sync task's primary PR reference
            task.GitHubPrNumber = dto.PullRequestNumber;
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            return prEntity;
        }

        public async Task<List<TaskPullRequest>> GetTaskPullRequestsAsync(
            int taskId,
            CancellationToken cancellationToken = default)
        {
            return await _context.TaskPullRequests
                .Where(p => p.TaskId == taskId)
                .OrderByDescending(p => p.LastSyncedAtUtc)
                .ToListAsync(cancellationToken);
        }

        public async Task<TaskPullRequest?> SyncPullRequestAsync(
            int taskId,
            int? prNumber = null,
            CancellationToken cancellationToken = default)
        {
            var task = await _context.Tasks
                .Include(t => t.Project)
                .FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);

            if (task == null) return null;

            var targetNumber = prNumber ?? task.GitHubPrNumber;
            if (!targetNumber.HasValue) return null;

            var prEntity = await _context.TaskPullRequests
                .FirstOrDefaultAsync(p => p.TaskId == taskId && p.PullRequestNumber == targetNumber.Value, cancellationToken);

            var owner = task.Project?.GitHubRepoOwner ?? "dotnet";
            var repo = task.Project?.GitHubRepoName ?? "aspnetcore";

            var livePr = await GetPullRequestAsync(owner, repo, targetNumber.Value, cancellationToken);
            if (livePr == null) return prEntity;

            if (prEntity == null)
            {
                prEntity = new TaskPullRequest
                {
                    TaskId = taskId,
                    PullRequestNumber = targetNumber.Value,
                    PullRequestUrl = livePr.HtmlUrl,
                    Title = livePr.Title,
                    State = livePr.State,
                    IsMerged = livePr.IsMerged,
                    LastSyncedAtUtc = DateTime.UtcNow
                };
                _context.TaskPullRequests.Add(prEntity);
            }
            else
            {
                prEntity.PullRequestUrl = livePr.HtmlUrl;
                prEntity.Title = livePr.Title;
                prEntity.State = livePr.State;
                prEntity.IsMerged = livePr.IsMerged;
                prEntity.LastSyncedAtUtc = DateTime.UtcNow;
            }

            task.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            return prEntity;
        }
    }
}