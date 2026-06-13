export const AGENT_SKILL_CATEGORIES = ['project-kits', 'domains', 'extensions', 'providers', 'workflows'] as const;
export const AGENT_TARGETS = ['claude', 'cursor', 'kiro', 'antigravity', 'codex', 'opencode', 'gemini', 'roocode', 'continue'] as const;

export type AgentSkillCategory = typeof AGENT_SKILL_CATEGORIES[number];
export type AgentTarget = typeof AGENT_TARGETS[number];

export interface SkillPermissions {
  readonly filesystem: string[];
  readonly shell: string[];
  readonly network: string[];
  readonly browser: string[];
  readonly mcp: string[];
}

export interface SkillTrustPolicy {
  readonly source: 'local' | 'github' | 'registry' | 'unknown';
  readonly reviewRequired: boolean;
}

export interface AgentSkillManifest {
  readonly schemaVersion: string;
  readonly id: string;
  readonly name: string;
  readonly category: AgentSkillCategory;
  readonly version: string;
  readonly description: string;
  readonly entry: string;
  readonly dependsOn: string[];
  readonly compatibleTargets: AgentTarget[];
  readonly permissions: SkillPermissions;
  readonly trust: SkillTrustPolicy;
}

export interface LoadedAgentSkill {
  readonly manifest: AgentSkillManifest;
  readonly rootDir: string;
  readonly skillPath: string;
  readonly entryPath: string;
  readonly readmePath?: string;
}

export interface ValidationIssue {
  readonly severity: 'error' | 'warning';
  readonly skillId?: string;
  readonly file?: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: ValidationIssue[];
}

export interface TargetAdapter {
  readonly id: AgentTarget;
  readonly displayName: string;
  readonly outputRoot: string;
  readonly supportsSkillFolder: boolean;
  readonly supportsRules: boolean;
  readonly supportsSteering: boolean;
  readonly supportsAgents: boolean;
}

export interface RenderResult {
  readonly target: AgentTarget;
  readonly filesWritten: string[];
  readonly skippedSkills: string[];
}

export interface AuditFinding {
  readonly severity: 'low' | 'medium' | 'high';
  readonly skillId: string;
  readonly message: string;
  readonly file?: string;
}
