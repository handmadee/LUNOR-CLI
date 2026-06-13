import { Request, Response, NextFunction } from 'express';
import { HttpException } from '../exceptions/http.exception';
import { createErrorResponse } from '../constants/error-codes';
import { logger } from '../logger';

/**
 * Global Error Handling Middleware
 * 
 * Catches all errors and returns consistent JSON response.
 * Single Responsibility: Only handles error formatting and response.
 */
export function errorMiddleware(
  error: Error | HttpException,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  if (error instanceof HttpException) {
    logger.warn(`HTTP ${error.statusCode}: ${error.message}`, {
      path: req.path,
      method: req.method,
    });
  } else {
    logger.error('INTERNAL_ERROR', error, {
      path: req.path,
      method: req.method,
    });
  }

  // Determine status code
  const statusCode = error instanceof HttpException ? error.statusCode : 500;

  // Send response
  res.status(statusCode).json(createErrorResponse(
    statusCode >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
    error.message
  ));
}
