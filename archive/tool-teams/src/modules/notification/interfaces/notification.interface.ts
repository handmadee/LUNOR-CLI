/**
 * Notification Interface
 * 
 * Defines the contract for notification providers (Telegram, Email, SMS, etc.)
 */
export interface INotificationProvider {
  /**
   * Send a text message
   */
  sendMessage(message: string, options?: NotificationOptions): Promise<boolean>;

  /**
   * Send an error notification
   */
  sendError(error: Error, context?: Record<string, any>): Promise<boolean>;

  /**
   * Send a success notification
   */
  sendSuccess(action: string, details?: Record<string, any>): Promise<boolean>;

  /**
   * Check if provider is available
   */
  isAvailable(): boolean;
}

/**
 * Notification Options
 */
export interface NotificationOptions {
  /**
   * Parse mode for formatting (HTML, Markdown, etc.)
   */
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';

  /**
   * Priority level
   */
  priority?: 'low' | 'normal' | 'high';

  /**
   * Optional recipient override
   */
  recipient?: string;

  /**
   * Disable notification sound
   */
  silent?: boolean;
}

/**
 * Notification Types
 */
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}
