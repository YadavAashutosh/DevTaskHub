using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.Models
{
    public class AuditLog
    {
        public int Id { get; set; }

        public int? ActorUserId { get; set; }
        public User? ActorUser { get; set; }

        [Required]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty; // "Create", "Update", "Delete", "Login"

        [Required]
        [MaxLength(100)]
        public string EntityType { get; set; } = string.Empty; // "Task", "Project", "User"

        public int? EntityId { get; set; }

        public string? OldValuesJson { get; set; }
        public string? NewValuesJson { get; set; }

        public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
    }
}

