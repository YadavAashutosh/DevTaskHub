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
  totalMembers: number;
}

export interface CreateProjectDto {
  name: string;
  projectKey: string;
  description?: string;
  gitHubRepoOwner?: string;
  gitHubRepoName?: string;
}

export interface UpdateProjectDto {
  name: string;
  description?: string;
  status?: string;
  gitHubRepoOwner?: string;
  gitHubRepoName?: string;
}

export interface ProjectMemberDto {
  projectId: number;
  userId: number;
  fullName: string;
  email: string;
  role: string;
  projectRole: string;
  gitHubUsername?: string | null;
  joinedAtUtc: string;
}

export interface AddProjectMemberDto {
  userId: number;
  projectRole: string;
}
