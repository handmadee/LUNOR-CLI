export interface ConfigEntry {
  readonly key: string;
  readonly value: string;
  readonly encrypted: boolean;
  readonly updatedAt: string;
}

export interface SecureConfig {
  readonly url?: string;
  readonly apiKey?: string;
}

export interface AMPConfig extends SecureConfig {
  readonly url: string;
  readonly apiKey: string;
}

export interface ClaudeConfig extends SecureConfig {
  readonly apiKey: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly organization?: string;
}

export interface MiMoConfig extends SecureConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model?: string;
}

export type ConfigKey = 
  | 'amp.url'
  | 'amp.apiKey'
  | 'claude.apiKey'
  | 'claude.model'
  | 'claude.baseUrl'
  | 'claude.organization'
  | 'mimo.apiKey'
  | 'mimo.baseUrl'
  | 'mimo.model';

export interface IConfigRepository {
  get(key: ConfigKey): Promise<string | undefined>;
  set(key: ConfigKey, value: string, encrypt?: boolean): Promise<void>;
  delete(key: ConfigKey): Promise<void>;
  list(): Promise<ConfigEntry[]>;
  exists(key: ConfigKey): Promise<boolean>;
}

export interface IConfigService {
  getAMPConfig(): Promise<AMPConfig | null>;
  setAMPConfig(config: Partial<AMPConfig>): Promise<void>;
  getClaudeConfig(): Promise<ClaudeConfig | null>;
  setClaudeConfig(config: Partial<ClaudeConfig>): Promise<void>;
  getMiMoConfig(): Promise<MiMoConfig | null>;
  setMiMoConfig(config: Partial<MiMoConfig>): Promise<void>;
  exportToEnv(): string[];
  validateConfig(): Promise<ValidationResult>;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}
