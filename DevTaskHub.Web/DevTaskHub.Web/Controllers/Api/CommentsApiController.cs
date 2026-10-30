using System.Security.Claims;
using DevTaskHub.Web.Data;
using DevTaskHub.Web.DTOs.Comments;
using DevTaskHub.Web.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevTaskHub.Web.Controllers.Api
{
    [ApiController]
    [Route("api/tasks/{taskId:int}/comments")]
    [Authorize]
    public class CommentsApiController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<CommentsApiController> _logger;

        public CommentsApiController(AppDbContext context, ILogger<CommentsApiController> logger)
        {
            _context = context;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                           ?? User.FindFirst("sub")?.Value;

            if (int.TryParse(userIdClaim, out var parsedId))
            {
                return parsedId;
            }

            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
            if (!string.IsNullOrWhiteSpace(userEmail))
            {
                var u = _context.Users.FirstOrDefault(x => x.Email.ToLower() == userEmail.ToLower());
                if (u != null) return u.Id;
            }

            return 1;
        }

        [HttpGet]
        public async Task<IActionResult> GetComments(int taskId)
        {
            var comments = await _context.TaskComments
                .Where(c => c.TaskId == taskId && c.DeletedAtUtc == null)
                .Include(c => c.AuthorUser)
                .OrderBy(c => c.CreatedAtUtc)
                .Select(c => new CommentDto
                {
                    Id = c.Id,
                    TaskId = c.TaskId,
                    AuthorUserId = c.AuthorUserId,
                    AuthorName = c.AuthorUser.FullName ?? c.AuthorUser.Email,
                    AuthorEmail = c.AuthorUser.Email,
                    AuthorGitHubUsername = c.AuthorUser.GitHubUsername,
                    Body = c.Body,
                    CreatedAtUtc = c.CreatedAtUtc,
                    UpdatedAtUtc = c.UpdatedAtUtc
                })
                .ToListAsync();

            return Ok(comments);
        }

        [HttpPost]
        public async Task<IActionResult> AddComment(int taskId, [FromBody] CreateCommentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.Body))
            {
                return BadRequest(new { message = "Comment body cannot be empty." });
            }

            var taskExists = await _context.Tasks.AnyAsync(t => t.Id == taskId && t.DeletedAtUtc == null);
            if (!taskExists)
            {
                return NotFound(new { message = $"Task with ID {taskId} was not found." });
            }

            var authorUserId = GetCurrentUserId();

            var comment = new TaskComment
            {
                TaskId = taskId,
                AuthorUserId = authorUserId,
                Body = dto.Body.Trim(),
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.TaskComments.Add(comment);
            await _context.SaveChangesAsync();

            var author = await _context.Users.FindAsync(authorUserId);

            return CreatedAtAction(nameof(GetComments), new { taskId }, new CommentDto
            {
                Id = comment.Id,
                TaskId = comment.TaskId,
                AuthorUserId = comment.AuthorUserId,
                AuthorName = author?.FullName ?? author?.Email ?? "Developer",
                AuthorEmail = author?.Email,
                AuthorGitHubUsername = author?.GitHubUsername,
                Body = comment.Body,
                CreatedAtUtc = comment.CreatedAtUtc,
                UpdatedAtUtc = comment.UpdatedAtUtc
            });
        }

        [HttpPut("{commentId:int}")]
        public async Task<IActionResult> UpdateComment(int taskId, int commentId, [FromBody] UpdateCommentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.Body))
            {
                return BadRequest(new { message = "Comment body cannot be empty." });
            }

            var comment = await _context.TaskComments
                .Include(c => c.AuthorUser)
                .FirstOrDefaultAsync(c => c.Id == commentId && c.TaskId == taskId && c.DeletedAtUtc == null);

            if (comment == null)
            {
                return NotFound(new { message = $"Comment #{commentId} was not found on Task #{taskId}." });
            }

            var currentUserId = GetCurrentUserId();

            // Strict Ownership: Only the author who created the comment can edit it
            if (comment.AuthorUserId != currentUserId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You can only edit your own comments." });
            }

            comment.Body = dto.Body.Trim();
            comment.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new CommentDto
            {
                Id = comment.Id,
                TaskId = comment.TaskId,
                AuthorUserId = comment.AuthorUserId,
                AuthorName = comment.AuthorUser?.FullName ?? comment.AuthorUser?.Email ?? "Developer",
                AuthorEmail = comment.AuthorUser?.Email,
                AuthorGitHubUsername = comment.AuthorUser?.GitHubUsername,
                Body = comment.Body,
                CreatedAtUtc = comment.CreatedAtUtc,
                UpdatedAtUtc = comment.UpdatedAtUtc
            });
        }

        [HttpDelete("{commentId:int}")]
        public async Task<IActionResult> DeleteComment(int taskId, int commentId)
        {
            var comment = await _context.TaskComments
                .FirstOrDefaultAsync(c => c.Id == commentId && c.TaskId == taskId && c.DeletedAtUtc == null);

            if (comment == null)
            {
                return NotFound(new { message = $"Comment #{commentId} was not found on Task #{taskId}." });
            }

            var currentUserId = GetCurrentUserId();

            // Strict Ownership: Only the author who created the comment can delete it
            if (comment.AuthorUserId != currentUserId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You can only delete your own comments." });
            }

            // Audit-safe soft delete
            comment.DeletedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
