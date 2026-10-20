using System.ComponentModel.DataAnnotations;
namespace DevTaskHub.Web.Models
{
    public class CreateTaskViewModel
    {
        [Required(ErrorMessage = "Task title is required.")]
        [StringLength(100, MinimumLength = 3, ErrorMessage = "Title must be between 3 and 100 characters.")]
        public string Title { get; set; } = string.Empty;
        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters.")]
        public string? Description { get; set; }
        [Required(ErrorMessage = "Please select a status.")]
        public string Status { get; set; } = "Todo"; // Default 'Todo'
        [Required(ErrorMessage = "Please select a priority.")]
        public string Priority { get; set; } = "Medium"; // Default 'Medium'

        [Range(1, int.MaxValue, ErrorMessage = "GitHub PR number must be a valid positive number.")]
        [Display(Name = "GitHub PR # (Optional)")]
        public int? GitHubPrNumber { get; set; }
        [Required(ErrorMessage = "Please select a project.")]
        [Display(Name = "Project")]
        public int ProjectId { get; set; }
    }
}
