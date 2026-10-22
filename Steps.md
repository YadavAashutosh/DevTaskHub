# 📋 DevTask Hub: Implementation Steps Log

This file tracks every step completed in DevTask Hub along with its concept summary and verified status.

---

## 🎯 Step 1: Switch to main and Create Today's Branch
### 📖 Concept Summary:
Yesterday we completed feature/day1-setup and merged it into main. Today is a new day with new tasks (Database and Form Validation). To keep everything clean and isolated:
* We go to our clean main branch.
* We create a fresh new branch named feature/day1-database-forms.

### 💻 Action to do in GitHub Desktop:
1. Open GitHub Desktop.
2. Click "Current branch" at the top.
   * If you are still on feature/day1-setup, select main.
3. Now click "Current branch" again → click the blue button "New branch".
4. In the Name box, type:
   `feature/day1-database-forms`
5. Click "Create branch".
* **Status:** Verified ✅

---

## 🎯 Step 2: Database Setup & SQL Server (Task 3)
### 📖 Concept Summary:
In real software development, we always design our Database Tables first. Why? Because your C# code and HTML forms simply mirror whatever data lives in your database!
Our app has 3 core entities:
* Users: People who can log in (Email, PasswordHash, Role, GitHubUsername).
* Projects: Workspaces like "E-Commerce App" or "API Service" (Name, Description).
* Tasks: Individual work cards (Title, Status, Priority, GitHub PR number).
  * Foreign Key 1: Every task must belong to a Project (ProjectId).
  * Foreign Key 2: Every task can be assigned to a User (AssignedUserId).

### 💻 Action to do:
Open SSMS (SQL Server Management Studio) and connect to your local server.
Click "New Query" at the top.
Paste and execute this simple SQL script:
```sql
-- 1. Create the Database
CREATE DATABASE DevTaskHubDb;
GO
USE DevTaskHubDb;
GO
-- 2. Users Table
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(200) NOT NULL,
    Role NVARCHAR(50) NOT NULL DEFAULT 'Developer', -- 'Admin' or 'Developer'
    GitHubUsername NVARCHAR(100) NULL              -- For linking GitHub profile
);
GO
-- 3. Projects Table
CREATE TABLE Projects (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(250) NULL
);
GO
-- 4. Tasks Table (Relational with Foreign Keys)
CREATE TABLE Tasks (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(150) NOT NULL,
    Description NVARCHAR(500) NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Todo',        -- 'Todo', 'InProgress', 'Done'
    Priority NVARCHAR(50) NOT NULL DEFAULT 'Medium',    -- 'Low', 'Medium', 'High'
    GitHubPrNumber INT NULL,                            -- Linked GitHub PR (e.g., #42)
    ProjectId INT NOT NULL FOREIGN KEY REFERENCES Projects(Id),
    AssignedUserId INT NULL FOREIGN KEY REFERENCES Users(Id)
);
GO
```
Press F5 (or click Execute).
* **Status:** Verified ✅

---

## 🎯 Step 3: Insert Practice Data & Test SQL CRUD Queries (Day 1 Task 3)
### 📖 Concept Summary:
Before writing C# code, the syllabus asks us to:
"Design initial relational tables (Users, Projects, Tasks), and write manual CRUD queries."
We need to verify that our Foreign Keys work properly:
* A Task cannot exist without a valid ProjectId.
* We practice INSERT (Create) and a SELECT ... JOIN (Read with relationships) to see user names and project names together.

### 💻 Action to do:
In SSMS, open a New Query window (make sure the dropdown says DevTaskHubDb), paste and execute this script:
```sql
USE DevTaskHubDb;
GO
-- 1. Insert Sample Project
INSERT INTO Projects (Name, Description) 
VALUES ('DevTask Hub Web', 'Core developer issue and task tracking portal');
-- 2. Insert Sample Users (Admin & Developer)
INSERT INTO Users (Email, PasswordHash, Role, GitHubUsername) 
VALUES 
('admin@devtask.com', 'dummy_hash_admin', 'Admin', 'octocat'),
('dev@devtask.com', 'dummy_hash_dev', 'Developer', 'torvalds');
-- 3. Insert Sample Tasks (Linked to Project #1 and Users #1 and #2)
INSERT INTO Tasks (Title, Description, Status, Priority, GitHubPrNumber, ProjectId, AssignedUserId)
VALUES 
('Setup Database Schema', 'Create initial SQL Server tables with FKs', 'Done', 'High', 101, 1, 1),
('Build Task Creation Form', 'ASP.NET Core MVC form with validation', 'InProgress', 'High', 102, 1, 2);
GO
-- 4. Test READ with JOIN (Verify Relationships)
SELECT 
    t.Id AS TaskId,
    t.Title,
    t.Status,
    t.Priority,
    t.GitHubPrNumber,
    p.Name AS ProjectName,
    u.Email AS AssignedTo
FROM Tasks t
INNER JOIN Projects p ON t.ProjectId = p.Id
LEFT JOIN Users u ON t.AssignedUserId = u.Id;
GO
```
* **Status:** Verified ✅ (Returned 2 rows successfully)



---

## 🎯 Step 4: C# ViewModel & Form Validation Rules (Day 1 Task 2)
### 📖 Concept Summary:
In ASP.NET Core MVC, we should never bind raw HTML inputs directly to database entity classes when receiving form data. 
Instead, we use a ViewModel (`CreateTaskViewModel`):
* It acts as a clean contract for only the data coming from the user's browser.
* We decorate properties with Data Annotations (`[Required]`, `[StringLength]`, `[Range]`):
  * `[Required]`: Guarantees the user cannot leave the field blank.
  * `[StringLength(100, MinimumLength = 3)]`: Prevents titles that are too short (less than 3 characters) or too long (more than 100).
  * `[Range(1, int.MaxValue)]`: Ensures the GitHub PR number, if entered, is a positive number (like `#42`, not negative).
  * ASP.NET Core checks these rules automatically before your controller touches the data.

### 💻 Action to do:
1. Open Visual Studio.
2. In Solution Explorer, look inside the `DevTaskHub.Web` project.
3. Right-click on the `Models` folder → Add → Class...
4. Name the file: `CreateTaskViewModel.cs`
5. Added properties for `Title`, `Description`, `Status`, `Priority`, `GitHubPrNumber`, and `ProjectId` with DataAnnotations.
* **Status:** Verified ✅ (Build succeeded with 0 errors)


---

## 🎯 Step 5: TasksController (Handling Form Submission & Validation)
### 📖 Concept Summary:
A Controller in ASP.NET Core receives HTTP requests from the browser, processes logic, and returns Views or redirects.
For our Task feature, `TasksController` manages:
* `GET: /Tasks` (Index): Returns a table of all tasks.
* `GET: /Tasks/Create`: Displays the blank HTML form for task creation.
* `POST: /Tasks/Create`: Validates incoming data using `ModelState.IsValid`. If invalid, re-renders the form with error messages; if valid, saves the task to the list and redirects to `Index`.
* `[ValidateAntiForgeryToken]`: Provides cross-site request forgery security.

### 💻 Action to do:
1. In Visual Studio, inside `DevTaskHub.Web`, right-click on the `Controllers` folder → Add → Controller...
2. Choose "MVC Controller - Empty" → click Add.
3. Name it: `TasksController.cs`
4. Added actions: `Index()`, `Create()` [HttpGet], and `Create(CreateTaskViewModel model)` [HttpPost].
* **Status:** Verified ✅ (Build succeeded with 0 errors)


---

## 🎯 Step 5: TasksController (Handling Form Submission & Validation)
### 📖 Concept Summary:
A Controller in ASP.NET Core receives HTTP requests from the browser, processes logic, and returns Views or redirects.
For our Task feature, `TasksController` manages:
* `GET: /Tasks` (Index): Returns a table of all tasks.
* `GET: /Tasks/Create`: Displays the blank HTML form for task creation.
* `POST: /Tasks/Create`: Validates incoming data using `ModelState.IsValid`. If invalid, re-renders the form with error messages; if valid, saves the task to the list and redirects to `Index`.
* `[ValidateAntiForgeryToken]`: Provides cross-site request forgery security.

### 💻 Action to do:
1. In Visual Studio, inside `DevTaskHub.Web`, right-click on the `Controllers` folder → Add → Controller...
2. Choose "MVC Controller - Empty" → click Add.
3. Name it: `TasksController.cs`
4. Added actions: `Index()`, `Create()` [HttpGet], and `Create(CreateTaskViewModel model)` [HttpPost].
* **Status:** Verified ✅ (Build succeeded with 0 errors)



---

## 🎯 Step 6: Create Razor Views (`Index.cshtml` & `Create.cshtml`)
### 📖 Concept Summary:
In ASP.NET Core MVC, views provide the visual presentation layer for user interactions:
* `Views/Tasks/Index.cshtml`: Displays a clean table listing all tasks with styled badges for Priority and Status.
* `Views/Tasks/Create.cshtml`: Form configured with Tag Helpers (`asp-for`, `asp-validation-for`, `asp-action`) to collect input and display validation errors.
* `_ValidationScriptsPartial`: Enables instantaneous client-side validation using jQuery Unobtrusive Validation without requiring full page roundtrips.

### 💻 Action to do:
1. Created `Views/Tasks/` folder.
2. Created `Index.cshtml` with Bootstrap table for task lists.
3. Created `Create.cshtml` with input fields, select dropdowns, and validation spans.
* **Status:** Verified ✅ (Build succeeded with 0 errors)


---

## 🎯 Step 6: Create Razor Views (`Index.cshtml` & `Create.cshtml`)
### 📖 Concept Summary:
In ASP.NET Core MVC, views provide the visual presentation layer for user interactions:
* `Views/Tasks/Index.cshtml`: Displays a clean table listing all tasks with styled badges for Priority and Status.
* `Views/Tasks/Create.cshtml`: Form configured with Tag Helpers (`asp-for`, `asp-validation-for`, `asp-action`) to collect input and display validation errors.
* `_ValidationScriptsPartial`: Enables instantaneous client-side validation using jQuery Unobtrusive Validation without requiring full page roundtrips.

### 💻 Action to do:
1. Created `Views/Tasks/` folder.
2. Created `Index.cshtml` with Bootstrap table for task lists.
3. Created `Create.cshtml` with input fields, select dropdowns, and validation spans.
* **Status:** Verified ✅ (Build succeeded with 0 errors)



---

## 🎯 Step 7: Run Application, Test Validation, and Merge to `main`
### 📖 Concept Summary:
Verification ensures that client-side and server-side validation behave as intended before pushing to production:
* Navigation updated in `Views/Shared/_Layout.cshtml` with link to `TasksController.Index`.
* Verified validation rules:
  - Blank input triggers `[Required]` error message.
  - Length violations trigger `[StringLength]` error message.
  - Valid input passes `ModelState.IsValid`, adds to task list, and redirects to `Index`.
* Option B workflow executed: Feature branch merged into `main` and pushed to GitHub remote (`origin/main`).

### 💻 Action to do:
1. Added navbar item for Tasks in `_Layout.cshtml`.
2. Tested form in browser with both invalid and valid submissions.
3. In GitHub Desktop, committed all changes, switched to `main`, merged `feature/day1-database-forms`, and pushed origin.
* **Status:** Verified ✅ (Git remote `origin/main` at commit `9101694`)


---

## 🎯 Step 7: Run Application, Test Validation, and Merge to `main`
### 📖 Concept Summary:
Verification ensures that client-side and server-side validation behave as intended before pushing to production:
* Navigation updated in `Views/Shared/_Layout.cshtml` with link to `TasksController.Index`.
* Verified validation rules:
  - Blank input triggers `[Required]` error message.
  - Length violations trigger `[StringLength]` error message.
  - Valid input passes `ModelState.IsValid`, adds to task list, and redirects to `Index`.
* Option B workflow executed: Feature branch merged into `main` and pushed to GitHub remote (`origin/main`).

### 💻 Action to do:
1. Added navbar item for Tasks in `_Layout.cshtml`.
2. Tested form in browser with both invalid and valid submissions.
3. In GitHub Desktop, committed all changes, switched to `main`, merged `feature/day1-database-forms`, and pushed origin.
* **Status:** Verified ✅ (Git remote `origin/main` at commit `9101694`)



---

## 🎯 Step 8: Create Day 2 Feature Branch
### 📖 Concept Summary:
Following the Option B branching strategy, a fresh feature branch (`feature/day2-webapi-efcore`) was created off `main`. This isolates the Day 2 deliverables (Web API, DTOs, EF Core, and Repository Layer) from production code on `main`.

### 💻 Action to do:
1. Switched to `main` in GitHub Desktop.
2. Created and checked out new branch: `feature/day2-webapi-efcore`.
* **Status:** Verified ✅


---

## 🎯 Step 8: Create Day 2 Feature Branch
### 📖 Concept Summary:
Following the Option B branching strategy, a fresh feature branch (`feature/day2-webapi-efcore`) was created off `main`. This isolates the Day 2 deliverables (Web API, DTOs, EF Core, and Repository Layer) from production code on `main`.

### 💻 Action to do:
1. Switched to `main` in GitHub Desktop.
2. Created and checked out new branch: `feature/day2-webapi-efcore`.
* **Status:** Verified ✅



---

## 🎯 Step 9: Install Entity Framework Core NuGet Packages
### 📖 Concept Summary:
To enable ORM capabilities, database connectivity, and Code-First migrations, three foundational EF Core packages were installed:
* `Microsoft.EntityFrameworkCore.SqlServer`: SQL Server database provider.
* `Microsoft.EntityFrameworkCore.Tools`: PowerShell cmdlets for migrations inside Visual Studio.
* `Microsoft.EntityFrameworkCore.Design`: Design-time logic for scaffolding and migration generation.

### 💻 Action to do:
Installed `Microsoft.EntityFrameworkCore.SqlServer`, `Microsoft.EntityFrameworkCore.Tools`, and `Microsoft.EntityFrameworkCore.Design` via NuGet Package Manager.
* **Status:** Verified ✅ (Packages restored and project build clean)


---

## 🎯 Step 9: Install Entity Framework Core NuGet Packages
### 📖 Concept Summary:
To enable ORM capabilities, database connectivity, and Code-First migrations, three foundational EF Core packages were installed:
* `Microsoft.EntityFrameworkCore.SqlServer`: SQL Server database provider.
* `Microsoft.EntityFrameworkCore.Tools`: PowerShell cmdlets for migrations inside Visual Studio.
* `Microsoft.EntityFrameworkCore.Design`: Design-time logic for scaffolding and migration generation.

### 💻 Action to do:
Installed `Microsoft.EntityFrameworkCore.SqlServer`, `Microsoft.EntityFrameworkCore.Tools`, and `Microsoft.EntityFrameworkCore.Design` via NuGet Package Manager.
* **Status:** Verified ✅ (Packages restored and project build clean)



---

## 🎯 Step 10: Create Production-Ready Entity Models (`User.cs`, `Project.cs`, `TaskItem.cs`)
### 📖 Concept Summary:
Created the core domain entities matching the final architecture and SQL Server relational schema:
* `User.cs`: ID, Email, PasswordHash, Role (Admin/Developer), GitHubUsername, IsActive, CreatedAt, and navigation collection for assigned tasks.
* `Project.cs`: ID, Name, Description, GitHubRepoOwner, GitHubRepoName, CreatedAt, and navigation collection for project tasks.
* `TaskItem.cs`: ID, Title, Description, Status, Priority, GitHubPrNumber, DueDate, CreatedAt, UpdatedAt, and Foreign Keys with navigation properties for `Project` and `AssignedUser`.

### 💻 Action to do:
Created `Models/User.cs`, `Models/Project.cs`, and `Models/TaskItem.cs` with validation attributes and navigation properties.
* **Status:** Verified ✅ (Build succeeded with 0 errors)


---

## 🎯 Step 10: Create Production-Ready Entity Models (`User.cs`, `Project.cs`, `TaskItem.cs`)
### 📖 Concept Summary:
Created the core domain entities matching the final architecture and SQL Server relational schema:
* `User.cs`: ID, Email, PasswordHash, Role (Admin/Developer), GitHubUsername, IsActive, CreatedAt, and navigation collection for assigned tasks.
* `Project.cs`: ID, Name, Description, GitHubRepoOwner, GitHubRepoName, CreatedAt, and navigation collection for project tasks.
* `TaskItem.cs`: ID, Title, Description, Status, Priority, GitHubPrNumber, DueDate, CreatedAt, UpdatedAt, and Foreign Keys with navigation properties for `Project` and `AssignedUser`.

### 💻 Action to do:
Created `Models/User.cs`, `Models/Project.cs`, and `Models/TaskItem.cs` with validation attributes and navigation properties.
* **Status:** Verified ✅ (Build succeeded with 0 errors)



---

## 🎯 Step 11: Create AppDbContext & Register EF Core (Task 5)
### 📖 Concept Summary:
Established the database context and connection pipeline:
* `Data/AppDbContext.cs`: Configured entity sets (`Users`, `Projects`, `Tasks`) and Fluent API relationships (Foreign keys, Cascade delete on project removal, SetNull on user removal).
* `appsettings.json`: Added `ConnectionStrings:DefaultConnection` targeting `Server=.\\SQLEXPRESS01;Database=DevTaskHubDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True`.
* `Program.cs`: Registered `AppDbContext` into dependency injection container via `builder.Services.AddDbContext<AppDbContext>()`.

### 💻 Action to do:
1. Created `Data/AppDbContext.cs` with DbSets and model configurations.
2. Configured SQL Server connection string in `appsettings.json`.
3. Registered DbContext in `Program.cs`.
* **Status:** Verified ✅ (Build succeeded with 0 errors)


---

## 🎯 Step 11: Create AppDbContext & Register EF Core (Task 5)
### 📖 Concept Summary:
Established the database context and connection pipeline:
* `Data/AppDbContext.cs`: Configured entity sets (`Users`, `Projects`, `Tasks`) and Fluent API relationships (Foreign keys, Cascade delete on project removal, SetNull on user removal).
* `appsettings.json`: Added `ConnectionStrings:DefaultConnection` targeting `Server=.\\SQLEXPRESS01;Database=DevTaskHubDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True`.
* `Program.cs`: Registered `AppDbContext` into dependency injection container via `builder.Services.AddDbContext<AppDbContext>()`.

### 💻 Action to do:
1. Created `Data/AppDbContext.cs` with DbSets and model configurations.
2. Configured SQL Server connection string in `appsettings.json`.
3. Registered DbContext in `Program.cs`.
* **Status:** Verified ✅ (Build succeeded with 0 errors)



---

## 🎯 Step 11.1: Enterprise Security & Configuration Hardening
### 📖 Concept Summary:
Aligned application secret handling with 20-year Senior Principal Architecture standards and `Project Description` instructions (line 77):
* Base configuration (`appsettings.json`): Sanitized into a production template using placeholder server names (`Server=YOUR_SERVER;...`) to prevent secret leakage on GitHub.
* Development override (`appsettings.Development.json`): Configured with local workstation SQL Server connection string (`Server=.\\SQLEXPRESS01;...`) for active debugging.
* `.gitignore`: Enriched with security rules preventing accidental commit of local environment files (`*.local.json`, `appsettings.*.local.json`, `.env`, `.env.*`).

### 💻 Action to do:
1. Updated `appsettings.json` with sanitized connection string placeholder.
2. Configured actual SQL connection string in `appsettings.Development.json`.
3. Added security override patterns to `.gitignore`.
* **Status:** Verified ✅


---

## 🎯 Step 11.1: Enterprise Security & Configuration Hardening
### 📖 Concept Summary:
Aligned application secret handling with 20-year Senior Principal Architecture standards and `Project Description` instructions (line 77):
* Base configuration (`appsettings.json`): Sanitized into a production template using placeholder server names (`Server=YOUR_SERVER;...`) to prevent secret leakage on GitHub.
* Development override (`appsettings.Development.json`): Configured with local workstation SQL Server connection string (`Server=.\\SQLEXPRESS01;...`) for active debugging.
* `.gitignore`: Enriched with security rules preventing accidental commit of local environment files (`*.local.json`, `appsettings.*.local.json`, `.env`, `.env.*`).

### 💻 Action to do:
1. Updated `appsettings.json` with sanitized connection string placeholder.
2. Configured actual SQL connection string in `appsettings.Development.json`.
3. Added security override patterns to `.gitignore`.
* **Status:** Verified ✅



---

## 🎯 Step 12: Initial EF Core Migration & Database Sync (Task 6 Part 1)
### 📖 Concept Summary:
Generated and applied the baseline Code-First database migration:
* Executed `dotnet ef migrations add InitialCreate -o Data/Migrations`.
* EF Core created migration files mapping the enriched domain schema (`Projects`, `Users`, `Tasks`) with Foreign Keys, Cascade/SetNull delete behaviors, and Indexes (`IX_Tasks_AssignedUserId`, `IX_Tasks_ProjectId`).
* Applied migration to database using `dotnet ef database update`.
* Verified `__EFMigrationsHistory` table records migration `20261021065557_InitialCreate`.

### 💻 Action to do:
1. Navigated to `DevTaskHub.Web` project directory.
2. Dropped raw SQL practice tables in SSMS to allow clean Code-First schema ownership.
3. Executed `dotnet ef migrations add InitialCreate -o Data/Migrations`.
4. Executed `dotnet ef database update`.
* **Status:** Verified ✅ (Database schema synced and migration history active)


---

## 🎯 Step 12: Initial EF Core Migration & Database Sync (Task 6 Part 1)
### 📖 Concept Summary:
Generated and applied the baseline Code-First database migration:
* Executed `dotnet ef migrations add InitialCreate -o Data/Migrations`.
* EF Core created migration files mapping the enriched domain schema (`Projects`, `Users`, `Tasks`) with Foreign Keys, Cascade/SetNull delete behaviors, and Indexes (`IX_Tasks_AssignedUserId`, `IX_Tasks_ProjectId`).
* Applied migration to database using `dotnet ef database update`.
* Verified `__EFMigrationsHistory` table records migration `20261021065557_InitialCreate`.

### 💻 Action to do:
1. Navigated to `DevTaskHub.Web` project directory.
2. Dropped raw SQL practice tables in SSMS to allow clean Code-First schema ownership.
3. Executed `dotnet ef migrations add InitialCreate -o Data/Migrations`.
4. Executed `dotnet ef database update`.
* **Status:** Verified ✅ (Database schema synced and migration history active)



---

## 🎯 Step 13: Create Data Transfer Objects (DTOs) (Task 4)
### 📖 Concept Summary:
Implemented Data Transfer Objects to establish a clean, decoupled API contract between clients and the database:
* `DTOs/Tasks/TaskDto.cs`: Output DTO delivering formatted task attributes, project names, and assigned user emails without exposing internal database entities or triggering JSON serialization loops.
* `DTOs/Tasks/CreateTaskDto.cs`: Input DTO featuring DataAnnotations (`[Required]`, `[StringLength]`, `[Range]`) for server-side validation during task creation.
* `DTOs/Tasks/UpdateTaskDto.cs`: Update DTO for status transitions and task modifications.

### 💻 Action to do:
Created `DTOs/Tasks/TaskDto.cs`, `DTOs/Tasks/CreateTaskDto.cs`, and `DTOs/Tasks/UpdateTaskDto.cs`.
* **Status:** Verified ✅ (Build succeeded with 0 errors)


---

## 🎯 Step 13: Create Data Transfer Objects (DTOs) (Task 4)
### 📖 Concept Summary:
Implemented Data Transfer Objects to establish a clean, decoupled API contract between clients and the database:
* `DTOs/Tasks/TaskDto.cs`: Output DTO delivering formatted task attributes, project names, and assigned user emails without exposing internal database entities or triggering JSON serialization loops.
* `DTOs/Tasks/CreateTaskDto.cs`: Input DTO featuring DataAnnotations (`[Required]`, `[StringLength]`, `[Range]`) for server-side validation during task creation.
* `DTOs/Tasks/UpdateTaskDto.cs`: Update DTO for status transitions and task modifications.

### 💻 Action to do:
Created `DTOs/Tasks/TaskDto.cs`, `DTOs/Tasks/CreateTaskDto.cs`, and `DTOs/Tasks/UpdateTaskDto.cs`.
* **Status:** Verified ✅ (Build succeeded with 0 errors)



---

## 🎯 Step 14: Service / Repository Layer (`ITaskService` & `TaskService`) (Task 6 Part 2)
### 📖 Concept Summary:
Decoupled business and database operations from presentation controllers by implementing the Repository/Service design pattern:
* `Services/ITaskService.cs`: Interface defining asynchronous contracts (`GetAllTasksAsync`, `GetTaskByIdAsync`, `CreateTaskAsync`, `UpdateTaskAsync`, `DeleteTaskAsync`).
* `Services/TaskService.cs`: Concrete implementation injecting `AppDbContext`, utilizing non-blocking queries (`ToListAsync`, `SaveChangesAsync`), eager loading (`.Include(t => t.Project)`), and performance optimizations (`.AsNoTracking()`).
* `Program.cs`: Registered `ITaskService` as Scoped dependency via `builder.Services.AddScoped<ITaskService, TaskService>()`.

### 💻 Action to do:
1. Created `Services/ITaskService.cs`.
2. Created `Services/TaskService.cs`.
3. Registered `ITaskService` in `Program.cs`.
* **Status:** Verified ✅ (Build succeeded with 0 errors)


---

## 🎯 Step 15: Web API Controller & MVC Persistence Integration (Task 4)
### 📖 Concept Summary:
Built high-performance, asynchronous RESTful API endpoints alongside the MVC architecture:
* `Controllers/Api/TasksApiController.cs`:
  - `GET /api/tasks`: Returns `200 OK` with JSON array of tasks mapped to `TaskDto`.
  - `GET /api/tasks/{id}`: Returns `200 OK` or `404 NotFound` with descriptive error payload.
  - `POST /api/tasks`: Validates `CreateTaskDto` via automatic `[ApiController]` binding, saves via `ITaskService`, and returns `201 Created` with resource Location header.
  - `PUT /api/tasks/{id}`: Validates updates and returns `200 OK` or `404 NotFound`.
  - `DELETE /api/tasks/{id}`: Deletes record and returns `204 NoContent`.
* Updated MVC `TasksController.cs` to inject `ITaskService`, replacing temporary in-memory collections with real SQL Server persistence through EF Core.
* Updated `Views/Tasks/Index.cshtml` to consume `@model IEnumerable<TaskDto>`.

### 💻 Action to do:
1. Created `Controllers/Api/TasksApiController.cs`.
2. Refactored `Controllers/TasksController.cs` to persist through `ITaskService`.
3. Updated `Views/Tasks/Index.cshtml` model contract.
* **Status:** Verified ✅ (Build succeeded with 0 errors)


---

## 🎯 Step 16: Test Web API, SQL Persistence, and Merge to `main` (Day 2 Complete)
### 📖 Concept Summary:
Verified full-stack data flow from presentation down to SQL Server and completed the Day 2 Git lifecycle:
* Tested MVC Form submission: Created task records successfully persisted through `ITaskService` into SQL Server table `Tasks`.
* Tested Web API Endpoint: `GET /api/tasks` returned structured JSON with all relational fields (`projectName`) and zero cyclic reference errors.
* Option B Lifecycle: Committed all changes to `feature/day2-webapi-efcore`, merged into `main`, and pushed to remote `origin/main`.

### 💻 Action to do:
1. Tested MVC Form submission and verified database insertion in SQL Server.
2. Verified `GET /api/tasks` JSON payload in browser.
3. In GitHub Desktop, committed changes with summary: `Web API, EF Core Migrations, DTOs & Repository Layer`.
4. Merged `feature/day2-webapi-efcore` into `main`.
5. Pushed `origin/main` to GitHub.
* **Status:** Verified ✅ (Git remote `origin/main` at commit `a7f5eea`)


---

## 🎯 Step 17: Switch to `main` and Create Day 3 Feature Branch
### 📖 Concept Summary:
Prepared repository for Day 3 deliverables (Pagination, Filtering, Sorting, Global Exception Middleware, Swagger/OpenAPI, and Authentication Basics):
* Updated `.gitignore` with production-grade rules ignoring application logs (`*.log`, `logs/`) and .NET User Secrets (`secrets.json`, `.microsoft.extensions.secretmanager/`).
* Created and checked out feature branch: `feature/day3-api-auth` off `main`.

### 💻 Action to do:
1. Committed `.gitignore` changes to `main`.
2. Created branch `feature/day3-api-auth` in GitHub Desktop.
* **Status:** Verified ✅


---

## 🎯 Step 18: Pagination, Filtering & Sorting Contracts (Task 7)
### 📖 Concept Summary:
Architected enterprise-grade pagination and filtering contracts:
* `DTOs/Common/PagedResponse<T>.cs`: Universal generic wrapper providing standard pagination metadata (`PageNumber`, `PageSize`, `TotalRecords`, `TotalPages`, `HasPreviousPage`, `HasNextPage`, and collection payload `Data`).
* `DTOs/Tasks/TaskQueryParameters.cs`: Encapsulates client query parameters including page bounds (enforcing a 50-item ceiling), keyword search (`SearchTerm`), categorical filters (`Status`, `Priority`, `ProjectId`, `AssignedUserId`), and multi-column sorting rules (`SortBy`, `IsAscending`).

### 💻 Action to do:
1. Created `DTOs/Common/PagedResponse.cs`.
2. Created `DTOs/Tasks/TaskQueryParameters.cs`.
* **Status:** Verified ✅ (Build succeeded with 0 errors)


---

## 🎯 Step 19: High-Performance IQueryable Deferred Execution (Task 7)
### 📖 Concept Summary:
Implemented enterprise-grade server-side query processing using LINQ deferred execution against SQL Server:
* `Services/ITaskService.cs` & `Services/TaskService.cs`:
  - `GetTasksAsync(TaskQueryParameters)`:
    * Deferred filtering: Dynamically composes `WHERE` clauses for `SearchTerm` (case-insensitive across Title and Description), `Status`, `Priority`, `ProjectId`, and `AssignedUserId`.
    * Pre-pagination counting: Calls `CountAsync()` on the filtered query tree before applying offsets.
    * Dynamic switch-expression sorting: Orders by `title`, `priority`, `status`, `duedate`, or default `createdAt` (Ascending/Descending).
    * Server-side slicing: Applies `.Skip((PageNumber - 1) * PageSize).Take(PageSize)` so SQL Server only reads and transmits the requested slice.
    * Projection: Projects directly to `TaskDto` within the database query, minimizing memory allocation.
* Updated `Controllers/Api/TasksApiController.cs`:
  - `GET /api/tasks`: Binds `[FromQuery] TaskQueryParameters` and returns `200 OK` wrapping the generic `PagedResponse<TaskDto>`.
* **Status:** Verified ✅ (Build succeeded with 0 errors)


---

## 🎯 Step 19: High-Performance IQueryable Deferred Execution (Task 7)
### 📖 Concept Summary:
Implemented enterprise-grade server-side query processing using LINQ deferred execution against SQL Server:
* `Services/ITaskService.cs` & `Services/TaskService.cs`:
  - `GetTasksAsync(TaskQueryParameters)`:
    * Deferred filtering: Dynamically composes `WHERE` clauses for `SearchTerm` (case-insensitive across Title and Description), `Status`, `Priority`, `ProjectId`, and `AssignedUserId`.
    * Pre-pagination counting: Calls `CountAsync()` on the filtered query tree before applying offsets.
    * Dynamic switch-expression sorting: Orders by `title`, `priority`, `status`, `duedate`, or default `createdAt` (Ascending/Descending).
    * Server-side slicing: Applies `.Skip((PageNumber - 1) * PageSize).Take(PageSize)` so SQL Server only reads and transmits the requested slice.
    * Projection: Projects directly to `TaskDto` within the database query, minimizing memory allocation.
* Updated `Controllers/Api/TasksApiController.cs`:
  - `GET /api/tasks`: Binds `[FromQuery] TaskQueryParameters` and returns `200 OK` wrapping the generic `PagedResponse<TaskDto>`.
* **Status:** Verified ✅ (Build succeeded with 0 errors)

