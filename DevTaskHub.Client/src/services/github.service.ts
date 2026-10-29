import { apiClient } from './api';
import type { GitHubPullRequestDto, LinkPullRequestDto, TaskPullRequest } from '../types';

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
};