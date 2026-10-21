using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.DTOs.Tasks
{
    public class CreateTaskDto
    {
        [Required(ErrorMessage = "Title is required.")]
        [StringLength(150, MinimumLength = 3, ErrorMessage = "Title must be between 3 and 150 characters.")]
        public string Title { get; set; } = string.Empty;

        [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters.")]
        public string? Description { get; set; }

        [Required(ErrorMessage = "Status is required.")]
        public string Status { get; set; } = "Todo";

        [Required(ErrorMessage = "Priority is required.")]
        public string Priority { get; set; } = "Medium";

        [Range(1, int.MaxValue, ErrorMessage = "GitHub PR number must be a positive number.")]
        public int? GitHubPrNumber { get; set; }

        public DateTime? DueDate { get; set; }

        [Required(ErrorMessage = "ProjectId is required.")]
        public int ProjectId { get; set; }

        public int? AssignedUserId { get; set; }
    }
}