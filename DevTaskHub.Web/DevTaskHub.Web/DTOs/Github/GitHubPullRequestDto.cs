using System.Text.Json.Serialization;

namespace DevTaskHub.Web.DTOs.GitHub
{
    /// <summary>
    /// Contract representing Pull Request data returned by GitHub REST API v3 and DevTaskHub.
    /// </summary>
    public class GitHubPullRequestDto
    {
        [JsonPropertyName("number")]
        public int PullRequestNumber { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("html_url")]
        public string HtmlUrl { get; set; } = string.Empty;

        [JsonPropertyName("state")]
        public string State { get; set; } = "open"; // open, closed

        [JsonPropertyName("merged")]
        public bool IsMerged { get; set; }

        [JsonPropertyName("merged_at")]
        public DateTime? MergedAtUtc { get; set; }

        [JsonPropertyName("created_at")]
        public DateTime? CreatedAtUtc { get; set; }

        [JsonPropertyName("author")]
        public string? AuthorLogin { get; set; }

        public DateTime LastSyncedAtUtc { get; set; } = DateTime.UtcNow;
    }
}