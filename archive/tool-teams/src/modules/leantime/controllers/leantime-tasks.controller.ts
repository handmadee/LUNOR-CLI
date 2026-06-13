import { Request, Response } from 'express';
import { LeantimeTasksService } from '../services/leantime-tasks.service';
import { TaskFilters } from '../dto/task.dto';

export class LeantimeTasksController {
  private getService(userId: string) {
    return new LeantimeTasksService(userId);
  }

  async getAllTasks(req: Request, res: Response) {
    try {
      const userId = req.query.userId?.toString() || 'default';
      const filters: TaskFilters = {
        projectId: req.query.projectId ? Number(req.query.projectId) : undefined,
        status: req.query.status?.toString(),
        userId: req.query.assignedTo?.toString() // 'my' or specific user ID
      };

      const service = this.getService(userId);
      const tasks = await service.getAllTasks(filters);

      return res.status(200).json({
        success: true,
        data: tasks
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch tasks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getTask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.query.userId?.toString() || 'default';
      const service = this.getService(userId);
      
      const task = await service.getTask(Number(id));

      return res.status(200).json({
        success: true,
        data: task
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch task details'
      });
    }
  }

  async createTask(req: Request, res: Response) {
    try {
      const userId = req.query.userId?.toString() || 'default';
      const service = this.getService(userId);
      
      const task = await service.createTask(req.body);

      return res.status(201).json({
        success: true,
        data: task
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create task'
      });
    }
  }
}

export const leantimeTasksController = new LeantimeTasksController();
