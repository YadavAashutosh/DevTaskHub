using System;

namespace DevTaskHub.Web.Models
{
    public class TaskAssignee
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public TaskItem? Task { get; set; }
        public int UserId { get; set; }
        public User? User { get; set; }
        public DateTime AssignedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
