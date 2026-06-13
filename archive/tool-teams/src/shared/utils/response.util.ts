import { Response } from 'express';

/**
 * Response Utilities
 * 
 * Helper functions for consistent API responses.
 */

interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Send success response
 */
function success<T>(res: Response, data: T, message?: string): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
  res.json(response);
}

/**
 * Send created response (201)
 */
function created<T>(res: Response, data: T, message?: string): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
  res.status(201).json(response);
}

/**
 * Send no content response (204)
 */
function noContent(res: Response): void {
  res.status(204).send();
}

/**
 * Send error response
 */
function error(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(response);
}

export const responseUtil = {
  success,
  created,
  noContent,
  error,
};
