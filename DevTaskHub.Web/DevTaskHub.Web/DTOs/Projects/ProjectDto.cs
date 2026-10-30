namespace DevTaskHub.Web.DTOs.Projects
{
    public class ProjectDto
    {
        public int Id { get; set; }
        public string ProjectKey { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = "Active";
        public string? GitHubRepoOwner { get; set; }
        public string? GitHubRepoName { get; set; }
        public DateTime CreatedAt { get; set; }
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int TotalMembers { get; set; }
    }
}
