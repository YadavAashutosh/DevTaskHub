using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.DTOs.Auth
{
    /// <summary>
    /// Input contract for corporate authentication requests.
    /// </summary>
    public class LoginRequestDto
    {
        [Required(ErrorMessage = "Email address is required.")]
        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        public string Password { get; set; } = string.Empty;
    }
}