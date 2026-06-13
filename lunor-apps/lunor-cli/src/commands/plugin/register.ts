/**
 * Self-registering Plugin command group.
 */

import type { Command } from 'commander';
import { withErrorBoundary } from '../registry.js';
import {
  pluginMarketplaceAddCommand,
  pluginInstallCommand,
  pluginListCommand,
} from './index.js';

export function registerPluginCommands(program: Command): void {
  const pluginCmd = program
    .command('plugin')
    .description('Manage skill plugins from marketplace repositories')
    .action(withErrorBoundary(pluginListCommand));

  const marketplaceCmd = pluginCmd
    .command('marketplace')
    .description('Manage marketplace repositories');

  marketplaceCmd
    .command('add <repo>')
    .description('Add a marketplace repository (e.g. mrgoonie/claudekit-skills)')
    .action(withErrorBoundary(pluginMarketplaceAddCommand));

  marketplaceCmd
    .command('list')
    .description('List added marketplace repositories')
    .action(withErrorBoundary(pluginListCommand));

  pluginCmd
    .command('install <spec>')
    .description('Install a plugin category (e.g. ai-ml-tools@claudekit-skills)')
    .option('--ide <type>', 'IDE target: claude|cursor|opencode|antigravity|all', 'claude')
    .option('--overwrite', 'Overwrite existing skill files')
    .option('--yes', 'Auto-confirm prompts')
    .action(withErrorBoundary(pluginInstallCommand));

  pluginCmd
    .command('list')
    .description('List added marketplace repositories and available categories')
    .action(withErrorBoundary(pluginListCommand));
}
