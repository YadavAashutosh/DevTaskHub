namespace DevTaskHub.Web.DTOs.Tasks
{
    public class TaskQueryParameters
    {
        private const int MaxPageSize = 50;
        private int _pageSize = 10;

        // Pagination
        public int PageNumber { get; set; } = 1;

        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = (value > MaxPageSize) ? MaxPageSize : (value < 1 ? 1 : value);
        }

        // Filtering & Search
        public string? SearchTerm { get; set; }
        public string? Status { get; set; }     // "Todo", "InProgress", "Done"
        public string? Priority { get; set; }   // "Low", "Medium", "High"
        public int? ProjectId { get; set; }
        public int? AssignedUserId { get; set; }

        // Sorting
        public string? SortBy { get; set; } = "createdAt"; // "title", "priority", "status", "dueDate", "createdAt"
        public bool IsAscending { get; set; } = false;      // Default newest first
    }
}