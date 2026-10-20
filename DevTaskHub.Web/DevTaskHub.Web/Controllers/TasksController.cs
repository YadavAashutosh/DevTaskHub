using Microsoft.AspNetCore.Mvc;
using DevTaskHub.Web.Models;

namespace DevTaskHub.Web.Controllers
{
    public class TasksController : Controller
    {
        // In-memory list for Day 1 validation practice (replaced by EF Core in Day 2)
        private static readonly List<CreateTaskViewModel> _tasks = new()
        {
            new CreateTaskViewModel
            {
                Title = "Setup Database Schema",
                Description = "Create initial SQL Server tables with FKs",
                Status = "Done",
                Priority = "High",
                GitHubPrNumber = 101,
                ProjectId = 1
            }
        };

        // GET: /Tasks
        public IActionResult Index()
        {
            return View(_tasks);
        }

        // GET: /Tasks/Create (Loads blank form)
        [HttpGet]
        public IActionResult Create()
        {
            var model = new CreateTaskViewModel();
            return View(model);
        }

        // POST: /Tasks/Create (Validates and saves form)
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Create(CreateTaskViewModel model)
        {
            // Server-side validation check
            if (!ModelState.IsValid)
            {
                // Validation failed: Re-render form with error messages
                return View(model);
            }

            // Validation passed: Add task to list
            _tasks.Add(model);

            // Redirect back to task list
            return RedirectToAction(nameof(Index));
        }
    }
}