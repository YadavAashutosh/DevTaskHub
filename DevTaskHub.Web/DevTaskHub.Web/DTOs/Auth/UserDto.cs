using System;

namespace DevTaskHub.Web.DTOs.Auth
{
    /// <summary>
    /// Safe, sanitized User Data Contract returned to clients.
    /// Guarantees ZERO leakage of password hashes or internal security metadata.
    /// </summary>
    public class UserDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}