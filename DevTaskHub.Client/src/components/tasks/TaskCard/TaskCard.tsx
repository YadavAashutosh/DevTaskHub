import React from 'react';
import type { TaskDto, TaskPriorityType, TaskStatusType } from '../../../types';
import { Badge } from '../../common';
import { useAuth } from '../../../hooks';
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
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';

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

  const assigneesList = task.assignees && task.assignees.length > 0
    ? task.assignees
    : (task.assignedUserId ? [{
        userId: task.assignedUserId,
        fullName: task.assignedUserFullName || '',
        email: task.assignedUserEmail || '',
        role: 'Developer' as const,
        gitHubUsername: task.assignedUserGitHubUsername
      }] : []);

  const assigneeDisplayName = assigneesList.length === 0
    ? 'Unassigned'
    : assigneesList.length === 1
    ? (assigneesList[0].fullName || assigneesList[0].email.split('@')[0])
    : assigneesList.length === 2
    ? `${assigneesList[0].fullName || assigneesList[0].email.split('@')[0]} & ${assigneesList[1].fullName || assigneesList[1].email.split('@')[0]}`
    : `${assigneesList[0].fullName || assigneesList[0].email.split('@')[0]} +${assigneesList.length - 1}`;

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
          <span>{task.projectName}</span>
        </div>
      )}

      {/* Badges Row: Priority, Due Date */}
      <div className={styles.cardBadges}>
        <Badge variant={getPriorityBadgeVariant(task.priority)}>
          {task.priority === 'High' ? '🔴' : task.priority === 'Medium' ? '🟡' : '🟢'} {task.priority}
        </Badge>
        {task.dueDate && (
          <span className={styles.dueDateBadge}>
            📅 {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* GitHub PR Connection Badge */}
      <div className={styles.prBadgeWrapper}>
        {task.gitHubPrNumber ? (
          <div className={styles.prConnectedPill}>
            <span className={styles.prIcon}>⎇</span>
            <a 
              href={task.gitHubPrUrl || `https://github.com/YadavAashutosh/DevTaskHub/pull/${task.gitHubPrNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.prLink}
              onClick={(e) => e.stopPropagation()}
              title={task.gitHubPrTitle ? `PR #${task.gitHubPrNumber}: ${task.gitHubPrTitle}` : `Open PR #${task.gitHubPrNumber}`}
            >
              PR #{task.gitHubPrNumber}
            </a>
            <span className={task.gitHubPrIsMerged ? styles.prMerged : task.gitHubPrStatus === 'CLOSED' ? styles.prClosed : styles.prOpen}>
              {task.gitHubPrIsMerged ? 'MERGED' : (task.gitHubPrStatus || 'OPEN')}
            </span>
          </div>
        ) : (
          <button
            type="button"
            className={styles.linkPrBtn}
            onClick={(e) => {
              e.stopPropagation();
              onOpenLinkPrModal?.(task.id);
            }}
            title="Link this task to an existing GitHub Pull Request"
          >
            + Link PR
          </button>
        )}
      </div>

      {/* Bottom Row: Member Avatar(s), Name & Action Buttons */}
      <div className={styles.cardBottomRow}>
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          title={assigneesList.map((a) => `${a.fullName || a.email} (@${a.gitHubUsername || 'none'})`).join(', ')}
        >
          {assigneesList.length === 0 ? (
            <div className={styles.avatar} title="Unassigned">👤</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {assigneesList.slice(0, 3).map((a, idx) => {
                const initials = a.fullName
                  ? a.fullName.substring(0, 2).toUpperCase()
                  : (a.email ? a.email.substring(0, 2).toUpperCase() : 'DH');
                return (
                  <div
                    key={a.userId}
                    className={styles.avatar}
                    style={{
                      marginLeft: idx > 0 ? '-8px' : '0',
                      zIndex: 10 - idx,
                      boxShadow: idx > 0 ? '0 0 0 1.5px #ffffff' : undefined,
                    }}
                    title={`${a.fullName || a.email} (${a.role || 'Member'})`}
                  >
                    {a.gitHubUsername ? (
                      <img
                        src={`https://github.com/${a.gitHubUsername}.png?size=64`}
                        alt={a.fullName || a.email}
                        className={styles.avatarImg}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      initials
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>
            {assigneeDisplayName}
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
          {isAdmin && (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              title="Delete task (Admin only)"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
