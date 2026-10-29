import { apiClient } from './api';
import type { ProjectDto, CreateProjectDto } from '../types';

export const projectService = {
  /**
   * Retrieves all active engineering projects.
   */
  async getProjects(): Promise<ProjectDto[]> {
    const response = await apiClient.get<ProjectDto[]>('/projects');
    return response.data;
  },

  /**
   * Retrieves a single project by its ID.
   */
  async getProjectById(id: number): Promise<ProjectDto> {
    const response = await apiClient.get<ProjectDto>(`/projects/${id}`);
    return response.data;
  },

  /**
   * Creates a new engineering project.
   */
  async createProject(dto: CreateProjectDto): Promise<ProjectDto> {
    const response = await apiClient.post<ProjectDto>('/projects', dto);
    return response.data;
  },

  /**
   * Soft-deletes a project.
   */
  async deleteProject(id: number): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },
};