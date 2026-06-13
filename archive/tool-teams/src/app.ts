import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateConfig } from './config';
import { errorMiddleware } from './core/middlewares/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import schedulerRoutes from './modules/attendance/scheduler.routes';
import leantimeRoutes from './modules/leantime/leantime.routes';
import { APP_INFO } from './core/constants/app.constants';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();

  // Validate configuration
  validateConfig();

  // Security middlewares
  app.use(helmet());
  app.use(cors());

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      version: APP_INFO.VERSION,
    });
  });

  // API info endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: APP_INFO.NAME,
      version: APP_INFO.VERSION,
      description: APP_INFO.DESCRIPTION,
      endpoints: {
        auth: '/api/auth',
        attendance: '/api/attendance',
        scheduler: '/api/scheduler',
        health: '/health',
      },
    });
  });


  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/scheduler', schedulerRoutes);
  app.use('/api/leantime', leantimeRoutes);

  // Global error handling (must be last)
  app.use(errorMiddleware);

  return app;
}
