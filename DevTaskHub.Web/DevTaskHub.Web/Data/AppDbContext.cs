using Microsoft.EntityFrameworkCore;
using DevTaskHub.Web.Models;

namespace DevTaskHub.Web.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // Core DbSets
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<RefreshSession> RefreshSessions { get; set; }

        public DbSet<Project> Projects { get; set; }
        public DbSet<ProjectMember> ProjectMembers { get; set; }

        public DbSet<TaskItem> Tasks { get; set; }
        public DbSet<TaskStatusHistory> TaskStatusHistories { get; set; }
        public DbSet<TaskComment> TaskComments { get; set; }
        public DbSet<Label> Labels { get; set; }
        public DbSet<TaskLabel> TaskLabels { get; set; }

        public DbSet<TaskPullRequest> TaskPullRequests { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. User Unique Index
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // 2. UserRole Composite Primary Key
            modelBuilder.Entity<UserRole>()
                .HasKey(ur => new { ur.UserId, ur.RoleId });

            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            // 3. ProjectMember Composite Primary Key
            modelBuilder.Entity<ProjectMember>()
                .HasKey(pm => new { pm.ProjectId, pm.UserId });

            modelBuilder.Entity<ProjectMember>()
                .HasOne(pm => pm.Project)
                .WithMany(p => p.Members)
                .HasForeignKey(pm => pm.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProjectMember>()
                .HasOne(pm => pm.User)
                .WithMany(u => u.ProjectMemberships)
                .HasForeignKey(pm => pm.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // 4. Task Relationships
            modelBuilder.Entity<TaskItem>()
                .HasOne(t => t.Project)
                .WithMany(p => p.Tasks)
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TaskItem>()
                .HasOne(t => t.AssignedUser)
                .WithMany(u => u.AssignedTasks)
                .HasForeignKey(t => t.AssignedUserId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<TaskItem>()
                .HasOne(t => t.CreatedByUser)
                .WithMany()
                .HasForeignKey(t => t.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // 5. TaskLabel - Explicit Cascade Path Resolution (SQL Server Error 1785 prevention)
            modelBuilder.Entity<TaskLabel>()
                .HasKey(tl => new { tl.TaskId, tl.LabelId });

            modelBuilder.Entity<TaskLabel>()
                .HasOne(tl => tl.Task)
                .WithMany(t => t.TaskLabels)
                .HasForeignKey(tl => tl.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TaskLabel>()
                .HasOne(tl => tl.Label)
                .WithMany(l => l.TaskLabels)
                .HasForeignKey(tl => tl.LabelId)
                .OnDelete(DeleteBehavior.Restrict);

            // 6. RefreshSession Index
            modelBuilder.Entity<RefreshSession>()
                .HasIndex(rs => rs.TokenHash)
                .IsUnique();
        }
    }
}
