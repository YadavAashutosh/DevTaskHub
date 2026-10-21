using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.Models
{
    public class Project
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        // For GitHub PR Sync in Day 7
        [MaxLength(100)]
        public string? GitHubRepoOwner { get; set; }

        [MaxLength(100)]
        public string? GitHubRepoName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property: Tasks belonging to this project
        public List<TaskItem> Tasks { get; set; } = new();
    }
}