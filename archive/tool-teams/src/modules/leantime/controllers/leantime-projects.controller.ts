import { Request, Response } from 'express';
import { LeantimeProjectsService } from '../services/leantime-projects.service';
import { leantimeCredentialsRepository } from '../repositories/leantime-credentials.repository';

export class LeantimeProjectsController {
  private getService(userId: string) {
    // Helper to get service instance for specific user
    return new LeantimeProjectsService(userId);
  }

  async getAllProjects(req: Request, res: Response) {
    try {
      const userId = req.query.userId?.toString() || 'default';
      
      // If default, try to resolve actual user
      // (We really should refactor the "default" logic into a shared helper)
      let resolvedUserId = userId;
      if (userId === 'default') {
         // simple hack: check if 'default' exists, if not use email from first row?
         // For now let's assume 'default' or assume client sends correct email.
      }

      const service = this.getService(resolvedUserId);
      const projects = await service.getAllProjects();

      return res.status(200).json({
        success: true,
        data: projects
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.query.userId?.toString() || 'default';
      const service = this.getService(userId);
      
      const project = await service.getProject(Number(id));

      return res.status(200).json({
        success: true,
        data: project
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch project details'
      });
    }
  }
}

export const leantimeProjectsController = new LeantimeProjectsController();
