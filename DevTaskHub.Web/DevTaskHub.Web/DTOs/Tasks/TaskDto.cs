namespace DevTaskHub.Web.DTOs.Tasks
{
    public class TaskDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = "Todo";
        public string Priority { get; set; } = "Medium";
        
        // Live GitHub PR metadata from dbo.TaskPullRequests
        public int? GitHubPrNumber { get; set; }
        public string? GitHubPrStatus { get; set; }
        public string? GitHubPrUrl { get; set; }
        public string? GitHubPrTitle { get; set; }
        public bool? GitHubPrIsMerged { get; set; }

        public DateTime? DueDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Clean relational fields (avoids JSON circular reference crashes)
        public int ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;

        public int? AssignedUserId { get; set; }
        public string? AssignedUserEmail { get; set; }
        public string? AssignedUserFullName { get; set; }
        public string? AssignedUserGitHubUsername { get; set; }
    }
}
