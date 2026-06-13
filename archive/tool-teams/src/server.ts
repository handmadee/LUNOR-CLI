import { createApp } from './app';
import { config, validateConfig } from './config';
import { schedulerService } from './modules/attendance/services/scheduler.service';
import { telegramBot } from './infrastructure/telegram/telegram-bot.service';
import { telegramPolling } from './infrastructure/telegram/telegram-polling.service';
import './infrastructure/telegram/telegram-commands.handler'; // Initialize handler
import { DatabaseConnection } from './infrastructure/database/sqlite.connection';
import { mongodbConnection } from './infrastructure/database/mongodb.connection';
import { APP_INFO } from './core/constants/app.constants';
import { logger } from './core/logger';

/**
 * Bootstrap and start the server
 */
async function bootstrap(): Promise<void> {
  try {
    // Validate configuration
    logger.info('🔍 Validating configuration...');
    validateConfig();

    // Connect to MongoDB
    logger.info('🔌 Connecting to MongoDB...');
    await mongodbConnection.connect();
    const mongoStatus = mongodbConnection.getStatus();
    logger.info('✅ MongoDB connected', {
      host: mongoStatus.host,
      database: mongoStatus.database,
    });

    // Create Express app
    const app = createApp();

    const server = app.listen(config.port, async () => {
      console.log('==================================================');
      console.log(`🚀 ${APP_INFO.NAME} API v${APP_INFO.VERSION}`);
      console.log('==================================================');
      console.log(`📍 Server running at http://localhost:${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`🗄️  Database: MongoDB (${mongoStatus.host}/${mongoStatus.database})`);
      console.log('==================================================');
      console.log('📋 Available endpoints:');
      console.log('   GET  /              - API info');
      console.log('   GET  /health        - Health check');
      console.log('   POST /api/auth/save-token - Save MS Teams token');
      console.log('   GET  /api/auth/status     - Check credentials');
      console.log('   POST /api/attendance/clock-in  - Manual clock in');
      console.log('   POST /api/attendance/clock-out - Manual clock out');
      console.log('   GET  /api/attendance/logs      - View logs');
      console.log('   POST /api/scheduler/start      - Start auto scheduler');
      console.log('   POST /api/scheduler/stop       - Stop scheduler');
      console.log('   GET  /api/scheduler/status     - Scheduler status');
      console.log('   POST /api/leantime/auth/login  - Leantime Login');
      console.log('   GET  /api/leantime/projects    - List Projects');
      console.log('   GET  /api/leantime/tasks       - List Tasks');
      console.log('==================================================');

      // Start scheduler automatically
      schedulerService.start();

      // Start Telegram polling and send startup notification
      if (config.telegram.enabled) {
        await telegramPolling.start();
        await telegramBot.sendStartup();
      }
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      console.log(`\n⏳ Received ${signal}. Shutting down gracefully...`);

      // Stop scheduler and polling
      schedulerService.stop();
      telegramPolling.stop();

      // Close databases
      logger.info('Closing database connections...');
      await mongodbConnection.disconnect();
      DatabaseConnection.close();

      // Close server
      server.close(() => {
        console.log('👋 Server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('⚠️ Force closing...');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap();
