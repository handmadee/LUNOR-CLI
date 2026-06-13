import { telegramBot } from '../../infrastructure/telegram/telegram-bot.service';
import { ERROR_CODES, ErrorCode } from '../constants/error-codes';

/**
 * Logger Service
 * 
 * Centralized logging with console output and Telegram notifications.
 * Follows Single Responsibility Principle - only handles logging.
 */
class LoggerService {
  /**
   * Log info message
   */
  info(message: string, context?: object): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, context ?? '');
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: object): void {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, context ?? '');
  }

  /**
   * Log error message and send to Telegram
   */
  async error(
    errorCode: ErrorCode,
    error: Error | string,
    context?: object
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const errorDef = ERROR_CODES[errorCode];
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    // Console log
    console.error(`[${timestamp}] [ERROR] [${errorDef.code}] ${errorMessage}`, {
      context,
      stack,
    });

    // Send to Telegram
    const details = {
      ...context,
      stack: stack?.split('\n').slice(0, 5).join('\n'),
    };
    await telegramBot.sendError(errorDef.code, errorMessage, JSON.stringify(details, null, 2));
  }

  /**
   * Log clock in success and send to Telegram
   */
  /**
   * Log clock in success and send to Telegram
   */
  async clockInSuccess(
    user: string,
    shift: 'morning' | 'afternoon',
    timecardId: string
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [SUCCESS] Clock In - User: ${user}, Shift: ${shift}, Timecard: ${timecardId}`);
    
    await telegramBot.sendClockSuccess(shift, 'clock_in', timecardId);
  }

  /**
   * Log clock out success and send to Telegram
   */
  async clockOutSuccess(
    user: string,
    shift: 'morning' | 'afternoon',
    timecardId: string
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [SUCCESS] Clock Out - User: ${user}, Shift: ${shift}, Timecard: ${timecardId}`);
    
    await telegramBot.sendClockSuccess(shift, 'clock_out', timecardId);
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: object): void {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [DEBUG] ${message}`, context ?? '');
    }
  }
}

// Singleton instance
export const logger = new LoggerService();
