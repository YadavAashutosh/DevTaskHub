using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.DTOs.Auth
{
    /// <summary>
    /// Enterprise Registration Request Data Contract.
    /// Enforces strict input validation and NIST-compliant password complexity.
    /// Supports corporate role provisioning and developer identity linking.
    /// </summary>
    public class RegisterRequestDto
    {
        [Required(ErrorMessage = "Full name is required.")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Full name must be between 2 and 100 characters.")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Corporate or personal email is required.")]
        [EmailAddress(ErrorMessage = "Please provide a valid email address.")]
        [StringLength(256, ErrorMessage = "Email length cannot exceed 256 characters.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be between 8 and 100 characters.")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$",
            ErrorMessage = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).")]
        public string Password { get; set; } = string.Empty;

        [Compare("Password", ErrorMessage = "Passwords do not match.")]
        public string ConfirmPassword { get; set; } = string.Empty;

        /// <summary>
        /// Corporate system role: "Admin", "Developer", "ProjectManager" (Defaults to "Developer").
        /// </summary>
        [StringLength(50, ErrorMessage = "Role name cannot exceed 50 characters.")]
        public string Role { get; set; } = "Developer";

        /// <summary>
        /// Optional GitHub username for repository and pull request tracking.
        /// </summary>
        [StringLength(100, ErrorMessage = "GitHub username cannot exceed 100 characters.")]
        public string? GitHubUsername { get; set; }
    }
}
