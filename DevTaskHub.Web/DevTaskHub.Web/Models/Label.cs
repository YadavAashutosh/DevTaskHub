using System.ComponentModel.DataAnnotations;

namespace DevTaskHub.Web.Models
{
    public class Label
    {
        public int Id { get; set; }

        public int ProjectId { get; set; }
        public Project Project { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty; // "Bug", "Feature", "Security"

        [MaxLength(20)]
        public string Color { get; set; } = "#6c757d"; // Hex color

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public List<TaskLabel> TaskLabels { get; set; } = new();
    }

    public class TaskLabel
    {
        public int TaskId { get; set; }
        public TaskItem Task { get; set; } = null!;

        public int LabelId { get; set; }
        public Label Label { get; set; } = null!;

        public DateTime AddedAtUtc { get; set; } = DateTime.UtcNow;
    }
}

