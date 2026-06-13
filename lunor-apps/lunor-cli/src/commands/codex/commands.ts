/**
 * `lunor codex list` — list all Codex Kit skills grouped by category.
 * `lunor codex run <skill>` — print skill content (pipe to agent or copy to clipboard).
 * `lunor codex harmet` — show the 7-stage harmet delivery chain.
 * `lunor codex install` — copy Codex Kit skills into current project's .agents/skills/.
 * `lunor codex info` — show Codex Kit root path and stats.
 */

import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import picocolors from 'picocolors';
import type { CodexListOptions, CodexRunOptions, CodexInstallOptions } from './types.js';
import {
  listCodexSkills,
  getCodexSkill,
  readSkillContent,
  HARMET_STAGES,
  getCodexKitRoot,
} from './catalogue.js';

// ── Category display config ────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  planning:      '📋 Planning',
  dev:           '🛠  Dev',
  debug:         '🔍 Debug',
  security:      '🔒 Security',
  'x-automation':'🐦 X / Twitter',
  automation:    '⚙️  Automation',
  agents:        '🤖 Agents',
};

// ── list ───────────────────────────────────────────────────────────────────────

export async function codexListCommand(options: CodexListOptions = {}): Promise<void> {
  const skills = listCodexSkills(options.category);

  if (skills.length === 0) {
    console.log(picocolors.yellow('No skills found. Is Codex Kit installed?'));
    console.log(picocolors.dim(`Expected at: ${getCodexKitRoot()}`));
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(skills, null, 2));
    return;
  }

  // Group by category
  const grouped = new Map<string, typeof skills>();
  for (const skill of skills) {
    const arr = grouped.get(skill.category) ?? [];
    arr.push(skill);
    grouped.set(skill.category, arr);
  }

  console.log('');
  console.log(picocolors.bold(picocolors.cyan('  Codex Kit skills')));
  console.log(picocolors.dim(`  ${skills.length} skills from ${getCodexKitRoot()}`));
  console.log('');

  for (const [category, categorySkills] of grouped) {
    const label = CATEGORY_LABELS[category] ?? category;
    console.log(picocolors.bold(`  ${label}`));

    for (const skill of categorySkills) {
      const invoke = picocolors.green(`$${skill.name.replace(/\s+/g, '-').toLowerCase()}`);
      const desc = picocolors.dim(skill.description.slice(0, 72));
      console.log(`    ${invoke.padEnd(28)} ${desc}`);
    }
    console.log('');
  }

  console.log(picocolors.dim('  Run: lunor codex run <skill-name>'));
  console.log(picocolors.dim('  Install to project: lunor codex install'));
}

// ── run ────────────────────────────────────────────────────────────────────────

export async function codexRunCommand(
  skillName: string,
  options: CodexRunOptions = {},
): Promise<void> {
  const skill = getCodexSkill(skillName);

  if (!skill) {
    console.error(picocolors.red(`✗ Skill not found: ${skillName}`));
    console.log(picocolors.dim('  Run `lunor codex list` to see available skills.'));
    process.exit(1);
  }

  const content = readSkillContent(skill);

  if (options.dry) {
    console.log(picocolors.bold(`\n  Skill: ${skill.name}`));
    console.log(picocolors.dim(`  Category: ${skill.category}`));
    console.log(picocolors.dim(`  Path: ${skill.path}`));
    console.log(picocolors.dim(`  Description: ${skill.description}`));
    console.log('');
    console.log(picocolors.yellow('  [dry-run] Skill content not printed. Remove --dry to display.'));
    return;
  }

  if (options.copy) {
    // Pipe to pbcopy (macOS) for clipboard
    const { execSync } = await import('node:child_process');
    try {
      execSync(`echo ${JSON.stringify(content)} | pbcopy`);
      console.log(picocolors.green(`✓ Skill "${skill.name}" copied to clipboard.`));
    } catch {
      console.log(picocolors.yellow('⚠ Could not copy to clipboard. Printing instead:'));
      console.log(content);
    }
    return;
  }

  // Default: print to stdout (pipeable to agent)
  console.log(content);
}

// ── harmet ─────────────────────────────────────────────────────────────────────

export async function codexHarmetCommand(): Promise<void> {
  console.log('');
  console.log(picocolors.bold(picocolors.cyan('  harmet — 7-Stage Delivery Chain')));
  console.log('');

  for (let i = 0; i < HARMET_STAGES.length; i++) {
    const stage = HARMET_STAGES[i];
    const num = picocolors.dim(`  ${i + 1}.`);
    const invoke = picocolors.green(stage.invoke.padEnd(26));
    const desc = picocolors.white(stage.description);
    const gate = stage.hasGate ? picocolors.yellow(' ← GATE') : '';
    console.log(`${num} ${invoke} ${desc}${gate}`);
  }

  console.log('');
  console.log(picocolors.dim('  Human GATES are mandatory — do not skip.'));
  console.log(picocolors.dim('  Start with: $harmet:exploring'));
  console.log('');
}

// ── install ────────────────────────────────────────────────────────────────────

export async function codexInstallCommand(options: CodexInstallOptions = {}): Promise<void> {
  const targetDir = options.target ?? process.cwd();
  const destSkillsDir = join(targetDir, '.agents', 'skills');

  const codexKitRoot = getCodexKitRoot();
  const srcSkillsDir = join(codexKitRoot, '.agents', 'skills');

  const skills = listCodexSkills();

  if (skills.length === 0) {
    console.log(picocolors.yellow('No skills found in Codex Kit.'));
    return;
  }

  mkdirSync(destSkillsDir, { recursive: true });

  let installed = 0;
  let skipped = 0;

  for (const skill of skills) {
    const skillDirName = basename(join(skill.path, '..'));
    const src = join(srcSkillsDir, skillDirName);
    const dest = join(destSkillsDir, skillDirName);

    if (existsSync(dest) && !options.force) {
      skipped++;
      continue;
    }

    cpSync(src, dest, { recursive: true });
    installed++;
    console.log(picocolors.green(`  ✓ ${skillDirName}`));
  }

  console.log('');
  console.log(picocolors.bold(`  Installed: ${installed} skills to ${destSkillsDir}`));
  if (skipped > 0) {
    console.log(picocolors.dim(`  Skipped: ${skipped} (already exist — use --force to overwrite)`));
  }
}

// ── info ───────────────────────────────────────────────────────────────────────

export async function codexInfoCommand(): Promise<void> {
  const root = getCodexKitRoot();
  const skills = listCodexSkills();

  const byCategory: Record<string, number> = {};
  for (const skill of skills) {
    byCategory[skill.category] = (byCategory[skill.category] ?? 0) + 1;
  }

  console.log('');
  console.log(picocolors.bold(picocolors.cyan('  Codex Kit info')));
  console.log('');
  console.log(`  ${picocolors.dim('Root:')}     ${root}`);
  console.log(`  ${picocolors.dim('Skills:')}   ${skills.length} total`);
  console.log(`  ${picocolors.dim('Stages:')}   ${HARMET_STAGES.length} harmet stages`);
  console.log('');
  console.log(picocolors.dim('  By category:'));
  for (const [cat, count] of Object.entries(byCategory)) {
    const label = CATEGORY_LABELS[cat] ?? cat;
    console.log(`    ${label.padEnd(22)} ${count}`);
  }
  console.log('');
}
