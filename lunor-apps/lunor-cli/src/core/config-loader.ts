import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import yaml from 'js-yaml';
import type { Config } from '../types/index.js';
import { PATHS } from '../constants/paths.js';
import { DEFAULT_ANTHROPIC_BASE_URL } from '../constants/base-urls.js';

const DEFAULT_CONFIG: Config = {
  baseUrl: DEFAULT_ANTHROPIC_BASE_URL,
  keyFile: PATHS.keyFile,
  stateDir: PATHS.stateDir,
  maxRetries: 3,
  timeout: 30000,
  logLevel: 'info',
  cacheEnabled: true,
  cacheTtl: 300,
  theme: 'default',
};

export class ConfigLoader {
  private configFile: string;
  private config: Config;

  constructor(configFile?: string) {
    this.configFile = configFile || PATHS.configFile;
    this.config = this.loadConfig();
  }

  private loadConfig(): Config {
    if (!existsSync(this.configFile)) {
      return { ...DEFAULT_CONFIG };
    }

    try {
      const content = readFileSync(this.configFile, 'utf-8');
      const loaded = yaml.load(content) as Partial<Config>;
      return { ...DEFAULT_CONFIG, ...loaded };
    } catch (error) {
      return { ...DEFAULT_CONFIG };
    }
  }

  getConfig(): Config {
    return { ...this.config };
  }

  updateConfig(updates: Partial<Config>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  get(key: keyof Config): Config[keyof Config] {
    return this.config[key];
  }

  set(key: keyof Config, value: Config[keyof Config]): void {
    this.config = { ...this.config, [key]: value };
    this.saveConfig();
  }

  private saveConfig(): void {
    const dir = dirname(this.configFile);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    const content = yaml.dump(this.config, {
      indent: 2,
      lineWidth: 80,
      noRefs: true,
    });

    writeFileSync(this.configFile, content, { mode: 0o600 });
  }

  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
  }

  backup(backupPath: string): void {
    const content = yaml.dump(this.config, {
      indent: 2,
      lineWidth: 80,
      noRefs: true,
    });
    writeFileSync(backupPath, content);
  }

  restore(backupPath: string): void {
    if (!existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    const content = readFileSync(backupPath, 'utf-8');
    const loaded = yaml.load(content) as Partial<Config>;
    this.config = { ...DEFAULT_CONFIG, ...loaded };
    this.saveConfig();
  }
}
