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

export interface GitHubRepoDetailsDto {
  id: number;
  name: string;
  fullName: string;
  description?: string | null;
  htmlUrl: string;
  language?: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  defaultBranch: string;
  pushedAt?: string | null;
  ownerLogin?: string | null;
  ownerAvatarUrl?: string | null;
}

export interface GitHubCommitDto {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  date: string;
  htmlUrl: string;
}
