using Microsoft.AspNetCore.Mvc;
using DevTaskHub.Web.DTOs.Tasks;
using DevTaskHub.Web.Services;

namespace DevTaskHub.Web.Controllers.Api
{
    [ApiController]
    [Route("api/tasks")]
    public class TasksApiController : ControllerBase
    {
        private readonly ITaskService _taskService;

        public TasksApiController(ITaskService taskService)
        {
            _taskService = taskService;
        }

        // GET: /api/tasks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskDto>>> GetAllTasks()
        {
            var tasks = await _taskService.GetAllTasksAsync();
            return Ok(tasks);
        }

        // GET: /api/tasks/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<TaskDto>> GetTaskById(int id)
        {
            var task = await _taskService.GetTaskByIdAsync(id);
            if (task == null)
            {
                return NotFound(new { message = $"Task with ID {id} not found." });
            }

            return Ok(task);
        }

        // POST: /api/tasks
        [HttpPost]
        public async Task<ActionResult<TaskDto>> CreateTask([FromBody] CreateTaskDto dto)
        {
            var createdTask = await _taskService.CreateTaskAsync(dto);

            // Returns 201 Created with Location header pointing to GET /api/tasks/{id}
            return CreatedAtAction(nameof(GetTaskById), new { id = createdTask.Id }, createdTask);
        }

        // PUT: /api/tasks/{id}
        [HttpPut("{id:int}")]
        public async Task<ActionResult<TaskDto>> UpdateTask(int id, [FromBody] UpdateTaskDto dto)
        {
            var updatedTask = await _taskService.UpdateTaskAsync(id, dto);
            if (updatedTask == null)
            {
                return NotFound(new { message = $"Task with ID {id} not found." });
            }

            return Ok(updatedTask);
        }

        // DELETE: /api/tasks/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteTask(int id)
        {
            var deleted = await _taskService.DeleteTaskAsync(id);
            if (!deleted)
            {
                return NotFound(new { message = $"Task with ID {id} not found." });
            }

            return NoContent(); // 204 No Content
        }
    }
}