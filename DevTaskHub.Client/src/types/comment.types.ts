export interface CommentDto {
  id: number;
  taskId: number;
  authorUserId: number;
  authorName: string;
  authorEmail?: string | null;
  authorGitHubUsername?: string | null;
  body: string;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
}

export interface CreateCommentDto {
  body: string;
}

export interface UpdateCommentDto {
  body: string;
}

export interface TaskStatusHistoryDto {
  id: number;
  taskId: number;
  oldStatus: string;
  newStatus: string;
  changedByName: string;
  changeReason?: string | null;
  changedAtUtc: string;
}
