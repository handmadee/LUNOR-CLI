import { Request, Response, NextFunction } from 'express';
import { schedulerService } from '../services/scheduler.service';
import { responseUtil } from '../../../shared/utils/response.util';

/**
 * Scheduler Controller
 * 
 * Handles HTTP requests for scheduler operations.
 */
class SchedulerController {
  /**
   * Start scheduler
   * POST /api/scheduler/start
   */
  start(req: Request, res: Response, next: NextFunction): void {
    try {
      schedulerService.start();
      responseUtil.success(res, schedulerService.getStatus(), 'Scheduler started');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stop scheduler
   * POST /api/scheduler/stop
   */
  stop(req: Request, res: Response, next: NextFunction): void {
    try {
      schedulerService.stop();
      responseUtil.success(res, schedulerService.getStatus(), 'Scheduler stopped');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get scheduler status
   * GET /api/scheduler/status
   */
  getStatus(req: Request, res: Response, next: NextFunction): void {
    try {
      responseUtil.success(res, schedulerService.getStatus());
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update scheduler config
   * PUT /api/scheduler/config
   */
  updateConfig(req: Request, res: Response, next: NextFunction): void {
    try {
      const { morningClockIn, morningClockOut, afternoonClockIn, afternoonClockOut } = req.body;

      const config = schedulerService.updateConfig({
        morningClockIn,
        morningClockOut,
        afternoonClockIn,
        afternoonClockOut,
      });

      responseUtil.success(res, { config, status: schedulerService.getStatus() }, 'Config updated');
    } catch (error) {
      next(error);
    }
  }
}

export const schedulerController = new SchedulerController();
