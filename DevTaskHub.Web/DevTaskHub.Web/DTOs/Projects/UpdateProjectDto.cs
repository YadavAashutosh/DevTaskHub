using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.DTOs.Projects
{
    public class UpdateProjectDto
    {
        [Required(ErrorMessage = "Project name is required.")]
        [MaxLength(150, ErrorMessage = "Project name cannot exceed 150 characters.")]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500, ErrorMessage = "Description cannot exceed 500 characters.")]
        public string? Description { get; set; }

        [MaxLength(50)]
        public string? Status { get; set; } // Active, Archived, Completed

        [MaxLength(100)]
        public string? GitHubRepoOwner { get; set; }

        [MaxLength(100)]
        public string? GitHubRepoName { get; set; }
    }
}

