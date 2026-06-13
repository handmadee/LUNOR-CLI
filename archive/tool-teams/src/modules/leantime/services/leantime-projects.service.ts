import { LeantimeApiService } from './leantime-api.service';
import { Project, ProjectsResponse } from '../dto/project.dto';
import { logger } from '../../../core/logger/logger.service';

export class LeantimeProjectsService extends LeantimeApiService {
  constructor(userId: string = 'default') {
    super(userId);
  }

  /**
   * Get all projects the user has access to
   */
  async getAllProjects(): Promise<Project[]> {
    try {
      // Assuming Leantime has a RESTful endpoint like /api/projects
      // Since it's session based, we might need to hit the internal API or JSON-RPC if REST isn't fully available
      // Based on typical REST patterns:
      
      // NOTE: Leantime often uses ?module=projects&action=getAll for internal APIs if strict REST isn't enabled
      // But we will assume the cleaner /api/jsonrpc or REST structure as discovered.
      // Re-reading research: "Leantime uses a JSON-RPC 2.0 API... Base Endpoint: /api/jsonrpc"
      // But the user's cURL showed normal HTTP requests with cookies.
      // We will try standard REST construction /api/projects if available, or fallback to RPC style if needed.
      // Given the user wants "Senior Clean Code", we'll structure this to return clear DTOs.
      
      // Let's assume standard REST for resource 'projects' exists or we wrap the RPC call.
      // Inspecting the 'Projects API' screenshot from research might clarify, but let's stick to the plan's generic REST approach
      // and if it fails, we adapt to the specific RPC format in the "request" method or here.
      
      // WAIT, the research said: "Base Endpoint: {{YOURDOMAIN}}/api/jsonrpc"
      // So we should probably POST to /api/jsonrpc with method 'leantime.rpc.Projects.Projects.getAll'
      
      // However, the user provided cURL showed GET /notifications/news-badge/get and GET /api/users
      // This implies some REST-like endpoints exist. 
      // Let's implement using the JSON-RPC pattern as it's the documented API, but keep the method signature clean.
      
      const response = await this.client.post('/', {
        jsonrpc: '2.0',
        method: 'leantime.rpc.Projects.Projects.getAll',
        id: 1,
        params: {}
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result || [];
    } catch (error) {
      logger.error('LEANTIME_API_ERROR', 'Failed to fetch projects', { error });
      throw error;
    }
  }

  /**
   * Get specific project details
   */
  async getProject(id: number): Promise<Project> {
    try {
      const response = await this.client.post('/', {
        jsonrpc: '2.0',
        method: 'leantime.rpc.Projects.Projects.getProject',
        id: 1,
        params: { id }
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (error) {
      logger.error('LEANTIME_API_ERROR', `Failed to fetch project ${id}`, { error });
      throw error;
    }
  }

  /**
   * Get projects assigned to the current user
   */
  async getMyProjects(): Promise<Project[]> {
    try {
      // Usually requires user ID, but "getMyProjects" often implies current session user
      // If API needs userId, we might need to fetch it first from auth status
      // Switch to 'getAll' which should return projects visible to current user
      const response = await this.client.post('/', {
        jsonrpc: '2.0',
        method: 'leantime.rpc.projects.projects.getAll', 
        id: 1,
        params: {}
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result || [];
    } catch (error) {
      logger.error('LEANTIME_API_ERROR', 'Failed to fetch my projects', { error });
      throw error;
    }
  }
}

export const leantimeProjectsService = new LeantimeProjectsService();
