import { apiClient } from './api';
import type {
  GitHubPullRequestDto,
  LinkPullRequestDto,
  TaskPullRequest,
  GitHubRepoDetailsDto,
  GitHubCommitDto,
} from '../types';

export const githubService = {
  /**
   * Fetches live Pull Request details from GitHub REST API v3 via backend proxy
   */
  async getPullRequest(owner: string, repo: string, number: number): Promise<GitHubPullRequestDto> {
    const response = await apiClient.get<GitHubPullRequestDto>(`/github/repos/${owner}/${repo}/pulls/${number}`);
    return response.data;
  },

  /**
   * Links a GitHub Pull Request to a sprint task and saves to database
   */
  async linkPullRequest(taskId: number, dto: LinkPullRequestDto): Promise<TaskPullRequest> {
    const response = await apiClient.post<TaskPullRequest>(`/tasks/${taskId}/github/link`, dto);
    return response.data;
  },

  /**
   * Disassociates / unlinks the Pull Request from a sprint task
   */
  async unlinkPullRequest(taskId: number): Promise<void> {
    await apiClient.delete(`/tasks/${taskId}/github/unlink`);
  },

  /**
   * Gets all linked Pull Requests for a given task
   */
  async getTaskPullRequests(taskId: number): Promise<TaskPullRequest[]> {
    const response = await apiClient.get<TaskPullRequest[]>(`/tasks/${taskId}/github/prs`);
    return response.data;
  },

  /**
   * Manually syncs and refreshes the latest PR status from GitHub
   */
  async syncPullRequest(taskId: number, prNumber?: number): Promise<TaskPullRequest> {
    const url = prNumber ? `/tasks/${taskId}/github/sync?prNumber=${prNumber}` : `/tasks/${taskId}/github/sync`;
    const response = await apiClient.post<TaskPullRequest>(url);
    return response.data;
  },

  /**
   * Fetches complete repository metadata (stars, forks, issues, language, default branch)
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepoDetailsDto> {
    const response = await apiClient.get<GitHubRepoDetailsDto>(`/github/repos/${owner}/${repo}`);
    return response.data;
  },

  /**
   * Fetches all public repositories for a specified GitHub user (e.g. 'YadavAashutosh')
   */
  async getUserRepositories(username: string): Promise<GitHubRepoDetailsDto[]> {
    const response = await apiClient.get<GitHubRepoDetailsDto[]>(`/github/users/${username}/repos`);
    return response.data;
  },

  /**
   * Fetches recent commits for a repository
   */
  async getRepositoryCommits(owner: string, repo: string, limit = 10): Promise<GitHubCommitDto[]> {
    const response = await apiClient.get<GitHubCommitDto[]>(`/github/repos/${owner}/${repo}/commits?limit=${limit}`);
    return response.data;
  },
};
