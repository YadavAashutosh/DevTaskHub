using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.DTOs.Projects
{
    public class CreateProjectDto
    {
        [Required(ErrorMessage = "Project name is required.")]
        [MaxLength(150, ErrorMessage = "Project name cannot exceed 150 characters.")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Project key is required (e.g. DTH).")]
        [MaxLength(20, ErrorMessage = "Project key cannot exceed 20 characters.")]
        public string ProjectKey { get; set; } = "DTH";

        [MaxLength(500, ErrorMessage = "Description cannot exceed 500 characters.")]
        public string? Description { get; set; }

        [MaxLength(100)]
        public string? GitHubRepoOwner { get; set; }

        [MaxLength(100)]
        public string? GitHubRepoName { get; set; }
    }
}