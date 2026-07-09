/**
 * `lunor reset [target]` — Reset Codex and/or Claude Code to their original defaults.
 *
 * Targets:
 *   codex   — Factory-style reset of ~/.codex/config.toml for native ChatGPT auth:
 *             keep approval_policy, sandbox_mode, personality, service_tier, notify,
 *             [plugins.*], and never touch auth.json. Drop model pins / proxy / MCP /
 *             projects so Codex re-resolves models for the account. Clear models_cache.
 *             Also remove any project-local .codex/ (never the global ~/.codex).
 *   claude  — Remove API key overrides / proxy config from ~/.claude.json and
 *             ~/.claude/settings.json, and clear active CLI state + local .claude/ dir.
 *   all     — Both codex + claude (default when target is omitted).
 *
 * Shell integration note:
 *   If used via the zsh wrapper, `lunor reset` evaluates the unset output so that
 *   env vars are removed from the current shell session.
 */

import pc from 'picocolors';
import { existsSync, readFileSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { PATHS } from '../constants/paths.js';
import { logger } from '../utils/logger.js';

export type ResetTarget = 'codex' | 'claude' | 'all';

/** Top-level keys preserved across a Codex factory reset. */
export const CODEX_KEEP_TOP_LEVEL_KEYS = [
  'personality',
  'approval_policy',
  'sandbox_mode',
  'service_tier',
  'notify',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * True when `candidate` resolves to the global home config dir (e.g. ~/.codex).
 * Used to prevent wiping the global Codex/Claude home when cwd is $HOME.
 */
function isGlobalHomeDotDir(candidate: string, dirName: '.codex' | '.claude'): boolean {
  return resolve(candidate) === resolve(homedir(), dirName);
}

/**
 * Remove a project-local dotdir, never the global ~/.codex or ~/.claude.
 */
function removeLocalDotDir(
  dirName: '.codex' | '.claude',
  steps: string[],
): void {
  const localDir = join(process.cwd(), dirName);
  if (!existsSync(localDir)) return;

  if (isGlobalHomeDotDir(localDir, dirName)) {
    steps.push(
      `  ${pc.dim(`Skipped removing ${dirName}/`)} — matches global ~/${dirName} (cwd is home)`,
    );
    return;
  }

  try {
    rmSync(localDir, { recursive: true, force: true });
    steps.push(`✓ Removed local ${pc.cyan(`${dirName}/`)} directory from project`);
  } catch (err: any) {
    steps.push(`${pc.red('✗')} Failed to remove local ${dirName}/: ${err.message}`);
  }
}

/**
 * Read a top-level TOML assignment line value (raw RHS, including quotes/brackets).
 * Only scans before the first [section].
 */
function readTopLevelRawValue(toml: string, key: string): string | null {
  const lines = toml.split(/\r?\n/);
  let firstTableIndex = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('[') && !trimmed.startsWith('#')) {
      firstTableIndex = i;
      break;
    }
  }
  const re = new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`);
  for (let i = 0; i < firstTableIndex; i++) {
    // Strip trailing inline comments carefully: only for simple "..." values after #
    const line = lines[i];
    const m = re.exec(line);
    if (!m) continue;
    let rhs = m[1];
    // If value is a quoted string, keep through closing quote; else drop # comment
    if (rhs.startsWith('"')) {
      const end = rhs.indexOf('"', 1);
      if (end !== -1) rhs = rhs.slice(0, end + 1);
    } else if (rhs.startsWith('[')) {
      // array / notify — keep full RHS, strip trailing comment after ]
      const end = rhs.lastIndexOf(']');
      if (end !== -1) rhs = rhs.slice(0, end + 1);
    } else {
      rhs = rhs.replace(/\s+#.*$/, '');
    }
    return rhs.trim();
  }
  return null;
}

/**
 * Extract full [plugins.*] section blocks (header + body until next [section]).
 */
export function extractPluginSections(toml: string): string[] {
  const lines = toml.split(/\r?\n/);
  const blocks: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('[plugins.') && trimmed.endsWith(']')) {
      const start = i;
      i += 1;
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.startsWith('[') && !t.startsWith('#')) break;
        i += 1;
      }
      // Drop trailing blank lines inside the block
      let end = i;
      while (end > start + 1 && lines[end - 1].trim() === '') end -= 1;
      blocks.push(lines.slice(start, end).join('\n'));
      continue;
    }
    i += 1;
  }
  return blocks;
}

/**
 * Build a factory-style Codex config: keep selected prefs + plugins only.
 * No model pin, no proxy, no MCP, no projects — so models resolve for the account.
 */
export function buildFactoryCodexConfig(existingToml: string): string {
  const parts: string[] = [
    '# Factory-style Codex config (native ChatGPT auth)',
    '# No model pin — Codex selects models available to this account.',
    '# auth.json is never modified by lunor reset.',
  ];

  for (const key of CODEX_KEEP_TOP_LEVEL_KEYS) {
    const raw = readTopLevelRawValue(existingToml, key);
    if (raw !== null) {
      parts.push(`${key} = ${raw}`);
    }
  }

  const plugins = extractPluginSections(existingToml);
  if (plugins.length > 0) {
    parts.push('');
    parts.push('# --- plugins kept ---');
    for (const block of plugins) {
      parts.push(block);
      parts.push('');
    }
  }

  return `${parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Codex reset
// ─────────────────────────────────────────────────────────────────────────────

export async function resetCodex(): Promise<{ envUnsets: string[]; steps: string[] }> {
  const steps: string[] = [];
  const envUnsets: string[] = [];

  const codexDir = join(homedir(), '.codex');
  const configTomlPath = join(codexDir, 'config.toml');
  const modelsCachePath = join(codexDir, 'models_cache.json');

  // 1. Factory-rewrite ~/.codex/config.toml (keep prefs + plugins; drop model pin / proxy)
  //    Never touch auth.json.
  if (existsSync(configTomlPath)) {
    try {
      const existing = readFileSync(configTomlPath, 'utf-8');
      const next = buildFactoryCodexConfig(existing);

      if (next.trim() === existing.trim()) {
        steps.push(`  ${pc.dim('~/.codex/config.toml')} — already factory-clean, no changes needed`);
      } else {
        writeFileSync(configTomlPath, next, { encoding: 'utf-8', mode: 0o600 });
        steps.push(
          `✓ Factory-reset ${pc.cyan('~/.codex/config.toml')} — kept prefs + plugins, dropped model pin / proxy / MCP / projects`,
        );
      }

      // Confirm auth was left alone
      const authPath = join(codexDir, 'auth.json');
      if (existsSync(authPath)) {
        steps.push(`  ${pc.dim('auth.json')} — preserved (ChatGPT / account login)`);
      } else {
        steps.push(`  ${pc.yellow('auth.json')} — not found; run ${pc.cyan('codex login')} if needed`);
      }
    } catch (err: any) {
      steps.push(`${pc.red('✗')} Failed to factory-reset ~/.codex/config.toml: ${err.message}`);
    }
  } else {
    steps.push(`  ${pc.dim('~/.codex/config.toml')} — not found, nothing to rewrite`);
  }

  // 2. Clear models cache so Codex re-fetches models for this account
  if (existsSync(modelsCachePath)) {
    try {
      unlinkSync(modelsCachePath);
      steps.push(`✓ Cleared ${pc.cyan('models_cache.json')} — models will re-resolve for the account`);
    } catch (err: any) {
      steps.push(`${pc.red('✗')} Failed to clear models_cache.json: ${err.message}`);
    }
  }

  // 3. Remove project-local .codex/ only — never the global ~/.codex
  removeLocalDotDir('.codex', steps);

  return { envUnsets, steps };
}

// ─────────────────────────────────────────────────────────────────────────────
// Claude reset
// ─────────────────────────────────────────────────────────────────────────────

export async function resetClaude(): Promise<{ envUnsets: string[]; steps: string[] }> {
  const steps: string[] = [];

  // 1. Env vars that need to be unset in the parent shell
  const envUnsets = [
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_AUTH_TOKEN',
    'ANTHROPIC_DEFAULT_OPUS_MODEL',
    'ANTHROPIC_DEFAULT_SONNET_MODEL',
    'ANTHROPIC_DEFAULT_HAIKU_MODEL',
    'ANTHROPIC_MODEL',
    'ANTHROPIC_SMALL_FAST_MODEL',
    'CLAUDE_CODE_MAX_OUTPUT_TOKENS',
    'CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS',
    'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
    'MAX_THINKING_TOKENS',
    'MAX_MCP_OUTPUT_TOKENS',
    'LUNOR_PROFILE',
    'LUNOR_ENDPOINT',
    'LUNOR_FREE_MODEL_KEY',
  ];

  // 2. Revert ~/.claude.json — remove proxy fields, restore clean state
  const claudeJsonPath = join(homedir(), '.claude.json');
  if (existsSync(claudeJsonPath)) {
    try {
      let json: any = {};
      try {
        json = JSON.parse(readFileSync(claudeJsonPath, 'utf-8'));
      } catch {
        // Ignore JSON parsing error on empty or invalid file
      }

      // Remove lunor-injected fields
      delete json.primaryApiKey;
      delete json.apiKeyHelper;
      if (json.env) {
        delete json.env.ANTHROPIC_API_KEY;
        delete json.env.ANTHROPIC_BASE_URL;
        delete json.env.ANTHROPIC_AUTH_TOKEN;
        delete json.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC;
        if (Object.keys(json.env).length === 0) delete json.env;
      }

      writeFileSync(claudeJsonPath, JSON.stringify(json, null, 2), 'utf-8');
      steps.push(`✓ Cleaned ${pc.cyan('~/.claude.json')} — removed proxy/API key overrides`);
    } catch (err: any) {
      steps.push(`${pc.red('✗')} Failed to clean ~/.claude.json: ${err.message}`);
    }
  } else {
    steps.push(`  ${pc.dim('~/.claude.json')} — not found, nothing to revert`);
  }

  // 3. Revert ~/.claude/settings.json
  const claudeSettingsPath = join(homedir(), '.claude', 'settings.json');
  if (existsSync(claudeSettingsPath)) {
    try {
      let settings: any = {};
      try {
        settings = JSON.parse(readFileSync(claudeSettingsPath, 'utf-8'));
      } catch {
        // Ignore JSON parsing error on empty or invalid file
      }

      delete settings.primaryApiKey;
      delete settings.apiKeyHelper;
      if (settings.env) {
        delete settings.env.ANTHROPIC_API_KEY;
        delete settings.env.ANTHROPIC_BASE_URL;
        delete settings.env.ANTHROPIC_AUTH_TOKEN;
        delete settings.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC;
        if (Object.keys(settings.env).length === 0) delete settings.env;
      }

      writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      steps.push(`✓ Cleaned ${pc.cyan('~/.claude/settings.json')} — removed proxy/API key overrides`);
    } catch (err: any) {
      steps.push(`${pc.red('✗')} Failed to clean ~/.claude/settings.json: ${err.message}`);
    }
  } else {
    steps.push(`  ${pc.dim('~/.claude/settings.json')} — not found, nothing to revert`);
  }

  // 4. Clear Lunor CLI state file
  if (existsSync(PATHS.stateFile)) {
    try {
      writeFileSync(PATHS.stateFile, '', { mode: 0o600 });
      steps.push(`✓ Cleared Lunor state file (${pc.dim(PATHS.stateFile)})`);
    } catch (err: any) {
      steps.push(`${pc.red('✗')} Failed to clear state file: ${err.message}`);
    }
  }

  // 5. Remove project-local .claude/ only — never the global ~/.claude
  removeLocalDotDir('.claude', steps);

  return { envUnsets, steps };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main reset command (direct CLI action — does NOT print eval-able shell code)
// ─────────────────────────────────────────────────────────────────────────────

export async function resetCommand(target: ResetTarget = 'all'): Promise<void> {
  const validTargets: ResetTarget[] = ['codex', 'claude', 'all'];
  if (!validTargets.includes(target)) {
    logger.error(`Unknown reset target: ${pc.yellow(target)}. Valid options: ${validTargets.join(', ')}`);
    process.exit(1);
  }

  console.log('');
  console.log(pc.bold(pc.cyan(`  Resetting ${target === 'all' ? 'Codex + Claude' : target} to original defaults…`)));
  console.log('');

  const doCodex  = target === 'codex'  || target === 'all';
  const doClaude = target === 'claude' || target === 'all';

  if (doCodex) {
    console.log(pc.bold('  ── Codex ──'));
    const { steps } = await resetCodex();
    for (const s of steps) console.log(`  ${s}`);
    console.log('');
  }

  if (doClaude) {
    console.log(pc.bold('  ── Claude Code ──'));
    const { steps, envUnsets } = await resetClaude();
    for (const s of steps) console.log(`  ${s}`);
    if (envUnsets.length > 0) {
      console.log('');
      console.log(pc.dim('  ℹ  To clear env vars in your current shell session, run:'));
      console.log(pc.dim(`     eval "$(lunor reset ${target} --emit)"`));
    }
    console.log('');
  }

  console.log(pc.green('  ✓ Reset complete!'));
  console.log('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell-emit mode (used by `__emit reset` → evaluated by zsh wrapper)
// ─────────────────────────────────────────────────────────────────────────────

export async function emitResetCommand(target: ResetTarget = 'all'): Promise<void> {
  const doCodex  = target === 'codex'  || target === 'all';
  const doClaude = target === 'claude' || target === 'all';

  // Run file-system changes silently in emit mode
  if (doCodex) {
    const { steps } = await resetCodex();
    /* eslint-disable-next-line no-control-regex */
    for (const s of steps) console.log(`# ${s.replace(/\x1b\[[0-9;]*m/g, '')}`);
  }

  if (doClaude) {
    const { steps, envUnsets } = await resetClaude();
    /* eslint-disable-next-line no-control-regex */
    for (const s of steps) console.log(`# ${s.replace(/\x1b\[[0-9;]*m/g, '')}`);
    // Emit unset commands so the parent shell can evaluate them
    for (const key of envUnsets) {
      console.log(`unset ${key}`);
    }
  }
}
