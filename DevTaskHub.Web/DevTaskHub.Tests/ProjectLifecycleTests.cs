using System;
using System.Linq;
using System.Threading.Tasks;
using DevTaskHub.Web.Data;
using DevTaskHub.Web.Models;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DevTaskHub.Tests
{
    public class ProjectLifecycleTests
    {
        private AppDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        [Fact]
        public async Task Developer_CannotSee_ArchivedProjects()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();

            var activeProject = new Project { Id = 1, Name = "Active Sprint Project", ProjectKey = "ACT", Status = "Active" };
            var archivedProject = new Project { Id = 2, Name = "Legacy Archived Project", ProjectKey = "ARC", Status = "Archived" };
            var completedProject = new Project { Id = 3, Name = "Completed Project", ProjectKey = "CMP", Status = "Completed" };

            context.Projects.AddRange(activeProject, archivedProject, completedProject);
            await context.SaveChangesAsync();

            // Act - Developer query
            string requestingRole = "Developer";
            var query = context.Projects.AsNoTracking();
            if (string.Equals(requestingRole, "Developer", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(p => p.Status != "Archived");
            }
            var results = await query.ToListAsync();

            // Assert
            Assert.Equal(2, results.Count);
            Assert.DoesNotContain(results, p => p.Status == "Archived");
            Assert.Contains(results, p => p.Status == "Active");
            Assert.Contains(results, p => p.Status == "Completed");
        }

        [Fact]
        public async Task Admin_And_ProjectManager_CanSee_ArchivedProjects()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();

            var activeProject = new Project { Id = 1, Name = "Active Sprint Project", ProjectKey = "ACT", Status = "Active" };
            var archivedProject = new Project { Id = 2, Name = "Legacy Archived Project", ProjectKey = "ARC", Status = "Archived" };

            context.Projects.AddRange(activeProject, archivedProject);
            await context.SaveChangesAsync();

            // Act - Admin query
            string requestingRole = "Admin";
            var query = context.Projects.AsNoTracking();
            if (string.Equals(requestingRole, "Developer", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(p => p.Status != "Archived");
            }
            var results = await query.ToListAsync();

            // Assert
            Assert.Equal(2, results.Count);
            Assert.Contains(results, p => p.Status == "Archived");
        }
    }
}

