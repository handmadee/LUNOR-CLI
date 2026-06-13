import * as cron from 'node-cron';
import { attendanceService } from './attendance.service';
import { authService } from '../../auth/services/auth.service';
import { schedulerConfigRepository, SchedulerConfigEntity } from '../repositories/scheduler-config.repository';
import { logger } from '../../../core/logger';
import { ShiftType } from '../../../core/constants/app.constants';

/**
 * Scheduler Task Type
 */
type SchedulerTaskType = 'morning_clock_in' | 'morning_clock_out' | 'afternoon_clock_in' | 'afternoon_clock_out';

/**
 * Scheduler Service
 * 
 * Manages automatic clock-in/out scheduling using node-cron.
 */
class SchedulerService {
  private tasks: Map<SchedulerTaskType, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;

  /**
   * Start the scheduler with config from database
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    const config = schedulerConfigRepository.getConfig();
    if (!config) {
      logger.warn('No scheduler config found');
      return;
    }

    if (!config.is_enabled) {
      logger.info('Scheduler is disabled in config');
      return;
    }

    // Schedule morning tasks
    this.scheduleTask('morning_clock_in', config.morning_clock_in, 'morning', 'clock_in');
    this.scheduleTask('morning_clock_out', config.morning_clock_out, 'morning', 'clock_out');

    // Schedule afternoon tasks
    this.scheduleTask('afternoon_clock_in', config.afternoon_clock_in, 'afternoon', 'clock_in');
    this.scheduleTask('afternoon_clock_out', config.afternoon_clock_out, 'afternoon', 'clock_out');

    this.isRunning = true;
    logger.info('Scheduler started', {
      morning: `${config.morning_clock_in} - ${config.morning_clock_out}`,
      afternoon: `${config.afternoon_clock_in} - ${config.afternoon_clock_out}`,
    });
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    this.tasks.forEach((task, name) => {
      task.stop();
      logger.info(`Stopped task: ${name}`);
    });
    this.tasks.clear();
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  /**
   * Restart scheduler with new config
   */
  restart(): void {
    this.stop();
    this.start();
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    config: SchedulerConfigEntity | null;
    tasks: string[];
  } {
    return {
      isRunning: this.isRunning,
      config: schedulerConfigRepository.getConfig(),
      tasks: Array.from(this.tasks.keys()),
    };
  }

  /**
   * Update scheduler config and restart
   */
  updateConfig(dto: {
    morningClockIn?: string;
    morningClockOut?: string;
    afternoonClockIn?: string;
    afternoonClockOut?: string;
  }): SchedulerConfigEntity {
    const config = schedulerConfigRepository.update({
      morningClockIn: dto.morningClockIn,
      morningClockOut: dto.morningClockOut,
      afternoonClockIn: dto.afternoonClockIn,
      afternoonClockOut: dto.afternoonClockOut,
    });

    // Restart with new config
    if (this.isRunning) {
      this.restart();
    }

    return config;
  }

  /**
   * Schedule a task
   */
  private scheduleTask(
    taskName: SchedulerTaskType,
    time: string,
    shift: ShiftType,
    action: 'clock_in' | 'clock_out'
  ): void {
    const [hour, minute] = time.split(':').map(Number);
    // Cron format: minute hour * * day-of-week (1-5 = Monday-Friday)
    const cronExpression = `${minute} ${hour} * * 1-5`;

    const task = cron.schedule(cronExpression, async () => {
      logger.info(`Executing scheduled task: ${taskName}`);
      
      try {
        let result;
        if (action === 'clock_in') {
          result = await attendanceService.clockIn({ shift });
        } else {
          // For clock out, get the latest timecard from clock in
          const timecardId = attendanceService.getLatestTimecardId(shift);
          if (timecardId) {
            result = await attendanceService.clockOut({ timecardId, shift });
          } else {
            logger.warn(`No timecard found for ${shift} shift clock out`);
            return;
          }
        }

        // Handle re-auth if needed
        if (result?.needsReauth) {
          logger.warn(`Task ${taskName} failed due to auth error. Attempting explicit refresh...`);
          
          // Try explicit refresh
          const newToken = await authService.refreshToken();
          if (newToken) {
             logger.info('Token refreshed via Scheduler. Retrying task...');
             // Retry
             if (action === 'clock_in') {
               await attendanceService.clockIn({ shift });
             } else if (result.timecardId) { 
                await attendanceService.clockOut({ timecardId: result.timecardId, shift });
             }
          } else {
            // Refresh failed, notify user
            await import('../../../infrastructure/telegram/telegram-bot.service').then(m => m.telegramBot.sendReauthRequired());
          }
        }

      } catch (error) {
        await logger.error('SCHEDULER_ERROR', error as Error, { task: taskName });
      }
    });

    this.tasks.set(taskName, task);
    logger.info(`Scheduled ${taskName} at ${time} (cron: ${cronExpression})`);
  }

  /**
   * Check if it's a weekday
   */
  private isWeekday(): boolean {
    const day = new Date().getDay();
    return day >= 1 && day <= 5;
  }
}

// Singleton instance
export const schedulerService = new SchedulerService();
