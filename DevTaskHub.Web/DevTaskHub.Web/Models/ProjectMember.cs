using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.Models
{
    public class ProjectMember
    {
        public int ProjectId { get; set; }
        public Project Project { get; set; } = null!;

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string ProjectRole { get; set; } = "Contributor"; // "Manager", "Contributor", "Viewer"

        public DateTime JoinedAtUtc { get; set; } = DateTime.UtcNow;
    }
}

