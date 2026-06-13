/**
 * `lunor reset [target]` — Reset Codex and/or Claude Code to their original defaults.
 *
 * Targets:
 *   codex   — Revert ~/.codex/config.toml to native ChatGPT/OpenAI defaults
 *             and remove any local .codex/ directory in cwd.
 *   claude  — Remove API key overrides / proxy config from ~/.claude.json and
 *             ~/.claude/settings.json, and clear active CLI state + local .claude/ dir.
 *   all     — Both codex + claude (default when target is omitted).
 *
 * Shell integration note:
 *   If used via the zsh wrapper, `lunor reset` evaluates the unset output so that
 *   env vars are removed from the current shell session.
 */

import pc from 'picocolors';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { PATHS } from '../constants/paths.js';
import { logger } from '../utils/logger.js';

export type ResetTarget = 'codex' | 'claude' | 'all';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remove a top-level key from a TOML string (before the first [section]).
 */
function removeTomlKey(toml: string, key: string): { content: string; modified: boolean } {
  const lines = toml.split(/\r?\n/);
  let firstTableIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('[') && !trimmed.startsWith('#')) {
      firstTableIndex = i;
      break;
    }
  }
  const limit = firstTableIndex !== -1 ? firstTableIndex : lines.length;
  for (let i = 0; i < limit; i++) {
    if (new RegExp(`^\\s*${key}\\s*=`).test(lines[i])) {
      lines.splice(i, 1);
      return { content: lines.join('\n'), modified: true };
    }
  }
  return { content: toml, modified: false };
}

/**
 * Replace a top-level key value in a TOML string (before the first [section]).
 */
function replaceTomlKeyValue(toml: string, key: string, newValue: string): { content: string; modified: boolean } {
  const lines = toml.split(/\r?\n/);
  let firstTableIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('[') && !trimmed.startsWith('#')) {
      firstTableIndex = i;
      break;
    }
  }
  const limit = firstTableIndex !== -1 ? firstTableIndex : lines.length;
  for (let i = 0; i < limit; i++) {
    if (new RegExp(`^\\s*${key}\\s*=`).test(lines[i])) {
      lines[i] = `${key} = "${newValue}"`;
      return { content: lines.join('\n'), modified: true };
    }
  }
  return { content: toml, modified: false };
}

/**
 * Remove a [section] block (and all its lines up to the next [section]) from a TOML string.
 */
function removeTomlSection(toml: string, sectionHeader: string): { content: string; modified: boolean } {
  const lines = toml.split(/\r?\n/);
  let startIdx = -1;
  let endIdx = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === sectionHeader) {
      startIdx = i;
    } else if (startIdx !== -1 && trimmed.startsWith('[') && !trimmed.startsWith('#')) {
      endIdx = i;
      break;
    }
  }
  if (startIdx === -1) return { content: toml, modified: false };
  lines.splice(startIdx, endIdx - startIdx);
  return { content: lines.join('\n'), modified: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Codex reset
// ─────────────────────────────────────────────────────────────────────────────

export async function resetCodex(): Promise<{ envUnsets: string[]; steps: string[] }> {
  const steps: string[] = [];
  const envUnsets: string[] = [];

  // 1. Revert ~/.codex/config.toml
  const codexDir = join(homedir(), '.codex');
  const configTomlPath = join(codexDir, 'config.toml');

  if (existsSync(configTomlPath)) {
    try {
      let toml = readFileSync(configTomlPath, 'utf-8');
      let anyChange = false;

      // Remove model_provider key
      const r1 = removeTomlKey(toml, 'model_provider');
      if (r1.modified) { toml = r1.content; anyChange = true; }

      // Remove supports_websockets key
      const r2 = removeTomlKey(toml, 'supports_websockets');
      if (r2.modified) { toml = r2.content; anyChange = true; }

      // Remove model_reasoning_effort key
      const r3 = removeTomlKey(toml, 'model_reasoning_effort');
      if (r3.modified) { toml = r3.content; anyChange = true; }

      // Remove plan_mode_reasoning_effort key
      const r4 = removeTomlKey(toml, 'plan_mode_reasoning_effort');
      if (r4.modified) { toml = r4.content; anyChange = true; }

      // Revert model from gpt-5.5 → gpt-4o (safe native default)
      const r5 = replaceTomlKeyValue(toml, 'model', 'gpt-4o');
      // Only mark as changed if the original was gpt-5.5
      if (r5.modified && toml.includes('model = "gpt-5.5"')) {
        toml = r5.content;
        anyChange = true;
      }

      // Remove [model_providers.cliproxyapi] block
      const r6 = removeTomlSection(toml, '[model_providers.cliproxyapi]');
      if (r6.modified) { toml = r6.content; anyChange = true; }

      if (anyChange) {
        // Clean up triple+ blank lines
        toml = toml.replace(/\n{3,}/g, '\n\n');
        writeFileSync(configTomlPath, toml, 'utf-8');
        steps.push(`✓ Reverted ${pc.cyan('~/.codex/config.toml')} to native ChatGPT / OpenAI defaults`);
      } else {
        steps.push(`  ${pc.dim('~/.codex/config.toml')} — already at native defaults, no changes needed`);
      }
    } catch (err: any) {
      steps.push(`${pc.red('✗')} Failed to revert ~/.codex/config.toml: ${err.message}`);
    }
  } else {
    steps.push(`  ${pc.dim('~/.codex/config.toml')} — not found, nothing to revert`);
  }

  // 2. Remove local .codex/ in cwd (if any)
  const localCodexDir = join(process.cwd(), '.codex');
  if (existsSync(localCodexDir)) {
    try {
      rmSync(localCodexDir, { recursive: true, force: true });
      steps.push(`✓ Removed local ${pc.cyan('.codex/')} directory from project`);
    } catch (err: any) {
      steps.push(`${pc.red('✗')} Failed to remove local .codex/: ${err.message}`);
    }
  }

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

  // 5. Remove local .claude/ in cwd (if any)
  const localClaudeDir = join(process.cwd(), '.claude');
  if (existsSync(localClaudeDir)) {
    try {
      rmSync(localClaudeDir, { recursive: true, force: true });
      steps.push(`✓ Removed local ${pc.cyan('.claude/')} directory from project`);
    } catch (err: any) {
      steps.push(`${pc.red('✗')} Failed to remove local .claude/: ${err.message}`);
    }
  }

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
