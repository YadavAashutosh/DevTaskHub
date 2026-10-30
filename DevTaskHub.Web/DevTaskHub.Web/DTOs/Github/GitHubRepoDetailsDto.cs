namespace DevTaskHub.Web.DTOs.Github
{
    public class GitHubRepoDetailsDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string HtmlUrl { get; set; } = string.Empty;
        public string? Language { get; set; }
        public int StargazersCount { get; set; }
        public int ForksCount { get; set; }
        public int OpenIssuesCount { get; set; }
        public string DefaultBranch { get; set; } = "main";
        public DateTime? PushedAt { get; set; }
        public string? OwnerLogin { get; set; }
        public string? OwnerAvatarUrl { get; set; }
    }
}

