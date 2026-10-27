import React from 'react';
import type { TaskDto, TaskPriorityType, TaskStatusType } from '../../../types/task.types';
import { Card, Badge, Button } from '../../common';
import styles from './TaskCard.module.css';

export interface TaskCardProps {
  task: TaskDto;
  onToggleStatus: (id: number) => void;
  onDelete: (id: number) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onToggleStatus, onDelete }) => {
  const getPriorityVariant = (priority: TaskPriorityType) => {
    switch (priority) {
      case 'High': return 'purple';
      case 'Medium': return 'yellow';
      default: return 'neutral';
    }
  };

  const getStatusVariant = (status: TaskStatusType) => {
    switch (status) {
      case 'Done': return 'green';
      case 'InProgress': return 'yellow';
      default: return 'neutral';
    }
  };

  const getNextStatusLabel = (status: TaskStatusType) => {
    switch (status) {
      case 'Todo': return 'Start';
      case 'InProgress': return 'Complete';
      case 'Done': return 'Reopen';
    }
  };

  return (
    <Card className={styles.taskCard}>
      <div className={styles.header}>
        <div className={styles.badges}>
          <Badge variant={getStatusVariant(task.status)}>{task.status}</Badge>
          <Badge variant={getPriorityVariant(task.priority)}>{task.priority} Priority</Badge>
          {task.gitHubPrNumber && (
            <Badge variant="purple">PR #{task.gitHubPrNumber}</Badge>
          )}
        </div>
        <span className={styles.taskId}>#{task.id}</span>
      </div>

      <h3 className={`${styles.title} ${task.status === 'Done' ? styles.completed : ''}`}>
        {task.title}
      </h3>

      {task.description && (
        <p className={styles.description}>{task.description}</p>
      )}

      <div className={styles.footer}>
        <span className={styles.time}>{new Date(task.createdAt).toLocaleDateString()}</span>
        <div className={styles.actions}>
          <Button
            size="sm"
            variant={task.status === 'Done' ? 'secondary' : 'primary'}
            onClick={() => onToggleStatus(task.id)}
          >
            {getNextStatusLabel(task.status)}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onDelete(task.id)}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
};