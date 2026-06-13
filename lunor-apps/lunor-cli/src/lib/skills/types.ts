export type SourceType = 'local' | 'github';

export interface SourceConfig {
  readonly name: string;
  readonly displayName: string;
  readonly type: SourceType;
  readonly description?: string;
}

export interface LocalSourceConfig extends SourceConfig {
  readonly type: 'local';
  readonly path: string;
}

export interface GitHubSourceConfig extends SourceConfig {
  readonly type: 'github';
  readonly repo: string;
  readonly branch: string;
  readonly owner?: string;
}

export type AnySourceConfig = LocalSourceConfig | GitHubSourceConfig;

export interface OperationResult<T = void> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

export interface CloneResult extends OperationResult {
  readonly path: string;
}

export interface UpdateResult extends OperationResult {
  readonly updated: boolean;
  readonly previousVersion?: string;
  readonly currentVersion?: string;
}

export interface InstalledSkill {
  readonly name: string;
  readonly displayName: string;
  readonly type: SourceType;
  readonly path: string;
  readonly version?: string;
  readonly installedAt: string;
  readonly updatedAt?: string;
}

export interface SkillManifest {
  readonly version: string;
  readonly skills: InstalledSkillRecord[];
  readonly lastUpdated: string;
}

export interface InstalledSkillRecord {
  readonly name: string;
  readonly type: SourceType;
  readonly installedAt: string;
  readonly updatedAt?: string;
  readonly commit?: string;
}

export interface ISourceStrategy {
  readonly type: SourceType;
  clone(config: AnySourceConfig, targetDir: string): Promise<CloneResult>;
  update(skillPath: string): Promise<UpdateResult>;
  canUpdate(): boolean;
  getVersion(skillPath: string): string | undefined;
}

export interface ISkillRegistry {
  getSkillsDir(): string;
  getSkillPath(name: string): string;
  isInstalled(name: string): boolean;
  getInstalledSkills(): InstalledSkill[];
  getManifest(): SkillManifest | null;
  saveManifest(manifest: SkillManifest): void;
  recordInstall(name: string, type: SourceType, commit?: string): void;
  recordUpdate(name: string, commit?: string): void;
  removeRecord(name: string): void;
}

export interface ISkillManager {
  init(sourceName: string): Promise<OperationResult>;
  initAll(): Promise<Map<string, OperationResult>>;
  update(sourceName?: string): Promise<Map<string, UpdateResult>>;
  list(): InstalledSkill[];
  remove(sourceName: string): Promise<OperationResult>;
  getAvailableSources(): AnySourceConfig[];
}

// =============================================================================
// IDE Types for Engineering skill
// =============================================================================

export type IDEType = 'claude' | 'cursor' | 'opencode' | 'antigravity' | 'all';

export const IDE_TYPES: IDEType[] = ['claude', 'cursor', 'opencode', 'antigravity', 'all'];

export const IDE_FOLDERS: Record<IDEType, string[]> = {
  claude: ['.claude'],
  cursor: ['.cursor'],
  opencode: ['.opencode'],
  antigravity: ['.agent'],
  all: ['.claude', '.cursor', '.opencode', '.agent'],
};

const IDE_TYPE_DESCRIPTIONS: Record<IDEType, string> = {
  claude: 'Claude Code (.claude/)',
  cursor: 'Cursor (.cursor/) — migrated from .claude/',
  opencode: 'OpenCode (.opencode/)',
  antigravity: 'Antigravity (.agent/)',
  all: 'All IDEs (.claude/ + .cursor/ + .opencode/ + .agent/)',
};

export const getIDETypeDescription = (ideType: IDEType): string => IDE_TYPE_DESCRIPTIONS[ideType];

// =============================================================================
// AI Types for UX/UI skill
// =============================================================================

export type AIType = 'claude' | 'cursor' | 'windsurf' | 'antigravity' | 'copilot' | 'kiro' | 'roocode' | 'codex' | 'qoder' | 'gemini' | 'codebuddy' | 'trae' | 'opencode' | 'continue' | 'droid' | 'all';

export const AI_TYPES: AIType[] = ['claude', 'cursor', 'windsurf', 'antigravity', 'copilot', 'roocode', 'kiro', 'codex', 'qoder', 'gemini', 'codebuddy', 'trae', 'opencode', 'continue', 'droid', 'all'];

export const AI_FOLDERS: Record<Exclude<AIType, 'all'>, string[]> = {
  claude: ['.claude'],
  cursor: ['.cursor', '.shared'],
  windsurf: ['.windsurf', '.shared'],
  antigravity: ['.agent', '.shared'],
  copilot: ['.github', '.shared'],
  kiro: ['.kiro', '.shared'],
  codex: ['.codex'],
  roocode: ['.roo', '.shared'],
  qoder: ['.qoder', '.shared'],
  gemini: ['.gemini', '.shared'],
  codebuddy: ['.codebuddy', '.shared'],
  trae: ['.trae', '.shared'],
  opencode: ['.opencode', '.shared'],
  continue: ['.continue', '.shared'],
  droid: ['.droid', '.shared'],
};

const AI_TYPE_DESCRIPTIONS: Record<AIType, string> = {
  claude: 'Claude Code (.claude/)',
  cursor: 'Cursor (.cursor/ + .shared/)',
  windsurf: 'Windsurf (.windsurf/ + .shared/)',
  antigravity: 'Antigravity (.agent/ + .shared/)',
  copilot: 'GitHub Copilot (.github/ + .shared/)',
  kiro: 'Kiro (.kiro/ + .shared/)',
  codex: 'Codex CLI (.codex/)',
  roocode: 'RooCode (.roo/ + .shared/)',
  qoder: 'Qoder (.qoder/ + .shared/)',
  gemini: 'Gemini CLI (.gemini/ + .shared/)',
  codebuddy: 'CodeBuddy (.codebuddy/ + .shared/)',
  trae: 'Trae (.trae/ + .shared/)',
  opencode: 'OpenCode (.opencode/ + .shared/)',
  continue: 'Continue (.continue/ + .shared/)',
  droid: 'Droid Factory (.droid/ + .shared/)',
  all: 'All AI assistants',
};

export const getAITypeDescription = (aiType: AIType): string => AI_TYPE_DESCRIPTIONS[aiType];

// =============================================================================
// Extended Source Config
// =============================================================================

export interface SkillCopyOptions {
  ideType?: IDEType;
  aiType?: AIType;
  includeCoverage?: boolean;
  includeGitignore?: boolean;
  rootFiles?: string[];
}

export interface ExtendedSourceConfig {
  supportsIdeSelection?: boolean;
  supportsAiSelection?: boolean;
  rootFiles?: string[];
  githubRepo?: string;
  category?: 'lunor' | 'official' | 'engineering' | 'security' | 'growth' | 'marketplace' | 'orchestration' | 'reference';
  stars?: string;
  skillCount?: string;
  priority?: number;
  /** Plugin categories available in this source (for claudekit-skills marketplace pattern) */
  pluginCategories?: string[];
  /**
   * If set, the source stores skills in this root folder (e.g. "skills/") instead
   * of IDE-specific subfolders (e.g. ".agent/skills/"). The init/copy command will
   * copy <skillsRootDir>/ → <projectRoot>/<ideFolder>/skills/
   */
  skillsRootDir?: string;
  /**
   * Default target folder for sources that use skillsRootDir but do not ask for
   * an IDE/AI target. Defaults to ".agent" for backwards compatibility.
   */
  defaultTargetFolder?: string;
}
