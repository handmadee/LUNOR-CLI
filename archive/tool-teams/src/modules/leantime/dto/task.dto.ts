export interface Task {
  id: number;
  headline: string;
  description?: string;
  status?: string;
  priority?: string;
  projectId?: number;
  projectName?: string;
  editorId?: string;
  tags?: string;
  dateToFinish?: string;
}

export interface TasksResponse {
  tickets: Task[];
}

export interface TaskFilters {
  projectId?: number;
  userId?: string;
  status?: string;
}
