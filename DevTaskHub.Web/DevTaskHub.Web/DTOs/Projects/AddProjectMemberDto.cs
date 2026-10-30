using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.DTOs.Projects
{
    public class AddProjectMemberDto
    {
        [Required(ErrorMessage = "UserId is required.")]
        public int UserId { get; set; }

        [Required(ErrorMessage = "ProjectRole is required.")]
        [MaxLength(50)]
        public string ProjectRole { get; set; } = "Developer"; // "Lead", "Developer", "Contributor", "QA", "Viewer"
    }
}

