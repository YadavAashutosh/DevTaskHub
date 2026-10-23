using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.Models
{
    public class Role
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty; // "Admin", "Developer", "ProjectManager"

        [MaxLength(250)]
        public string? Description { get; set; }

        public List<UserRole> UserRoles { get; set; } = new();
    }
}

