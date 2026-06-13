export type RuleType = 'cursor' | 'code-style' | 'framework' | 'custom';
export type RuleFormat = 'markdown' | 'yaml' | 'json' | 'text';
export type IDETarget = 'cursor' | 'atigravity' | 'claudecode' | 'all';

export interface RuleMetadata {
  readonly name: string;
  readonly displayName: string;
  readonly type: RuleType;
  readonly format: RuleFormat;
  readonly description?: string;
  readonly tags?: string[];
  readonly version?: string;
  readonly targets?: IDETarget[];
}

export interface Rule extends RuleMetadata {
  readonly content: string;
  readonly filePath: string;
  readonly size: number;
  readonly createdAt: string;
  readonly updatedAt?: string;
}

export interface RuleTemplate {
  readonly name: string;
  readonly displayName: string;
  readonly type: RuleType;
  readonly description: string;
  readonly content: string;
}

export interface IRuleValidator {
  validate(content: string): Promise<ValidationResult>;
  canHandle(format: RuleFormat): boolean;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

export interface IRuleRepository {
  list(): Promise<Rule[]>;
  get(name: string): Promise<Rule | null>;
  add(rule: Omit<Rule, 'createdAt' | 'updatedAt'>): Promise<void>;
  update(name: string, content: string): Promise<void>;
  remove(name: string): Promise<void>;
  exists(name: string): Promise<boolean>;
  getRulesDir(): string;
}

export interface IRuleService {
  listRules(type?: RuleType): Promise<Rule[]>;
  getRule(name: string): Promise<Rule | null>;
  addRule(metadata: RuleMetadata, content: string): Promise<ValidationResult>;
  updateRule(name: string, content: string): Promise<ValidationResult>;
  removeRule(name: string): Promise<void>;
  importFromFile(filePath: string, metadata?: Partial<RuleMetadata>): Promise<ValidationResult>;
  exportToFile(name: string, outputPath: string): Promise<void>;
  validateRule(content: string, format: RuleFormat): Promise<ValidationResult>;
  getTemplates(): RuleTemplate[];
  createFromTemplate(templateName: string, name: string, customContent?: string): Promise<ValidationResult>;
}

export interface RuleSearchOptions {
  type?: RuleType;
  tags?: string[];
  query?: string;
}
