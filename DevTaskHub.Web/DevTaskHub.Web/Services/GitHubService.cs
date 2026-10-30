using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using DevTaskHub.Web.Data;
using DevTaskHub.Web.DTOs.GitHub;
using DevTaskHub.Web.DTOs.Github;
using DevTaskHub.Web.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace DevTaskHub.Web.Services
{
    public class GitHubService : IGitHubService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly AppDbContext _context;
        private readonly ILogger<GitHubService> _logger;
        private readonly IMemoryCache _cache;

        // Cache TTLs
        private static readonly TimeSpan RepoCacheTtl = TimeSpan.FromMinutes(10);
        private static readonly TimeSpan CommitsCacheTtl = TimeSpan.FromMinutes(5);
        private static readonly TimeSpan PrCacheTtl = TimeSpan.FromMinutes(2);

        public GitHubService(
            IHttpClientFactory httpClientFactory,
            AppDbContext context,
            ILogger<GitHubService> logger,
            IMemoryCache cache)
        {
            _httpClientFactory = httpClientFactory;
            _context = context;
            _logger = logger;
            _cache = cache;
        }

        /// <summary>
        /// Parses a GitHub PR URL like https://github.com/owner/repo/pull/7
        /// Returns (owner, repo, prNumber) or nulls if the URL is not a valid PR URL.
        /// </summary>
        public static (string? owner, string? repo, int? prNumber) ParseGitHubPrUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return (null, null, null);

            var match = Regex.Match(
                url.Trim(),
                @"(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)",
                RegexOptions.IgnoreCase);

            if (match.Success)
            {
                var owner = match.Groups[1].Value;
                var repo = match.Groups[2].Value;
                if (int.TryParse(match.Groups[3].Value, out var prNum))
                {
                    return (owner, repo, prNum);
                }
            }

            return (null, null, null);
        }

        /// <summary>
        /// Parses a GitHub repo URL like https://github.com/owner/repo
        /// Returns (owner, repo) or nulls.
        /// </summary>
        private static (string? owner, string? repo) ParseGitHubRepoUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return (null, null);

            var match = Regex.Match(
                url.Trim(),
                @"(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/?\s]+)",
                RegexOptions.IgnoreCase);

            if (match.Success)
                return (match.Groups[1].Value, match.Groups[2].Value);

            return (null, null);
        }

        /// <summary>
        /// Builds authenticated request headers. Token injected at HttpClient level via Program.cs.
        /// </summary>
        private static HttpRequestMessage BuildRequest(string url)
        {
            var req = new HttpRequestMessage(HttpMethod.Get, url);
            // User-Agent and Accept/Authorization set at HttpClient level (Program.cs)
            return req;
        }

        /// <summary>
        /// Checks a GitHub HTTP response for rate limit or auth errors and throws descriptive exceptions.
        /// </summary>
        private void EnsureGitHubSuccess(HttpResponseMessage response, string context)
        {
            if (response.IsSuccessStatusCode) return;

            if (response.StatusCode == HttpStatusCode.Forbidden || response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                // Parse the reset time from headers
                string resetInfo = string.Empty;
                if (response.Headers.TryGetValues("X-RateLimit-Reset", out var resetVals))
                {
                    if (long.TryParse(resetVals.FirstOrDefault(), out var epoch))
                    {
                        var resetTime = DateTimeOffset.FromUnixTimeSeconds(epoch).ToLocalTime();
                        resetInfo = $" Rate limit resets at {resetTime:HH:mm:ss}.";
                    }
                }
                _logger.LogWarning("GitHub API rate limit or auth error for {Context}: {StatusCode}{ResetInfo}", context, response.StatusCode, resetInfo);
                throw new InvalidOperationException($"GitHub API rate limit exceeded.{resetInfo} Please try again later or configure a GitHub Personal Access Token (GitHub:Token in appsettings).");
            }

            if (response.StatusCode == HttpStatusCode.NotFound)
                throw new KeyNotFoundException($"GitHub resource not found: {context}");

            if (response.StatusCode == HttpStatusCode.Unauthorized)
                throw new UnauthorizedAccessException($"GitHub API authentication failed for {context}. Check your GitHub:Token configuration.");

            throw new HttpRequestException($"GitHub API returned {(int)response.StatusCode} for {context}");
        }

        // ---------------------------------------------------------------
        // GET /repos/{owner}/{repo}/pulls/{number}
        // ---------------------------------------------------------------
        public async Task<GitHubPullRequestDto?> GetPullRequestAsync(
            string owner,
            string repo,
            int prNumber,
            CancellationToken cancellationToken = default)
        {
            var cacheKey = $"github:pr:{owner}/{repo}/{prNumber}";
            if (_cache.TryGetValue(cacheKey, out GitHubPullRequestDto? cached) && cached != null)
                return cached;

            try
            {
                var client = _httpClientFactory.CreateClient("GitHubClient");
                var requestUrl = $"https://api.github.com/repos/{owner}/{repo}/pulls/{prNumber}";
                using var request = BuildRequest(requestUrl);
                using var response = await client.SendAsync(request, cancellationToken);

                if (response.StatusCode == HttpStatusCode.NotFound)
                {
                    _logger.LogWarning("GitHub PR #{PrNumber} not found on {Owner}/{Repo}", prNumber, owner, repo);
                    return null; // Legitimate 404 - PR does not exist
                }

                EnsureGitHubSuccess(response, $"{owner}/{repo}/pulls/{prNumber}");

                var jsonStream = await response.Content.ReadAsStreamAsync(cancellationToken);
                using var jsonDoc = await JsonDocument.ParseAsync(jsonStream, cancellationToken: cancellationToken);
                var root = jsonDoc.RootElement;

                var isMerged = false;
                if (root.TryGetProperty("merged", out var mergedProp))
                    isMerged = mergedProp.GetBoolean();

                DateTime? mergedAt = null;
                if (root.TryGetProperty("merged_at", out var mergedAtProp) && mergedAtProp.ValueKind == JsonValueKind.String)
                {
                    if (DateTime.TryParse(mergedAtProp.GetString(), out var parsedMerged))
                    {
                        mergedAt = parsedMerged;
                        isMerged = true;
                    }
                }

                string state = root.TryGetProperty("state", out var stateProp)
                    ? (isMerged ? "merged" : (stateProp.GetString() ?? "open").ToLowerInvariant())
                    : "open";

                DateTime? createdAt = null;
                if (root.TryGetProperty("created_at", out var createdAtProp) && createdAtProp.ValueKind == JsonValueKind.String)
                {
                    if (DateTime.TryParse(createdAtProp.GetString(), out var parsedCreated))
                        createdAt = parsedCreated;
                }

                string? authorLogin = null;
                if (root.TryGetProperty("user", out var userProp) && userProp.TryGetProperty("login", out var loginProp))
                    authorLogin = loginProp.GetString();

                var title = root.TryGetProperty("title", out var titleProp) ? titleProp.GetString() ?? string.Empty : string.Empty;
                var htmlUrl = root.TryGetProperty("html_url", out var urlProp) ? urlProp.GetString() ?? string.Empty : string.Empty;

                var dto = new GitHubPullRequestDto
                {
                    PullRequestNumber = root.GetProperty("number").GetInt32(),
                    Title = title,
                    HtmlUrl = htmlUrl,
                    State = state,
                    IsMerged = isMerged,
                    MergedAtUtc = mergedAt,
                    CreatedAtUtc = createdAt,
                    AuthorLogin = authorLogin,
                    LastSyncedAtUtc = DateTime.UtcNow
                };

                _cache.Set(cacheKey, dto, PrCacheTtl);
                return dto;
            }
            catch (KeyNotFoundException) { throw; }
            catch (InvalidOperationException) { throw; }
            catch (UnauthorizedAccessException) { throw; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch GitHub PR #{PrNumber} from {Owner}/{Repo}", prNumber, owner, repo);
                return null;
            }
        }

        // ---------------------------------------------------------------
        // Link PR to task
        // ---------------------------------------------------------------
        public async Task<TaskPullRequest> LinkPullRequestToTaskAsync(
            int taskId,
            LinkPullRequestDto dto,
            CancellationToken cancellationToken = default)
        {
            var task = await _context.Tasks
                .Include(t => t.Project)
                .FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);

            if (task == null)
                throw new KeyNotFoundException($"Task with ID {taskId} was not found.");

            // 1. Resolve owner, repo, and PR number
            //    Priority: from URL > from DTO explicit fields > from Project config
            var (urlOwner, urlRepo, urlPrNum) = ParseGitHubPrUrl(dto.PullRequestUrl);
            var targetPrNumber = urlPrNum ?? dto.PullRequestNumber;

            var owner = (!string.IsNullOrWhiteSpace(dto.Owner) ? dto.Owner.Trim() : null)
                ?? urlOwner
                ?? (!string.IsNullOrWhiteSpace(task.Project?.GitHubRepoOwner) ? task.Project.GitHubRepoOwner.Trim() : null);

            var repo = (!string.IsNullOrWhiteSpace(dto.Repo) ? dto.Repo.Trim() : null)
                ?? urlRepo
                ?? (!string.IsNullOrWhiteSpace(task.Project?.GitHubRepoName) ? task.Project.GitHubRepoName.Trim() : null);

            if (string.IsNullOrWhiteSpace(owner) || string.IsNullOrWhiteSpace(repo))
            {
                throw new InvalidOperationException(
                    "Could not determine GitHub repository owner and name. " +
                    "Please either provide a full GitHub PR URL (e.g. https://github.com/owner/repo/pull/7), " +
                    "or make sure this project has a GitHub owner and repo configured.");
            }

            // 2. Query GitHub API v3 — this throws on rate limit, throws KeyNotFoundException on 404
            var livePr = await GetPullRequestAsync(owner, repo, targetPrNumber, cancellationToken);

            if (livePr == null)
            {
                throw new KeyNotFoundException(
                    $"Pull Request #{targetPrNumber} was not found on repository '{owner}/{repo}'. " +
                    $"Please verify the PR exists at https://github.com/{owner}/{repo}/pull/{targetPrNumber}");
            }

            // 3. Remove stale PR links for this task
            var obsoletePrs = await _context.TaskPullRequests
                .Where(p => p.TaskId == taskId && p.PullRequestNumber != targetPrNumber)
                .ToListAsync(cancellationToken);
            if (obsoletePrs.Count > 0)
                _context.TaskPullRequests.RemoveRange(obsoletePrs);

            var prEntity = await _context.TaskPullRequests
                .FirstOrDefaultAsync(p => p.TaskId == taskId && p.PullRequestNumber == targetPrNumber, cancellationToken);

            if (prEntity == null)
            {
                prEntity = new TaskPullRequest
                {
                    TaskId = taskId,
                    PullRequestNumber = targetPrNumber,
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

            task.GitHubPrNumber = targetPrNumber;
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            return prEntity;
        }

        // ---------------------------------------------------------------
        // Get all PRs for a task
        // ---------------------------------------------------------------
        public async Task<List<TaskPullRequest>> GetTaskPullRequestsAsync(
            int taskId,
            CancellationToken cancellationToken = default)
        {
            return await _context.TaskPullRequests
                .Where(p => p.TaskId == taskId)
                .OrderByDescending(p => p.LastSyncedAtUtc)
                .ToListAsync(cancellationToken);
        }

        // ---------------------------------------------------------------
        // Sync PR status from GitHub
        // ---------------------------------------------------------------
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

            string? owner = null;
            string? repo = null;

            if (prEntity != null && !string.IsNullOrWhiteSpace(prEntity.PullRequestUrl))
            {
                var (pOwner, pRepo, _) = ParseGitHubPrUrl(prEntity.PullRequestUrl);
                owner = pOwner;
                repo = pRepo;
            }

            owner ??= task.Project?.GitHubRepoOwner;
            repo ??= task.Project?.GitHubRepoName;

            if (string.IsNullOrWhiteSpace(owner) || string.IsNullOrWhiteSpace(repo))
                throw new InvalidOperationException("Cannot sync PR: GitHub repository owner/name could not be determined.");

            // Invalidate cache so sync always gets fresh data
            var cacheKey = $"github:pr:{owner}/{repo}/{targetNumber.Value}";
            _cache.Remove(cacheKey);

            var livePr = await GetPullRequestAsync(owner, repo, targetNumber.Value, cancellationToken);

            if (livePr == null)
                throw new KeyNotFoundException($"Pull Request #{targetNumber.Value} was not found on repository '{owner}/{repo}'.");

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

            task.GitHubPrNumber = targetNumber.Value;
            task.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            return prEntity;
        }

        // ---------------------------------------------------------------
        // Unlink PR from task
        // ---------------------------------------------------------------
        public async Task<bool> UnlinkPullRequestAsync(int taskId, CancellationToken cancellationToken = default)
        {
            var task = await _context.Tasks
                .Include(t => t.PullRequests)
                .FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);

            if (task == null) return false;

            if (task.PullRequests.Count > 0)
                _context.TaskPullRequests.RemoveRange(task.PullRequests);

            task.GitHubPrNumber = null;
            task.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        // ---------------------------------------------------------------
        // GET /repos/{owner}/{repo}  — full repo metadata
        // ---------------------------------------------------------------
        public async Task<GitHubRepoDetailsDto?> GetRepositoryAsync(
            string owner,
            string repo,
            CancellationToken cancellationToken = default)
        {
            var cacheKey = $"github:repo:{owner}/{repo}";
            if (_cache.TryGetValue(cacheKey, out GitHubRepoDetailsDto? cached) && cached != null)
                return cached;

            try
            {
                var client = _httpClientFactory.CreateClient("GitHubClient");
                var requestUrl = $"https://api.github.com/repos/{owner}/{repo}";
                using var request = BuildRequest(requestUrl);
                using var response = await client.SendAsync(request, cancellationToken);

                if (response.StatusCode == HttpStatusCode.NotFound) return null;
                EnsureGitHubSuccess(response, $"repo {owner}/{repo}");

                var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
                var root = doc.RootElement;

                var ownerLogin = root.TryGetProperty("owner", out var ownerEl) && ownerEl.TryGetProperty("login", out var l) ? l.GetString() : null;
                var ownerAvatar = root.TryGetProperty("owner", out var ownerEl2) && ownerEl2.TryGetProperty("avatar_url", out var a) ? a.GetString() : null;

                var dto = new GitHubRepoDetailsDto
                {
                    Id = root.GetProperty("id").GetInt64(),
                    Name = root.GetProperty("name").GetString() ?? string.Empty,
                    FullName = root.GetProperty("full_name").GetString() ?? string.Empty,
                    Description = root.TryGetProperty("description", out var d) && d.ValueKind == JsonValueKind.String ? d.GetString() : null,
                    HtmlUrl = root.GetProperty("html_url").GetString() ?? string.Empty,
                    Language = root.TryGetProperty("language", out var lang) && lang.ValueKind == JsonValueKind.String ? lang.GetString() : null,
                    StargazersCount = root.TryGetProperty("stargazers_count", out var stars) ? stars.GetInt32() : 0,
                    ForksCount = root.TryGetProperty("forks_count", out var forks) ? forks.GetInt32() : 0,
                    OpenIssuesCount = root.TryGetProperty("open_issues_count", out var issues) ? issues.GetInt32() : 0,
                    DefaultBranch = root.TryGetProperty("default_branch", out var branch) ? branch.GetString() ?? "main" : "main",
                    PushedAt = root.TryGetProperty("pushed_at", out var pushed) && pushed.ValueKind == JsonValueKind.String && DateTime.TryParse(pushed.GetString(), out DateTime pDate) ? pDate : null,
                    OwnerLogin = ownerLogin,
                    OwnerAvatarUrl = ownerAvatar
                };

                _cache.Set(cacheKey, dto, RepoCacheTtl);
                return dto;
            }
            catch (InvalidOperationException) { throw; }
            catch (UnauthorizedAccessException) { throw; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch repository metadata for {Owner}/{Repo}", owner, repo);
                return null;
            }
        }

        // ---------------------------------------------------------------
        // GET /users/{username}/repos
        // ---------------------------------------------------------------
        public async Task<List<GitHubRepoDetailsDto>> GetUserRepositoriesAsync(
            string username,
            CancellationToken cancellationToken = default)
        {
            var cacheKey = $"github:user-repos:{username}";
            if (_cache.TryGetValue(cacheKey, out List<GitHubRepoDetailsDto>? cachedRepos) && cachedRepos != null)
                return cachedRepos;

            var results = new List<GitHubRepoDetailsDto>();
            try
            {
                var client = _httpClientFactory.CreateClient("GitHubClient");
                var requestUrl = $"https://api.github.com/users/{username}/repos?per_page=100&sort=updated";
                using var request = BuildRequest(requestUrl);
                using var response = await client.SendAsync(request, cancellationToken);

                EnsureGitHubSuccess(response, $"user repos for {username}");

                var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    results.Add(new GitHubRepoDetailsDto
                    {
                        Id = el.GetProperty("id").GetInt64(),
                        Name = el.GetProperty("name").GetString() ?? string.Empty,
                        FullName = el.GetProperty("full_name").GetString() ?? string.Empty,
                        Description = el.TryGetProperty("description", out var d) && d.ValueKind == JsonValueKind.String ? d.GetString() : null,
                        HtmlUrl = el.GetProperty("html_url").GetString() ?? string.Empty,
                        Language = el.TryGetProperty("language", out var lang) && lang.ValueKind == JsonValueKind.String ? lang.GetString() : null,
                        StargazersCount = el.TryGetProperty("stargazers_count", out var stars) ? stars.GetInt32() : 0,
                        ForksCount = el.TryGetProperty("forks_count", out var forks) ? forks.GetInt32() : 0,
                        OpenIssuesCount = el.TryGetProperty("open_issues_count", out var issues) ? issues.GetInt32() : 0,
                        DefaultBranch = el.TryGetProperty("default_branch", out var branch) ? branch.GetString() ?? "main" : "main"
                    });
                }

                _cache.Set(cacheKey, results, RepoCacheTtl);
            }
            catch (InvalidOperationException) { throw; }
            catch (UnauthorizedAccessException) { throw; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch repositories for user {Username}", username);
            }
            return results;
        }

        // ---------------------------------------------------------------
        // GET /repos/{owner}/{repo}/commits
        // ---------------------------------------------------------------
        public async Task<List<GitHubCommitDto>> GetRepositoryCommitsAsync(
            string owner,
            string repo,
            int limit = 10,
            CancellationToken cancellationToken = default)
        {
            var cacheKey = $"github:commits:{owner}/{repo}:{limit}";
            if (_cache.TryGetValue(cacheKey, out List<GitHubCommitDto>? cachedCommits) && cachedCommits != null)
                return cachedCommits;

            var results = new List<GitHubCommitDto>();
            try
            {
                var client = _httpClientFactory.CreateClient("GitHubClient");
                var requestUrl = $"https://api.github.com/repos/{owner}/{repo}/commits?per_page={limit}";
                using var request = BuildRequest(requestUrl);
                using var response = await client.SendAsync(request, cancellationToken);

                EnsureGitHubSuccess(response, $"commits for {owner}/{repo}");

                var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    var sha = el.GetProperty("sha").GetString() ?? string.Empty;
                    var htmlUrl = el.GetProperty("html_url").GetString() ?? string.Empty;

                    var commitEl = el.GetProperty("commit");
                    var message = commitEl.GetProperty("message").GetString() ?? string.Empty;

                    var authorEl = commitEl.GetProperty("author");
                    var authorName = authorEl.GetProperty("name").GetString() ?? "Unknown";
                    var dateStr = authorEl.GetProperty("date").GetString();
                    var date = DateTime.TryParse(dateStr, out var d) ? d : DateTime.UtcNow;

                    string? avatarUrl = null;
                    if (el.TryGetProperty("author", out var ghAuthor) && ghAuthor.ValueKind == JsonValueKind.Object && ghAuthor.TryGetProperty("avatar_url", out var av))
                        avatarUrl = av.GetString();

                    results.Add(new GitHubCommitDto
                    {
                        Sha = sha,
                        Message = message,
                        AuthorName = authorName,
                        AuthorAvatarUrl = avatarUrl,
                        Date = date,
                        HtmlUrl = htmlUrl
                    });
                }

                _cache.Set(cacheKey, results, CommitsCacheTtl);
            }
            catch (InvalidOperationException) { throw; }
            catch (UnauthorizedAccessException) { throw; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch commits for {Owner}/{Repo}", owner, repo);
            }
            return results;
        }
    }
}
