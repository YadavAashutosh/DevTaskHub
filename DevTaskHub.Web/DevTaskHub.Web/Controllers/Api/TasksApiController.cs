using Microsoft.AspNetCore.Mvc;
using DevTaskHub.Web.DTOs.Common;
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

        // GET: /api/tasks?pageNumber=1&pageSize=10&status=Done&sortBy=createdAt&isAscending=false
        [HttpGet]
        public async Task<ActionResult<PagedResponse<TaskDto>>> GetTasks([FromQuery] TaskQueryParameters parameters)
        {
            var result = await _taskService.GetTasksAsync(parameters);
            return Ok(result);
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

            return NoContent();
        }
    }
}