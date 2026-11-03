import React, { useState, useEffect } from 'react';
import type {
  TaskDto,
  TaskStatusType,
  TaskPriorityType,
  CommentDto,
  TaskStatusHistoryDto,
  GitHubRepoDetailsDto,
  GitHubCommitDto,
  TaskPullRequest,
  UserDto,
  ProjectDto,
} from '../../../types';
import { Badge, Button } from '../../common';
import { taskService, githubService } from '../../../services';
import { useAuth } from '../../../hooks';
import styles from './TaskDetailDrawer.module.css';

export interface TaskDetailDrawerProps {
  task: TaskDto | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (id: number, nextStatus: TaskStatusType) => void;
  onTaskUpdated?: (updatedTask: TaskDto) => void;
  users?: UserDto[];
  projects?: ProjectDto[];
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  isOpen,
  onClose,
  onStatusChange,
  onTaskUpdated,
  users: _users = [],
  projects = [],
}) => {
  const { user } = useAuth();
  const [currentTask, setCurrentTask] = useState<TaskDto | null>(task);
  const activeTask = currentTask || task;

  const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'history'>('overview');

  // Comments state (dbo.TaskComments)
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);

  // Status History state (dbo.TaskStatusHistories)
  const [history, setHistory] = useState<TaskStatusHistoryDto[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Multi-PR state
  const [linkedPrs, setLinkedPrs] = useState<TaskPullRequest[]>([]);
  const [isAddingPr, setIsAddingPr] = useState(false);
  const [syncingPrNumber, setSyncingPrNumber] = useState<number | null>(null);
  const [unlinkingPrNumber, setUnlinkingPrNumber] = useState<number | null>(null);
  const [githubSyncFeedback, setGithubSyncFeedback] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Inline Link PR form state (Individual fields + Quick URL)
  const [inlinePrNumber, setInlinePrNumber] = useState('');
  const [inlineOwner, setInlineOwner] = useState('');
  const [inlineRepo, setInlineRepo] = useState('');
  const [inlineUrl, setInlineUrl] = useState('');
  const [isLinkingInlinePr, setIsLinkingInlinePr] = useState(false);

  // GitHub Repository & Commits state
  const [repoDetails, setRepoDetails] = useState<GitHubRepoDetailsDto | null>(null);
  const [repoCommits, setRepoCommits] = useState<GitHubCommitDto[]>([]);
  const [showCommits, setShowCommits] = useState(false);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [commitsError, setCommitsError] = useState<string | null>(null);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);

  const activeAssignees = activeTask?.assignees && activeTask.assignees.length > 0
    ? activeTask.assignees
    : (activeTask?.assignedUserId ? [{
        userId: activeTask.assignedUserId,
        fullName: activeTask.assignedUserFullName || '',
        email: activeTask.assignedUserEmail || '',
        role: 'Developer' as const,
        gitHubUsername: activeTask.assignedUserGitHubUsername
      }] : []);

  const updateTaskAssignees = async (assigneeIds: number[]) => {
    if (!activeTask) return;
    setIsUpdatingAssignee(true);
    try {
      const updated = await taskService.updateTask(activeTask.id, {
        title: activeTask.title,
        description: activeTask.description || undefined,
        status: activeTask.status,
        priority: activeTask.priority,
        gitHubPrNumber: activeTask.gitHubPrNumber,
        dueDate: activeTask.dueDate || undefined,
        assignedUserId: assigneeIds.length > 0 ? assigneeIds[0] : undefined,
        assignedUserIds: assigneeIds,
      });
      if (updated) {
        setCurrentTask(updated);
        if (onTaskUpdated) onTaskUpdated(updated);
      }
    } catch (err) {
      console.error('Failed to update task assignees:', err);
    } finally {
      setIsUpdatingAssignee(false);
    }
  };

  const handleAddAssignee = async (userId: number) => {
    if (!activeTask) return;
    const currentIds = activeAssignees.map((a) => a.userId);
    if (currentIds.includes(userId)) return;
    await updateTaskAssignees([...currentIds, userId]);
  };

  const handleRemoveAssignee = async (userId: number) => {
    if (!activeTask) return;
    const currentIds = activeAssignees.map((a) => a.userId);
    const updatedIds = currentIds.filter((id) => id !== userId);
    await updateTaskAssignees(updatedIds);
  };

  const handleAssigneeSelectChange = async (newUserIdStr: string) => {
    if (!newUserIdStr) {
      await updateTaskAssignees([]);
    } else {
      await handleAddAssignee(Number(newUserIdStr));
    }
  };

  // Sync currentTask when task prop changes
  useEffect(() => {
    setCurrentTask(task);
    if (task) {
      setInlinePrNumber(task.gitHubPrNumber ? String(task.gitHubPrNumber) : '');
      setInlineUrl(task.gitHubPrUrl || '');
    }
  }, [task]);

  // Resolve target owner & repo for GitHub queries
  const resolveOwnerRepo = (targetTask?: TaskDto | null) => {
    const t = targetTask || activeTask;
    let owner = 'YadavAashutosh';
    let repo = 'DevTaskHub';

    if (t?.gitHubPrUrl) {
      const match = t.gitHubPrUrl.match(/github\.com\/([^/]+)\/([^/]+)/i);
      if (match) {
        owner = match[1];
        repo = match[2];
      }
    } else if (t?.projectName && t.projectName !== 'Unassigned') {
      repo = t.projectName.replace(/\s+/g, '-');
    }

    return { owner, repo };
  };

  const fetchRepoDetails = async (owner: string, repo: string) => {
    try {
      const repoInfo = await githubService.getRepository(owner, repo);
      setRepoDetails(repoInfo);
    } catch {
      setRepoDetails(null);
    }
  };

  const fetchHistory = async (taskId: number) => {
    setIsLoadingHistory(true);
    try {
      const historyData = await taskService.getTaskHistory(taskId);
      setHistory(historyData);
    } catch {
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchComments = async (taskId: number) => {
    setIsLoadingComments(true);
    try {
      const commentsData = await taskService.getComments(taskId);
      setComments(commentsData);
    } catch {
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleLoadCommits = async (targetOwner?: string, targetRepo?: string) => {
    const { owner, repo } = targetOwner && targetRepo ? { owner: targetOwner, repo: targetRepo } : resolveOwnerRepo();
    setIsLoadingCommits(true);
    setCommitsError(null);
    setShowCommits(true);
    try {
      const commits = await githubService.getRepositoryCommits(owner, repo, 5);
      setRepoCommits(commits);
      if (commits.length === 0) {
        setCommitsError(`No commits found for repository "${owner}/${repo}".`);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      const status = axiosErr?.response?.status;
      const msg = axiosErr?.response?.data?.message || 'Failed to fetch commits from GitHub.';
      const isRateLimit = status === 429 || msg.toLowerCase().includes('rate limit');
      setCommitsError(isRateLimit ? `⚠️ GitHub API Rate Limit Exceeded: ${msg}` : `⚠️ ${msg}`);
    } finally {
      setIsLoadingCommits(false);
    }
  };

  const fetchTaskPrs = async (taskId: number) => {
    try {
      const prs = await githubService.getTaskPullRequests(taskId);
      setLinkedPrs(prs);
      if (prs.length > 0) {
        const { owner, repo } = resolveOwnerRepo(task);
        fetchRepoDetails(owner, repo);
        handleLoadCommits(owner, repo);
      }
    } catch {
      // Non-blocking
    }
  };

  // Fetch comments, history, and repo details when drawer opens or task changes
  useEffect(() => {
    if (!isOpen || !task) return;

    setGithubSyncFeedback(null);
    setIsAddingPr(false);
    setInlinePrNumber(task.gitHubPrNumber ? String(task.gitHubPrNumber) : '');
    setInlineUrl(task.gitHubPrUrl || '');
    setInlineOwner('');
    setInlineRepo('');
    setEditingCommentId(null);
    setShowCommits(false);
    setRepoCommits([]);
    setCommitsError(null);

    fetchComments(task.id);
    fetchHistory(task.id);
    if (task.pullRequests && task.pullRequests.length > 0) {
      setLinkedPrs(task.pullRequests);
    }
    fetchTaskPrs(task.id);
    if (task.gitHubPrNumber) {
      const { owner, repo } = resolveOwnerRepo(task);
      fetchRepoDetails(owner, repo);
      handleLoadCommits(owner, repo);
    } else {
      setRepoDetails(null);
    }
  }, [isOpen, task?.id, task?.gitHubPrNumber, task?.gitHubPrUrl]);

  if (!isOpen || !activeTask) return null;

  // -------------------------------------------------------------
  // COMMENT HANDLERS (Create, Edit & Soft-Delete)
  // -------------------------------------------------------------

  // Add Comment Handler (Live POST /api/tasks/{id}/comments)
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmittingComment || !activeTask) return;

    setIsSubmittingComment(true);
    try {
      const created = await taskService.addComment(activeTask.id, newCommentText.trim());
      setComments((prev) => [...prev, created]);
      setNewCommentText('');
    } catch {
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Start editing a comment
  const handleStartEditComment = (comment: CommentDto) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.body);
  };

  // Cancel editing comment
  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  // Save edited comment (Live PUT /api/tasks/{id}/comments/{commentId})
  const handleSaveEditComment = async (commentId: number) => {
    if (!editingCommentText.trim() || isUpdatingComment || !activeTask) return;

    setIsUpdatingComment(true);
    try {
      const updated = await taskService.updateComment(activeTask.id, commentId, editingCommentText.trim());
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, body: updated.body, updatedAtUtc: updated.updatedAtUtc || new Date().toISOString() } : c))
      );
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch {
      alert('Failed to update comment. Please check your network connection.');
    } finally {
      setIsUpdatingComment(false);
    }
  };

  // Soft-delete comment (Live DELETE /api/tasks/{id}/comments/{commentId})
  const handleDeleteComment = async (commentId: number) => {
    if (!activeTask || !window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await taskService.deleteComment(activeTask.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      alert('Failed to delete comment.');
    }
  };

  // -------------------------------------------------------------
  // GITHUB PULL REQUEST HANDLERS (Sync, Link, Change, Unlink)
  // -------------------------------------------------------------

  // Helper to sync URL when individual fields below change
  const syncUrlFromFields = (ownerVal: string, repoVal: string, prNumVal: string) => {
    const o = ownerVal.trim();
    const r = repoVal.trim();
    const p = prNumVal.trim();
    if (o && r && p) {
      setInlineUrl(`https://github.com/${o}/${r}/pull/${p}`);
    } else if (o && p) {
      setInlineUrl(`https://github.com/${o}/DevTaskHub/pull/${p}`);
    } else if (p) {
      setInlineUrl(`https://github.com/YadavAashutosh/DevTaskHub/pull/${p}`);
    }
  };

  // URL input handler with smart autofill
  const handleInlineUrlChange = (val: string) => {
    setInlineUrl(val);
    const match = val.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
    if (match) {
      setInlineOwner(match[1]);
      setInlineRepo(match[2]);
      setInlinePrNumber(match[3]);
    }
  };

  const handleInlineOwnerChange = (val: string) => {
    setInlineOwner(val);
    syncUrlFromFields(val, inlineRepo, inlinePrNumber);
  };

  const handleInlineRepoChange = (val: string) => {
    setInlineRepo(val);
    syncUrlFromFields(inlineOwner, val, inlinePrNumber);
  };

  const handleInlinePrNumberChange = (val: string) => {
    setInlinePrNumber(val);
    syncUrlFromFields(inlineOwner, inlineRepo, val);
  };

  // Link or Change PR directly from drawer
  const handleLinkPrDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    let prNum = parseInt(inlinePrNumber.trim(), 10);
    let owner = inlineOwner.trim() || undefined;
    let repo = inlineRepo.trim() || undefined;
    const url = inlineUrl.trim();

    if (url && (isNaN(prNum) || prNum <= 0)) {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
      if (match) {
        owner = match[1];
        repo = match[2];
        prNum = parseInt(match[3], 10);
      }
    }

    if (isNaN(prNum) || prNum <= 0) {
      alert('Please enter a valid PR number (e.g. 7) or full GitHub PR URL.');
      return;
    }

    setIsLinkingInlinePr(true);
    setGithubSyncFeedback(null);
    try {
      const linked = await githubService.linkPullRequest(activeTask.id, {
        pullRequestNumber: prNum,
        pullRequestUrl: url || (owner && repo ? `https://github.com/${owner}/${repo}/pull/${prNum}` : undefined),
        owner,
        repo,
      });

      const updated: TaskDto = {
        ...activeTask,
        gitHubPrNumber: prNum,
        gitHubPrStatus: linked.state,
        gitHubPrIsMerged: linked.isMerged,
        gitHubPrUrl: linked.pullRequestUrl,
        gitHubPrTitle: linked.title,
      };

      setCurrentTask(updated);
      onTaskUpdated?.(updated);
      setIsAddingPr(false);
      setGithubSyncFeedback({
        message: `Connected to GitHub PR #${prNum} ("${linked.title || 'PR'}")!`,
        type: 'success',
      });

      // IMMEDIATELY re-fetch repo details and history so UI below updates without page refresh!
      const targetOwner = owner || resolveOwnerRepo(updated).owner;
      const targetRepo = repo || resolveOwnerRepo(updated).repo;
      fetchRepoDetails(targetOwner, targetRepo);
      fetchHistory(activeTask.id);
      handleLoadCommits(targetOwner, targetRepo);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      const status = axiosErr?.response?.status;
      const msg = axiosErr?.response?.data?.message || `Could not link PR #${prNum}. Please check that the PR exists on GitHub.`;
      const isRateLimit = status === 429 || msg.toLowerCase().includes('rate limit');

      setGithubSyncFeedback({
        message: isRateLimit ? `⚠️ ${msg}` : msg,
        type: isRateLimit ? 'warning' : 'error',
      });
      alert(msg);
    } finally {
      setIsLinkingInlinePr(false);
    }
  };

  // Sync a specific PR from the multi-PR list
  const handleSyncSpecificPr = async (prNum: number) => {
    if (!activeTask) return;
    setSyncingPrNumber(prNum);
    setGithubSyncFeedback(null);
    try {
      const synced = await githubService.syncPullRequest(activeTask.id, prNum);
      setLinkedPrs((prev) => prev.map((p) => (p.pullRequestNumber === prNum ? synced : p)));

      // Auto-advance task status to Done if PR merged
      if (synced.isMerged && activeTask.status !== 'Done') {
        const updatedDone: TaskDto = { ...activeTask, status: 'Done', gitHubPrIsMerged: true, gitHubPrStatus: 'merged' };
        setCurrentTask(updatedDone);
        onTaskUpdated?.(updatedDone);
        await taskService.updateTask(activeTask.id, {
          title: activeTask.title,
          status: 'Done',
          priority: activeTask.priority,
        });
        fetchHistory(activeTask.id);
      }

      setGithubSyncFeedback({
        message: `PR #${prNum} synced! [${(synced.state || 'OPEN').toUpperCase()}]`,
        type: 'success',
      });
    } catch {
      setGithubSyncFeedback({
        message: `Failed to sync PR #${prNum}.`,
        type: 'error',
      });
    } finally {
      setSyncingPrNumber(null);
    }
  };

  // Unlink a specific PR from the multi-PR list
  const handleUnlinkSpecificPr = async (prNum: number) => {
    if (!activeTask) return;
    if (!window.confirm(`Unlink PR #${prNum} from this task?`)) return;

    setUnlinkingPrNumber(prNum);
    try {
      await githubService.unlinkPullRequest(activeTask.id, prNum);
      const remaining = linkedPrs.filter((p) => p.pullRequestNumber !== prNum);
      setLinkedPrs(remaining);

      const latest = remaining[0];
      const updated: TaskDto = {
        ...activeTask,
        gitHubPrNumber: latest ? latest.pullRequestNumber : undefined,
        gitHubPrStatus: latest ? latest.state : undefined,
        gitHubPrIsMerged: latest ? latest.isMerged : undefined,
        gitHubPrUrl: latest ? latest.pullRequestUrl : undefined,
        gitHubPrTitle: latest ? latest.title : undefined,
      };

      setCurrentTask(updated);
      onTaskUpdated?.(updated);
      setGithubSyncFeedback({
        message: `PR #${prNum} unlinked successfully.`,
        type: 'success',
      });
      fetchHistory(activeTask.id);
    } catch {
      alert(`Failed to unlink PR #${prNum}.`);
    } finally {
      setUnlinkingPrNumber(null);
    }
  };

  // Helper to check edit/delete permissions: ONLY the author who commented can edit/delete
  const canModifyComment = (comment: CommentDto) => {
    if (!user) return false;
    const currentUserId = Number(user.userId ?? (user as any).id);
    const authorId = Number(comment.authorUserId);
    const isSameEmail = Boolean(user.email && comment.authorEmail && user.email.toLowerCase() === comment.authorEmail.toLowerCase());
    const isSameName = Boolean(user.fullName && comment.authorName && user.fullName.toLowerCase() === comment.authorName.toLowerCase());
    return (currentUserId > 0 && currentUserId === authorId) || isSameEmail || isSameName;
  };

  const handlePrioritySelectChange = async (nextPriority: TaskPriorityType) => {
    if (!activeTask || isUpdatingPriority) return;
    setIsUpdatingPriority(true);
    const updated: TaskDto = { ...activeTask, priority: nextPriority };
    setCurrentTask(updated);
    onTaskUpdated?.(updated);
    try {
      await taskService.updateTask(activeTask.id, {
        title: activeTask.title,
        description: activeTask.description || undefined,
        priority: nextPriority,
        status: activeTask.status,
        assignedUserId: activeTask.assignedUserId || undefined,
        dueDate: activeTask.dueDate || undefined,
      });
      fetchHistory(activeTask.id);
    } catch {
      alert('Failed to update task priority.');
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const handleStatusSelectChange = (nextStatus: TaskStatusType) => {
    const updated: TaskDto = { ...activeTask, status: nextStatus };
    setCurrentTask(updated);
    onStatusChange(activeTask.id, nextStatus);
    onTaskUpdated?.(updated);
    fetchHistory(activeTask.id);
  };

  return (
    <div className={styles.drawerBackdrop} onClick={onClose}>
      <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <header className={styles.drawerHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.taskKey}>#{activeTask.id}</span>
            <div className={styles.statusDropdownWrapper}>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Priority:</label>
              <select
                className={styles.statusSelect}
                value={activeTask.priority}
                disabled={isUpdatingPriority}
                onChange={(e) => handlePrioritySelectChange(e.target.value as TaskPriorityType)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className={styles.statusDropdownWrapper}>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Status:</label>
              <select
                className={styles.statusSelect}
                value={activeTask.status}
                onChange={(e) => handleStatusSelectChange(e.target.value as TaskStatusType)}
              >
                <option value="Todo">To Do</option>
                <option value="InProgress">In Progress</option>
                <option value="InReview">Review</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div className={styles.statusDropdownWrapper}>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Assignee:</label>
              <select
                className={styles.statusSelect}
                value={activeTask.assignedUserId || ''}
                onChange={(e) => handleAssigneeSelectChange(e.target.value)}
                disabled={isUpdatingAssignee}
                title="Assign task to project member"
              >
                <option value="">ðŸ‘¤ Unassigned</option>
                {(() => {
                  const currentProj = projects.find((p) => p.id === activeTask.projectId);
                  const assignableMembers = currentProj?.members && currentProj.members.length > 0
                    ? currentProj.members
                    : [];
                  return assignableMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName || m.email.split('@')[0]} ({m.projectRole || m.role})
                    </option>
                  ));
                })()}
              </select>
              {isUpdatingAssignee && <span style={{ fontSize: '11px', marginLeft: '2px' }}>â³</span>}
            </div>
          </div>

          <button type="button" className={styles.closeBtn} onClick={onClose} title="Close drawer">
            ✕
          </button>
        </header>

        {/* Task Title & Project Meta */}
        <div className={styles.titleSection}>
          <h2 className={styles.taskTitle}>{activeTask.title}</h2>
          <div className={styles.metaRow}>
            <span className={styles.projectTag}>📁 {activeTask.projectName || 'Default Project'}</span>
            <span className={styles.metaDot}>•</span>
            <span className={styles.dueDateText}>
              📅 {activeTask.dueDate ? new Date(activeTask.dueDate).toLocaleDateString() : 'No due date'}
            </span>
            <span className={styles.metaDot}>•</span>
            <span className={styles.assigneeText}>
              <span>👥 {activeAssignees.length > 0 ? `${activeAssignees.length} assigned` : 'Unassigned'}</span>
            </span>
          </div>

          {/* Dedicated Multi-Assignee Roster */}
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Assigned Members:</span>
            {activeAssignees.map((a) => (
              <span
                key={a.userId}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#334155'
                }}
              >
                {a.gitHubUsername ? (
                  <img
                    src={`https://github.com/${a.gitHubUsername}.png?size=24`}
                    alt={a.fullName || a.email}
                    style={{ width: '14px', height: '14px', borderRadius: '50%' }}
                  />
                ) : (
                  <span>👤</span>
                )}
                <span>{a.fullName || a.email.split('@')[0]}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAssignee(a.userId)}
                  disabled={isUpdatingAssignee}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    fontSize: '11px',
                    padding: '0 2px',
                    marginLeft: '2px'
                  }}
                  title={`Remove ${a.fullName || a.email}`}
                >
                  ✕
                </button>
              </span>
            ))}

            {(() => {
              const currentProj = projects.find((p) => p.id === activeTask.projectId);
              const projectMembers = currentProj?.members || [];
              const assignedUserIds = activeAssignees.map((a) => a.userId);
              const unassignedMembers = projectMembers.filter((m) => !assignedUserIds.includes(m.userId));

              if (unassignedMembers.length === 0) return null;

              return (
                <select
                  className={styles.statusSelect}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleAddAssignee(Number(e.target.value));
                  }}
                  disabled={isUpdatingAssignee}
                  style={{ fontSize: '11px', padding: '2px 8px', height: 'auto', borderRadius: '12px' }}
                >
                  <option value="">+ Add Co-Assignee</option>
                  {unassignedMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      + {m.fullName || m.email.split('@')[0]} ({m.projectRole || m.role})
                    </option>
                  ))}
                </select>
              );
            })()}
            {isUpdatingAssignee && <span style={{ fontSize: '11px', color: '#64748b' }}>⏳ Updating...</span>}
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className={styles.tabNav}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview & GitHub
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'comments' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            Comments ({comments.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'history' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Status History
          </button>
        </nav>

        {/* Tab Content */}
        <div className={styles.drawerBody}>
          {/* TAB 1: OVERVIEW & GITHUB */}
          {activeTab === 'overview' && (
            <div className={styles.overviewSection}>
              {/* Description */}
              <div className={styles.sectionBlock}>
                <h4 className={styles.sectionHeading}>Description</h4>
                <p className={styles.descriptionText}>
                  {activeTask.description || 'No description provided for this task.'}
                </p>
              </div>

              {/* GitHub Pull Requests Multi-PR Live Card */}
              <div className={styles.githubCard}>
                <div className={styles.githubCardHeader}>
                  <div className={styles.githubCardTitle}>
                    <span className={styles.gitIcon}>⎇</span>
                    <span>GitHub Pull Requests ({linkedPrs.length})</span>
                  </div>

                  <div className={styles.prActionBtnGroup}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsAddingPr((prev) => !prev)}
                    >
                      {isAddingPr ? '✕ Cancel' : '+ Link PR'}
                    </Button>
                  </div>
                </div>

                {githubSyncFeedback && (
                  <div
                    className={
                      githubSyncFeedback.type === 'success'
                        ? styles.syncFeedbackSuccess
                        : githubSyncFeedback.type === 'warning'
                        ? styles.syncFeedbackWarning
                        : styles.syncFeedbackError
                    }
                  >
                    {githubSyncFeedback.message}
                  </div>
                )}

                {/* Form to link a new PR */}
                {(isAddingPr || linkedPrs.length === 0) && (
                  <form onSubmit={handleLinkPrDirectly} className={styles.multiInputPrForm} style={{ marginBottom: linkedPrs.length > 0 ? '12px' : 0 }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      {linkedPrs.length === 0 ? 'Link First GitHub Pull Request:' : 'Link Another GitHub Pull Request:'}
                    </p>

                    <div className={styles.prInputGroup}>
                      <label className={styles.prInputLabel}>Quick Paste Full PR URL (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. https://github.com/owner/repo/pull/7"
                        className={styles.prInputField}
                        value={inlineUrl}
                        onChange={(e) => handleInlineUrlChange(e.target.value)}
                      />
                    </div>

                    <div className={styles.inputGridRow}>
                      <div className={styles.prInputGroup}>
                        <label className={styles.prInputLabel}>PR Number *</label>
                        <input
                          type="number"
                          placeholder="e.g. 7"
                          className={styles.prInputField}
                          value={inlinePrNumber}
                          onChange={(e) => handleInlinePrNumberChange(e.target.value)}
                          required
                        />
                      </div>
                      <div className={styles.prInputGroup}>
                        <label className={styles.prInputLabel}>Owner (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. YadavAashutosh"
                          className={styles.prInputField}
                          value={inlineOwner}
                          onChange={(e) => handleInlineOwnerChange(e.target.value)}
                        />
                      </div>
                      <div className={styles.prInputGroup}>
                        <label className={styles.prInputLabel}>Repo (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. DevTaskHub"
                          className={styles.prInputField}
                          value={inlineRepo}
                          onChange={(e) => handleInlineRepoChange(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                      {linkedPrs.length > 0 && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsAddingPr(false)}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button type="submit" variant="primary" size="sm" disabled={isLinkingInlinePr}>
                        {isLinkingInlinePr ? 'Connecting...' : 'Connect PR'}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Multi-PR List Cards */}
                {linkedPrs.length > 0 && (
                  <div className={styles.prListContainer}>
                    {linkedPrs.map((pr) => {
                      const isMerged = pr.isMerged || pr.state?.toLowerCase() === 'merged';
                      const isOpen = pr.state?.toLowerCase() === 'open';
                      const badgeVariant = isMerged ? 'purple' : isOpen ? 'green' : 'red';
                      const badgeLabel = isMerged ? 'MERGED' : (pr.state || 'OPEN').toUpperCase();

                      return (
                        <div key={pr.id || pr.pullRequestNumber} className={styles.prItemCard}>
                          <div className={styles.prItemLeft}>
                            <Badge variant={badgeVariant}>
                              {badgeLabel}
                            </Badge>
                            <a
                              href={pr.pullRequestUrl || `https://github.com/YadavAashutosh/DevTaskHub/pull/${pr.pullRequestNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.prItemTitle}
                              title={pr.title || `PR #${pr.pullRequestNumber}`}
                            >
                              PR #{pr.pullRequestNumber} {pr.title ? `— ${pr.title}` : ''} ↗
                            </a>
                          </div>

                          <div className={styles.prItemActions}>
                            <button
                              type="button"
                              className={styles.secondarySmallBtn}
                              disabled={syncingPrNumber === pr.pullRequestNumber}
                              onClick={() => handleSyncSpecificPr(pr.pullRequestNumber)}
                              title="Sync this PR with GitHub"
                            >
                              {syncingPrNumber === pr.pullRequestNumber ? 'Syncing...' : '🔄 Sync'}
                            </button>
                            <button
                              type="button"
                              className={styles.dangerSmallBtn}
                              disabled={unlinkingPrNumber === pr.pullRequestNumber}
                              onClick={() => handleUnlinkSpecificPr(pr.pullRequestNumber)}
                              title="Unlink this PR"
                            >
                              {unlinkingPrNumber === pr.pullRequestNumber ? '...' : '✕ Unlink'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* GitHub Repository Live Metadata Card (Only when PR is linked) */}
              {Boolean(activeTask.gitHubPrNumber || linkedPrs.length > 0) && repoDetails && (
                <div className={styles.githubRepoCard}>
                  <div className={styles.repoCardHeader}>
                    <div className={styles.repoTitleBlock}>
                      <span className={styles.repoIcon}>📦</span>
                      <a
                        href={repoDetails.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.repoLink}
                      >
                        {repoDetails.fullName} ↗
                      </a>
                    </div>
                    {repoDetails.language && (
                      <span className={styles.languageBadge}>{repoDetails.language}</span>
                    )}
                  </div>
                  {repoDetails.description && (
                    <p className={styles.repoDesc}>{repoDetails.description}</p>
                  )}
                  <div className={styles.repoStatsRow}>
                    <span title="Stargazers">⭐ {repoDetails.stargazersCount}</span>
                    <span>•</span>
                    <span title="Forks">🍴 {repoDetails.forksCount}</span>
                    <span>•</span>
                    <span title="Open Issues">⚠️ {repoDetails.openIssuesCount} issues</span>
                    <span>•</span>
                    <span title="Default Branch">⎇ {repoDetails.defaultBranch}</span>
                  </div>
                </div>
              )}

              {/* On-Demand Repository Commits Section (Only when PR is linked) */}
              {Boolean(activeTask.gitHubPrNumber) && (
                <div className={styles.commitsSection}>
                  <div className={styles.commitsHeaderRow}>
                    <h4 className={styles.sectionHeading} style={{ margin: 0 }}>
                      Repository Commits
                    </h4>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {!showCommits ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleLoadCommits()}
                          disabled={isLoadingCommits}
                        >
                          {isLoadingCommits ? 'Loading Commits...' : '⎇ Load Recent Commits'}
                        </Button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={styles.secondarySmallBtn}
                            onClick={() => handleLoadCommits()}
                            disabled={isLoadingCommits}
                            title="Refresh commit history"
                          >
                            🔄 Refresh
                          </button>
                          <button
                            type="button"
                            className={styles.secondarySmallBtn}
                            onClick={() => setShowCommits(false)}
                            title="Hide commits"
                          >
                            ✕ Hide
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {showCommits && (
                    <>
                      {isLoadingCommits && (
                        <p className={styles.loadingText}>Fetching commits from GitHub API...</p>
                      )}

                      {commitsError && (
                        <div className={styles.commitsErrorBanner}>
                          <span>{commitsError}</span>
                          <button
                            type="button"
                            className={styles.retryBtn}
                            onClick={() => handleLoadCommits()}
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {!isLoadingCommits && !commitsError && repoCommits.length > 0 && (
                        <div className={styles.commitList}>
                          {repoCommits.map((commit) => (
                            <div key={commit.sha} className={styles.commitRow}>
                              <div className={styles.commitLeft}>
                                <span className={styles.commitMsg} title={commit.message}>
                                  {commit.message.split('\n')[0]}
                                </span>
                                <span className={styles.commitMeta}>
                                  by {commit.authorName} • {new Date(commit.date).toLocaleDateString()}
                                </span>
                              </div>
                              <a
                                href={commit.htmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.commitShaPill}
                                title="View commit on GitHub"
                              >
                                {commit.shortSha} ↗
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMMENTS FEED (dbo.TaskComments - Create, Edit & Soft-Delete) */}
          {activeTab === 'comments' && (
            <div className={styles.commentsSection}>
              {/* Comment Thread */}
              <div className={styles.commentList}>
                {isLoadingComments ? (
                  <p className={styles.loadingText}>Loading comments...</p>
                ) : comments.length === 0 ? (
                  <div className={styles.emptyComments}>
                    <span>💬</span>
                    <p>No comments yet. Start the conversation!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className={styles.commentItem}>
                      <div
                        className={styles.commentAvatar}
                        style={{ overflow: 'hidden' }}
                        title={comment.authorGitHubUsername ? `@${comment.authorGitHubUsername}` : comment.authorName}
                      >
                        {comment.authorGitHubUsername ? (
                          <>
                            <img
                              src={`https://github.com/${comment.authorGitHubUsername}.png?size=64`}
                              alt={comment.authorName}
                              className={styles.avatarImg}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <span style={{ display: 'none' }}>
                              {comment.authorName ? comment.authorName.substring(0, 2).toUpperCase() : 'US'}
                            </span>
                          </>
                        ) : (
                          comment.authorName ? comment.authorName.substring(0, 2).toUpperCase() : 'US'
                        )}
                      </div>
                      <div className={styles.commentBubble}>
                        <div className={styles.commentMeta}>
                          <div className={styles.authorMeta}>
                            <span className={styles.commentAuthor}>{comment.authorName}</span>
                            <span className={styles.commentDate}>
                              {new Date(comment.createdAtUtc).toLocaleDateString()} {new Date(comment.createdAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {comment.updatedAtUtc && (
                              <span className={styles.editedTag}>(edited)</span>
                            )}
                          </div>

                          {/* Edit / Delete actions for Author or Admin */}
                          {canModifyComment(comment) && editingCommentId !== comment.id && (
                            <div className={styles.commentActions}>
                              <button
                                type="button"
                                className={styles.commentIconBtn}
                                onClick={() => handleStartEditComment(comment)}
                                title="Edit this comment"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                className={styles.commentIconBtn}
                                onClick={() => handleDeleteComment(comment.id)}
                                title="Delete this comment"
                                style={{ color: '#dc2626' }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Inline Edit Box or Normal Body */}
                        {editingCommentId === comment.id ? (
                          <div className={styles.inlineEditCommentWrapper}>
                            <textarea
                              className={styles.commentTextarea}
                              rows={2}
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              autoFocus
                            />
                            <div className={styles.inlineEditActions}>
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                disabled={isUpdatingComment}
                                onClick={() => handleSaveEditComment(comment.id)}
                              >
                                {isUpdatingComment ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleCancelEditComment}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className={styles.commentBody}>{comment.body}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input Box */}
              <form onSubmit={handleAddComment} className={styles.addCommentForm}>
                <textarea
                  className={styles.commentTextarea}
                  placeholder="Write a comment or status update..."
                  rows={3}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <Button type="submit" variant="primary" size="sm" disabled={isSubmittingComment}>
                    {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: STATUS HISTORY (dbo.TaskStatusHistories) */}
          {activeTab === 'history' && (
            <div className={styles.historySection}>
              {isLoadingHistory ? (
                <p className={styles.loadingText}>Loading activity history...</p>
              ) : history.length === 0 ? (
                <div className={styles.emptyComments}>
                  <span>📜</span>
                  <p>No status transitions recorded yet.</p>
                </div>
              ) : (
                <div className={styles.timelineList}>
                  {history.map((item) => (
                    <div key={item.id} className={styles.timelineItem}>
                      <div className={styles.timelineDot} />
                      <div className={styles.timelineContent}>
                        <p className={styles.timelineTitle}>
                          Moved from <span className={styles.statusPill}>{item.oldStatus}</span> → <span className={styles.statusPill}>{item.newStatus}</span>
                        </p>
                        <span className={styles.timelineDate}>
                          by {item.changedByName} • {new Date(item.changedAtUtc).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
