export interface DashboardStatsDto {
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  inReviewTasks: number;
  doneTasks: number;
  completionRate: number;
  projectSummaries: ProjectProgressSummaryDto[];
  recentActivity: RecentActivityDto[];
}

export interface ProjectProgressSummaryDto {
  projectId: number;
  projectName: string;
  projectKey: string;
  gitHubRepoOwner?: string | null;
  gitHubRepoName?: string | null;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

export interface RecentActivityDto {
  id: number;
  type: 'StatusChange' | 'Comment' | 'PRLink' | string;
  taskId: number;
  taskTitle: string;
  actorName: string;
  details: string;
  timestampUtc: string;
}

