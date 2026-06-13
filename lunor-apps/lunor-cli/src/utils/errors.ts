export class LunorError extends Error {
  constructor(
    public code: string,
    message: string,
    public suggestion?: string
  ) {
    super(message);
    this.name = 'LunorError';
  }
}

export const ErrorCodes = {
  KEY_NOT_FOUND: 'LUNOR_001',
  INVALID_MODEL: 'LUNOR_002',
  NETWORK_TIMEOUT: 'LUNOR_003',
  MODEL_NOT_AVAILABLE: 'LUNOR_404',
  INVALID_PRESET: 'LUNOR_005',
  CONFIG_ERROR: 'LUNOR_006',
  STATE_ERROR: 'LUNOR_007',
  ENCRYPTION_ERROR: 'LUNOR_008',
  VALIDATION_ERROR: 'LUNOR_009',
} as const;

export function createError(
  code: string,
  message: string,
  suggestion?: string
): LunorError {
  return new LunorError(code, message, suggestion);
}

export function handleError(error: unknown): void {
  if (error instanceof LunorError) {
    console.error(`\nError [${error.code}]: ${error.message}`);
    if (error.suggestion) {
      console.error(`→ Suggestion: ${error.suggestion}`);
    }
  } else if (error instanceof Error) {
    console.error(`\nError: ${error.message}`);
  } else {
    console.error('\nAn unknown error occurred');
  }
  process.exit(1);
}
