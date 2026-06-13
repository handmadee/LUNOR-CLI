import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../core/logger';

/**
 * Telegram Command Interface
 */
export interface TelegramCommand {
  command: string;
  args: string[];
  chatId: number;
}

/**
 * Telegram Polling Service
 * 
 * Handles long-polling updates from Telegram API.
 * Dispatches messages to the Command Handler.
 */
class TelegramPollingService {
  private readonly baseUrl: string;
  private isPolling: boolean = false;
  private lastUpdateId: number = 0;
  private commandHandler?: (command: TelegramCommand) => Promise<void>;

  constructor() {
    this.baseUrl = `https://api.telegram.org/bot${config.telegram.botToken}`;
  }

  /**
   * Set command handler callback
   */
  setCommandHandler(handler: (command: TelegramCommand) => Promise<void>): void {
    this.commandHandler = handler;
  }

  /**
   * Start polling
   */
  async start(): Promise<void> {
    if (this.isPolling) return;
    
    if (!config.telegram.enabled) {
      logger.warn('Telegram disabled, polling skipped');
      return;
    }

    this.isPolling = true;
    logger.info('Telegram polling started...');
    
    this.poll();
  }

  /**
   * Stop polling
   */
  stop(): void {
    this.isPolling = false;
    logger.info('Telegram polling stopped');
  }

  /**
   * Polling loop
   */
  private async poll(): Promise<void> {
    if (!this.isPolling) return;

    try {
      const response = await axios.get(`${this.baseUrl}/getUpdates`, {
        params: {
          offset: this.lastUpdateId + 1,
          timeout: 30, // Long polling timeout (seconds)
        },
        timeout: 40000, // Axios timeout (must be > long polling timeout)
      });

      const updates = response.data?.result || [];

      if (updates.length > 0) {
        for (const update of updates) {
          this.lastUpdateId = update.update_id;
          await this.processUpdate(update);
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        // Timeout is normal in long polling
      } else {
        logger.error('TELEGRAM_POLLING_ERROR', error as Error);
        // Wait a bit before retrying on error
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Schedule next poll
    if (this.isPolling) {
      setTimeout(() => this.poll(), 100);
    }
  }

  /**
   * Process a single update
   */
  private async processUpdate(update: any): Promise<void> {
    const message = update.message;
    if (!message || !message.text) return;

    // Only process messages from authorized chat
    if (String(message.chat.id) !== config.telegram.chatId) {
      logger.warn(`Ignored message from unauthorized chat: ${message.chat.id}`);
      return;
    }

    logger.info(`Received message: ${message.text} from ${message.chat.id}`);

    const text = message.text.trim();
    if (text.startsWith('/')) {
      const parts = text.split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      if (this.commandHandler) {
        await this.commandHandler({ command, args, chatId: message.chat.id });
      }
    }
  }
}

// Singleton instance
export const telegramPolling = new TelegramPollingService();
