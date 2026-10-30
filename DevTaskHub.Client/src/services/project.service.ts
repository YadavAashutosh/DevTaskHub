import { apiClient } from './api';
import type {
  ProjectDto,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectMemberDto,
  AddProjectMemberDto,
} from '../types';

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
   * Updates an existing project's metadata (RBAC: Admin / ProjectManager only).
   */
  async updateProject(id: number, dto: UpdateProjectDto): Promise<ProjectDto> {
    const response = await apiClient.put<ProjectDto>(`/projects/${id}`, dto);
    return response.data;
  },

  /**
   * Soft-deletes a project (RBAC: Admin only).
   */
  async deleteProject(id: number): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },

  /**
   * Retrieves all members assigned to a project.
   */
  async getProjectMembers(projectId: number): Promise<ProjectMemberDto[]> {
    const response = await apiClient.get<ProjectMemberDto[]>(`/projects/${projectId}/members`);
    return response.data;
  },

  /**
   * Adds a team member to a project (RBAC: Admin / ProjectManager only).
   */
  async addProjectMember(projectId: number, dto: AddProjectMemberDto): Promise<ProjectMemberDto> {
    const response = await apiClient.post<ProjectMemberDto>(`/projects/${projectId}/members`, dto);
    return response.data;
  },

  /**
   * Removes a team member from a project (RBAC: Admin / ProjectManager only).
   */
  async removeProjectMember(projectId: number, userId: number): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/members/${userId}`);
  },
};
