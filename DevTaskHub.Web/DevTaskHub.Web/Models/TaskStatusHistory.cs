using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.Models
{
    public class TaskStatusHistory
    {
        public int Id { get; set; }

        public int TaskId { get; set; }
        public TaskItem Task { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string OldStatus { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string NewStatus { get; set; } = string.Empty;

        public int? ChangedByUserId { get; set; }
        public User? ChangedByUser { get; set; }

        [MaxLength(500)]
        public string? ChangeReason { get; set; }

        public DateTime ChangedAtUtc { get; set; } = DateTime.UtcNow;
    }
}

