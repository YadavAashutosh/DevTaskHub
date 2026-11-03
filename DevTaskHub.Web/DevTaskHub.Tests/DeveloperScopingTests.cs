using System;
using System.Linq;
using System.Threading.Tasks;
using DevTaskHub.Web.Data;
using DevTaskHub.Web.DTOs.Tasks;
using DevTaskHub.Web.Models;
using DevTaskHub.Web.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DevTaskHub.Tests
{
    public class DeveloperScopingTests
    {
        private AppDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        [Fact]
        public async Task Developer_OnlySees_AssignedTasks_Or_ProjectMemberTasks()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();

            // Users
            var dev1 = new User { Id = 101, FullName = "Dev One", Email = "dev1@devtask.com", PasswordHash = "hash", Role = "Developer" };
            var dev2 = new User { Id = 102, FullName = "Dev Two", Email = "dev2@devtask.com", PasswordHash = "hash", Role = "Developer" };
            context.Users.AddRange(dev1, dev2);

            // Project A (dev1 is a member)
            var projA = new Project { Id = 1, Name = "Project A", ProjectKey = "PRJA", Status = "Active" };
            // Project B (dev1 is NOT a member)
            var projB = new Project { Id = 2, Name = "Project B", ProjectKey = "PRJB", Status = "Active" };
            context.Projects.AddRange(projA, projB);

            context.ProjectMembers.Add(new ProjectMember { ProjectId = 1, UserId = 101, ProjectRole = "Developer" });

            // Task 1: In Project A (dev1 is project member)
            var task1 = new TaskItem { Id = 1, Title = "Task in Proj A", Status = "Todo", Priority = "Medium", ProjectId = 1, AssignedUserId = 102 };
            // Task 2: In Project B, but assigned directly to dev1
            var task2 = new TaskItem { Id = 2, Title = "Task in Proj B assigned to dev1", Status = "InProgress", Priority = "High", ProjectId = 2, AssignedUserId = 101 };
            // Task 3: In Project B, NOT assigned to dev1, dev1 NOT member
            var task3 = new TaskItem { Id = 3, Title = "Task in Proj B for dev2 only", Status = "Todo", Priority = "Low", ProjectId = 2, AssignedUserId = 102 };
            // Task 4: Soft-deleted task
            var task4 = new TaskItem { Id = 4, Title = "Deleted Task", Status = "Done", Priority = "Low", ProjectId = 1, AssignedUserId = 101, DeletedAtUtc = DateTime.UtcNow };

            context.Tasks.AddRange(task1, task2, task3, task4);
            await context.SaveChangesAsync();

            var taskService = new TaskService(context);

            // Act - query as dev1
            var queryParams = new TaskQueryParameters
            {
                RequestingUserId = 101,
                RequestingUserRole = "Developer",
                PageNumber = 1,
                PageSize = 25
            };

            var result = await taskService.GetTasksAsync(queryParams);

            // Assert
            Assert.Equal(2, result.TotalRecords);
            var taskIds = result.Data.Select(t => t.Id).ToList();
            Assert.Contains(1, taskIds); // Member of Project A
            Assert.Contains(2, taskIds); // Assigned to dev1
            Assert.DoesNotContain(3, taskIds); // Unaffiliated task hidden from developer
            Assert.DoesNotContain(4, taskIds); // Soft deleted task hidden
        }

        [Fact]
        public async Task Admin_Sees_AllTasks_AcrossAllProjects()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();

            var projA = new Project { Id = 1, Name = "Project A", ProjectKey = "PRJA", Status = "Active" };
            var projB = new Project { Id = 2, Name = "Project B", ProjectKey = "PRJB", Status = "Active" };
            context.Projects.AddRange(projA, projB);

            var task1 = new TaskItem { Id = 1, Title = "Task in Proj A", Status = "Todo", Priority = "Medium", ProjectId = 1, AssignedUserId = 102 };
            var task2 = new TaskItem { Id = 2, Title = "Task in Proj B", Status = "InProgress", Priority = "High", ProjectId = 2, AssignedUserId = 101 };
            context.Tasks.AddRange(task1, task2);
            await context.SaveChangesAsync();

            var taskService = new TaskService(context);

            // Act - query as Admin
            var queryParams = new TaskQueryParameters
            {
                RequestingUserId = 999,
                RequestingUserRole = "Admin",
                PageNumber = 1,
                PageSize = 25
            };

            var result = await taskService.GetTasksAsync(queryParams);

            // Assert - Admin sees all active tasks
            Assert.Equal(2, result.TotalRecords);
            var taskIds = result.Data.Select(t => t.Id).ToList();
            Assert.Contains(1, taskIds);
            Assert.Contains(2, taskIds);
        }
    }
}
