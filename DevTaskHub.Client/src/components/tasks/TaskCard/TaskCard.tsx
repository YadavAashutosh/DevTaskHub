import React from 'react';
import type { TaskDto, TaskPriorityType, TaskStatusType } from '../../../types';
import { Badge } from '../../common';
import styles from './TaskCard.module.css';

export interface TaskCardProps {
  task: TaskDto;
  onToggleStatus: (id: number) => void;
  onDelete: (id: number) => void;
  onOpenLinkPrModal?: (taskId: number) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onToggleStatus, 
  onDelete, 
  onOpenLinkPrModal 
}) => {
  const getPriorityBadgeVariant = (priority: TaskPriorityType): 'red' | 'yellow' | 'neutral' => {
    switch (priority) {
      case 'High':
        return 'red';
      case 'Medium':
        return 'yellow';
      case 'Low':
      default:
        return 'neutral';
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
    <div className={styles.kanbanCard}>
      {/* Top Row: Title & #ID */}
      <div className={styles.cardTopRow}>
        <h4 className={`${styles.cardTitle} ${task.status === 'Done' ? styles.completedTitle : ''}`}>
          {task.title}
        </h4>
        <span className={styles.cardId}>#{task.id}</span>
      </div>

      {/* Optional Description / Technical Notes */}
      {task.description && (
        <p className={styles.cardDescription}>{task.description}</p>
      )}

      {/* Tags & Badges Row (Atomic Badge Component & GitHub PR) */}
      <div className={styles.cardTagsRow}>
        <Badge variant={getPriorityBadgeVariant(task.priority)}>
          🚩 {task.priority}
        </Badge>

        {task.gitHubPrNumber ? (
          <a
            href={`https://github.com/dotnet/aspnetcore/pull/${task.gitHubPrNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.prLink}
            onClick={(e) => e.stopPropagation()}
            title={`View GitHub PR #${task.gitHubPrNumber} in a new tab`}
          >
            <Badge variant="purple">
              <span className={styles.prIcon}>⎇</span> PR #{task.gitHubPrNumber} ↗
            </Badge>
          </a>
        ) : (
          onOpenLinkPrModal && (
            <button
              type="button"
              className={styles.linkPrBtn}
              onClick={(e) => {
                e.stopPropagation();
                onOpenLinkPrModal(task.id);
              }}
              title="Link a GitHub Pull Request to this task"
            >
              + Link PR
            </button>
          )
        )}
      </div>

      {/* Bottom Row: Member Avatar & Actions */}
      <div className={styles.cardBottomRow}>
        <div className={styles.avatar} title="DevTaskHub Member">
          DH
        </div>

        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.advanceBtn}
            onClick={() => onToggleStatus(task.id)}
            title="Advance status"
          >
            {getNextStatusLabel(task.status)}
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={() => onDelete(task.id)}
            title="Delete task"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};