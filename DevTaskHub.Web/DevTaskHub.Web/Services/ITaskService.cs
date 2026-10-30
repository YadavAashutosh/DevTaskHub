using DevTaskHub.Web.DTOs.Common;
using DevTaskHub.Web.DTOs.Tasks;

namespace DevTaskHub.Web.Services
{
    public interface ITaskService
    {
        // Core Paginated & Filtered Query
        Task<PagedResponse<TaskDto>> GetTasksAsync(TaskQueryParameters parameters);

        Task<IEnumerable<TaskDto>> GetAllTasksAsync();
        Task<TaskDto?> GetTaskByIdAsync(int id);
        Task<TaskDto> CreateTaskAsync(CreateTaskDto dto);
        Task<TaskDto?> UpdateTaskAsync(int id, UpdateTaskDto dto);
        Task<bool> DeleteTaskAsync(int id);
        Task<List<TaskStatusHistoryDto>> GetTaskHistoryAsync(int taskId);
    }
}
