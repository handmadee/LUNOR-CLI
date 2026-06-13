#!/usr/bin/env node

/**
 * LUNOR KIT CLI — Professional CLI for AI model management and skill orchestration.
 *
 * Architecture (senior-level):
 *  - Each command group self-registers via a `register(program)` function.
 *  - All action handlers are wrapped with `withErrorBoundary` — zero boilerplate.
 *  - Help, banner, and version are handled centrally here.
 */

import { Command } from 'commander';
import { CLI_VERSION } from './lib/ui/index.js';
import { configureLunorHelp } from './lib/ui/help-formatter.js';

// ── Command group registrations ───────────────────────────────────────────────
import { registerCoreCommands } from './commands/core-register.js';
import { registerConfigCommands } from './commands/config-register.js';
import { registerSkillsCommands } from './commands/skills/register.js';
import { registerPluginCommands } from './commands/plugin/register.js';
import { registerAmpCommands } from './commands/amp-register.js';
import { registerRulesCommands } from './commands/rules/register.js';
import { registerUtilityCommands } from './commands/utility-register.js';
import { registerTargetsCommands } from './commands/targets/register.js';
import { registerCodexCommands } from './commands/codex/register.js';

// ── Encoding ──────────────────────────────────────────────────────────────────
if (process.stdout.setEncoding) {
  process.stdout.setEncoding('utf8');
}
if (process.stderr.setEncoding) {
  process.stderr.setEncoding('utf8');
}

// ── Program setup ─────────────────────────────────────────────────────────────
const program = new Command();

program
  .name('lunor')
  .description('LUNOR KIT command center for AI model management and skill orchestration')
  .version(CLI_VERSION)
  .addHelpCommand(false);

// Native `-h, --help` is handled by Commander on every command. The custom
// formatter renders the banner-rich global view and styled per-command help.
// Configure BEFORE registering so subcommands inherit the help configuration.
configureLunorHelp(program);

// ── Register all command groups ───────────────────────────────────────────────
registerCoreCommands(program);
registerConfigCommands(program);
registerSkillsCommands(program);
registerPluginCommands(program);
registerAmpCommands(program);
registerRulesCommands(program);
registerTargetsCommands(program);
registerUtilityCommands(program);
registerCodexCommands(program);

// ── Parse ─────────────────────────────────────────────────────────────────────
// Bare `lunor` (no command) shows the global help instead of doing nothing.
if (process.argv.length === 2) {
  program.help();
}

program.parse();
