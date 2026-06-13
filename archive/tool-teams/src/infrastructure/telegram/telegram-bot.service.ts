import axios from 'axios';
import { config } from '../../config';
import { telegramTemplates, getClockTemplate } from './telegram.templates';
import { ShiftType, AttendanceType } from '../../modules/attendance/dto';

/**
 * Telegram Bot Service
 * 
 * Singleton service for sending messages via Telegram Bot API.
 * Fun meme-style notifications for LEO at HILAB.
 */
class TelegramBotService {
  private readonly baseUrl: string;
  private readonly chatId: string;
  private readonly enabled: boolean;

  constructor() {
    this.baseUrl = `https://api.telegram.org/bot${config.telegram.botToken}`;
    this.chatId = config.telegram.chatId;
    this.enabled = config.telegram.enabled;
  }

  /**
   * Send a text message to the configured chat
   */
  async sendMessage(
    message: string,
    options: {
      parseMode?: 'MarkdownV2' | 'HTML';
      disableNotification?: boolean;
    } = {}
  ): Promise<boolean> {
    if (!this.enabled) {
      console.log('[Telegram] Disabled, skipping message');
      return false;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: options.parseMode ?? 'MarkdownV2',
        disable_notification: options.disableNotification ?? false,
      });

      return response.data?.ok === true;
    } catch (error) {
      console.error('[Telegram] Failed to send message:', error);
      return false;
    }
  }

  /**
   * Send clock in/out success notification
   */
  async sendClockSuccess(
    shift: ShiftType,
    action: AttendanceType,
    timecardId: string
  ): Promise<boolean> {
    const message = getClockTemplate(shift, action, timecardId);
    return this.sendMessage(message);
  }

  /**
   * Send error notification
   */
  async sendError(
    code: string,
    message: string,
    details?: string
  ): Promise<boolean> {
    const text = telegramTemplates.error(code, message, details);
    return this.sendMessage(text);
  }

  /**
   * Send startup notification
   */
  async sendStartup(): Promise<boolean> {
    const text = telegramTemplates.startup();
    return this.sendMessage(text);
  }

  /**
   * Send token refreshed notification
   */
  async sendTokenRefreshed(): Promise<boolean> {
    const text = telegramTemplates.tokenRefreshed();
    return this.sendMessage(text);
  }

  /**
   * Send re-auth required notification
   */
  async sendReauthRequired(): Promise<boolean> {
    const text = telegramTemplates.reauthRequired();
    return this.sendMessage(text);
  }

  /**
   * Send scheduler status
   */
  async sendSchedulerStatus(
    isRunning: boolean,
    configDto: {
      morningIn: string;
      morningOut: string;
      afternoonIn: string;
      afternoonOut: string;
    }
  ): Promise<boolean> {
    const text = telegramTemplates.schedulerStatus(isRunning, configDto);
    return this.sendMessage(text);
  }

  /**
   * Get bot info (for testing connection)
   */
  async getMe(): Promise<object | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/getMe`);
      return response.data?.result ?? null;
    } catch (error) {
      console.error('[Telegram] Failed to get bot info:', error);
      return null;
    }
  }
  /**
   * Set bot commands
   */
  async setMyCommands(commands: { command: string; description: string }[]): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await axios.post(`${this.baseUrl}/setMyCommands`, {
        commands,
      });
      return response.data?.ok === true;
    } catch (error) {
      console.error('[Telegram] Failed to set commands:', error);
      return false;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: number): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await axios.post(`${this.baseUrl}/deleteMessage`, {
        chat_id: this.chatId,
        message_id: messageId,
      });
      return response.data?.ok === true;
    } catch (error) {
      // Don't log error if message not found or too old
      return false;
    }
  }
}

// Singleton instance
export const telegramBot = new TelegramBotService();
