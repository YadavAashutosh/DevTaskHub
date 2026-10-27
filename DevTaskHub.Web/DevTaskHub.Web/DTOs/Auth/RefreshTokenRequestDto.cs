using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.DTOs.Auth
{
    /// <summary>
    /// Payload required to exchange an expired JWT access token for a fresh token pair.
    /// </summary>
    public class RefreshTokenRequestDto
    {
        [Required(ErrorMessage = "RefreshToken is required.")]
        public string RefreshToken { get; set; } = string.Empty;
    }
}

