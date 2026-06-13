import type { AgentTarget, TargetAdapter } from './types.js';

export const TARGET_ADAPTERS: Record<AgentTarget, TargetAdapter> = {
  claude: { id: 'claude', displayName: 'Claude Code', outputRoot: '.claude', supportsSkillFolder: true, supportsRules: false, supportsSteering: false, supportsAgents: false },
  cursor: { id: 'cursor', displayName: 'Cursor', outputRoot: '.cursor', supportsSkillFolder: true, supportsRules: true, supportsSteering: false, supportsAgents: false },
  kiro: { id: 'kiro', displayName: 'Kiro', outputRoot: '.kiro', supportsSkillFolder: true, supportsRules: false, supportsSteering: true, supportsAgents: false },
  antigravity: { id: 'antigravity', displayName: 'Antigravity', outputRoot: '.agent', supportsSkillFolder: true, supportsRules: false, supportsSteering: false, supportsAgents: false },
  codex: { id: 'codex', displayName: 'Codex CLI', outputRoot: '.codex', supportsSkillFolder: true, supportsRules: false, supportsSteering: false, supportsAgents: false },
  opencode: { id: 'opencode', displayName: 'OpenCode', outputRoot: '.opencode', supportsSkillFolder: false, supportsRules: false, supportsSteering: false, supportsAgents: true },
  gemini: { id: 'gemini', displayName: 'Gemini CLI', outputRoot: '.gemini', supportsSkillFolder: true, supportsRules: false, supportsSteering: false, supportsAgents: false },
  roocode: { id: 'roocode', displayName: 'Roo Code', outputRoot: '.roo', supportsSkillFolder: true, supportsRules: false, supportsSteering: false, supportsAgents: false },
  continue: { id: 'continue', displayName: 'Continue', outputRoot: '.continue', supportsSkillFolder: true, supportsRules: false, supportsSteering: false, supportsAgents: false },
};

export function getTargetAdapter(target: AgentTarget): TargetAdapter {
  return TARGET_ADAPTERS[target];
}
