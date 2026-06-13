import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { IConfigRepository, ConfigEntry, ConfigKey } from './types.js';
import { ConfigCrypto } from './crypto.js';
import { PATHS } from '../../constants/paths.js';

interface ConfigStore {
  version: string;
  entries: Record<string, { value: string; encrypted: boolean; updatedAt: string }>;
}

export class ConfigRepository implements IConfigRepository {
  private readonly configPath: string;
  private store: ConfigStore;

  constructor(configDir?: string) {
    const baseDir = configDir ?? PATHS.root;
    this.configPath = join(baseDir, 'config.json');
    this.ensureConfigDir();
    this.store = this.loadStore();
  }

  private ensureConfigDir(): void {
    const dir = dirname(this.configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  private loadStore(): ConfigStore {
    if (!existsSync(this.configPath)) {
      return { version: '1.0.0', entries: {} };
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { version: '1.0.0', entries: {} };
    }
  }

  private saveStore(): void {
    const content = JSON.stringify(this.store, null, 2);
    writeFileSync(this.configPath, content, { mode: 0o600 });
  }

  async get(key: ConfigKey): Promise<string | undefined> {
    const entry = this.store.entries[key];
    if (!entry) return undefined;

    if (entry.encrypted) {
      try {
        return ConfigCrypto.decrypt(entry.value);
      } catch {
        throw new Error(`Failed to decrypt config key: ${key}`);
      }
    }

    return entry.value;
  }

  async set(key: ConfigKey, value: string, encrypt = false): Promise<void> {
    const storedValue = encrypt ? ConfigCrypto.encrypt(value) : value;

    this.store.entries[key] = {
      value: storedValue,
      encrypted: encrypt,
      updatedAt: new Date().toISOString(),
    };

    this.saveStore();
  }

  async delete(key: ConfigKey): Promise<void> {
    delete this.store.entries[key];
    this.saveStore();
  }

  async list(): Promise<ConfigEntry[]> {
    return Object.entries(this.store.entries).map(([key, entry]) => ({
      key,
      value: entry.encrypted ? '[encrypted]' : entry.value,
      encrypted: entry.encrypted,
      updatedAt: entry.updatedAt,
    }));
  }

  async exists(key: ConfigKey): Promise<boolean> {
    return key in this.store.entries;
  }

  async clear(): Promise<void> {
    this.store.entries = {};
    this.saveStore();
  }
}
