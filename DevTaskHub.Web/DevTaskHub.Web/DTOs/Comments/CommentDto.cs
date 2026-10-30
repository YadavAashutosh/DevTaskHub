namespace DevTaskHub.Web.DTOs.Comments
{
    public class CommentDto
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public int AuthorUserId { get; set; }
        public string AuthorName { get; set; } = string.Empty;
        public string? AuthorEmail { get; set; }
        public string? AuthorGitHubUsername { get; set; }
        public string Body { get; set; } = string.Empty;
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
    }

    public class CreateCommentDto
    {
        public string Body { get; set; } = string.Empty;
    }

    public class UpdateCommentDto
    {
        public string Body { get; set; } = string.Empty;
    }
}
