using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.Models
{
    public class Project
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(20)]
        public string ProjectKey { get; set; } = "DTH"; // e.g. DTH-101

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public int? OwnerUserId { get; set; }
        public User? OwnerUser { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Active"; // Active, Archived, Completed

        [MaxLength(100)]
        public string? GitHubRepoOwner { get; set; }

        [MaxLength(100)]
        public string? GitHubRepoName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAtUtc { get; set; }
        public DateTime? DeletedAtUtc { get; set; }

        [Timestamp]
        public byte[]? RowVersion { get; set; }

        // Navigation properties
        public List<TaskItem> Tasks { get; set; } = new();
        public List<ProjectMember> Members { get; set; } = new();
    }
}
