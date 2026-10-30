namespace DevTaskHub.Web.DTOs.Github
{
    public class GitHubCommitDto
    {
        public string Sha { get; set; } = string.Empty;
        public string ShortSha => Sha.Length >= 7 ? Sha.Substring(0, 7) : Sha;
        public string Message { get; set; } = string.Empty;
        public string AuthorName { get; set; } = string.Empty;
        public string? AuthorAvatarUrl { get; set; }
        public DateTime Date { get; set; }
        public string HtmlUrl { get; set; } = string.Empty;
    }
}

