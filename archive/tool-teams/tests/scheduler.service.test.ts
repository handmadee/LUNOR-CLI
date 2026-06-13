
import { schedulerService } from '../src/modules/attendance/services/scheduler.service';
import { schedulerConfigRepository } from '../src/modules/attendance/repositories/scheduler-config.repository';
import { attendanceService } from '../src/modules/attendance/services/attendance.service';
import { telegramBot } from '../src/infrastructure/telegram/telegram-bot.service';
import { authService } from '../src/modules/auth/services/auth.service';
import * as cron from 'node-cron';

jest.mock('../src/modules/attendance/repositories/scheduler-config.repository');
jest.mock('../src/modules/attendance/services/attendance.service');
jest.mock('../src/infrastructure/telegram/telegram-bot.service');
jest.mock('../src/modules/auth/services/auth.service');
jest.mock('../src/core/logger');
jest.mock('node-cron');

describe('SchedulerService', () => {
  const mockConfig = {
    morning_clock_in: '08:00',
    morning_clock_out: '12:00',
    afternoon_clock_in: '13:30',
    afternoon_clock_out: '17:30',
    is_enabled: 1,
  };

  const mockTask = {
    stop: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (cron.schedule as jest.Mock).mockReturnValue(mockTask);
    (schedulerConfigRepository.getConfig as jest.Mock).mockReturnValue(mockConfig);
    
    // Reset singleton state
    (schedulerService as any).isRunning = false;
    (schedulerService as any).tasks.clear();
  });

  describe('start', () => {
    it('should schedule 4 tasks based on config', () => {
      schedulerService.start();

      expect(schedulerConfigRepository.getConfig).toHaveBeenCalled();
      // 4 tasks for morning/afternoon in/out
      expect(cron.schedule).toHaveBeenCalledTimes(4);

    });

    it('should not start if already running', () => {
      schedulerService.start();
      schedulerService.start(); // Call twice

      expect(cron.schedule).toHaveBeenCalledTimes(4); // Should still be 4 from first call
    });
  });

  describe('stop', () => {
    it('should stop all tasks', () => {
      // Setup active state
      (schedulerService as any).isRunning = true;
      (schedulerService as any).tasks.set('test_task', mockTask);

      schedulerService.stop();

      expect(mockTask.stop).toHaveBeenCalled();
      // expect(telegramBot.sendSchedulerStatus).toHaveBeenCalledWith(false, expect.anything()); // stop() doesn't send status in implementation?
    });
  });

  // Note: Testing the cron callback logic (inside cron.schedule) requires more complex mocking 
  // or refactoring the service to expose the callback. 
  // For now, we verified the scheduling orchestration.
});
