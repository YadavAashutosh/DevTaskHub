import React, { useState } from 'react';
import type { CreateTaskDto, TaskPriorityType } from '../../../types/task.types';
import { Card, Input, Button } from '../../common';
import styles from './TaskForm.module.css';

export interface TaskFormProps {
  onAddTask: (task: CreateTaskDto) => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ onAddTask }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriorityType>('Medium');
  const [error, setError] = useState('');

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

    setError('');
    // Lifting state up to parent App.tsx
    onAddTask({
      title: trimmedTitle,
      description: description.trim() || undefined,
      priority,
      status: 'Todo',
      projectId: 1, // Default Enterprise Project
    });

    // Reset controlled inputs
    setTitle('');
    setDescription('');
    setPriority('Medium');
  };

  return (
    <Card className={styles.formCard}>
      <h2 className={styles.formTitle}>Create DevTask</h2>
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <Input
          label="Task Title *"
          placeholder="e.g. Implement GitHub webhook payload signature verification"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError('');
          }}
          error={error}
        />

        <div className={styles.fieldGroup}>
          <label htmlFor="task-desc" className={styles.label}>Description</label>
          <textarea
            id="task-desc"
            className={styles.textarea}
            placeholder="Details, acceptance criteria, or technical notes..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <label htmlFor="task-priority" className={styles.label}>Priority</label>
            <select
              id="task-priority"
              className={styles.select}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriorityType)}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className={styles.buttonWrapper}>
            <Button type="submit" variant="primary">Add Task</Button>
          </div>
        </div>
      </form>
    </Card>
  );
};