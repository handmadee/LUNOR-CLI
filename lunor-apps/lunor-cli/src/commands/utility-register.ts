/**
 * Self-registering Utility commands group.
 *
 * Commands: init, completion, off, __emit.
 */

import type { Command } from 'commander';
import { withErrorBoundary } from './registry.js';
import { initZshCommand, emitCommand } from './init.js';
import { completionZshCommand } from './completion.js';
import { logger } from '../utils/logger.js';

export function registerUtilityCommands(program: Command): void {
  program
    .command('init <shell>')
    .description('Print shell integration script')
    .action(withErrorBoundary(
      async (shell: string) => {
        if (shell !== 'zsh') {
          logger.error('Only zsh is supported currently');
          process.exit(1);
        }
        initZshCommand();
      },
    ));

  program
    .command('completion <shell>')
    .description('Generate shell completion script')
    .action(withErrorBoundary(
      async (shell: string) => {
        if (shell !== 'zsh') {
          logger.error('Only zsh is supported currently');
          process.exit(1);
        }
        completionZshCommand();
      },
    ));

  program
    .command('off')
    .description('Disable Lunor (print unset commands)')
    .action(withErrorBoundary(
      async () => {
        await emitCommand('off');
      },
    ));

  program
    .command('__emit <action> [args...]', { hidden: true })
    .description('Internal: emit shell code')
    .action(withErrorBoundary(
      async (action: string, args: string[]) => {
        await emitCommand(action, ...args);
      },
    ));
}
