import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../services';
import type { DashboardStatsDto } from '../types';
import { Button } from '../components/common';
import styles from './DashboardPage.module.css';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sorting & Filtering State
  type ProjectProgressSort = 'completion-desc' | 'completion-asc' | 'tasks-desc' | 'name-asc';
  const [projectSort, setProjectSort] = useState<ProjectProgressSort>('completion-desc');

  type ActivityFilterType = 'All' | 'Status' | 'Comment';
  const [activityFilter, setActivityFilter] = useState<ActivityFilterType>('All');
  type ActivitySortType = 'newest' | 'oldest';
  const [activitySort, setActivitySort] = useState<ActivitySortType>('newest');

  useEffect(() => {
    const controller = new AbortController();

    const fetchDashboard = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await dashboardService.getStats(controller.signal);
        setStats(data);
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== 'CanceledError') {
          setErrorMessage('Failed to load dashboard metrics. Please verify backend connection.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();

    return () => {
      controller.abort();
    };
  }, []);

  // Derived sorted projects
  const sortedProjects = React.useMemo(() => {
    if (!stats?.projectSummaries) return [];
    return stats.projectSummaries.slice().sort((a, b) => {
      switch (projectSort) {
        case 'completion-desc':
          return b.completionRate - a.completionRate;
        case 'completion-asc':
          return a.completionRate - b.completionRate;
        case 'tasks-desc':
          return b.totalTasks - a.totalTasks;
        case 'name-asc':
          return a.projectName.localeCompare(b.projectName);
        default:
          return 0;
      }
    });
  }, [stats?.projectSummaries, projectSort]);

  // Derived filtered & sorted activity
  const filteredActivity = React.useMemo(() => {
    if (!stats?.recentActivity) return [];
    let list = stats.recentActivity;
    if (activityFilter === 'Comment') {
      list = list.filter((act) => act.type === 'Comment');
    } else if (activityFilter === 'Status') {
      list = list.filter((act) => act.type !== 'Comment');
    }
    return list.slice().sort((a, b) => {
      const timeA = new Date(a.timestampUtc).getTime();
      const timeB = new Date(b.timestampUtc).getTime();
      return activitySort === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [stats?.recentActivity, activityFilter, activitySort]);

  const formatRelativeTime = (timestampUtc: string) => {
    try {
      const date = new Date(timestampUtc);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBox}>Loading dashboard metrics...</div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBanner}>{errorMessage}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.pageTitle}>Engineering Dashboard</h2>
          <p className={styles.pageSubtitle}>
            Live operational observability across projects, sprint velocity, and GitHub tasks.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link to="/tasks" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="sm">
              📋 Open Task Board
            </Button>
          </Link>
          <Link to="/projects" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm">
              📁 Manage Projects
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Total Tasks</span>
            <span className={styles.kpiIcon}>📋</span>
          </div>
          <span className={styles.kpiValue}>{stats?.totalTasks ?? 0}</span>
          <div className={styles.kpiFooter}>
            Across <span className={styles.kpiHighlight}>{stats?.projectSummaries.length ?? 0}</span> projects
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>In Progress</span>
            <span className={styles.kpiIcon}>⚡</span>
          </div>
          <span className={styles.kpiValue} style={{ color: '#2563eb' }}>
            {stats?.inProgressTasks ?? 0}
          </span>
          <div className={styles.kpiFooter}>Active developer sprint focus</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>In Review</span>
            <span className={styles.kpiIcon}>🔍</span>
          </div>
          <span className={styles.kpiValue} style={{ color: '#d97706' }}>
            {stats?.inReviewTasks ?? 0}
          </span>
          <div className={styles.kpiFooter}>Pending PR review & testing</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Completed</span>
            <span className={styles.kpiIcon}>✅</span>
          </div>
          <span className={styles.kpiValue} style={{ color: '#16a34a' }}>
            {stats?.doneTasks ?? 0}
          </span>
          <div className={styles.kpiFooter}>
            <span className={styles.kpiHighlight}>{stats?.completionRate ?? 0}%</span> overall completion rate
          </div>
        </div>
      </div>

      {/* Main Grid: Projects Breakdown + Recent Activity */}
      <div className={styles.mainGrid}>
        {/* Left Column: Project Progress */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader} style={{ flexWrap: 'wrap', gap: '8px' }}>
            <h3 className={styles.sectionTitle}>
              <span>📁</span> Project Delivery Progress
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={projectSort}
                onChange={(e) => setProjectSort(e.target.value as any)}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  backgroundColor: '#ffffff'
                }}
                title="Sort project progress"
              >
                <option value="completion-desc">↕ Completion (High → Low)</option>
                <option value="completion-asc">↕ Completion (Low → High)</option>
                <option value="tasks-desc">↕ Total Tasks</option>
                <option value="name-asc">↕ Name (A → Z)</option>
              </select>
              <Link to="/projects" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none' }}>
                View all →
              </Link>
            </div>
          </div>

          <div className={styles.projectList}>
            {!sortedProjects || sortedProjects.length === 0 ? (
              <div className={styles.emptyState}>No projects active yet.</div>
            ) : (
              sortedProjects.map((p) => (
                <div key={p.projectId} className={styles.projectItem}>
                  <div className={styles.projectTopRow}>
                    <div className={styles.projectTitleBlock}>
                      <span className={styles.projectKeyBadge}>{p.projectKey}</span>
                      <span className={styles.projectName}>{p.projectName}</span>
                    </div>

                    {p.gitHubRepoOwner && p.gitHubRepoName && (
                      <a
                        href={`https://github.com/${p.gitHubRepoOwner}/${p.gitHubRepoName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.repoBadge}
                        title="Open GitHub repository"
                      >
                        <span>⎇</span>
                        <span>{p.gitHubRepoOwner}/{p.gitHubRepoName}</span>
                        <span>↗</span>
                      </a>
                    )}
                  </div>

                  <div className={styles.progressContainer}>
                    <div className={styles.progressInfo}>
                      <span>{p.completedTasks} of {p.totalTasks} tasks complete</span>
                      <span style={{ fontWeight: 700 }}>{p.completionRate}%</span>
                    </div>
                    <div className={styles.progressBarBg}>
                      <div
                        className={styles.progressBarFill}
                        style={{ width: `${Math.min(p.completionRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Recent Activity Stream */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader} style={{ flexWrap: 'wrap', gap: '8px' }}>
            <h3 className={styles.sectionTitle}>
              <span>⚡</span> Recent Activity Stream
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value as any)}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  backgroundColor: '#ffffff'
                }}
                title="Filter activity type"
              >
                <option value="All">All Activity</option>
                <option value="Status">Status Updates</option>
                <option value="Comment">Comments Only</option>
              </select>
              <select
                value={activitySort}
                onChange={(e) => setActivitySort(e.target.value as any)}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  backgroundColor: '#ffffff'
                }}
                title="Sort activity by time"
              >
                <option value="newest">↕ Newest First</option>
                <option value="oldest">↕ Oldest First</option>
              </select>
            </div>
          </div>

          <div className={styles.activityList}>
            {!filteredActivity || filteredActivity.length === 0 ? (
              <div className={styles.emptyState}>No matching activity logged yet.</div>
            ) : (
              filteredActivity.map((act) => (
                <div key={`${act.type}-${act.id}`} className={styles.activityItem}>
                  <div
                    className={`${styles.activityIconCol} ${
                      act.type === 'Comment' ? styles.commentIcon : styles.statusIcon
                    }`}
                  >
                    {act.type === 'Comment' ? '💬' : '🔄'}
                  </div>

                  <div className={styles.activityDetails}>
                    <div className={styles.activityMain}>
                      <span className={styles.activityActor}>{act.actorName}</span>{' '}
                      {act.type === 'Comment' ? 'commented on' : 'updated'}{' '}
                      <span className={styles.activityTask}>"{act.taskTitle}"</span>: {act.details}
                    </div>
                    <span className={styles.activityTime}>
                      {formatRelativeTime(act.timestampUtc)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;

