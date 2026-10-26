using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.Models
{
    public class TaskItem
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? Description { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Todo"; // Todo, InProgress, InReview, Done, Blocked

        [Required]
        [MaxLength(50)]
        public string Priority { get; set; } = "Medium"; // Low, Medium, High, Critical

        public int? GitHubPrNumber { get; set; }

        public DateTime? DueDate { get; set; }
        public DateTime? CompletedAtUtc { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeletedAtUtc { get; set; }

        [Timestamp]
        public byte[]? RowVersion { get; set; }

        // Foreign Key: Project
        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        // Foreign Key: Assigned Developer
        public int? AssignedUserId { get; set; }
        public User? AssignedUser { get; set; }

        // Foreign Key: Creator User
        public int? CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }

        // Navigation properties
        public List<TaskStatusHistory> StatusHistory { get; set; } = new();
        public List<TaskComment> Comments { get; set; } = new();
        public List<TaskLabel> TaskLabels { get; set; } = new();
        public List<TaskPullRequest> PullRequests { get; set; } = new();
    }
}
