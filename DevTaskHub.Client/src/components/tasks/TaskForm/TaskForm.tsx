import React, { useState, useEffect } from 'react';
import type {
  CreateTaskDto,
  TaskStatusType,
  TaskPriorityType,
  ProjectDto,
  UserDto,
} from '../../../types';
import { Input, Button } from '../../common';
import { useAuth } from '../../../hooks';
import styles from './TaskForm.module.css';

export interface TaskFormProps {
  onAddTask: (task: CreateTaskDto) => void;
  onCancel?: () => void;
  projects?: ProjectDto[];
  defaultProjectId?: number;
  users?: UserDto[];
  isSubmitting?: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  onAddTask,
  onCancel,
  projects = [],
  defaultProjectId,
  users = [],
  isSubmitting = false,
}) => {
  // Logged-in user context
  const { user } = useAuth();
  const currentUserId = user?.userId ? Number(user.userId) : undefined;

  // Form Fields
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<number>(
    defaultProjectId || (projects.length > 0 ? projects[0].id : 1)
  );
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatusType>('Todo');
  const [priority, setPriority] = useState<TaskPriorityType>('Medium');
  const [assignedUserId, setAssignedUserId] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [gitHubPrInput, setGitHubPrInput] = useState('');
  const [error, setError] = useState('');

  // Update default project if prop changes
  useEffect(() => {
    if (defaultProjectId) {
      setProjectId(defaultProjectId);
    } else if (projects.length > 0 && (!projectId || projectId === 1)) {
      setProjectId(projects[0].id);
    }
  }, [defaultProjectId, projects]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError('Task title is required.');
      return;
    }
    if (trimmedTitle.length < 3) {
      setError('Task title must be at least 3 characters.');
      return;
    }
    if (!projectId) {
      setError('Please select a project for this task.');
      return;
    }

    setError('');

    // Extract PR Number whether user inputs raw number or full GitHub URL
    let parsedPr: number | undefined = undefined;
    const rawPr = gitHubPrInput.trim();
    if (rawPr) {
      if (rawPr.includes('github.com')) {
        const match = rawPr.match(/pull\/(\d+)/i);
        if (match) {
          parsedPr = parseInt(match[1], 10);
        }
      } else {
        const num = parseInt(rawPr, 10);
        if (!isNaN(num) && num > 0) {
          parsedPr = num;
        }
      }
    }

    // Submit task payload
    onAddTask({
      title: trimmedTitle,
      description: description.trim() || undefined,
      status,
      priority,
      projectId: Number(projectId),
      assignedUserId: assignedUserId ? Number(assignedUserId) : undefined,
      dueDate: dueDate || undefined,
      gitHubPrNumber: parsedPr,
    });
  };

  return (
    <div className={styles.formCard}>
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {error && <div className={styles.errorMessage}>{error}</div>}

        {/* Task Title */}
        <Input
          label="Task Title *"
          placeholder="e.g. Implement GitHub webhook payload signature verification"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError('');
          }}
        />

        {/* Project Selector */}
        <div className={styles.fieldGroup}>
          <label htmlFor="task-project" className={styles.label}>
            Target Project *
          </label>
          <select
            id="task-project"
            className={styles.select}
            value={projectId}
            onChange={(e) => setProjectId(Number(e.target.value))}
            required
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                📁 {p.name} ({p.projectKey})
              </option>
            ))}
          </select>
        </div>

        {/* Status & Priority Row */}
        <div className={styles.twoColRow}>
          <div className={styles.fieldGroup}>
            <label htmlFor="task-status" className={styles.label}>
              Initial Status
            </label>
            <select
              id="task-status"
              className={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatusType)}
            >
              <option value="Todo">To Do</option>
              <option value="InProgress">In Progress</option>
              <option value="InReview">In Review</option>
              <option value="Done">Done</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="task-priority" className={styles.label}>
              Priority
            </label>
            <select
              id="task-priority"
              className={styles.select}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriorityType)}
            >
              <option value="Low">🟢 Low</option>
              <option value="Medium">🟡 Medium</option>
              <option value="High">🔴 High</option>
            </select>
          </div>
        </div>

        {/* Assignee & Due Date Row */}
        <div className={styles.twoColRow}>
          <div className={styles.fieldGroup}>
            <label htmlFor="task-assignee" className={styles.label}>
              Assign To Team Member
            </label>
            <select
              id="task-assignee"
              className={styles.select}
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">👤 Unassigned</option>
              {currentUserId && <option value={currentUserId}>⭐ Assign to Me ({user?.fullName || user?.email})</option>}
              {users.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.fullName || u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="task-duedate" className={styles.label}>
              Due Date (Optional)
            </label>
            <input
              id="task-duedate"
              type="date"
              className={styles.dateInput}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* GitHub PR Linking */}
        <Input
          label="GitHub PR # or URL (Optional)"
          placeholder="e.g. 7 or https://github.com/owner/repo/pull/7"
          type="text"
          value={gitHubPrInput}
          onChange={(e) => setGitHubPrInput(e.target.value)}
        />

        {/* Description Textarea */}
        <div className={styles.fieldGroup}>
          <label htmlFor="task-desc" className={styles.label}>
            Description & Technical Notes
          </label>
          <textarea
            id="task-desc"
            className={styles.textarea}
            placeholder="Details, acceptance criteria, or technical notes..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Actions Row */}
        <div className={styles.actionsRow}>
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Sprint Task'}
          </Button>
        </div>
      </form>
    </div>
  );
};
