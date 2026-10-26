using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(120)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(300)]
        public string PasswordHash { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? FullName { get; set; }

        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = "Developer"; // Default role

        [MaxLength(100)]
        public string? GitHubUsername { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAtUtc { get; set; }

        public DateTime? DeletedAtUtc { get; set; }

        [Timestamp]
        public byte[]? RowVersion { get; set; }

        // Navigation properties
        public List<TaskItem> AssignedTasks { get; set; } = new();
        public List<RefreshSession> RefreshSessions { get; set; } = new();
        public List<UserRole> UserRoles { get; set; } = new();
        public List<ProjectMember> ProjectMemberships { get; set; } = new();
    }
}
