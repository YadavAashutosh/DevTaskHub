import React, { useState, useEffect, useMemo } from 'react';
import type { TaskDto, CreateTaskDto, TaskStatusType, TaskPriorityType, ProjectDto } from '../types';
import { useDebounce } from '../hooks';
import { Button } from '../components/common';
import { TaskForm, TaskCard } from '../components/tasks';
import { taskService, projectService, githubService } from '../services';
import styles from './TasksPage.module.css';

interface ColumnConfig {
  key: TaskStatusType;
  title: string;
  pillClass: string;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'Todo', title: 'To Do', pillClass: styles.todoPill },
  { key: 'InProgress', title: 'In Progress', pillClass: styles.inProgressPill },
  { key: 'Done', title: 'Done', pillClass: styles.donePill },
];

export const TasksPage: React.FC = () => {
  // ZERO SEED DATA: State strictly live from SQL Server
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Modals
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'All' | TaskPriorityType>('All');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Link PR Modal State
  const [linkingTaskId, setLinkingTaskId] = useState<number | null>(null);
  const [linkPrNumber, setLinkPrNumber] = useState('');
  const [isLinkingPr, setIsLinkingPr] = useState(false);

  // New Project Form State
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectKey, setNewProjectKey] = useState('');

  // Debounced search for smooth responsive filtering
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Initial Data Fetching from Live Backend
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Fetch active projects and sprint tasks in parallel
        const [projectsData, tasksResponse] = await Promise.all([
          projectService.getProjects(),
          taskService.getTasks({ pageSize: 100 }),
        ]);

        if (isMounted) {
          setProjects(projectsData);
          if (projectsData.length > 0 && selectedProjectId === undefined) {
            setSelectedProjectId(projectsData[0].id);
          }
          setTasks(tasksResponse.data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Unable to connect to live tasks API. Please verify backend is running on https://localhost:7092.';
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // When user switches project dropdown
  const handleProjectChange = async (projectId: number | undefined) => {
    setSelectedProjectId(projectId);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await taskService.getTasks({
        projectId,
        pageSize: 100,
      });
      setTasks(response.data);
    } catch {
      setErrorMessage('Failed to load tasks for selected project.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create Project Handler
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectKey.trim()) return;

    try {
      const created = await projectService.createProject({
        name: newProjectName.trim(),
        projectKey: newProjectKey.trim().toUpperCase(),
      });

      setProjects((prev) => [created, ...prev]);
      setSelectedProjectId(created.id);
      setIsProjectModalOpen(false);
      setNewProjectName('');
      setNewProjectKey('');
      setErrorMessage(null);

      // Refresh task list for new project (empty [])
      setTasks([]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create project.';
      setErrorMessage(msg);
    }
  };

  // Create Task Handler (Live POST /api/tasks)
  const handleAddTask = async (newTaskDto: CreateTaskDto) => {
    const targetProjectId = selectedProjectId ?? (projects.length > 0 ? projects[0].id : undefined);

    if (!targetProjectId) {
      setErrorMessage('Please create an active project workspace before creating sprint tasks.');
      setIsTaskModalOpen(false);
      setIsProjectModalOpen(true);
      return;
    }

    try {
      const created = await taskService.createTask({
        ...newTaskDto,
        projectId: targetProjectId,
      });

      setTasks((prev) => [created, ...prev]);
      setIsTaskModalOpen(false);
      setErrorMessage(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save task to database.';
      setErrorMessage(msg);
    }
  };

  // Optimistic Status Transition with Automatic Error Rollback
  const handleToggleStatus = async (id: number) => {
    const currentTask = tasks.find((t) => t.id === id);
    if (!currentTask) return;

    let nextStatus: TaskStatusType;
    if (currentTask.status === 'Todo') nextStatus = 'InProgress';
    else if (currentTask.status === 'InProgress') nextStatus = 'Done';
    else nextStatus = 'Todo';

    // 1. Optimistic UI update (Instant visual feedback in 0ms)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: nextStatus, updatedAt: new Date().toISOString() } : t
      )
    );

    // 2. Network sync with .NET Web API
    try {
      await taskService.updateTask(id, {
        title: currentTask.title,
        description: currentTask.description || undefined,
        status: nextStatus,
        priority: currentTask.priority,
        gitHubPrNumber: currentTask.gitHubPrNumber || undefined,
        dueDate: currentTask.dueDate || undefined,
      });
    } catch (err: unknown) {
      // Automatic rollback on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: currentTask.status } : t))
      );
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

    try {
      await taskService.deleteTask(id);
      setErrorMessage(null);
    } catch (err: unknown) {
      // Rollback
      setTasks(backupTasks);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setErrorMessage('Access Denied (403): Only Administrators can permanently delete sprint tasks.');
      } else {
        setErrorMessage('Failed to delete task from database. Operation rolled back.');
      }
    }
  };

  // Open Link PR Modal
  const handleOpenLinkPrModal = (taskId: number) => {
    setLinkingTaskId(taskId);
    setLinkPrNumber('');
  };

  // Submit Link PR to Backend
  const handleLinkPrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingTaskId || !linkPrNumber.trim()) return;

    const prNum = parseInt(linkPrNumber.trim(), 10);
    if (isNaN(prNum) || prNum <= 0) {
      setErrorMessage('Please enter a valid positive Pull Request number.');
      return;
    }

    setIsLinkingPr(true);
    setErrorMessage(null);

    try {
      await githubService.linkPullRequest(linkingTaskId, {
        pullRequestNumber: prNum,
      });

      // Update task in state with linked PR
      setTasks((prev) =>
        prev.map((t) => (t.id === linkingTaskId ? { ...t, gitHubPrNumber: prNum } : t))
      );

      setLinkingTaskId(null);
      setLinkPrNumber('');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to link GitHub Pull Request to task.';
      setErrorMessage(msg);
    } finally {
      setIsLinkingPr(false);
    }
  };

  // Derived filtered tasks for active project and search/priority filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(debouncedSearch.toLowerCase()));

      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, debouncedSearch, priorityFilter]);

  // Metric counts derived purely from active state
  const metrics = useMemo(() => {
    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'Todo').length,
      inProgress: tasks.filter((t) => t.status === 'InProgress').length,
      completed: tasks.filter((t) => t.status === 'Done').length,
    };
  }, [tasks]);

  return (
    <div className={styles.pageContainer}>
      {/* Top Header & Breadcrumb Bar */}
      <header className={styles.header}>
        <div className={styles.headerTitleRow}>
          <div>
            <div className={styles.breadcrumb}>
              <span>DevTaskHub</span>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span>Sprint Workspace</span>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span className={styles.activeBreadcrumb}>Active Board</span>
            </div>
            <h1 className={styles.pageTitle}>Sprint Task Board</h1>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => setIsProjectModalOpen(true)}>
              + New Project
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsTaskModalOpen(true)}>
              + New task
            </Button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#b91c1c',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Control Bar: Project Selector, Search, Filter Pills & Metric Counters */}
        <div className={styles.controlBar}>
          <div className={styles.leftControls}>
            {/* Project Selector Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Project:</span>
              <select
                className={styles.projectSelect}
                value={selectedProjectId ?? ''}
                onChange={(e) =>
                  handleProjectChange(e.target.value ? Number(e.target.value) : undefined)
                }
              >
                {projects.length === 0 ? (
                  <option value="">No Projects (Click + New Project)</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.projectKey}] {p.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search sprint tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />

            {/* Priority Filter Pills */}
            <div className={styles.filterPills}>
              {(['All', 'High', 'Medium', 'Low'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`${styles.filterPill} ${priorityFilter === p ? styles.activeFilterPill : ''}`}
                  onClick={() => setPriorityFilter(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Real-Time Metrics Counters */}
          <div className={styles.metricsRow}>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Total</span>
              <span className={styles.metricValue}>{metrics.total}</span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>To Do</span>
              <span className={styles.metricValue}>{metrics.todo}</span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>In Progress</span>
              <span className={styles.metricValue}>{metrics.inProgress}</span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Completed</span>
              <span className={styles.metricValue}>{metrics.completed}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Board Kanban Columns */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className={styles.spinner} />
          <p style={{ marginTop: '12px', fontSize: '13px' }}>Loading tasks from database...</p>
        </div>
      ) : (
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

                {/* Card List Rendering via Atomic TaskCard Component */}
                <div className={styles.cardList}>
                  {columnTasks.length === 0 ? (
                    <div className={styles.emptyColumn}>No tasks in this stage</div>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleStatus={handleToggleStatus}
                        onDelete={handleDeleteTask}
                        onOpenLinkPrModal={handleOpenLinkPrModal}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            <TaskForm onAddTask={handleAddTask} />
          </div>
        </div>
      )}

      {/* Modal Dialog for Creating Project */}
      {isProjectModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsProjectModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create Project Workspace</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsProjectModalOpen(false)}
                title="Close modal"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="e.g. Core API Service"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Project Key (Max 10 chars) *
                </label>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="e.g. DTH, API, WEB"
                  value={newProjectKey}
                  onChange={(e) => setNewProjectKey(e.target.value)}
                  maxLength={10}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
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
      {linkingTaskId && (
        <div className={styles.modalBackdrop} onClick={() => setLinkingTaskId(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>⎇ Link GitHub Pull Request</h3>
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
                Link Task #{linkingTaskId} to a GitHub Pull Request to track PR review and merge status.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Pull Request Number *
                </label>
                <input
                  type="number"
                  className={styles.searchInput}
                  placeholder="e.g. 1403"
                  value={linkPrNumber}
                  onChange={(e) => setLinkPrNumber(e.target.value)}
                  required
                  min={1}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <Button variant="secondary" size="sm" onClick={() => setLinkingTaskId(null)} disabled={isLinkingPr}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isLinkingPr}>
                  {isLinkingPr ? 'Linking...' : 'Link PR'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};