/**
 * Self-registering Core commands group.
 *
 * Top-level commands: list, search, use, set, show, status, doctor.
 */

import type { Command } from 'commander';
import { withErrorBoundary } from './registry.js';
import { listCommand } from './list.js';
import { useCommand } from './use.js';
import { setCommand } from './set.js';
import { showCommand } from './show.js';
import { statusCommand } from './status.js';
import { doctorCommand } from './doctor.js';
import { resetCommand, emitResetCommand, type ResetTarget } from './reset.js';

export function registerCoreCommands(program: Command): void {
  program
    .command('list')
    .description('List available models')
    .option('-p, --provider <provider>', 'Filter by provider')
    .option('-s, --search <query>', 'Search models')
    .action(withErrorBoundary(listCommand));

  program
    .command('search <query>')
    .description('Search for models')
    .action(withErrorBoundary(
      async (query: string) => {
        await listCommand({ search: query });
      },
    ));

  program
    .command('use <preset>')
    .description('Activate a preset configuration')
    .action(withErrorBoundary(useCommand));

  program
    .command('set <model>')
    .description('Set a single model for all slots')
    .action(withErrorBoundary(setCommand));

  program
    .command('show')
    .description('Show current configuration')
    .action(withErrorBoundary(showCommand));

  program
    .command('status')
    .description('Show interactive dashboard')
    .action(withErrorBoundary(statusCommand));

  program
    .command('doctor')
    .description('Run health checks')
    .action(withErrorBoundary(doctorCommand));

  program
    .command('reset [target]')
    .description('Reset Codex and/or Claude Code to original defaults (target: codex|claude|all)')
    .option('--emit', 'Emit shell unset commands (used by the zsh wrapper)')
    .action(withErrorBoundary(
      async (target?: string, options?: { emit?: boolean }) => {
        const t = (target ?? 'all') as ResetTarget;
        if (options?.emit) {
          await emitResetCommand(t);
        } else {
          await resetCommand(t);
        }
      },
    ));

  // ── Theme Commands ──────────────────────────────────────────────────────────
  const themeCmd = program
    .command('theme')
    .description('Manage macOS Terminal and iTerm2 window themes');

  themeCmd
    .command('list')
    .description('List available themes')
    .action(withErrorBoundary(
      async () => {
        const { themeListCommand } = await import('./theme.js');
        themeListCommand();
      }
    ));

  themeCmd
    .command('apply <name>')
    .description('Instantly apply terminal theme colors')
    .action(withErrorBoundary(
      async (name: string) => {
        const { themeApplyCommand } = await import('./theme.js');
        await themeApplyCommand(name);
      }
    ));
}
