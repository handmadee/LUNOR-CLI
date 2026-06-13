/**
 * Metadata-driven help formatter for Commander.
 *
 * Single source of truth: command/option/argument metadata is read directly
 * from the live Commander program. No hand-maintained command tables — every
 * registered command appears automatically, so help can never drift from the
 * actual CLI surface.
 *
 * - Global help (root program): banner + grouped command overview.
 * - Subcommand help (`lunor <cmd> --help`): usage, arguments, options, subcommands.
 *
 * Grouping is purely presentational ordering of top-level command names. Any
 * registered top-level command not listed in a group still renders under
 * "Other Commands", guaranteeing nothing is ever silently hidden.
 */

import type { Command, Help } from 'commander';
import pc from 'picocolors';
import { getBannerWithInfo, CLI_VERSION, COPYRIGHT } from './banner.js';
import { defaultTheme } from './colors.js';
import { divider } from './effects.js';

interface HelpGroup {
  title: string;
  /** Top-level command names, in display order. */
  commands: string[];
}

/**
 * Presentational ordering of top-level commands only. Subcommands are shown by
 * running `lunor <command> --help`, not in the global overview.
 */
const COMMAND_GROUPS: HelpGroup[] = [
  { title: 'Core Commands', commands: ['init', 'show', 'status', 'doctor'] },
  { title: 'Model Management', commands: ['list', 'search', 'use', 'set'] },
  { title: 'Configuration', commands: ['presets', 'keys', 'config', 'stats'] },
  { title: 'Skills & Extensions', commands: ['skills'] },
  { title: 'Codex Kit', commands: ['codex'] },
  { title: 'Plugin Marketplace', commands: ['plugin'] },
  { title: 'External Services', commands: ['amp'] },
  { title: 'Cursor Rules', commands: ['rules'] },
  { title: 'Targets', commands: ['targets'] },
  { title: 'Utilities', commands: ['completion', 'off'] },
];

const GAP = 2;

/** Full invocation path, e.g. `lunor skills init`. */
function commandPath(cmd: Command): string {
  const names: string[] = [];
  let current: Command | undefined = cmd;
  while (current) {
    names.unshift(current.name());
    current = current.parent ?? undefined;
  }
  return names.join(' ');
}

/** Short term for the global overview: name + argument placeholders only. */
function overviewTerm(cmd: Command): { plain: string; colored: string } {
  const name = cmd.name();
  const args = (cmd.registeredArguments ?? [])
    .map((arg) => (arg.required ? `<${arg.name()}>` : `[${arg.name()}]`))
    .join(' ');

  if (!args) {
    return { plain: name, colored: defaultTheme.command(name) };
  }
  return {
    plain: `${name} ${args}`,
    colored: `${defaultTheme.command(name)} ${pc.dim(args)}`,
  };
}

/** Render a two-column row, padding by visible (uncolored) width. */
function row(plainTerm: string, coloredTerm: string, description: string, width: number): string {
  const pad = Math.max(GAP, width + GAP - plainTerm.length);
  return `  ${coloredTerm}${' '.repeat(pad)}${defaultTheme.description(description)}`;
}

function formatGlobalHelp(program: Command, helper: Help): string {
  const width = process.stdout.columns || 80;
  const lines: string[] = [];

  lines.push(getBannerWithInfo(CLI_VERSION, width, 'cyanToMagenta'));
  lines.push('');
  lines.push(divider());
  lines.push('');

  const visible = helper.visibleCommands(program);
  const byName = new Map(visible.map((cmd) => [cmd.name(), cmd] as const));
  const seen = new Set<string>();

  // Precompute column width across every command we will render.
  const allTerms = visible.map((cmd) => overviewTerm(cmd).plain.length);
  const colWidth = allTerms.length ? Math.max(...allTerms) : 0;

  const renderCommand = (cmd: Command): void => {
    const term = overviewTerm(cmd);
    lines.push(row(term.plain, term.colored, helper.subcommandDescription(cmd), colWidth));
    seen.add(cmd.name());
  };

  for (const group of COMMAND_GROUPS) {
    const cmds = group.commands
      .map((name) => byName.get(name))
      .filter((cmd): cmd is Command => Boolean(cmd));
    if (cmds.length === 0) continue;

    lines.push(defaultTheme.heading(group.title));
    lines.push('');
    cmds.forEach(renderCommand);
    lines.push('');
  }

  // Drift guard: any registered top-level command not placed in a group.
  const leftovers = visible.filter((cmd) => !seen.has(cmd.name()));
  if (leftovers.length > 0) {
    lines.push(defaultTheme.heading('Other Commands'));
    lines.push('');
    leftovers.forEach(renderCommand);
    lines.push('');
  }

  const options = helper.visibleOptions(program);
  if (options.length > 0) {
    const optWidth = Math.max(...options.map((opt) => helper.optionTerm(opt).length));
    lines.push(defaultTheme.heading('Global Options'));
    lines.push('');
    for (const opt of options) {
      const term = helper.optionTerm(opt);
      lines.push(row(term, defaultTheme.flag(term), helper.optionDescription(opt), optWidth));
    }
    lines.push('');
  }

  lines.push(divider());
  lines.push('');
  lines.push(pc.bold(pc.cyan("  Trợ giúp chi tiết (Detailed Help):")));
  lines.push(defaultTheme.muted("    Để xem hướng dẫn sử dụng chi tiết của từng lệnh con, hãy chạy:"));
  lines.push(pc.yellow("    lunor <lệnh con> --help") + pc.dim("   (Ví dụ: lunor use --help, lunor reset --help)"));
  lines.push('');
  lines.push(defaultTheme.muted(`  ${COPYRIGHT} • Made with ${pc.red('♥')} for AI developers`));
  lines.push('');

  return lines.join('\n');
}

function formatSubcommandHelp(cmd: Command, helper: Help): string {
  const lines: string[] = [];
  const description = helper.commandDescription(cmd);

  lines.push('');
  const header = `${defaultTheme.command(commandPath(cmd))}`;
  lines.push(description ? `${header} ${defaultTheme.muted('—')} ${defaultTheme.description(description)}` : header);
  lines.push('');

  lines.push(defaultTheme.heading('Usage:'));
  lines.push(`  ${defaultTheme.example(helper.commandUsage(cmd))}`);
  lines.push('');

  // Read registered arguments directly: Commander's `visibleArguments()` hides
  // arguments that lack a description, but we always want to surface them.
  const args = cmd.registeredArguments ?? [];
  if (args.length > 0) {
    const width = Math.max(...args.map((arg) => helper.argumentTerm(arg).length));
    lines.push(defaultTheme.heading('Arguments:'));
    lines.push('');
    for (const arg of args) {
      const term = helper.argumentTerm(arg);
      lines.push(row(term, defaultTheme.command(term), helper.argumentDescription(arg), width));
    }
    lines.push('');
  }

  const subcommands = helper.visibleCommands(cmd);
  if (subcommands.length > 0) {
    const width = Math.max(...subcommands.map((sub) => overviewTerm(sub).plain.length));
    lines.push(defaultTheme.heading('Commands:'));
    lines.push('');
    for (const sub of subcommands) {
      const term = overviewTerm(sub);
      lines.push(row(term.plain, term.colored, helper.subcommandDescription(sub), width));
    }
    lines.push('');
  }

  const options = helper.visibleOptions(cmd);
  if (options.length > 0) {
    const width = Math.max(...options.map((opt) => helper.optionTerm(opt).length));
    lines.push(defaultTheme.heading('Options:'));
    lines.push('');
    for (const opt of options) {
      const term = helper.optionTerm(opt);
      lines.push(row(term, defaultTheme.flag(term), helper.optionDescription(opt), width));
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Commander `formatHelp` hook: dispatch root vs. subcommand rendering. */
function formatHelp(cmd: Command, helper: Help): string {
  return cmd.parent ? formatSubcommandHelp(cmd, helper) : formatGlobalHelp(cmd, helper);
}

/**
 * Install the Lunor help formatter on the program. Must be called BEFORE
 * registering command groups so subcommands inherit the configuration
 * (Commander copies `_helpConfiguration` to children at `.command()` time).
 */
export function configureLunorHelp(program: Command): void {
  program.configureHelp({ formatHelp });
  program.helpOption('-h, --help', 'Hiển thị thông tin trợ giúp cho lệnh');
}
