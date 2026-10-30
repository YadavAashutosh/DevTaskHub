namespace DevTaskHub.Web.DTOs.Github
{
    public class TaskPullRequestDto
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public int PullRequestNumber { get; set; }
        public string PullRequestUrl { get; set; } = string.Empty;
        public string? Title { get; set; }
        public string State { get; set; } = "open";
        public bool IsMerged { get; set; }
        public DateTime LastSyncedAtUtc { get; set; }
    }
}

