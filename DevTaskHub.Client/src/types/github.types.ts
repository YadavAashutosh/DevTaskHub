export interface GitHubPullRequestDto {
  pullRequestNumber: number;
  title: string;
  htmlUrl: string;
  state: 'open' | 'closed' | 'merged' | string;
  isMerged: boolean;
  mergedAtUtc?: string | null;
  createdAtUtc?: string | null;
  authorLogin?: string | null;
  lastSyncedAtUtc: string;
}

export interface TaskPullRequest {
  id: number;
  taskId: number;
  pullRequestNumber: number;
  pullRequestUrl: string;
  title?: string | null;
  state: 'open' | 'closed' | 'merged' | string;
  isMerged: boolean;
  lastSyncedAtUtc: string;
}

export interface LinkPullRequestDto {
  pullRequestNumber: number;
  pullRequestUrl?: string;
  owner?: string;
  repo?: string;
}