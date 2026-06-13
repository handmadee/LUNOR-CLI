import { LeantimeApiService } from './leantime-api.service';
import { Task, TaskFilters } from '../dto/task.dto';
import { logger } from '../../../core/logger/logger.service';

export class LeantimeTasksService extends LeantimeApiService {
  constructor(userId: string = 'default') {
    super(userId);
  }

  /**
   * Get all tasks (tickets) with optional filters
   * API Method: leantime.rpc.tickets.getAll
   */
  async getAllTasks(filters: TaskFilters = {}): Promise<Task[]> {
    try {
      const response = await this.client.post('/', {
        jsonrpc: '2.0',
        method: 'leantime.rpc.tickets.getAll',
        id: 1,
        params: {
          searchCriteria: filters
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result || [];
    } catch (error) {
      logger.error('LEANTIME_API_ERROR', 'Failed to fetch tasks', { error });
      throw error;
    }
  }

  /**
   * Get specific task details
   * API Method: leantime.rpc.tickets.getTicket
   */
  async getTask(id: number): Promise<Task> {
    try {
      const response = await this.client.post('/', {
        jsonrpc: '2.0',
        method: 'leantime.rpc.tickets.getTicket',
        id: 1,
        params: { id }
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (error) {
      logger.error('LEANTIME_API_ERROR', `Failed to fetch task ${id}`, { error });
      throw error;
    }
  }

  /**
   * Create a new task
   * API Method: leantime.rpc.tickets.addTicket
   */
  async createTask(task: Partial<Task>): Promise<Task> {
    try {
      const response = await this.client.post('/', {
        jsonrpc: '2.0',
        method: 'leantime.rpc.tickets.addTicket',
        id: 1,
        params: {
          ...task
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      // The result might be the ID or the object, usually ID
      // We might need to fetch it back or return what we have with new ID
      const newId = response.data.result;
      return { ...task, id: newId } as Task;
    } catch (error) {
      logger.error('LEANTIME_API_ERROR', 'Failed to create task', { error });
      throw error;
    }
  }

  /**
   * Update an existing task
   * API Method: leantime.rpc.tickets.patchTicket
   */
  async updateTask(id: number, task: Partial<Task>): Promise<boolean> {
    try {
      const response = await this.client.post('/', {
        jsonrpc: '2.0',
        method: 'leantime.rpc.tickets.patchTicket',
        id: 1,
        params: {
          id,
          ...task
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return true;
    } catch (error) {
      logger.error('LEANTIME_API_ERROR', `Failed to update task ${id}`, { error });
      throw error;
    }
  }

  /**
   * Update task status only (optimized endpoint)
   * API Method: leantime.rpc.tickets.patchTicket (status field)
   */
  async updateTaskStatus(id: number, status: string): Promise<boolean> {
    try {
      const response = await this.client.post('/', {
        jsonrpc: '2.0',
        method: 'leantime.rpc.tickets.patchTicket',
        id: 1,
        params: {
          id,
          status
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      logger.info(`Task ${id} status updated to: ${status}`);
      return true;
    } catch (error) {
      logger.error('LEANTIME_API_ERROR', `Failed to update task ${id} status`, { error });
      throw error;
    }
  }

  /**
   * Get all status labels (state labels) for tickets
   * API Method: leantime.rpc.tickets.getStateLabels
   * Returns mapping: { statusId: { name, color, statusType } }
   */
  async getStateLabels(projectId?: number): Promise<Record<string, any>> {
    try {
      const response = await this.client.post('/', {
        jsonrpc: '2.0',
        method: 'leantime.rpc.tickets.getStateLabels',
        id: 1,
        params: projectId ? { projectId } : {}
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result || {};
    } catch (error) {
      logger.error('LEANTIME_API_ERROR', 'Failed to fetch state labels', { error });
      // Return default labels as fallback
      return {
        3: { name: 'New', statusType: 'NEW' },
        4: { name: 'In Progress', statusType: 'PROGRESS' },
        0: { name: 'Done', statusType: 'DONE' },
        '-1': { name: 'Archived', statusType: 'DONE' }
      };
    }
  }

  /**
   * Get priority labels
   * API Method: leantime.rpc.tickets.getPriorityLabels (if available)
   * Returns mapping: { priorityId: priorityName }
   */
  async getPriorityLabels(): Promise<Record<string, string>> {
    try {
      const response = await this.client.post('/', {
        jsonrpc: '2.0',
        method: 'leantime.rpc.tickets.getPriorityLabels',
        id: 1,
        params: {}
      });

      if (response.data.error) {
        // Method might not exist, return defaults
        logger.warn('Priority labels API not available, using defaults');
        return this.getDefaultPriorityLabels();
      }

      return response.data.result || this.getDefaultPriorityLabels();
    } catch (error) {
      // Return default labels as fallback
      return this.getDefaultPriorityLabels();
    }
  }

  /**
   * Default priority labels fallback
   */
  private getDefaultPriorityLabels(): Record<string, string> {
    return {
      '5': 'Very High',
      '4': 'High',
      '3': 'Medium-High',
      '2': 'Medium',
      '1': 'Low'
    };
  }
}

export const leantimeTasksService = new LeantimeTasksService();
