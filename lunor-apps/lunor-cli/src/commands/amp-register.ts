/**
 * Self-registering AMP command group.
 */

import type { Command } from 'commander';
import { withErrorBoundary } from './registry.js';
import { ampSetCommand, ampShowCommand, ampTestCommand, ampRemoveCommand } from './amp.js';

export function registerAmpCommands(program: Command): void {
  const ampCmd = program
    .command('amp')
    .description('Manage AMP configuration');

  ampCmd
    .command('set')
    .description('Configure AMP URL and API key')
    .action(withErrorBoundary(ampSetCommand));

  ampCmd
    .command('show')
    .description('Show current AMP configuration')
    .action(withErrorBoundary(ampShowCommand));

  ampCmd
    .command('test')
    .description('Test AMP connection')
    .action(withErrorBoundary(ampTestCommand));

  ampCmd
    .command('remove')
    .description('Remove AMP configuration')
    .action(withErrorBoundary(ampRemoveCommand));
}
