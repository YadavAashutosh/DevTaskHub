namespace DevTaskHub.Web.DTOs.Tasks
{
    public class TaskStatusHistoryDto
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public string OldStatus { get; set; } = string.Empty;
        public string NewStatus { get; set; } = string.Empty;
        public string ChangedByName { get; set; } = string.Empty;
        public string? ChangeReason { get; set; }
        public DateTime ChangedAtUtc { get; set; }
    }
}

