import { homedir } from 'node:os';
import { join } from 'node:path';
import type { IDETarget } from './types.js';

export interface IDEConfig {
  readonly name: string;
  readonly displayName: string;
  readonly rulesDir: string;
  readonly description: string;
}

export const IDE_CONFIGS: Record<IDETarget, IDEConfig | null> = {
  cursor: {
    name: 'cursor',
    displayName: 'Cursor IDE',
    rulesDir: join(homedir(), '.cursor', 'rules'),
    description: 'AI-powered code editor with Claude integration',
  },
  atigravity: {
    name: 'atigravity',
    displayName: 'Atigravity',
    rulesDir: join(homedir(), '.atigravity', 'rules'),
    description: 'Advanced AI coding assistant',
  },
  claudecode: {
    name: 'claudecode',
    displayName: 'ClaudeCode',
    rulesDir: join(homedir(), '.claudecode', 'rules'),
    description: 'Claude-powered development environment',
  },
  all: null,
};

export function getIDEConfig(target: IDETarget): IDEConfig | null {
  return IDE_CONFIGS[target];
}

export function getAllIDEConfigs(): IDEConfig[] {
  return Object.values(IDE_CONFIGS).filter((config): config is IDEConfig => config !== null);
}

export function getIDENames(): IDETarget[] {
  return Object.keys(IDE_CONFIGS).filter((key): key is IDETarget => key !== 'all');
}

export function getRulesDirectory(target: IDETarget): string | null {
  const config = getIDEConfig(target);
  return config?.rulesDir || null;
}

export function getAllRulesDirectories(): string[] {
  return getAllIDEConfigs().map(config => config.rulesDir);
}
