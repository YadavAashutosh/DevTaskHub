import { apiClient } from './api';
import type { 
  TaskDto, 
  CreateTaskDto, 
  UpdateTaskDto, 
  PagedResponse,
  CommentDto,
  TaskStatusHistoryDto
} from '../types';

export interface TaskQueryParams {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  status?: string;
  priority?: string;
  projectId?: number;
  assignedUserId?: number;
  sortBy?: string;
  isAscending?: boolean;
}

export const taskService = {
  /**
   * Retrieves paginated, sorted, and filtered tasks from .NET API.
   */
  async getTasks(params?: TaskQueryParams): Promise<PagedResponse<TaskDto>> {
    const response = await apiClient.get<PagedResponse<TaskDto>>('/tasks', {
      params,
    });
    return response.data;
  },

  /**
   * Retrieves a single task with its full details.
   */
  async getTaskById(id: number): Promise<TaskDto> {
    const response = await apiClient.get<TaskDto>(`/tasks/${id}`);
    return response.data;
  },

  /**
   * Creates a new sprint task in SQL Server.
   */
  async createTask(dto: CreateTaskDto): Promise<TaskDto> {
    const response = await apiClient.post<TaskDto>('/tasks', dto);
    return response.data;
  },

  /**
   * Updates an existing task's title, description, status, priority or PR.
   */
  async updateTask(id: number, dto: UpdateTaskDto): Promise<TaskDto> {
    const response = await apiClient.put<TaskDto>(`/tasks/${id}`, dto);
    return response.data;
  },

  /**
   * Deletes a task permanently (Admin only).
   */
  async deleteTask(id: number): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  },

  /**
   * Fetches real-time comment thread for a task (dbo.TaskComments).
   */
  async getComments(taskId: number): Promise<CommentDto[]> {
    const response = await apiClient.get<CommentDto[]>(`/tasks/${taskId}/comments`);
    return response.data;
  },

  /**
   * Posts a new comment to a task (dbo.TaskComments).
   */
  async addComment(taskId: number, body: string): Promise<CommentDto> {
    const response = await apiClient.post<CommentDto>(`/tasks/${taskId}/comments`, { body });
    return response.data;
  },

  /**
   * Updates an existing comment.
   */
  async updateComment(taskId: number, commentId: number, body: string): Promise<CommentDto> {
    const response = await apiClient.put<CommentDto>(`/tasks/${taskId}/comments/${commentId}`, { body });
    return response.data;
  },

  /**
   * Soft-deletes a comment (dbo.TaskComments.DeletedAtUtc).
   */
  async deleteComment(taskId: number, commentId: number): Promise<void> {
    await apiClient.delete(`/tasks/${taskId}/comments/${commentId}`);
  },

  /**
   * Retrieves lifecycle status change history for a task (dbo.TaskStatusHistories).
   */
  async getTaskHistory(taskId: number): Promise<TaskStatusHistoryDto[]> {
    const response = await apiClient.get<TaskStatusHistoryDto[]>(`/tasks/${taskId}/history`);
    return response.data;
  },
};
