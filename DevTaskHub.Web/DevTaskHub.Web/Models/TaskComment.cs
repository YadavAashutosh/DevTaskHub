using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.Models
{
    public class TaskComment
    {
        public int Id { get; set; }

        public int TaskId { get; set; }
        public TaskItem Task { get; set; } = null!;

        public int AuthorUserId { get; set; }
        public User AuthorUser { get; set; } = null!;

        [Required]
        [MaxLength(4000)]
        public string Body { get; set; } = string.Empty;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAtUtc { get; set; }
        public DateTime? DeletedAtUtc { get; set; }
    }
}

