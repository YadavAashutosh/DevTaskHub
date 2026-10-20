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

