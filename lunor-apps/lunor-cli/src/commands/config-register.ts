/**
 * Self-registering Configuration commands group.
 *
 * Subcommand groups: presets, keys, config, stats.
 */

import type { Command } from 'commander';
import { withErrorBoundary } from './registry.js';
import { presetsListCommand, presetsSearchCommand } from './presets.js';
import { keysAddCommand, keysAddMiMoCommand, keysListCommand, keysTestCommand, keysRemoveCommand } from './keys.js';
import { configGetCommand, configSetCommand, configBackupCommand, configRestoreCommand } from './config.js';
import { statsSummaryCommand, statsHistoryCommand, statsExportCommand } from './stats.js';
import {
  formatAnthropicBaseUrlOptions,
  formatOpenAIBaseUrlOptions,
} from '../constants/base-urls.js';
import pc from 'picocolors';

async function endpointsListCommand(): Promise<void> {
  console.log(pc.bold('Anthropic native /v1/messages endpoints'));
  console.log(pc.dim(formatAnthropicBaseUrlOptions()));
  console.log();
  console.log(pc.bold('OpenAI-compatible endpoints'));
  console.log(pc.dim(formatOpenAIBaseUrlOptions()));
}

export function registerConfigCommands(program: Command): void {
  program
    .command('endpoints')
    .description('List supported Anthropic and OpenAI base URLs')
    .action(withErrorBoundary(endpointsListCommand));

  // ── Presets ──────────────────────────────────────────────────────────────────
  const presetsCmd = program
    .command('presets')
    .description('Manage presets');

  presetsCmd
    .command('list')
    .description('List all presets')
    .action(withErrorBoundary(presetsListCommand));

  presetsCmd
    .command('search <query>')
    .description('Search presets')
    .action(withErrorBoundary(presetsSearchCommand));

  // ── Keys ────────────────────────────────────────────────────────────────────
  const keysCmd = program
    .command('keys')
    .description('Manage API keys');

  keysCmd
    .command('add')
    .description('Add API key')
    .action(withErrorBoundary(keysAddCommand));

  keysCmd
    .command('add-mimo')
    .description('Add MiMo API key')
    .action(withErrorBoundary(keysAddMiMoCommand));

  keysCmd
    .command('list')
    .description('List API keys')
    .action(withErrorBoundary(keysListCommand));

  keysCmd
    .command('test')
    .description('Test API key')
    .action(withErrorBoundary(keysTestCommand));

  keysCmd
    .command('remove')
    .description('Remove API key')
    .action(withErrorBoundary(keysRemoveCommand));

  // ── Config ──────────────────────────────────────────────────────────────────
  const configCmd = program
    .command('config')
    .description('Manage configuration');

  configCmd
    .command('get [key]')
    .description('Get configuration value')
    .action(withErrorBoundary(configGetCommand));

  configCmd
    .command('set <key> <value>')
    .description('Set configuration value')
    .action(withErrorBoundary(configSetCommand));

  configCmd
    .command('backup')
    .description('Backup configuration')
    .action(withErrorBoundary(configBackupCommand));

  configCmd
    .command('restore')
    .description('Restore configuration from backup')
    .action(withErrorBoundary(configRestoreCommand));

  // ── Stats ───────────────────────────────────────────────────────────────────
  const statsCmd = program
    .command('stats')
    .description('View usage statistics');

  statsCmd
    .command('summary')
    .description('Show usage summary')
    .action(withErrorBoundary(statsSummaryCommand));

  statsCmd
    .command('history')
    .description('Show usage history')
    .option('-d, --days <days>', 'Number of days', '7')
    .action(withErrorBoundary(
      async (options: { days?: string }) => {
        await statsHistoryCommand(parseInt(options.days ?? '7'));
      },
    ));

  statsCmd
    .command('export')
    .description('Export usage data')
    .option('-o, --output <file>', 'Output file')
    .action(withErrorBoundary(
      async (options: { output?: string }) => {
        await statsExportCommand(options.output);
      },
    ));
}
