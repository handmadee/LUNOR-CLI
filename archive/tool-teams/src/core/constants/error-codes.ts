/**
 * Centralized Error Codes
 * 
 * All error codes used in the application for consistent error handling
 * and Telegram notifications.
 */

export type ErrorCode = keyof typeof ERROR_CODES;

export const ERROR_CODES = {
  // General Errors
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
  },
  BAD_REQUEST: {
    code: 'BAD_REQUEST',
    message: 'Invalid request parameters',
    statusCode: 400,
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
    statusCode: 404,
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    statusCode: 400,
  },

  // Authentication Errors
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
    statusCode: 401,
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'Access denied',
    statusCode: 403,
  },
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid credentials provided',
    statusCode: 401,
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: 'Access token has expired',
    statusCode: 401,
  },
  TOKEN_INVALID: {
    code: 'TOKEN_INVALID',
    message: 'Invalid access token',
    statusCode: 401,
  },
  CREDENTIALS_NOT_FOUND: {
    code: 'CREDENTIALS_NOT_FOUND',
    message: 'No credentials configured',
    statusCode: 401,
  },
  LOGIN_FAILED: {
    code: 'LOGIN_FAILED',
    message: 'Login failed',
    statusCode: 401,
  },
  REFRESH_FAILED: {
    code: 'REFRESH_FAILED',
    message: 'Token refresh failed',
    statusCode: 401,
  },

  // Attendance Errors
  CLOCK_IN_FAILED: {
    code: 'CLOCK_IN_FAILED',
    message: 'Failed to clock in',
    statusCode: 500,
  },
  CLOCK_OUT_FAILED: {
    code: 'CLOCK_OUT_FAILED',
    message: 'Failed to clock out',
    statusCode: 500,
  },
  ALREADY_CLOCKED_IN: {
    code: 'ALREADY_CLOCKED_IN',
    message: 'Already clocked in',
    statusCode: 400,
  },
  NOT_CLOCKED_IN: {
    code: 'NOT_CLOCKED_IN',
    message: 'Not clocked in yet',
    statusCode: 400,
  },
  TIMECARD_NOT_FOUND: {
    code: 'TIMECARD_NOT_FOUND',
    message: 'Timecard not found',
    statusCode: 404,
  },

  // MS Teams API Errors
  TEAMS_API_ERROR: {
    code: 'TEAMS_API_ERROR',
    message: 'Microsoft Teams API error',
    statusCode: 502,
  },
  TEAMS_CONNECTION_FAILED: {
    code: 'TEAMS_CONNECTION_FAILED',
    message: 'Failed to connect to Microsoft Teams',
    statusCode: 503,
  },

  // Scheduler Errors
  SCHEDULER_ERROR: {
    code: 'SCHEDULER_ERROR',
    message: 'Scheduler error occurred',
    statusCode: 500,
  },
  SCHEDULER_ALREADY_RUNNING: {
    code: 'SCHEDULER_ALREADY_RUNNING',
    message: 'Scheduler is already running',
    statusCode: 400,
  },
  SCHEDULER_NOT_RUNNING: {
    code: 'SCHEDULER_NOT_RUNNING',
    message: 'Scheduler is not running',
    statusCode: 400,
  },

  // Telegram Errors
  TELEGRAM_SEND_FAILED: {
    code: 'TELEGRAM_SEND_FAILED',
    message: 'Failed to send Telegram message',
    statusCode: 500,
  },
  TELEGRAM_POLLING_ERROR: {
    code: 'TELEGRAM_POLLING_ERROR',
    message: 'Telegram polling error',
    statusCode: 500,
  },

  LEANTIME_AUTH_FAILED: {
    code: 'LEANTIME_AUTH_FAILED',
    message: 'Leantime authentication failed',
    statusCode: 401,
  },
  LEANTIME_TOKEN_EXPIRED: {
    code: 'LEANTIME_TOKEN_EXPIRED',
    message: 'Leantime token expired',
    statusCode: 401,
  },
  LEANTIME_API_ERROR: {
    code: 'LEANTIME_API_ERROR',
    message: 'Leantime API request failed',
    statusCode: 500,
  },
  LEANTIME_NOT_CONFIGURED: {
    code: 'LEANTIME_NOT_CONFIGURED',
    message: 'Leantime credentials not configured',
    statusCode: 400,
  },
} as const;

/**
 * Get error definition by code
 */
export function getErrorByCode(code: ErrorCode) {
  return ERROR_CODES[code];
}

/**
 * Create error response object
 */
export function createErrorResponse(
  code: ErrorCode,
  details?: string | object
) {
  const errorDef = ERROR_CODES[code];
  return {
    success: false,
    error: {
      code: errorDef.code,
      message: errorDef.message,
      details: details ?? undefined,
    },
    timestamp: new Date().toISOString(),
  };
}
