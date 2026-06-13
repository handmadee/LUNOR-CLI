
import { Request, Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendance.service';
import { ClockInDto, ClockOutDto } from '../dto';
import { responseUtil } from '../../../shared/utils/response.util';
import { createErrorResponse } from '../../../core/constants/error-codes';

/**
 * Attendance Controller
 * 
 * Handles HTTP requests for attendance operations.
 */
class AttendanceController {
  /**
   * Clock In
   * POST /api/attendance/clock-in
   */
  async clockIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: ClockInDto = {
        shift: req.body.shift,
        isAtApprovedLocation: req.body.isAtApprovedLocation ?? true,
      };

      const result = await attendanceService.clockIn(dto);

      if (result.success) {
        responseUtil.success(res, result, 'Clock in successful');
      } else {
        res.status(500).json(createErrorResponse('CLOCK_IN_FAILED', result.error));
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clock Out
   * POST /api/attendance/clock-out
   */
  async clockOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { timecardId, shift, isAtApprovedLocation } = req.body;

      // If no timecardId provided, get the latest from today
      const resolvedTimecardId = timecardId || attendanceService.getLatestTimecardId(shift);

      if (!resolvedTimecardId) {
        res.status(400).json(createErrorResponse('TIMECARD_NOT_FOUND', 'No timecard ID provided and no active timecard found'));
        return;
      }

      const dto: ClockOutDto = {
        timecardId: resolvedTimecardId,
        shift,
        isAtApprovedLocation: isAtApprovedLocation ?? true,
      };

      const result = await attendanceService.clockOut(dto);

      if (result.success) {
        responseUtil.success(res, result, 'Clock out successful');
      } else {
        res.status(500).json(createErrorResponse('CLOCK_OUT_FAILED', result.error));
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attendance status
   * GET /api/attendance/status
   */
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await attendanceService.getStatus();
      responseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get today's logs
   * GET /api/attendance/today
   */
  getTodayLogs(req: Request, res: Response, next: NextFunction): void {
    try {
      const logs = attendanceService.getTodayLogs();
      responseUtil.success(res, { logs, count: logs.length });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attendance logs with filters
   * GET /api/attendance/logs
   */
  getLogs(req: Request, res: Response, next: NextFunction): void {
    try {
      const { date, type, shift, limit, offset } = req.query;

      const logs = attendanceService.getLogs({
        date: date as string,
        type: type as 'clock_in' | 'clock_out',
        shift: shift as 'morning' | 'afternoon',
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      responseUtil.success(res, { logs, count: logs.length });
    } catch (error) {
      next(error);
    }
  }
}

export const attendanceController = new AttendanceController();
