using DevTaskHub.Web.DTOs.Common;
using DevTaskHub.Web.DTOs.Tasks;
using DevTaskHub.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DevTaskHub.Web.Controllers.Api
{
    [ApiController]
    [Route("api/tasks")]
    [Produces("application/json")]
    [Authorize] // 🛡️ LOCKDOWN: Saari tasks APIs ab JWT Bearer authenticated users ke liye locked hain!
    public class TasksApiController : ControllerBase
    {
        private readonly ITaskService _taskService;
        private readonly ILogger<TasksApiController> _logger;

        public TasksApiController(ITaskService taskService, ILogger<TasksApiController> logger)
        {
            _taskService = taskService;
            _logger = logger;
        }

        /// <summary>
        /// Retrieves paginated, sorted, and filtered tasks using server-side deferred execution.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(PagedResponse<TaskDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetTasks([FromQuery] TaskQueryParameters queryParameters)
        {
            var pagedTasks = await _taskService.GetTasksAsync(queryParameters);
            return Ok(pagedTasks);
        }

        /// <summary>
        /// Retrieves a specific task record by its unique database identifier.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(TaskDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetTaskById(int id)
        {
            var task = await _taskService.GetTaskByIdAsync(id);
            if (task == null)
            {
                return NotFound(new { message = $"Task with ID {id} was not found." });
            }
            return Ok(task);
        }

        /// <summary>
        /// Creates a new task in the relational database.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(TaskDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateTask([FromBody] CreateTaskDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                return BadRequest(new { message = $"Validation failed: {errors}" });
            }

            var createdTask = await _taskService.CreateTaskAsync(dto);
            return CreatedAtAction(nameof(GetTaskById), new { id = createdTask.Id }, createdTask);
        }

        /// <summary>
        /// Updates an existing task's lifecycle status or attributes.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(TaskDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateTask(int id, [FromBody] UpdateTaskDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                _logger.LogWarning("UpdateTask validation failed for Task {Id}: {Errors}", id, errors);
                return BadRequest(new { message = $"Validation failed: {errors}" });
            }

            try
            {
                var updatedTask = await _taskService.UpdateTaskAsync(id, dto);
                if (updatedTask == null)
                {
                    return NotFound(new { message = $"Cannot update task. Task with ID {id} was not found." });
                }

                return Ok(updatedTask);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while updating Task {Id}", id);
                return StatusCode(500, new { message = $"An error occurred while updating the task: {ex.Message}" });
            }
        }

        /// <summary>
        /// Deletes a task from the system permanently.
        /// 🛡️ RBAC RESTRICTION: Sirf 'Admin' role users hi task delete kar sakte hain!
        /// </summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteTask(int id)
        {
            var isDeleted = await _taskService.DeleteTaskAsync(id);
            if (!isDeleted)
            {
                return NotFound(new { message = $"Cannot delete task. Task with ID {id} was not found." });
            }

            return NoContent();
        }

        /// <summary>
        /// Retrieves the complete status transition history for a task (dbo.TaskStatusHistories).
        /// </summary>
        [HttpGet("{id:int}/history")]
        [ProducesResponseType(typeof(List<TaskStatusHistoryDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetTaskHistory(int id)
        {
            var history = await _taskService.GetTaskHistoryAsync(id);
            return Ok(history);
        }
    }
}
