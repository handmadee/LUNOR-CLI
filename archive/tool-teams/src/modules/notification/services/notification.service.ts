import { INotificationProvider, NotificationOptions, NotificationType } from '../interfaces/notification.interface';
import { telegramBot } from '../../../infrastructure/telegram/telegram-bot.service';
import { logger } from '../../../core/logger/logger.service';

/**
 * Notification Service
 * 
 * Centralized service for sending notifications across multiple channels.
 * Follows Strategy Pattern for multi-provider support.
 */
class NotificationService {
  private providers: Map<string, INotificationProvider> = new Map();
  private defaultProvider: string = 'telegram';

  constructor() {
    // Register Telegram as default provider
    this.registerProvider('telegram', new TelegramNotificationProvider());
  }

  /**
   * Register a notification provider
   */
  registerProvider(name: string, provider: INotificationProvider): void {
    this.providers.set(name, provider);
    logger.info(`Notification provider '${name}' registered`);
  }

  /**
   * Set the default notification provider
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider '${name}' not registered`);
    }
    this.defaultProvider = name;
  }

  /**
   * Send a notification using the default provider
   */
  async send(
    message: string,
    type: NotificationType = NotificationType.INFO,
    options?: NotificationOptions
  ): Promise<boolean> {
    return this.sendVia(this.defaultProvider, message, type, options);
  }

  /**
   * Send a notification via a specific provider
   */
  async sendVia(
    providerName: string,
    message: string,
    type: NotificationType = NotificationType.INFO,
    options?: NotificationOptions
  ): Promise<boolean> {
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      logger.error('INTERNAL_ERROR', `Notification provider '${providerName}' not found`);
      return false;
    }

    if (!provider.isAvailable()) {
      logger.warn(`Notification provider '${providerName}' is not available`);
      return false;
    }

    // Format message based on type
    const formattedMessage = this.formatMessage(message, type);

    try {
      return await provider.sendMessage(formattedMessage, options);
    } catch (error) {
      logger.error('INTERNAL_ERROR', 'Failed to send notification', { error, providerName });
      return false;
    }
  }

  /**
   * Send error notification
   */
  async sendError(error: Error, context?: Record<string, any>): Promise<boolean> {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider?.isAvailable()) return false;

    try {
      return await provider.sendError(error, context);
    } catch (e) {
      logger.error('INTERNAL_ERROR', 'Failed to send error notification', { error: e });
      return false;
    }
  }

  /**
   * Send success notification
   */
  async sendSuccess(action: string, details?: Record<string, any>): Promise<boolean> {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider?.isAvailable()) return false;

    try {
      return await provider.sendSuccess(action, details);
    } catch (e) {
      logger.error('INTERNAL_ERROR', 'Failed to send success notification', { error: e });
      return false;
    }
  }

  /**
   * Format message with icon based on type
   */
  private formatMessage(message: string, type: NotificationType): string {
    const icons = {
      [NotificationType.INFO]: 'ℹ️',
      [NotificationType.SUCCESS]: '✅',
      [NotificationType.WARNING]: '⚠️',
      [NotificationType.ERROR]: '❌',
      [NotificationType.CRITICAL]: '🚨',
    };

    const icon = icons[type] || icons[NotificationType.INFO];
    return `${icon} ${message}`;
  }
}

/**
 * Telegram Notification Provider
 */
class TelegramNotificationProvider implements INotificationProvider {
  async sendMessage(message: string, options?: NotificationOptions): Promise<boolean> {
    try {
      await telegramBot.sendMessage(message, {
        parseMode: options?.parseMode as 'MarkdownV2' | 'HTML',
        disableNotification: options?.silent
      });
      return true;
    } catch (error) {
      logger.error('INTERNAL_ERROR', 'Telegram notification failed', { error });
      return false;
    }
  }

  async sendError(error: Error, context?: Record<string, any>): Promise<boolean> {
    try {
      const errorMessage = `🚨 **Error**: ${error.message}`;
      const details = context ? `\n\nContext: \`${JSON.stringify(context)}\`` : '';
      await telegramBot.sendError('INTERNAL_ERROR', error.message, details);
      return true;
    } catch (e) {
      logger.error('INTERNAL_ERROR', 'Failed to send error to Telegram', { error: e });
      return false;
    }
  }

  async sendSuccess(action: string, details?: Record<string, any>): Promise<boolean> {
    try {
      const message = `✅ **Success**: ${action}`;
      const detailsText = details ? `\n\nDetails: \`${JSON.stringify(details)}\`` : '';
      await telegramBot.sendMessage(message + detailsText);
      return true;
    } catch (e) {
      logger.error('INTERNAL_ERROR', 'Failed to send success to Telegram', { error: e });
      return false;
    }
  }

  isAvailable(): boolean {
    // Check if Telegram bot is configured
    return !!process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ENABLED !== 'false';
  }
}

// Singleton instance
export const notificationService = new NotificationService();
