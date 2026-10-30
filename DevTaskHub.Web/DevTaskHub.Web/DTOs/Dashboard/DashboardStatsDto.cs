namespace DevTaskHub.Web.DTOs.Dashboard
{
    public class DashboardStatsDto
    {
        public int TotalTasks { get; set; }
        public int TodoTasks { get; set; }
        public int InProgressTasks { get; set; }
        public int InReviewTasks { get; set; }
        public int DoneTasks { get; set; }
        public double CompletionRate { get; set; }
        public List<ProjectProgressSummaryDto> ProjectSummaries { get; set; } = new();
        public List<RecentActivityDto> RecentActivity { get; set; } = new();
    }

    public class ProjectProgressSummaryDto
    {
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public string ProjectKey { get; set; } = string.Empty;
        public string? GitHubRepoOwner { get; set; }
        public string? GitHubRepoName { get; set; }
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public double CompletionRate { get; set; }
    }

    public class RecentActivityDto
    {
        public int Id { get; set; }
        public string Type { get; set; } = "StatusChange"; // StatusChange, Comment, PRLink
        public int TaskId { get; set; }
        public string TaskTitle { get; set; } = string.Empty;
        public string ActorName { get; set; } = "System";
        public string Details { get; set; } = string.Empty;
        public DateTime TimestampUtc { get; set; }
    }
}

