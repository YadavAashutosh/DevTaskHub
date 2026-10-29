export interface ProjectDto {
  id: number;
  projectKey: string;
  name: string;
  description?: string | null;
  status: string;
  gitHubRepoOwner?: string | null;
  gitHubRepoName?: string | null;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
}

export interface CreateProjectDto {
  name: string;
  projectKey: string;
  description?: string;
  gitHubRepoOwner?: string;
  gitHubRepoName?: string;
}