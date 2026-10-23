using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.Models
{
    public class RefreshSession
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        [Required]
        [MaxLength(500)]
        public string TokenHash { get; set; } = string.Empty;

        [MaxLength(256)]
        public string? DeviceInfo { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAtUtc { get; set; }
        public DateTime? RevokedAtUtc { get; set; }
        public string? ReplacedByTokenHash { get; set; }

        public bool IsActive => RevokedAtUtc == null && DateTime.UtcNow < ExpiresAtUtc;
    }
}

