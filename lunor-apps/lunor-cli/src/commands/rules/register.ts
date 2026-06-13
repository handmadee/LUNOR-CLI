/**
 * Self-registering Rules command group.
 */

import type { Command } from 'commander';
import { withErrorBoundary } from '../registry.js';
import {
  rulesAddCommand,
  rulesListCommand,
  rulesShowCommand,
  rulesRemoveCommand,
  rulesSyncCommand,
  rulesListIDEsCommand,
} from './index.js';

export function registerRulesCommands(program: Command): void {
  const rulesCmd = program
    .command('rules')
    .description('Manage Cursor rules')
    .action(withErrorBoundary(rulesListCommand));

  rulesCmd
    .command('add [file]')
    .description('Add a new rule (from file or interactive)')
    .action(withErrorBoundary(rulesAddCommand));

  rulesCmd
    .command('list [type]')
    .description('List all rules (optionally filter by type)')
    .action(withErrorBoundary(rulesListCommand));

  rulesCmd
    .command('show <name>')
    .description('Show rule details')
    .action(withErrorBoundary(rulesShowCommand));

  rulesCmd
    .command('remove [name]')
    .description('Remove a rule (interactive if no name specified)')
    .action(withErrorBoundary(rulesRemoveCommand));

  rulesCmd
    .command('sync [target]')
    .description('Sync rules across IDEs (cursor, atigravity, claudecode, all)')
    .action(withErrorBoundary(
      async (target?: string) => {
        await rulesSyncCommand(target as any);
      },
    ));

  rulesCmd
    .command('ides')
    .description('List supported IDEs and their status')
    .action(withErrorBoundary(rulesListIDEsCommand));
}
