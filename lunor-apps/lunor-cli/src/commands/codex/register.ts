/**
 * Self-registering Codex command group.
 *
 * Owns the entire `lunor codex <sub>` Commander tree.
 * Integrates Codex Kit skills and harmet chain into lunor-cli.
 *
 * Usage:
 *   lunor codex list              — List all 25 codex-kit skills
 *   lunor codex list --category planning
 *   lunor codex run <skill>       — Print SKILL.md content (pipeable)
 *   lunor codex run <skill> --copy — Copy to clipboard
 *   lunor codex harmet            — Show 7-stage harmet chain
 *   lunor codex install           — Copy skills to .agents/skills/
 *   lunor codex install --target <dir> --force
 *   lunor codex info              — Show codex-kit stats and path
 */

import type { Command } from 'commander';
import { withErrorBoundary } from '../registry.js';
import {
  codexListCommand,
  codexRunCommand,
  codexHarmetCommand,
  codexInstallCommand,
  codexInfoCommand,
} from './commands.js';
import type { CodexSkillCategory } from './types.js';

export function registerCodexCommands(program: Command): void {
  const codexCmd = program
    .command('codex')
    .description('Codex Kit skills and harmet delivery chain')
    .action(withErrorBoundary(codexListCommand));

  codexCmd
    .command('list')
    .description('List all Codex Kit skills grouped by category')
    .option('-c, --category <category>', 'Filter: planning|dev|debug|security|x-automation|automation|agents')
    .option('--json', 'Output as JSON')
    .action(withErrorBoundary(
      async (options: { category?: CodexSkillCategory; json?: boolean }) => {
        await codexListCommand(options);
      },
    ));

  codexCmd
    .command('run <skill>')
    .description('Print a skill\'s content to stdout (pipe to agent or editor)')
    .option('--dry', 'Show skill metadata without printing content')
    .option('--copy', 'Copy skill content to clipboard (macOS)')
    .action(withErrorBoundary(
      async (skill: string, options: { dry?: boolean; copy?: boolean }) => {
        await codexRunCommand(skill, options);
      },
    ));

  codexCmd
    .command('harmet')
    .description('Show the 7-stage harmet delivery chain')
    .action(withErrorBoundary(codexHarmetCommand));

  codexCmd
    .command('install')
    .description('Copy Codex Kit skills into current project\'s .agents/skills/')
    .option('-t, --target <dir>', 'Target project directory (default: cwd)')
    .option('--all', 'Install all skills (default)')
    .option('--force', 'Overwrite existing skill files')
    .action(withErrorBoundary(
      async (options: { target?: string; all?: boolean; force?: boolean }) => {
        await codexInstallCommand(options);
      },
    ));

  codexCmd
    .command('info')
    .description('Show Codex Kit root path and skill statistics')
    .action(withErrorBoundary(codexInfoCommand));
}
