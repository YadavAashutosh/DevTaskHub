using Microsoft.EntityFrameworkCore;
using DevTaskHub.Web.Data;
using DevTaskHub.Web.DTOs.Tasks;
using DevTaskHub.Web.Models;

namespace DevTaskHub.Web.Services
{
    public class TaskService : ITaskService
    {
        private readonly AppDbContext _context;

        public TaskService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<TaskDto>> GetAllTasksAsync()
        {
            return await _context.Tasks
                .Include(t => t.Project)
                .Include(t => t.AssignedUser)
                .AsNoTracking()
                .Select(t => new TaskDto
                {
                    Id = t.Id,
                    Title = t.Title,
                    Description = t.Description,
                    Status = t.Status,
                    Priority = t.Priority,
                    GitHubPrNumber = t.GitHubPrNumber,
                    DueDate = t.DueDate,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt,
                    ProjectId = t.ProjectId,
                    ProjectName = t.Project != null ? t.Project.Name : "Unassigned",
                    AssignedUserId = t.AssignedUserId,
                    AssignedUserEmail = t.AssignedUser != null ? t.AssignedUser.Email : null
                })
                .ToListAsync();
        }

        public async Task<TaskDto?> GetTaskByIdAsync(int id)
        {
            var task = await _context.Tasks
                .Include(t => t.Project)
                .Include(t => t.AssignedUser)
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id);

            if (task == null) return null;

            return new TaskDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                Status = task.Status,
                Priority = task.Priority,
                GitHubPrNumber = task.GitHubPrNumber,
                DueDate = task.DueDate,
                CreatedAt = task.CreatedAt,
                UpdatedAt = task.UpdatedAt,
                ProjectId = task.ProjectId,
                ProjectName = task.Project != null ? task.Project.Name : "Unassigned",
                AssignedUserId = task.AssignedUserId,
                AssignedUserEmail = task.AssignedUser != null ? task.AssignedUser.Email : null
            };
        }

        public async Task<TaskDto> CreateTaskAsync(CreateTaskDto dto)
        {
            var taskEntity = new TaskItem
            {
                Title = dto.Title,
                Description = dto.Description,
                Status = dto.Status,
                Priority = dto.Priority,
                GitHubPrNumber = dto.GitHubPrNumber,
                DueDate = dto.DueDate,
                ProjectId = dto.ProjectId,
                AssignedUserId = dto.AssignedUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Tasks.Add(taskEntity);
            await _context.SaveChangesAsync();

            return await GetTaskByIdAsync(taskEntity.Id) ?? new TaskDto { Id = taskEntity.Id, Title = taskEntity.Title };
        }

        public async Task<TaskDto?> UpdateTaskAsync(int id, UpdateTaskDto dto)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null) return null;

            task.Title = dto.Title;
            task.Description = dto.Description;
            task.Status = dto.Status;
            task.Priority = dto.Priority;
            task.GitHubPrNumber = dto.GitHubPrNumber;
            task.DueDate = dto.DueDate;
            task.AssignedUserId = dto.AssignedUserId;
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetTaskByIdAsync(id);
        }

        public async Task<bool> DeleteTaskAsync(int id)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null) return false;

            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}