import { apiClient } from './api';
import type { UserDto } from '../types';

export const usersService = {
  /**
   * Retrieves all active team members from SQL Server.
   */
  async getUsers(signal?: AbortSignal): Promise<UserDto[]> {
    const response = await apiClient.get<UserDto[]>('/users', { signal });
    return response.data;
  },

  /**
   * Retrieves the current authenticated user's profile.
   */
  async getMyProfile(signal?: AbortSignal): Promise<UserDto> {
    const response = await apiClient.get<UserDto>('/users/me', { signal });
    return response.data;
  },

  /**
   * Updates the current user's GitHub username handle.
   */
  async updateMyGitHubUsername(gitHubUsername: string | null): Promise<{ message: string; gitHubUsername?: string }> {
    const response = await apiClient.patch('/users/me/github', { gitHubUsername });
    return response.data;
  },
};

