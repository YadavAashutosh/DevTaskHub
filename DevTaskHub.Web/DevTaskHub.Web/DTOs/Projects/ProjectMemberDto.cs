using System;

namespace DevTaskHub.Web.DTOs.Projects
{
    public class ProjectMemberDto
    {
        public int ProjectId { get; set; }
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string ProjectRole { get; set; } = string.Empty;
        public string? GitHubUsername { get; set; }
        public DateTime JoinedAtUtc { get; set; }
    }
}

