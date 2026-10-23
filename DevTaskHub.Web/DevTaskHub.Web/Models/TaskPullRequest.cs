using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.Models
{
    public class TaskPullRequest
    {
        public int Id { get; set; }

        public int TaskId { get; set; }
        public TaskItem Task { get; set; } = null!;

        public int PullRequestNumber { get; set; }

        [Required]
        [MaxLength(500)]
        public string PullRequestUrl { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? Title { get; set; }

        [MaxLength(50)]
        public string State { get; set; } = "Open"; // Open, Closed, Merged

        public bool IsMerged { get; set; } = false;

        public DateTime LastSyncedAtUtc { get; set; } = DateTime.UtcNow;
    }
}

