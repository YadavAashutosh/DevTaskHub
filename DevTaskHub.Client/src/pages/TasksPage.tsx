import React, { useState, useMemo } from 'react';
import type { TaskDto, CreateTaskDto, TaskStatusType, TaskPriorityType } from '../types';
import { useDebounce } from '../hooks';
import { Button } from '../components/common';
import { TaskForm } from '../components/tasks';
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
  // ZERO SEED DATA: State clean empty shuru hoti hai (strictly user-driven)
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'All' | TaskPriorityType>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debounced search for smooth responsive filtering
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Lifting State Up: TaskForm se naya task add karna
  const handleAddTask = (newTaskDto: CreateTaskDto) => {
    const newTask: TaskDto = {
      id: (Date.now() % 9000) + 1000,
      title: newTaskDto.title,
      description: newTaskDto.description || null,
      status: newTaskDto.status,
      priority: newTaskDto.priority,
      projectId: newTaskDto.projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    setIsModalOpen(false);
  };

  // Cycle status: Todo -> InProgress -> Done -> Todo
  const handleToggleStatus = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        let nextStatus: TaskStatusType;
        if (t.status === 'Todo') nextStatus = 'InProgress';
        else if (t.status === 'InProgress') nextStatus = 'Done';
        else nextStatus = 'Todo';

        return { ...t, status: nextStatus, updatedAt: new Date().toISOString() };
      })
    );
  };

  const handleDeleteTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleResetBoard = () => {
    setSearchQuery('');
    setPriorityFilter('All');
  };

  // Filter tasks based on debounced search text and priority dropdown
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const query = debouncedSearch.trim().toLowerCase();
      const matchesSearch =
        !query ||
        t.title.toLowerCase().includes(query) ||
        t.id.toString().includes(query);

      const matchesPriority =
        priorityFilter === 'All' || t.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, debouncedSearch, priorityFilter]);

  const getPriorityBadgeClass = (priority: TaskPriorityType) => {
    switch (priority) {
      case 'High':
        return styles.priorityHigh;
      case 'Medium':
        return styles.priorityMedium;
      case 'Low':
      default:
        return styles.priorityLow;
    }
  };

  const getNextStatusLabel = (status: TaskStatusType) => {
    switch (status) {
      case 'Todo':
        return 'Start →';
      case 'InProgress':
        return 'Done ✓';
      case 'Done':
        return 'Reopen ↺';
    }
  };

  return (
    <div className={styles.container}>
      {/* DevTaskHub Breadcrumbs */}
      <div className={styles.breadcrumbs}>
        <span>DevTaskHub</span> &bull; <span>Sprint Workspace</span> &bull; Active Board
      </div>

      {/* Top Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Tasks</h1>
          <span className={styles.taskCount}>
            {filteredTasks.length} of {tasks.length} tasks
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={handleResetBoard}>
            Reset filters
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            + New task
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by title or #ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filtersGroup}>
          <select
            className={styles.filterSelect}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'All' | TaskPriorityType)}
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {(searchQuery || priorityFilter !== 'All') && (
            <Button variant="secondary" size="sm" onClick={handleResetBoard}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* 3-Column Kanban Board Grid */}
      <div className={styles.kanbanGrid}>
        {COLUMNS.map((column) => {
          const columnTasks = filteredTasks.filter((t) => t.status === column.key);

          return (
            <div key={column.key} className={styles.column}>
              {/* Column Header */}
              <div className={styles.columnHeader}>
                <div className={`${styles.columnPill} ${column.pillClass}`}>
                  <span className={styles.columnCount}>{columnTasks.length}</span>
                  <span>{column.title}</span>
                </div>
                <button
                  type="button"
                  className={styles.advanceBtn}
                  onClick={() => setIsModalOpen(true)}
                  title={`Add task to ${column.title}`}
                >
                  +
                </button>
              </div>

              {/* Card List */}
              <div className={styles.cardList}>
                {columnTasks.length === 0 ? (
                  <div className={styles.emptyColumn}>No tasks in this stage</div>
                ) : (
                  columnTasks.map((task) => (
                    <div key={task.id} className={styles.kanbanCard}>
                      <div className={styles.cardTopRow}>
                        <h4 className={styles.cardTitle}>{task.title}</h4>
                        <span className={styles.cardId}>#{task.id}</span>
                      </div>

                      {task.description && (
                        <div className={styles.cardPhase}>{task.description}</div>
                      )}

                      <div className={styles.cardTagsRow}>
                        <span
                          className={`${styles.priorityBadge} ${getPriorityBadgeClass(
                            task.priority
                          )}`}
                        >
                          🚩 {task.priority}
                        </span>
                      </div>

                      <div className={styles.cardBottomRow}>
                        <div className={styles.avatar} title="DevTaskHub Member">
                          DH
                        </div>
                        <div className={styles.cardActions}>
                          <button
                            type="button"
                            className={styles.advanceBtn}
                            onClick={() => handleToggleStatus(task.id)}
                            title="Advance Status"
                          >
                            {getNextStatusLabel(task.status)}
                          </button>
                          <button
                            type="button"
                            className={styles.advanceBtn}
                            onClick={() => handleDeleteTask(task.id)}
                            title="Delete Task"
                            style={{ color: '#dc2626' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Dialog for Creating Task */}
      {isModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create DevTask</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsModalOpen(false)}
                title="Close modal"
              >
                ✕
              </button>
            </div>
            <TaskForm onAddTask={handleAddTask} />
          </div>
        </div>
      )}
    </div>
  );
};


