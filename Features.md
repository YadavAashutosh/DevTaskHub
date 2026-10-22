# DevTask Hub — Master Features & Live Capabilities Inventory

> **Document Status:** Live & Verified  
> **Target Standard:** Enterprise Grade (₹200 Crore Architectural Benchmark)  
> **Technology Stack:** ASP.NET Core (.NET 10), Entity Framework Core, SQL Server, OpenAPI / Swagger, Razor MVC, RESTful APIs

---

## 📑 Table of Contents
1. [Core Features Directory (16 Features)](#1-core-features-directory)
2. [Live Interactive Actions & Test Playbook (Number by Number)](#2-live-interactive-actions--test-playbook)
3. [Database Entity Relationship & Schema Map](#3-database-entity-relationship--schema-map)
4. [Enterprise Security & Resilience Guardrails](#4-enterprise-security--resilience-guardrails)
5. [Upcoming Capabilities Roadmap (Days 4 - 8)](#5-upcoming-capabilities-roadmap)

---

## 1. Core Features Directory

### A. Database & Persistence Layer
* **[FEAT-01] Normalized Relational Schema:** Enforced foreign keys across `Projects`, `Users`, and `Tasks` with strict 1:N cardinality and referential integrity.
* **[FEAT-02] Code-First Migrations & Versioning:** Zero manual SQL scripts. Database schema evolves strictly via reviewed, reproducible EF Core migrations (`InitialCreate`).
* **[FEAT-03] Deferred `IQueryable` Execution Engine:** Server-side LINQ execution where filtering, multi-column sorting, and pagination slice records at the database level (`.Skip().Take()`) before hitting application memory.

### B. API Architecture & Contracts
* **[FEAT-04] Decoupled DTO Layer:** Zero entity leakage. Specialized contracts (`TaskDto`, `CreateTaskDto`, `UpdateTaskDto`, `RegisterRequestDto`, `UserDto`) isolate domain tables from the network.
* **[FEAT-05] Universal Paged Response Contract:** Generic pagination wrapper (`PagedResponse<T>`) delivering record arrays along with metadata (`TotalRecords`, `TotalPages`, `HasPreviousPage`, `HasNextPage`).
* **[FEAT-06] RESTful Task Management Endpoints:** Full HTTP verb support (`GET`, `POST`, `PUT`, `DELETE`) with RFC-compliant status codes (`200 OK`, `201 Created`, `204 NoContent`, `400 BadRequest`, `404 NotFound`).
* **[FEAT-07] Interactive OpenAPI / Swagger UI:** Auto-generated API documentation and live execution harness accessible directly via `/swagger`.

### C. Enterprise Identity & Credential Protection
* **[FEAT-08] Cryptographic PBKDF2 Password Hashing:** Salted HMAC-SHA512 password hashing with 100,000+ iterations via `PasswordHasher<User>`, ensuring zero plaintext storage and rainbow table immunity.
* **[FEAT-09] Zero Secret Leakage Architecture:** `UserDto` completely omits password hashes and salt properties, guaranteeing safe client responses.
* **[FEAT-10] Case-Insensitive Email Normalization:** Strict uniqueness enforcement via `.Trim().ToLower()` checks prior to user creation to prevent duplicate account spoofing.
* **[FEAT-11] Defense-in-Depth Validation:** NIST-compliant regex complexity (uppercase, lowercase, number, special character) enforced directly on the server DTO.

### D. Diagnostics & System Resilience
* **[FEAT-12] Global Exception Handling Middleware:** Centralized pipeline filter catching all unhandled exceptions and transforming internal failures into sanitized RFC 7807 Problem Details JSON.
* **[FEAT-13] Structured Contextual Logging:** Non-blocking `ILogger` telemetry recording trace identifiers, HTTP routes, client IPs, and critical lifecycle events.

### E. Presentation & Application Workflows
* **[FEAT-14] Dual-Stack Architecture:** Coexistence of Razor MVC server-rendered views (`/Tasks`) and headless RESTful Web APIs (`/api/*`) on the same runtime.
* **[FEAT-15] N-Tier Repository / Service Decoupling:** Business logic encapsulated in `ITaskService` and `IAuthService`, completely decoupling controllers from `AppDbContext`.
* **[FEAT-16] Feature-Branch Git Governance:** Branch-per-milestone lifecycle (`feature/day3-api-auth`) enforcing clean commits, pull requests, and verified merges into `main`.

---

## 2. Live Interactive Actions & Test Playbook

Every action below can be executed and verified right now against the running server (`Ctrl + F5`):

### 🎯 Action 01: Launch Swagger Interactive Documentation
* **How to run:** Navigate to `https://localhost:<port>/swagger` in any browser.
* **Expected Result:** Renders the Swagger 3.0 specification UI listing all `AuthApi` and `TasksApi` endpoints.

### 🎯 Action 02: Register New User with Salted PBKDF2 Hashing
* **Endpoint:** `POST /api/auth/register`
* **Payload:**
  ```json
  {
    "fullName": "Enterprise Lead",
    "email": "lead@devtaskhub.com",
    "password": "SecurePassword@123",
    "confirmPassword": "SecurePassword@123"
  }
  ```
* **Expected Response:** `201 Created` returning `UserDto` containing `userId`, `email`, `role: "Developer"`, and `createdAt` (Zero password hash visible).

### 🎯 Action 03: Verify Duplicate Identity Conflict Rejection
* **Endpoint:** `POST /api/auth/register`
* **Payload:** Re-submit the identical payload from Action 02.
* **Expected Response:** `400 Bad Request` with payload `{"message": "The email address 'lead@devtaskhub.com' is already registered."}`.

### 🎯 Action 04: Verify Password Complexity Enforcement
* **Endpoint:** `POST /api/auth/register`
* **Payload:** Supply a weak password (e.g. `"12345"`).
* **Expected Response:** `400 Bad Request` citing NIST regex failure (Missing uppercase, special character, or minimum 8 characters).

### 🎯 Action 05: Create New Task via REST API
* **Endpoint:** `POST /api/tasks`
* **Payload:**
  ```json
  {
    "title": "Architect JWT Auth Module",
    "description": "Construct token issuance engine for Day 4",
    "status": "Todo",
    "priority": "High",
    "dueDate": "2026-10-30T18:00:00Z",
    "projectId": 1,
    "assignedUserId": 1
  }
  ```
* **Expected Response:** `201 Created` with the newly assigned task identifier and `Location` header.

### 🎯 Action 06: Query Tasks with Pagination, Search & Sorting
* **Endpoint:** `GET /api/tasks`
* **Query Parameters:**
  - `SearchTerm`: `JWT`
  - `Priority`: `High`
  - `PageNumber`: `1`
  - `PageSize`: `10`
  - `SortBy`: `priority`
  - `IsAscending`: `false`
* **Expected Response:** `200 OK` wrapped in `PagedResponse<TaskDto>` containing matching records, `totalPages: 1`, and `totalRecords: 1`.

### 🎯 Action 07: Fetch Single Task by Identifier
* **Endpoint:** `GET /api/tasks/{id}` (e.g., `id = 1`)
* **Expected Response:** `200 OK` returning full `TaskDto` details or `404 NotFound` if the ID does not exist.

### 🎯 Action 08: Update Task Status and Metadata
* **Endpoint:** `PUT /api/tasks/{id}` (e.g., `id = 1`)
* **Payload:**
  ```json
  {
    "title": "Architect JWT Auth Module",
    "description": "Updated scope for Day 4 authentication",
    "status": "InProgress",
    "priority": "High",
    "dueDate": "2026-10-31T18:00:00Z",
    "assignedUserId": 1
  }
  ```
* **Expected Response:** `200 OK` with updated task attributes.

### 🎯 Action 09: Delete Task Record
* **Endpoint:** `DELETE /api/tasks/{id}` (e.g., `id = 1`)
* **Expected Response:** `204 NoContent` confirming record deletion.

### 🎯 Action 10: Access MVC Web Portal
* **How to run:** Navigate to `https://localhost:<port>/Tasks` in browser.
* **Expected Result:** Renders server-side Razor table showing current database tasks, priority tags, and action buttons.

### 🎯 Action 11: Create Task via MVC Razor Form
* **How to run:** Click **"Create New Task"** on the `/Tasks` page.
* **Expected Result:** Client and server-side validated form allowing direct submission to SQL Server with seamless redirect.

---

## 3. Database Entity Relationship & Schema Map

```
  ┌─────────────────────────┐             ┌─────────────────────────┐
  │         USERS           │             │        PROJECTS         │
  ├─────────────────────────┤             ├─────────────────────────┤
  │ PK  Id (int)            │             │ PK  Id (int)            │
  │     Email (nvarchar)    │             │     Name (nvarchar)     │
  │     PasswordHash        │             │     Description         │
  │     Role                │             │     GitHubRepoName      │
  │     GitHubUsername      │             │     CreatedAt           │
  │     IsActive            │             └────────────┬────────────┘
  │     CreatedAt           │                          │
  └────────────┬────────────┘                          │
               │ 1                                     │ 1
               │                                       │
               │ N                                     │ N
          ┌────┴───────────────────────────────────────┴────┐
          │                      TASKS                      │
          ├─────────────────────────────────────────────────┤
          │ PK  Id (int)                                    │
          │     Title (nvarchar)                            │
          │     Description (nvarchar)                      │
          │     Status (nvarchar)                           │
          │     Priority (nvarchar)                         │
          │     DueDate (datetime2)                         │
          │ FK  ProjectId (int)                             │
          │ FK  AssignedUserId (int)                        │
          │     GitHubPrNumber (int, nullable)              │
          │     CreatedAt (datetime2)                       │
          └─────────────────────────────────────────────────┘
```

---

## 4. Enterprise Security & Resilience Guardrails

| Guardrail Area | Mechanism | Implementation Detail |
| :--- | :--- | :--- |
| **Password Storage** | PBKDF2 with HMAC-SHA512 | `Microsoft.AspNetCore.Identity.PasswordHasher<User>` |
| **Information Leakage** | Strict DTO Projections | Sensitive internal fields omitted in response contracts |
| **Exception Safety** | RFC 7807 Problem Details | Centralized `GlobalExceptionMiddleware` prevents stack traces |
| **Input Sanitization** | Server-Side DataAnnotations | `[Required]`, `[EmailAddress]`, `[RegularExpression]` on DTOs |
| **Query Performance** | Deferred SQL Execution | EF Core generates single SQL query for filtering + pagination |
| **Config Hardening** | Git Secret Defense | `secrets.json`, `*.local.json`, and `logs/` ignored in git |

---

## 5. Upcoming Capabilities Roadmap

```
Day 4: JWT Authentication Engine & Role-Based Access Control (RBAC)
  ├── POST /api/auth/login (Credential verification & Token issue)
  ├── Cryptographic JWT Bearer Token (Claims: Sub, Email, Role)
  └── Endpoint Authorization Guardrails ([Authorize(Roles = "Admin")])

Day 5: GitHub Enterprise Live Integration
  ├── Octokit / HttpClient REST integration
  ├── Pull Request status synchronization with Task entity
  └── Auto-closure of Tasks on GitHub PR Merge

Day 6: Modern Enterprise Frontend (React + TypeScript)
  ├── Interactive Kanban / Task DataGrid
  └── Axios HTTP Client with JWT interceptors

Day 7 & 8: Enterprise Quality, CI/CD & Production Hardening
  ├── xUnit Integration & Unit Testing Suite
  ├── Automated GitHub Actions CI Pipeline
  └── Production Docker Containerization
```

