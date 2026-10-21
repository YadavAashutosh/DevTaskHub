using Microsoft.AspNetCore.Mvc;
using DevTaskHub.Web.DTOs.Tasks;
using DevTaskHub.Web.Models;
using DevTaskHub.Web.Services;

namespace DevTaskHub.Web.Controllers
{
    public class TasksController : Controller
    {
        private readonly ITaskService _taskService;

        public TasksController(ITaskService taskService)
        {
            _taskService = taskService;
        }

        // GET: /Tasks
        public async Task<IActionResult> Index()
        {
            var tasks = await _taskService.GetAllTasksAsync();
            return View(tasks);
        }

        // GET: /Tasks/Create
        [HttpGet]
        public IActionResult Create()
        {
            var model = new CreateTaskViewModel();
            return View(model);
        }

        // POST: /Tasks/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(CreateTaskViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            // Map ViewModel to DTO and save to database via Service
            var dto = new CreateTaskDto
            {
                Title = model.Title,
                Description = model.Description,
                Status = model.Status,
                Priority = model.Priority,
                GitHubPrNumber = model.GitHubPrNumber,
                ProjectId = model.ProjectId
            };

            await _taskService.CreateTaskAsync(dto);

            return RedirectToAction(nameof(Index));
        }
    }
}