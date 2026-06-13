/**
 * Types for codex-kit integration.
 */

export interface CodexSkill {
  name: string;
  description: string;
  category: CodexSkillCategory;
  path: string;
}

export type CodexSkillCategory =
  | 'planning'
  | 'dev'
  | 'debug'
  | 'security'
  | 'x-automation'
  | 'automation'
  | 'agents';

export interface HarmetStage {
  name: string;
  invoke: string;
  description: string;
  hasGate: boolean;
}

export interface CodexRunOptions {
  dry?: boolean;
  copy?: boolean;
  target?: string;
}

export interface CodexListOptions {
  category?: CodexSkillCategory;
  json?: boolean;
}

export interface CodexInstallOptions {
  target?: string;
  all?: boolean;
  force?: boolean;
}
