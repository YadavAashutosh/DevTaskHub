using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.DTOs.GitHub
{
    /// <summary>
    /// Payload contract for linking a GitHub Pull Request to a sprint task.
    /// </summary>
    public class LinkPullRequestDto
    {
        [Required(ErrorMessage = "Pull Request number is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "PR number must be a positive integer.")]
        public int PullRequestNumber { get; set; }

        [MaxLength(500)]
        public string? PullRequestUrl { get; set; }

        [MaxLength(100)]
        public string? Owner { get; set; }

        [MaxLength(100)]
        public string? Repo { get; set; }
    }
}