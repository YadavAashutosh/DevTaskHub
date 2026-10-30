import React, { useState, useEffect, useMemo } from 'react';
import type { TaskDto, CreateTaskDto, TaskStatusType, TaskPriorityType, ProjectDto, UserDto } from '../types';
import { useDebounce, useAuth } from '../hooks';
import { Button } from '../components/common';
import { TaskForm, TaskCard, TaskDetailDrawer } from '../components/tasks';
import { taskService, projectService, githubService, usersService } from '../services';
import styles from './TasksPage.module.css';

interface ColumnConfig {
  key: TaskStatusType;
  title: string;
  pillClass: string;
  emptyLabel: string;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'Todo', title: 'To Do', pillClass: styles.todoPill, emptyLabel: 'No tasks to do' },
  { key: 'InProgress', title: 'In Progress', pillClass: styles.inProgressPill, emptyLabel: 'No tasks in progress' },
  { key: 'InReview', title: 'Review', pillClass: styles.reviewPill, emptyLabel: 'No tasks in review' },
  { key: 'Done', title: 'Done', pillClass: styles.donePill, emptyLabel: 'No completed tasks' },
];

export const TasksPage: React.FC = () => {
  const { user } = useAuth();

  // ZERO SEED DATA: State strictly live from SQL Server
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'All' | TaskPriorityType>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | TaskStatusType>('All');
  const [isMineOnly, setIsMineOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Task Detail Slide-Over Drawer
  const [drawerTask, setDrawerTask] = useState<TaskDto | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Link PR Modal State
  const [linkingTaskId, setLinkingTaskId] = useState<number | null>(null);
  const [linkPrNumber, setLinkPrNumber] = useState('');
  const [linkOwner, setLinkOwner] = useState('YadavAashutosh');
  const [linkRepo, setLinkRepo] = useState('DevTaskHub');
  const [isLinkingPr, setIsLinkingPr] = useState(false);

  // New Project Form State
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectKey, setNewProjectKey] = useState('');
  const [newProjectOwner, setNewProjectOwner] = useState('YadavAashutosh');
  const [newProjectRepo, setNewProjectRepo] = useState('DevTaskHub');

  // Server-Side Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounced search for smooth responsive filtering
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Active selected project
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Initial & Reset Data Fetching from Live Backend
  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [projectsData, tasksResponse] = await Promise.all([
        projectService.getProjects(),
        taskService.getTasks({
          pageNumber: currentPage,
          pageSize,
          projectId: selectedProjectId,
        }),
      ]);

      setProjects(projectsData);
      setTasks(tasksResponse.data);
      setTotalCount(tasksResponse.totalRecords);
      setTotalPages(tasksResponse.totalPages);

      if (projectsData.length > 0 && selectedProjectId === undefined) {
        if (projectsData[0].gitHubRepoOwner) setLinkOwner(projectsData[0].gitHubRepoOwner);
        if (projectsData[0].gitHubRepoName) setLinkRepo(projectsData[0].gitHubRepoName);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to connect to live tasks API. Please verify backend is running on https://localhost:7092.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    usersService.getUsers().then(setUsers).catch(() => setUsers([]));
  }, [currentPage, pageSize, selectedProjectId]);

  // Filter Tasks by Project
  const handleProjectChange = (projectId?: number) => {
    setSelectedProjectId(projectId);
    const selected = projects.find((p) => p.id === projectId);
    if (selected?.gitHubRepoOwner) setLinkOwner(selected.gitHubRepoOwner);
    if (selected?.gitHubRepoName) setLinkRepo(selected.gitHubRepoName);
  };

  // Create Project Handler
  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectKey.trim()) return;

    try {
      const created = await projectService.createProject({
        name: newProjectName.trim(),
        projectKey: newProjectKey.trim().toUpperCase(),
        gitHubRepoOwner: newProjectOwner.trim() || undefined,
        gitHubRepoName: newProjectRepo.trim() || undefined,
      });

      setProjects((prev) => [...prev, created]);
      setSelectedProjectId(created.id);
      setIsProjectModalOpen(false);
      setNewProjectName('');
      setNewProjectKey('');
      setSuccessMessage(`Project "${created.name}" created successfully!`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create project. Please verify project key is unique.';
      setErrorMessage(msg);
    }
  };

  // Create Task Handler
  const handleCreateTask = async (dto: CreateTaskDto) => {
    try {
      const targetProjectId = dto.projectId || selectedProjectId || (projects.length > 0 ? projects[0].id : 1);
      const payload: CreateTaskDto = {
        ...dto,
        projectId: targetProjectId,
      };

      const newTask = await taskService.createTask(payload);
      setSelectedProjectId(undefined);
      setCurrentPage(1);
      setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
      setIsTaskModalOpen(false);
      setErrorMessage(null);
      setSuccessMessage(`Task #${newTask.id} "${newTask.title}" created successfully and reflected in All Projects!`);
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create sprint task in SQL Server.';
      setErrorMessage(msg);
    }
  };

  // Quick Column Advancement Handler
  const handleToggleStatus = async (id: number) => {
    const currentTask = tasks.find((t) => t.id === id);
    if (!currentTask) return;

    let nextStatus: TaskStatusType;
    switch (currentTask.status) {
      case 'Todo':
        nextStatus = 'InProgress';
        break;
      case 'InProgress':
        nextStatus = 'InReview';
        break;
      case 'InReview':
        nextStatus = 'Done';
        break;
      case 'Done':
      default:
        nextStatus = 'Todo';
        break;
    }

    await handleUpdateTaskStatus(id, nextStatus);
  };

  // Update Task Status
  const handleUpdateTaskStatus = async (id: number, nextStatus: TaskStatusType) => {
    const currentTask = tasks.find((t) => t.id === id);
    if (!currentTask) return;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t))
    );
    if (drawerTask?.id === id) {
      setDrawerTask((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }

    try {
      const updated = await taskService.updateTask(id, {
        title: currentTask.title,
        description: currentTask.description || undefined,
        status: nextStatus,
        priority: currentTask.priority,
        gitHubPrNumber: currentTask.gitHubPrNumber,
        assignedUserId: currentTask.assignedUserId || undefined,
        dueDate: currentTask.dueDate || undefined,
      });

      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      if (drawerTask?.id === id) {
        setDrawerTask(updated);
      }
      setErrorMessage(null);
    } catch (err: unknown) {
      // Rollback on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: currentTask.status } : t))
      );
      if (drawerTask?.id === id) {
        setDrawerTask((prev) => (prev ? { ...prev, status: currentTask.status } : null));
      }
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update task status on server. Rolled back.';
      setErrorMessage(msg);
    }
  };

  // Delete Task Handler (Live DELETE /api/tasks/{id})
  const handleDeleteTask = async (id: number) => {
    const backupTasks = [...tasks];

    // Optimistic removal
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (drawerTask?.id === id) {
      setIsDrawerOpen(false);
      setDrawerTask(null);
    }

    try {
      await taskService.deleteTask(id);
      setErrorMessage(null);
      setSuccessMessage(`Task #${id} deleted.`);
    } catch (err: unknown) {
      setTasks(backupTasks);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setErrorMessage('Access Denied (403): Only Administrators can permanently delete sprint tasks.');
      } else {
        setErrorMessage('Failed to delete task from database. Operation rolled back.');
      }
    }
  };

  // Open Slide-Over Drawer
  const handleOpenDrawer = (task: TaskDto) => {
    setDrawerTask(task);
    setIsDrawerOpen(true);
  };

  // Drawer Task Updated Callback
  const handleDrawerTaskUpdated = (updatedTask: TaskDto) => {
    setDrawerTask(updatedTask);
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  };

  // Open Link PR Modal
  const handleOpenLinkPrModal = (taskId: number) => {
    setLinkingTaskId(taskId);
    setLinkPrNumber('');
    if (currentProject?.gitHubRepoOwner) setLinkOwner(currentProject.gitHubRepoOwner);
    if (currentProject?.gitHubRepoName) setLinkRepo(currentProject.gitHubRepoName);
  };

  // Submit Link PR to Backend
  const handleLinkPrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingTaskId || !linkPrNumber.trim()) return;

    let prNum = parseInt(linkPrNumber.trim(), 10);
    let owner = linkOwner.trim();
    let repo = linkRepo.trim();
    const rawInput = linkPrNumber.trim();

    if (rawInput.includes('github.com')) {
      const match = rawInput.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
      if (match) {
        owner = match[1];
        repo = match[2];
        prNum = parseInt(match[3], 10);
      }
    }

    if (isNaN(prNum) || prNum <= 0) {
      setErrorMessage('Please enter a valid positive Pull Request number (e.g. 9999) or GitHub PR URL.');
      return;
    }

    setIsLinkingPr(true);
    setErrorMessage(null);

    try {
      const linked = await githubService.linkPullRequest(linkingTaskId, {
        pullRequestNumber: prNum,
        pullRequestUrl: rawInput.includes('github.com') ? rawInput : undefined,
        owner: owner || undefined,
        repo: repo || undefined,
      });

      // Update task in state with linked PR details
      setTasks((prev) =>
        prev.map((t) => (t.id === linkingTaskId ? { 
          ...t, 
          gitHubPrNumber: prNum,
          gitHubPrStatus: linked.state,
          gitHubPrIsMerged: linked.isMerged,
          gitHubPrUrl: linked.pullRequestUrl,
          gitHubPrTitle: linked.title
        } : t))
      );

      if (drawerTask?.id === linkingTaskId) {
        setDrawerTask((prev) => prev ? {
          ...prev,
          gitHubPrNumber: prNum,
          gitHubPrStatus: linked.state,
          gitHubPrIsMerged: linked.isMerged,
          gitHubPrUrl: linked.pullRequestUrl,
          gitHubPrTitle: linked.title
        } : null);
      }

      setLinkingTaskId(null);
      setLinkPrNumber('');
      setSuccessMessage(`Linked to GitHub PR #${prNum} ("${linked.title || `${owner}/${repo}`}") [${(linked.state || 'OPEN').toUpperCase()}]!`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        `Failed to link GitHub PR #${prNum}. Please check that the repository and PR number exist.`;
      setErrorMessage(msg);
    } finally {
      setIsLinkingPr(false);
    }
  };

  // Derived filtered tasks for active project and search/priority/mine filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Project filter
      if (selectedProjectId !== undefined && task.projectId !== selectedProjectId) {
        return false;
      }

      // Search filter
      const matchesSearch =
        task.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        task.id.toString().includes(debouncedSearch);

      // Priority filter
      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;

      // Status filter
      const matchesStatus = statusFilter === 'All' || task.status === statusFilter;

      // Mine only filter
      const matchesMine = !isMineOnly || (user?.email && task.assignedUserEmail?.toLowerCase() === user.email.toLowerCase());

      return matchesSearch && matchesPriority && matchesStatus && matchesMine;
    });
  }, [tasks, selectedProjectId, debouncedSearch, priorityFilter, statusFilter, isMineOnly, user?.email]);

  return (
    <div className={styles.pageContainer}>
      {/* Top Header & Breadcrumb Bar matching user's reference */}
      <header className={styles.header}>
        {/* Breadcrumb line: DevTask Hub · Projects · All Projects */}
        <div className={styles.breadcrumb}>
          <span>DevTask Hub</span>
          <span className={styles.breadcrumbDot}>·</span>
          <span>Projects</span>
          <span className={styles.breadcrumbDot}>·</span>
          <span className={styles.activeBreadcrumb}>
            {currentProject ? currentProject.name : 'All Projects'}
          </span>
        </div>

        {/* Title and Top Action Buttons */}
        <div className={styles.headerTitleRow}>
          <h1 className={styles.pageTitle}>Tasks</h1>

          <div className={styles.topRightActions}>
            <span className={styles.taskCountText}>
              {filteredTasks.length} of {tasks.length} tasks
            </span>
            <button
              type="button"
              className={styles.resetBoardBtn}
              onClick={loadData}
              title="Reload live tasks and pull requests from database"
            >
              Reset board
            </button>
            <Button variant="primary" size="sm" onClick={() => setIsTaskModalOpen(true)}>
              + New task
            </Button>
            <div className={styles.viewToggleGroup}>
              <button
                type="button"
                className={`${styles.viewBtn} ${viewMode === 'kanban' ? styles.activeViewBtn : ''}`}
                onClick={() => setViewMode('kanban')}
              >
                ☷ Kanban
              </button>
              <button
                type="button"
                className={`${styles.viewBtn} ${viewMode === 'list' ? styles.activeViewBtn : ''}`}
                onClick={() => setViewMode('list')}
              >
                ☰ List
              </button>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className={styles.errorBanner}>
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className={styles.bannerCloseBtn}
            >
              ✕
            </button>
          </div>
        )}

        {/* Global Success Banner */}
        {successMessage && (
          <div className={styles.successBanner}>
            <span>✅ {successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className={styles.bannerCloseBtn}
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter Bar: Search, Mine, Priority, Category, Projects */}
        <div className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search by title or #ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterDropdowns}>
            {/* Mine filter */}
            <button
              type="button"
              className={`${styles.filterBtn} ${isMineOnly ? styles.activeFilterBtn : ''}`}
              onClick={() => setIsMineOnly(!isMineOnly)}
            >
              👤 Mine
            </button>

            {/* Priority filter */}
            <div className={styles.selectWrapper}>
              <select
                className={styles.filterSelect}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as 'All' | TaskPriorityType)}
              >
                <option value="All">🚩 Priority: All</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Category / Status filter */}
            <div className={styles.selectWrapper}>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'All' | TaskStatusType)}
              >
                <option value="All">🏷️ Category: All</option>
                <option value="Todo">To Do</option>
                <option value="InProgress">In Progress</option>
                <option value="InReview">Review</option>
                <option value="Done">Done</option>
              </select>
            </div>

            {/* Projects dropdown */}
            <div className={styles.selectWrapper}>
              <select
                className={styles.filterSelect}
                value={selectedProjectId ?? ''}
                onChange={(e) =>
                  handleProjectChange(e.target.value ? Number(e.target.value) : undefined)
                }
              >
                <option value="">📁 Projects: All</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main 4-Column Board Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className={styles.spinner} />
          <p style={{ marginTop: '12px', fontSize: '13px' }}>Loading live tasks from SQL Server...</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className={styles.kanbanGrid}>
          {COLUMNS.map((column) => {
            const columnTasks = filteredTasks.filter((t) => t.status === column.key);

            return (
              <div key={column.key} className={styles.kanbanColumn}>
                {/* Column Header */}
                <div className={styles.columnHeader}>
                  <div className={`${styles.columnPill} ${column.pillClass}`}>
                    <span className={styles.columnCount}>{columnTasks.length}</span>
                    <span>{column.title}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.advanceBtn}
                    onClick={() => setIsTaskModalOpen(true)}
                    title={`Add task to ${column.title}`}
                  >
                    +
                  </button>
                </div>

                <div className={styles.columnSubtext}>
                  {currentProject ? currentProject.name : 'All Projects'}
                </div>

                {/* Card List Rendering via Atomic TaskCard Component */}
                <div className={styles.cardList}>
                  {columnTasks.length === 0 ? (
                    <div className={styles.emptyDashedBox}>
                      {column.emptyLabel}
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleStatus={handleToggleStatus}
                        onDelete={handleDeleteTask}
                        onOpenLinkPrModal={handleOpenLinkPrModal}
                        onCardClick={handleOpenDrawer}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className={styles.listViewContainer}>
          <table className={styles.listTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Project</th>
                <th>Assignee</th>
                <th>GitHub PR</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No tasks found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => (
                  <tr key={t.id} onClick={() => handleOpenDrawer(t)} className={styles.listRow}>
                    <td>#{t.id}</td>
                    <td style={{ fontWeight: 600 }}>{t.title}</td>
                    <td>
                      <span className={styles.statusBadge}>{t.status}</span>
                    </td>
                    <td>{t.priority}</td>
                    <td>{t.projectName || 'Default'}</td>
                    <td>{t.assignedUserEmail ? t.assignedUserEmail.split('@')[0] : 'Unassigned'}</td>
                    <td>
                      {t.gitHubPrNumber ? (
                        <a
                          href={t.gitHubPrUrl || `https://github.com/dotnet/aspnetcore/pull/${t.gitHubPrNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                        >
                          PR #{t.gitHubPrNumber} {t.gitHubPrTitle ? `(${t.gitHubPrTitle})` : ''} ↗
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Server-Side Pagination Bar */}
      <div className={styles.paginationBar}>
        <div className={styles.paginationInfo}>
          Showing <strong>{tasks.length}</strong> of <strong>{totalCount}</strong> total tasks
        </div>

        <div className={styles.paginationControls}>
          <label style={{ fontSize: '12px', color: '#64748b' }}>Page Size:</label>
          <select
            className={styles.pageSizeSelect}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          <button
            type="button"
            className={styles.pageBtn}
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          >
            ← Previous
          </button>

          <span className={styles.pageNumText}>
            Page {currentPage} of {Math.max(totalPages, 1)}
          </span>

          <button
            type="button"
            className={styles.pageBtn}
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Slide-Over Drawer for Task Details, Comments, and GitHub PR Sync */}
      <TaskDetailDrawer
        task={drawerTask}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setDrawerTask(null);
        }}
        onStatusChange={handleUpdateTaskStatus}
        onTaskUpdated={handleDrawerTaskUpdated}
      />

      {/* Modal Dialog for Creating Task */}
      {isTaskModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsTaskModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create Sprint Task</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsTaskModalOpen(false)}
                title="Close modal"
              >
                ✕
              </button>
            </div>
            <TaskForm
              onAddTask={handleCreateTask}
              onCancel={() => setIsTaskModalOpen(false)}
              projects={projects}
              defaultProjectId={selectedProjectId}
              users={users}
            />
          </div>
        </div>
      )}

      {/* Modal Dialog for Creating Project */}
      {isProjectModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsProjectModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create New Project</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsProjectModalOpen(false)}
                title="Close modal"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateProjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="e.g. DevTask Hub Web"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Project Key (Prefix, e.g. DTH, WEB, API) *
                </label>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="e.g. DTH"
                  value={newProjectKey}
                  onChange={(e) => setNewProjectKey(e.target.value)}
                  maxLength={10}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    GitHub Owner / Username
                  </label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="e.g. YadavAashutosh"
                    value={newProjectOwner}
                    onChange={(e) => setNewProjectOwner(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    GitHub Repo Name
                  </label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="e.g. DevTaskHub"
                    value={newProjectRepo}
                    onChange={(e) => setNewProjectRepo(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                <Button variant="secondary" size="sm" onClick={() => setIsProjectModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog for Linking GitHub Pull Request */}
      {linkingTaskId !== null && (
        <div className={styles.modalBackdrop} onClick={() => setLinkingTaskId(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Link GitHub Pull Request</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setLinkingTaskId(null)}
                title="Close modal"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleLinkPrSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Link Task #{linkingTaskId} to your GitHub Pull Request to fetch live review, title, and merge status.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    GitHub Owner / Username *
                  </label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="e.g. YadavAashutosh or dotnet"
                    value={linkOwner}
                    onChange={(e) => setLinkOwner(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Repository Name *
                  </label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="e.g. DevTaskHub or aspnetcore"
                    value={linkRepo}
                    onChange={(e) => setLinkRepo(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Pull Request Number or Full PR URL *
                </label>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="e.g. 9999 or https://github.com/dotnet/aspnetcore/pull/9999"
                  value={linkPrNumber}
                  onChange={(e) => setLinkPrNumber(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <Button variant="secondary" size="sm" onClick={() => setLinkingTaskId(null)} disabled={isLinkingPr}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isLinkingPr}>
                  {isLinkingPr ? 'Connecting GitHub...' : 'Link Pull Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


export default TasksPage;
