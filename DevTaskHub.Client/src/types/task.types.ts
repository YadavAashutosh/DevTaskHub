export type TaskStatusType = 'Todo' | 'InProgress' | 'Done';
export type TaskPriorityType = 'Low' | 'Medium' | 'High';

export interface TaskDto {
  id: number;
  title: string;
  description?: string | null;
  status: TaskStatusType;
  priority: TaskPriorityType;
  gitHubPrNumber?: number | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: number;
  projectName?: string | null;
  assignedUserId?: number | null;
  assignedUserEmail?: string | null;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  status: TaskStatusType;
  priority: TaskPriorityType;
  projectId: number;
  gitHubPrNumber?: number | null;
  assignedUserId?: number | null;
  dueDate?: string | null;
}

export interface UpdateTaskDto {
  title: string;
  description?: string;
  status: TaskStatusType;
  priority: TaskPriorityType;
  gitHubPrNumber?: number | null;
  assignedUserId?: number | null;
  dueDate?: string | null;
}

export interface PagedResponse<T> {
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  data: T[];
}