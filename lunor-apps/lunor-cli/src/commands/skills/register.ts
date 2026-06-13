/**
 * Self-registering Skills command group.
 *
 * Owns the entire `lunor skills <sub>` Commander tree.
 * Handlers are imported from existing files — no logic change.
 */

import type { Command } from 'commander';
import { withErrorBoundary } from '../registry.js';
import {
  skillsInitCommand,
  skillsUpdateCommand,
  skillsListCommand,
  skillsRemoveCommand,
  skillsRefreshCommand,
  skillsNewCommand,
  skillsSyncCommand,
  skillsBrowseCommand,
  skillsConvertCommand,
  skillsValidateCommand,
  skillsAuditCommand,
  skillsComposeCommand,
} from './index.js';
import { AGENT_TARGETS, type AgentTarget } from '../../lib/agent-skills/index.js';

export function registerSkillsCommands(program: Command): void {
  const skillsCmd = program
    .command('skills')
    .description('Manage skill sources (engineering tools, UI/UX kits)')
    .action(withErrorBoundary(skillsListCommand));

  skillsCmd
    .command('init [source]')
    .description('Initialize a skill source (interactive if no source specified)')
    .option('--yes', 'Auto-confirm copy/merge prompts')
    .option('--quiet', 'Skip optional copies/merges')
    .action(withErrorBoundary(
      async (source?: string, options?: { yes?: boolean; quiet?: boolean }) => {
        await skillsInitCommand(source, options ?? {});
      },
    ));

  skillsCmd
    .command('update [source]')
    .description('Update installed skills from remote')
    .action(withErrorBoundary(skillsUpdateCommand));

  skillsCmd
    .command('list')
    .description('List available and installed skills')
    .action(withErrorBoundary(skillsListCommand));

  skillsCmd
    .command('remove [source]')
    .description('Remove an installed skill (interactive if no source specified)')
    .action(withErrorBoundary(skillsRemoveCommand));

  skillsCmd
    .command('refresh [source]')
    .description('Force refresh a skill (remove + init)')
    .action(withErrorBoundary(skillsRefreshCommand));

  skillsCmd
    .command('new')
    .description('Create a new custom skill from template')
    .action(withErrorBoundary(skillsNewCommand));

  skillsCmd
    .command('copy [skill]')
    .description('Copy installed skills to current project')
    .option('--all', 'Copy all installed skills')
    .option('--force', 'Overwrite existing files')
    .action(withErrorBoundary(
      async (skill?: string, options?: { all?: boolean; force?: boolean }) => {
        await skillsSyncCommand(skill, options);
      },
    ));

  skillsCmd
    .command('sync [skill]')
    .description('Sync canonical .agents skills to an assistant target, or copy legacy installed skills')
    .option('--all', 'Sync all legacy installed skills when --target is not set')
    .option('--force', 'Overwrite existing legacy installed files')
    .option('--target <target>', `Target adapter: ${AGENT_TARGETS.join('|')}|all`)
    .action(withErrorBoundary(
      async (skill?: string, options?: { all?: boolean; force?: boolean; target?: AgentTarget | 'all' }) => {
        await skillsSyncCommand(skill, options);
      },
    ));

  skillsCmd
    .command('validate')
    .description('Validate canonical .agents skills and write catalogs')
    .action(withErrorBoundary(skillsValidateCommand));

  skillsCmd
    .command('audit <skill>')
    .description('Audit a canonical skill for risky permissions and scripts')
    .action(withErrorBoundary(skillsAuditCommand));

  skillsCmd
    .command('compose <projectKit>')
    .description('Resolve a canonical skill or project kit dependency graph')
    .option('--target <target>', `Optionally render to target: ${AGENT_TARGETS.join('|')}`)
    .action(withErrorBoundary(
      async (projectKit: string, options?: { target?: AgentTarget }) => {
        await skillsComposeCommand(projectKit, options ?? {});
      },
    ));

  skillsCmd
    .command('browse')
    .description('Browse available/installed skills with SKILL.md preview')
    .option('--installed', 'Show only installed skills')
    .option('--search <query>', 'Filter by name substring')
    .option('--lines <n>', 'Max SKILL.md lines to preview', (v: string) => parseInt(v, 10), 40)
    .action(withErrorBoundary(
      async (options?: { installed?: boolean; search?: string; lines?: number }) => {
        await skillsBrowseCommand(options ?? {});
      },
    ));

  skillsCmd
    .command('convert <name>')
    .description('Convert skill between github/local sources and log manifest')
    .option('--to <target>', 'Target type: github|local')
    .option('--repo <owner/repo>', 'GitHub repo for github target')
    .option('--branch <branch>', 'Branch for github target', 'main')
    .option('--path <path>', 'Local path for local target')
    .action(withErrorBoundary(
      async (name: string, options?: { to?: string; repo?: string; branch?: string; path?: string }) => {
        await skillsConvertCommand(name, options ?? {});
      },
    ));
}
