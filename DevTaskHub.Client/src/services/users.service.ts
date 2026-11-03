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

  /**
   * Updates a user's role (Admin only).
   */
  async updateUserRole(userId: number, role: string): Promise<UserDto> {
    const response = await apiClient.patch<UserDto>(`/users/${userId}/role`, { role });
    return response.data;
  },

  /**
   * Toggles a user's active/deactivated status (Admin only).
   */
  async updateUserStatus(userId: number, isActive: boolean): Promise<UserDto> {
    const response = await apiClient.patch<UserDto>(`/users/${userId}/status`, { isActive });
    return response.data;
  },

  /**
   * Soft-deletes a user (Admin only).
   */
  async deleteUser(userId: number): Promise<void> {
    await apiClient.delete(`/users/${userId}`);
  },
};
