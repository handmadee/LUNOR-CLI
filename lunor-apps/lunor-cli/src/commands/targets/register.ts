import type { Command } from 'commander';
import { withErrorBoundary } from '../registry.js';
import { targetsListCommand } from './list.js';

export function registerTargetsCommands(program: Command): void {
  const targetsCmd = program.command('targets').description('Manage agent target adapters').action(withErrorBoundary(targetsListCommand));
  targetsCmd.command('list').description('List supported target adapters').action(withErrorBoundary(targetsListCommand));
}
