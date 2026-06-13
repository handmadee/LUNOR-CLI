import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { dirname } from 'path';
import { Crypto } from '../utils/crypto.js';
import { createError, ErrorCodes } from '../utils/errors.js';
import type { KeyInfo } from '../types/index.js';

export class KeyService {
  private keyFile: string;
  private password: string;

  constructor(keyFile: string) {
    this.keyFile = keyFile;
    this.password = process.env.LUNOR_KEY_PASSWORD || 'lunor-default-password';
    this.ensureKeyDir();
  }

  private ensureKeyDir(): void {
    const dir = dirname(this.keyFile);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  addKey(key: string): void {
    try {
      const encrypted = Crypto.encrypt(key, this.password);
      writeFileSync(this.keyFile, encrypted, { mode: 0o600 });
    } catch (error) {
      throw createError(
        ErrorCodes.ENCRYPTION_ERROR,
        'Failed to encrypt and save key',
        'Check file permissions and try again'
      );
    }
  }

  getKey(): string {
    if (!existsSync(this.keyFile)) {
      throw createError(
        ErrorCodes.KEY_NOT_FOUND,
        'API key not found',
        'Run: lunor keys add'
      );
    }

    try {
      const encrypted = readFileSync(this.keyFile, 'utf-8');
      return Crypto.decrypt(encrypted, this.password);
    } catch (error) {
      throw createError(
        ErrorCodes.ENCRYPTION_ERROR,
        'Failed to decrypt key',
        'Key may be corrupted. Try adding it again'
      );
    }
  }

  hasKey(): boolean {
    return existsSync(this.keyFile);
  }

  removeKey(): void {
    if (existsSync(this.keyFile)) {
      writeFileSync(this.keyFile, '', { mode: 0o600 });
    }
  }

  getKeyInfo(): KeyInfo {
    return {
      provider: 'lunor',
      exists: this.hasKey(),
      validated: false,
      createdAt: this.hasKey() ? this.getFileCreatedAt() : undefined,
    };
  }

  private getFileCreatedAt(): string {
    try {
      const stats = statSync(this.keyFile);
      return stats.birthtime.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  async validateKey(): Promise<boolean> {
    if (!this.hasKey()) {
      return false;
    }

    try {
      const key = this.getKey();
      return key.length > 0;
    } catch {
      return false;
    }
  }
}
