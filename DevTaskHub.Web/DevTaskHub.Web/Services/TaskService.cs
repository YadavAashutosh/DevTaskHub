using Microsoft.EntityFrameworkCore;
using DevTaskHub.Web.Data;
using DevTaskHub.Web.DTOs.Common;
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

        // Production-Grade Deferred IQueryable Pipeline
        public async Task<PagedResponse<TaskDto>> GetTasksAsync(TaskQueryParameters parameters)
        {
            var query = _context.Tasks
                .Include(t => t.Project)
                .Include(t => t.AssignedUser)
                .AsNoTracking()
                .AsQueryable();

            // 1. Keyword Search (Title or Description)
            if (!string.IsNullOrWhiteSpace(parameters.SearchTerm))
            {
                var search = parameters.SearchTerm.Trim().ToLower();
                query = query.Where(t => t.Title.ToLower().Contains(search) ||
                                         (t.Description != null && t.Description.ToLower().Contains(search)));
            }

            // 2. Filter by Status
            if (!string.IsNullOrWhiteSpace(parameters.Status))
            {
                query = query.Where(t => t.Status == parameters.Status);
            }

            // 3. Filter by Priority
            if (!string.IsNullOrWhiteSpace(parameters.Priority))
            {
                query = query.Where(t => t.Priority == parameters.Priority);
            }

            // 4. Filter by ProjectId
            if (parameters.ProjectId.HasValue)
            {
                query = query.Where(t => t.ProjectId == parameters.ProjectId.Value);
            }

            // 5. Filter by AssignedUserId
            if (parameters.AssignedUserId.HasValue)
            {
                query = query.Where(t => t.AssignedUserId == parameters.AssignedUserId.Value);
            }

            // Total count of matching records (before pagination)
            var totalRecords = await query.CountAsync();

            // 6. Dynamic Column Sorting
            query = parameters.SortBy?.ToLower() switch
            {
                "title" => parameters.IsAscending ? query.OrderBy(t => t.Title) : query.OrderByDescending(t => t.Title),
                "priority" => parameters.IsAscending ? query.OrderBy(t => t.Priority) : query.OrderByDescending(t => t.Priority),
                "status" => parameters.IsAscending ? query.OrderBy(t => t.Status) : query.OrderByDescending(t => t.Status),
                "duedate" => parameters.IsAscending ? query.OrderBy(t => t.DueDate) : query.OrderByDescending(t => t.DueDate),
                _ => parameters.IsAscending ? query.OrderBy(t => t.CreatedAt) : query.OrderByDescending(t => t.CreatedAt)
            };

            // 7. Server-Side Pagination (Skip & Take)
            var tasks = await query
                .Skip((parameters.PageNumber - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
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

            return new PagedResponse<TaskDto>(tasks, parameters.PageNumber, parameters.PageSize, totalRecords);
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