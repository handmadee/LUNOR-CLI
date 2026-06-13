/**
 * Command registration utilities for senior-level CLI architecture.
 *
 * `withErrorBoundary` wraps every Commander action handler so we never
 * repeat the try/catch + handleError boilerplate.
 */

import type { Command } from 'commander';
import { handleError } from '../utils/errors.js';

/**
 * Wrap an async command handler with a consistent error boundary.
 *
 * Before (repeated 40+ times):
 * ```ts
 * .action(async (opts) => { try { await fn(opts); } catch (e) { handleError(e); } });
 * ```
 *
 * After:
 * ```ts
 * .action(withErrorBoundary(fn));
 * ```
 */
export function withErrorBoundary<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<void> | void,
): (...args: TArgs) => Promise<void> {
  return async (...args: TArgs) => {
    try {
      await handler(...args);
    } catch (error) {
      handleError(error);
    }
  };
}

/**
 * Type alias for a command-group registration function.
 * Each group module exports `register(program)` conforming to this shape.
 */
export type RegisterFn = (program: Command) => void;
