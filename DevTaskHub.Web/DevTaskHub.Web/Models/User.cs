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

        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = "Developer"; // "Admin" or "Developer"

        [MaxLength(100)]
        public string? GitHubUsername { get; set; } // For GitHub Profile integration

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property: Tasks assigned to this user
        public List<TaskItem> AssignedTasks { get; set; } = new();
    }
}