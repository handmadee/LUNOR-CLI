import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

/**
 * Application Configuration Interface
 */
export interface AppConfig {
  port: number;
  nodeEnv: string;
  encryptionKey: string;
  msTeams: {
    apiBase: string;
    apiVersion: string;
  };
  database: {
    path: string;
  };
  mongodb: {
    uri: string;
    poolSize: number;
  };
  telegram: {
    botToken: string;
    chatId: string;
    enabled: boolean;
  };
  scheduler: {
    morningIn: string;
    morningOut: string;
    afternoonIn: string;
    afternoonOut: string;
  };
}

/**
 * Application Configuration
 * 
 * Loads configuration from environment variables with sensible defaults.
 */
export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-key-change-in-production',

  msTeams: {
    apiBase: process.env.MS_TEAMS_API_BASE || 'https://flw.teams.cloud.microsoft',
    apiVersion: process.env.MS_TEAMS_API_VERSION || '20',
  },

  database: {
    path: process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'toolteams.db'),
  },

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb+srv://handmadee38_db_user:JRw5fdRt3IN1cIGh@lunorcluster.y8es43a.mongodb.net/?appName=lunorCluster',
    poolSize: parseInt(process.env.MONGODB_POOL_SIZE || '10', 10),
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    enabled: process.env.TELEGRAM_ENABLED === 'true',
  },

  scheduler: {
    morningIn: process.env.SCHEDULER_MORNING_IN || '08:00',
    morningOut: process.env.SCHEDULER_MORNING_OUT || '12:00',
    afternoonIn: process.env.SCHEDULER_AFTERNOON_IN || '13:30',
    afternoonOut: process.env.SCHEDULER_AFTERNOON_OUT || '17:30',
  },
};

/**
 * Validate required configuration
 */
export function validateConfig(): void {
  const warnings: string[] = [];
  const errors: string[] = [];

  // MongoDB validation
  if (!process.env.MONGODB_URI) {
    warnings.push('MONGODB_URI is not set. Using default connection string.');
  }

  // Telegram validation
  if (!config.telegram.botToken) {
    warnings.push('TELEGRAM_BOT_TOKEN is not set. Telegram notifications disabled.');
  }
  if (!config.telegram.chatId) {
    warnings.push('TELEGRAM_CHAT_ID is not set. Telegram notifications disabled.');
  }

  // Encryption validation
  if (config.encryptionKey === 'default-key-change-in-production') {
    if (config.nodeEnv === 'production') {
      errors.push('ENCRYPTION_KEY must be set in production for security!');
    } else {
      warnings.push('ENCRYPTION_KEY is using default value. Please set a secure key in production.');
    }
  }

  // Display warnings and errors
  warnings.forEach((w) => console.warn(`[Config] ⚠️ ${w}`));
  errors.forEach((e) => console.error(`[Config] ❌ ${e}`));

  // Throw if critical errors
  if (errors.length > 0) {
    throw new Error('Configuration validation failed. See errors above.');
  }
}
