import React from 'react';
import type { TaskDto, TaskPriorityType, TaskStatusType } from '../../../types';
import { Badge } from '../../common';
import styles from './TaskCard.module.css';

export interface TaskCardProps {
  task: TaskDto;
  onToggleStatus: (id: number) => void;
  onDelete: (id: number) => void;
  onOpenLinkPrModal?: (taskId: number) => void;
  onCardClick?: (task: TaskDto) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onToggleStatus, 
  onDelete, 
  onOpenLinkPrModal,
  onCardClick
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
        return 'Review →';
      case 'InReview':
        return 'Done ✓';
      case 'Done':
        return 'Reopen ↺';
    }
  };

  const assigneeName = task.assignedUserFullName || (task.assignedUserEmail ? task.assignedUserEmail.split('@')[0] : 'Unassigned');
  const assigneeInitials = task.assignedUserFullName 
    ? task.assignedUserFullName.substring(0, 2).toUpperCase() 
    : (task.assignedUserEmail ? task.assignedUserEmail.substring(0, 2).toUpperCase() : 'DH');
  const gitHubUsername = task.assignedUserGitHubUsername;

  return (
    <div 
      className={styles.kanbanCard}
      onClick={() => onCardClick?.(task)}
      title="Click to view task details, comments, and GitHub activity"
    >
      {/* Top Row: Title & #ID */}
      <div className={styles.cardTopRow}>
        <h4 className={`${styles.cardTitle} ${task.status === 'Done' ? styles.completedTitle : ''}`}>
          {task.title}
        </h4>
        <span className={styles.cardId}>#{task.id} ↗</span>
      </div>

      {/* Project Subtitle */}
      {task.projectName && (
        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>📁</span>
          <span style={{ fontWeight: 600 }}>{task.projectName}</span>
        </div>
      )}

      {/* Optional Description / Technical Notes */}
      {task.description && (
        <p className={styles.cardDescription}>{task.description}</p>
      )}

      {/* Tags & Badges Row (Atomic Badge Component & GitHub PR) */}
      <div className={styles.cardTagsRow}>
        <Badge variant={getPriorityBadgeVariant(task.priority)}>
          🚩 {task.priority}
        </Badge>

        {task.dueDate && (
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
            📅 {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
        )}

        {task.gitHubPrNumber ? (
          <a
            href={task.gitHubPrUrl || `https://github.com/dotnet/aspnetcore/pull/${task.gitHubPrNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.prLink}
            onClick={(e) => e.stopPropagation()}
            title={task.gitHubPrTitle ? `${task.gitHubPrTitle} (Click to open on GitHub)` : `View GitHub PR #${task.gitHubPrNumber}`}
          >
            <Badge 
              variant={
                task.gitHubPrIsMerged || task.gitHubPrStatus?.toLowerCase() === 'merged'
                  ? 'purple'
                  : task.gitHubPrStatus?.toLowerCase() === 'open'
                  ? 'green'
                  : 'red'
              }
            >
              <span className={styles.prIcon}>⎇</span> PR #{task.gitHubPrNumber}
              {task.gitHubPrStatus ? ` [${task.gitHubPrStatus.toUpperCase()}]` : ''} ↗
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

      {/* Bottom Row: Member Avatar, Name & Action Buttons */}
      <div className={styles.cardBottomRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div 
            className={styles.avatar} 
            title={gitHubUsername ? `${assigneeName} (@${gitHubUsername})` : (task.assignedUserEmail || 'DevTaskHub Member')}
          >
            {gitHubUsername ? (
              <>
                <img
                  src={`https://github.com/${gitHubUsername}.png?size=64`}
                  alt={assigneeName}
                  className={styles.avatarImg}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <span className={styles.fallbackInitials} style={{ display: 'none' }}>
                  {assigneeInitials}
                </span>
              </>
            ) : (
              assigneeInitials
            )}
          </div>
          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>
            {assigneeName}
          </span>
        </div>

        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.advanceBtn}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(task.id);
            }}
            title={`Advance status from ${task.status}`}
          >
            {getNextStatusLabel(task.status)}
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            title="Delete task"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};
