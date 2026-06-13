export interface Project {
  id: number;
  name: string;
  clientName?: string;
  state?: string;
  progress?: number;
}

export interface ProjectsResponse {
  projects: Project[];
}
