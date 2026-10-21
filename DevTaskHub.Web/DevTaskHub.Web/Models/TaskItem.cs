using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.Models
{
    public class TaskItem
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Todo"; // "Todo", "InProgress", "Done"

        [Required]
        [MaxLength(50)]
        public string Priority { get; set; } = "Medium"; // "Low", "Medium", "High"

        public int? GitHubPrNumber { get; set; } // For Day 7 Live GitHub PR Sync

        public DateTime? DueDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Foreign Key: Project
        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        // Foreign Key: Assigned Developer (Nullable)
        public int? AssignedUserId { get; set; }
        public User? AssignedUser { get; set; }
    }
}