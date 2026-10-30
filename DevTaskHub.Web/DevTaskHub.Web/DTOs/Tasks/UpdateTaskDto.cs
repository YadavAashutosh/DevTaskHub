using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.DTOs.Tasks
{
    public class UpdateTaskDto
    {
        [Required(ErrorMessage = "Title is required.")]
        [StringLength(150, MinimumLength = 1, ErrorMessage = "Title must be between 1 and 150 characters.")]
        public string Title { get; set; } = string.Empty;

        [StringLength(2000)]
        public string? Description { get; set; }

        [Required]
        public string Status { get; set; } = "Todo";

        [Required]
        public string Priority { get; set; } = "Medium";

        public int? GitHubPrNumber { get; set; }

        public DateTime? DueDate { get; set; }

        public int? AssignedUserId { get; set; }
    }
}
