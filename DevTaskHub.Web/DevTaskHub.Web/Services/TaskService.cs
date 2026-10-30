using DevTaskHub.Web.Data;
using DevTaskHub.Web.DTOs.Common;
using DevTaskHub.Web.DTOs.Tasks;
using DevTaskHub.Web.Models;
using Microsoft.EntityFrameworkCore;

namespace DevTaskHub.Web.Services
{
    public class TaskService : ITaskService
    {
        private readonly AppDbContext _context;

        public TaskService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResponse<TaskDto>> GetTasksAsync(TaskQueryParameters parameters)
        {
            // 1. Base Query with Relational Joins & Soft Delete Filter
            var query = _context.Tasks
                .Include(t => t.Project)
                .Include(t => t.AssignedUser)
                .Include(t => t.PullRequests)
                .Where(t => t.DeletedAtUtc == null)
                .AsNoTracking();

            // 2. Filtering by ProjectId
            if (parameters.ProjectId.HasValue)
            {
                query = query.Where(t => t.ProjectId == parameters.ProjectId.Value);
            }

            // 3. Filtering by Assigned Developer
            if (parameters.AssignedUserId.HasValue)
            {
                query = query.Where(t => t.AssignedUserId == parameters.AssignedUserId.Value);
            }

            // 4. Filtering by Status
            if (!string.IsNullOrWhiteSpace(parameters.Status))
            {
                query = query.Where(t => t.Status.ToLower() == parameters.Status.Trim().ToLower());
            }

            // 5. Filtering by Priority
            if (!string.IsNullOrWhiteSpace(parameters.Priority))
            {
                query = query.Where(t => t.Priority.ToLower() == parameters.Priority.Trim().ToLower());
            }

            // 6. Free-Text Search across Title and Description
            if (!string.IsNullOrWhiteSpace(parameters.SearchTerm))
            {
                var term = parameters.SearchTerm.Trim().ToLower();
                query = query.Where(t => t.Title.ToLower().Contains(term) ||
                                         (t.Description != null && t.Description.ToLower().Contains(term)));
            }

            // Compute Total Records before Pagination
            var totalRecords = await query.CountAsync();

            // Dynamic Sorting
            query = (parameters.SortBy?.ToLower(), parameters.IsAscending) switch
            {
                ("title", true) => query.OrderBy(t => t.Title),
                ("title", false) => query.OrderByDescending(t => t.Title),
                ("priority", true) => query.OrderBy(t => t.Priority),
                ("priority", false) => query.OrderByDescending(t => t.Priority),
                ("status", true) => query.OrderBy(t => t.Status),
                ("status", false) => query.OrderByDescending(t => t.Status),
                ("createdat", true) => query.OrderBy(t => t.CreatedAt),
                _ => query.OrderByDescending(t => t.CreatedAt)
            };

            // Server-Side Pagination (Skip & Take)
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
                    GitHubPrStatus = t.PullRequests.OrderByDescending(p => p.LastSyncedAtUtc).Select(p => p.State).FirstOrDefault(),
                    GitHubPrUrl = t.PullRequests.OrderByDescending(p => p.LastSyncedAtUtc).Select(p => p.PullRequestUrl).FirstOrDefault(),
                    GitHubPrTitle = t.PullRequests.OrderByDescending(p => p.LastSyncedAtUtc).Select(p => p.Title).FirstOrDefault(),
                    GitHubPrIsMerged = t.PullRequests.OrderByDescending(p => p.LastSyncedAtUtc).Select(p => (bool?)p.IsMerged).FirstOrDefault(),
                    DueDate = t.DueDate,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt,
                    ProjectId = t.ProjectId,
                    ProjectName = t.Project != null ? t.Project.Name : "Unassigned",
                    AssignedUserId = t.AssignedUserId,
                    AssignedUserEmail = t.AssignedUser != null ? t.AssignedUser.Email : null,
                    AssignedUserFullName = t.AssignedUser != null ? t.AssignedUser.FullName : null,
                    AssignedUserGitHubUsername = t.AssignedUser != null ? t.AssignedUser.GitHubUsername : null
                })
                .ToListAsync();

            return new PagedResponse<TaskDto>(tasks, parameters.PageNumber, parameters.PageSize, totalRecords);
        }

        public async Task<IEnumerable<TaskDto>> GetAllTasksAsync()
        {
            return await _context.Tasks
                .Include(t => t.Project)
                .Include(t => t.AssignedUser)
                .Include(t => t.PullRequests)
                .AsNoTracking()
                .Select(t => new TaskDto
                {
                    Id = t.Id,
                    Title = t.Title,
                    Description = t.Description,
                    Status = t.Status,
                    Priority = t.Priority,
                    GitHubPrNumber = t.GitHubPrNumber,
                    GitHubPrStatus = t.PullRequests.OrderByDescending(p => p.LastSyncedAtUtc).Select(p => p.State).FirstOrDefault(),
                    GitHubPrUrl = t.PullRequests.OrderByDescending(p => p.LastSyncedAtUtc).Select(p => p.PullRequestUrl).FirstOrDefault(),
                    GitHubPrTitle = t.PullRequests.OrderByDescending(p => p.LastSyncedAtUtc).Select(p => p.Title).FirstOrDefault(),
                    GitHubPrIsMerged = t.PullRequests.OrderByDescending(p => p.LastSyncedAtUtc).Select(p => (bool?)p.IsMerged).FirstOrDefault(),
                    DueDate = t.DueDate,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt,
                    ProjectId = t.ProjectId,
                    ProjectName = t.Project != null ? t.Project.Name : "Unassigned",
                    AssignedUserId = t.AssignedUserId,
                    AssignedUserEmail = t.AssignedUser != null ? t.AssignedUser.Email : null,
                    AssignedUserFullName = t.AssignedUser != null ? t.AssignedUser.FullName : null,
                    AssignedUserGitHubUsername = t.AssignedUser != null ? t.AssignedUser.GitHubUsername : null
                })
                .ToListAsync();
        }

        public async Task<TaskDto?> GetTaskByIdAsync(int id)
        {
            var task = await _context.Tasks
                .Include(t => t.Project)
                .Include(t => t.AssignedUser)
                .Include(t => t.PullRequests)
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id);

            if (task == null) return null;

            var latestPr = task.PullRequests.OrderByDescending(p => p.LastSyncedAtUtc).FirstOrDefault();

            return new TaskDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                Status = task.Status,
                Priority = task.Priority,
                GitHubPrNumber = task.GitHubPrNumber,
                GitHubPrStatus = latestPr?.State,
                GitHubPrUrl = latestPr?.PullRequestUrl,
                GitHubPrTitle = latestPr?.Title,
                GitHubPrIsMerged = latestPr?.IsMerged,
                DueDate = task.DueDate,
                CreatedAt = task.CreatedAt,
                UpdatedAt = task.UpdatedAt,
                ProjectId = task.ProjectId,
                ProjectName = task.Project != null ? task.Project.Name : "Unassigned",
                AssignedUserId = task.AssignedUserId,
                AssignedUserEmail = task.AssignedUser != null ? task.AssignedUser.Email : null,
                AssignedUserFullName = task.AssignedUser != null ? task.AssignedUser.FullName : null,
                AssignedUserGitHubUsername = task.AssignedUser != null ? task.AssignedUser.GitHubUsername : null
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

            // Record initial creation in history
            try
            {
                _context.TaskStatusHistories.Add(new TaskStatusHistory
                {
                    TaskId = taskEntity.Id,
                    OldStatus = "None",
                    NewStatus = taskEntity.Status,
                    ChangeReason = "Task Created",
                    ChangedAtUtc = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }
            catch (Exception)
            {
                // Non-blocking history record
            }

            // Record initial PR in TaskPullRequests if provided
            if (dto.GitHubPrNumber.HasValue && dto.GitHubPrNumber.Value > 0)
            {
                try
                {
                    _context.TaskPullRequests.Add(new TaskPullRequest
                    {
                        TaskId = taskEntity.Id,
                        PullRequestNumber = dto.GitHubPrNumber.Value,
                        PullRequestUrl = $"https://github.com/YadavAashutosh/DevTaskHub/pull/{dto.GitHubPrNumber.Value}",
                        Title = $"Pull Request #{dto.GitHubPrNumber.Value}",
                        State = "open",
                        IsMerged = false,
                        LastSyncedAtUtc = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync();
                }
                catch (Exception)
                {
                    // Non-blocking PR association
                }
            }

            return await GetTaskByIdAsync(taskEntity.Id) ?? new TaskDto { Id = taskEntity.Id, Title = taskEntity.Title };
        }

        public async Task<TaskDto?> UpdateTaskAsync(int id, UpdateTaskDto dto)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null) return null;

            // Track status transition in dbo.TaskStatusHistories
            if (!string.Equals(task.Status, dto.Status, StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    _context.TaskStatusHistories.Add(new TaskStatusHistory
                    {
                        TaskId = task.Id,
                        OldStatus = task.Status,
                        NewStatus = dto.Status,
                        ChangeReason = "Status Updated",
                        ChangedAtUtc = DateTime.UtcNow
                    });
                }
                catch (Exception)
                {
                    // Non-blocking status history audit
                }
            }

            if (string.Equals(dto.Status, "Done", StringComparison.OrdinalIgnoreCase))
            {
                task.CompletedAtUtc = DateTime.UtcNow;
            }
            else
            {
                task.CompletedAtUtc = null;
            }

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

        public async Task<List<TaskStatusHistoryDto>> GetTaskHistoryAsync(int taskId)
        {
            return await _context.TaskStatusHistories
                .Where(h => h.TaskId == taskId)
                .Include(h => h.ChangedByUser)
                .OrderByDescending(h => h.ChangedAtUtc)
                .Select(h => new TaskStatusHistoryDto
                {
                    Id = h.Id,
                    TaskId = h.TaskId,
                    OldStatus = h.OldStatus,
                    NewStatus = h.NewStatus,
                    ChangedByName = h.ChangedByUser != null ? (h.ChangedByUser.FullName ?? h.ChangedByUser.Email) : "System",
                    ChangeReason = h.ChangeReason,
                    ChangedAtUtc = h.ChangedAtUtc
                })
                .ToListAsync();
        }
    }
}
