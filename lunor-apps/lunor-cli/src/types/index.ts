export type Provider = 'GPT' | 'Claude' | 'Gemini' | 'Kimi' | 'Qwen' | 'GLM' | 'DeepSeek' | 'MiniMax' | 'MiMo' | 'Other';

export interface ModelInfo {
  name: string;
  provider: Provider;
}

export interface Preset {
  name: string;
  description?: string;
  opus: string;
  sonnet: string;
  haiku: string;
  tags?: string[];
}

export interface Config {
  baseUrl: string;
  keyFile: string;
  stateDir: string;
  maxRetries: number;
  timeout: number;
  logLevel: 'silent' | 'info' | 'verbose' | 'debug';
  cacheEnabled: boolean;
  cacheTtl: number;
  theme?: 'default' | 'dracula' | 'nord' | 'cyberpunk' | 'matrix' | 'sunset' | 'monochrome' | 'tokyonight' | 'catppuccin' | 'rosepine';
}

export interface AppState {
  currentPreset?: string;
  endpoint?: string;
  baseUrl?: string;
  opus: string;
  sonnet: string;
  haiku: string;
  lastUpdated: string;
  freeModelKey?: string;
}

export interface UsageRecord {
  id?: number;
  timestamp: string;
  action: 'use' | 'set';
  preset?: string;
  model: string;
  provider: Provider;
}

export interface KeyInfo {
  provider: string;
  exists: boolean;
  validated: boolean;
  createdAt?: string;
  lastUsed?: string;
}
