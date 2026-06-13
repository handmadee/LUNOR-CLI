/**
 * Codex-kit skill catalogue and resolution logic.
 *
 * Resolves the codex-kit path relative to the LUNOR KIT workspace,
 * then reads SKILL.md frontmatter to build a typed catalogue.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CodexSkill, CodexSkillCategory, HarmetStage } from './types.js';

// ── Path resolution ────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Find codex-kit root relative to lunor-cli location.
 * lunor-cli lives in: LUNOR KIT/lunor-apps/lunor-cli/
 * codex-kit lives in: LUNOR KIT/agentic-frameworks/codex-kit/
 */
function resolveCodexKitRoot(): string {
  // Walk up from src/commands/codex → src → lunor-cli → lunor-apps → LUNOR KIT
  const lunoKitRoot = resolve(__dirname, '../../../../..');
  const codexPath = join(lunoKitRoot, 'agentic-frameworks', 'codex-kit');

  if (!existsSync(codexPath)) {
    // Fallback: check env var for custom path
    const envPath = process.env.CODEX_KIT_PATH;
    if (envPath && existsSync(envPath)) return envPath;

    throw new Error(
      `codex-kit not found at: ${codexPath}\n` +
      `Set CODEX_KIT_PATH env var to override.`
    );
  }
  return codexPath;
}

export function getCodexKitRoot(): string {
  return resolveCodexKitRoot();
}

// ── Skill category mapping ─────────────────────────────────────────────────────

const SKILL_CATEGORIES: Record<string, CodexSkillCategory> = {
  plan: 'planning',
  prd: 'planning',
  'issue-breakdown': 'planning',
  'risk-analysis': 'planning',
  tdd: 'dev',
  refactor: 'dev',
  prototype: 'dev',
  'zoom-out': 'dev',
  'code-review': 'dev',
  'skill-writer': 'dev',
  diagnose: 'debug',
  'security-audit': 'security',
  'x-post': 'x-automation',
  'x-comment': 'x-automation',
  'x-dm': 'x-automation',
  'x-follow': 'x-automation',
  'shadowban-check': 'x-automation',
  'profile-audit': 'x-automation',
  'proxy-rotation': 'automation',
  warmup: 'automation',
  scheduler: 'automation',
  'agent-orchestrator': 'agents',
  'memory-sync': 'agents',
  handoff: 'agents',
  caveman: 'agents',
};

// ── SKILL.md frontmatter parser ────────────────────────────────────────────────

function parseSkillFrontmatter(content: string): { name: string; description: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { name: '', description: '' };

  const frontmatter = match[1];
  const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? '';
  const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? '';
  return { name, description };
}

// ── Catalogue builder ──────────────────────────────────────────────────────────

export function listCodexSkills(filterCategory?: CodexSkillCategory): CodexSkill[] {
  const skillsDir = join(getCodexKitRoot(), '.agents', 'skills');

  if (!existsSync(skillsDir)) {
    return [];
  }

  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const skills: CodexSkill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillMdPath = join(skillsDir, entry.name, 'SKILL.md');
    if (!existsSync(skillMdPath)) continue;

    const content = readFileSync(skillMdPath, 'utf8');
    const { name, description } = parseSkillFrontmatter(content);
    const category = SKILL_CATEGORIES[entry.name] ?? 'planning';

    if (filterCategory && category !== filterCategory) continue;

    skills.push({
      name: name || entry.name,
      description,
      category,
      path: skillMdPath,
    });
  }

  return skills.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export function getCodexSkill(skillName: string): CodexSkill | undefined {
  return listCodexSkills().find(
    (s) => s.name === skillName || s.path.includes(`/${skillName}/`)
  );
}

export function readSkillContent(skill: CodexSkill): string {
  return readFileSync(skill.path, 'utf8');
}

// ── Harmet chain definition ────────────────────────────────────────────────────

export const HARMET_STAGES: HarmetStage[] = [
  {
    name: 'exploring',
    invoke: '$harmet:exploring',
    description: 'Lock decisions in CONTEXT.md via Socratic dialogue',
    hasGate: true,
  },
  {
    name: 'planning',
    invoke: '$harmet:planning',
    description: 'Research + approach.md + work shape',
    hasGate: true,
  },
  {
    name: 'validating',
    invoke: '$harmet:validating',
    description: 'Feasibility matrix + readiness proof',
    hasGate: true,
  },
  {
    name: 'swarming',
    invoke: '$harmet:swarming',
    description: 'Launch parallel worker agents',
    hasGate: false,
  },
  {
    name: 'executing',
    invoke: '$harmet:executing',
    description: 'Per-worker: reserve → implement → verify → close',
    hasGate: false,
  },
  {
    name: 'reviewing',
    invoke: '$harmet:reviewing',
    description: 'P1/P2/P3 findings review',
    hasGate: true,
  },
  {
    name: 'compounding',
    invoke: '$harmet:compounding',
    description: 'Capture learnings → memory/',
    hasGate: false,
  },
];
