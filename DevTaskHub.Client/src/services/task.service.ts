import { apiClient } from './api';
import type { TaskDto, CreateTaskDto, UpdateTaskDto, PagedResponse } from '../types';

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
      params: {
        pageNumber: params?.pageNumber ?? 1,
        pageSize: params?.pageSize ?? 50, // Pull generous page size for Kanban board view
        ...params,
      },
    });
    return response.data;
  },

  /**
   * Retrieves a single task by its database ID.
   */
  async getTaskById(id: number): Promise<TaskDto> {
    const response = await apiClient.get<TaskDto>(`/tasks/${id}`);
    return response.data;
  },

  /**
   * Creates a new task in SQL Server.
   */
  async createTask(dto: CreateTaskDto): Promise<TaskDto> {
    const response = await apiClient.post<TaskDto>('/tasks', dto);
    return response.data;
  },

  /**
   * Updates an existing task's status or attributes.
   */
  async updateTask(id: number, dto: UpdateTaskDto): Promise<TaskDto> {
    const response = await apiClient.put<TaskDto>(`/tasks/${id}`, dto);
    return response.data;
  },

  /**
   * Deletes a task (Requires Admin authorization on backend).
   */
  async deleteTask(id: number): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  },
};