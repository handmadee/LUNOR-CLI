import { describe, test, expect } from 'vitest';
import { LunorError, createError, ErrorCodes } from './errors.js';

describe('Error Handling', () => {
  test('should create LunorError with code and message', () => {
    const error = new LunorError('TEST_001', 'Test error');
    expect(error.code).toBe('TEST_001');
    expect(error.message).toBe('Test error');
    expect(error.suggestion).toBeUndefined();
  });

  test('should create LunorError with suggestion', () => {
    const error = new LunorError('TEST_001', 'Test error', 'Try this');
    expect(error.code).toBe('TEST_001');
    expect(error.suggestion).toBe('Try this');
  });

  test('should have defined error codes', () => {
    expect(ErrorCodes.KEY_NOT_FOUND).toBe('LUNOR_001');
    expect(ErrorCodes.INVALID_MODEL).toBe('LUNOR_002');
    expect(ErrorCodes.NETWORK_TIMEOUT).toBe('LUNOR_003');
  });

  test('should create error using factory function', () => {
    const error = createError('TEST', 'Message', 'Suggestion');
    expect(error).toBeInstanceOf(LunorError);
    expect(error.code).toBe('TEST');
    expect(error.message).toBe('Message');
    expect(error.suggestion).toBe('Suggestion');
  });
});
