import { existsSync, cpSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import type {
  SourceType,
  AnySourceConfig,
  LocalSourceConfig,
  CloneResult,
  UpdateResult,
} from '../types.js';
import { BaseSourceStrategy } from './base-strategy.js';
import { isLocalSource } from '../skill-sources.js';

export class LocalSourceStrategy extends BaseSourceStrategy {
  readonly type: SourceType = 'local';

  async clone(config: AnySourceConfig, targetDir: string): Promise<CloneResult> {
    if (!isLocalSource(config)) {
      return this.createErrorResult(targetDir, 'Invalid config type for LocalSourceStrategy');
    }

    return this.copyFromLocal(config, targetDir);
  }

  private async copyFromLocal(config: LocalSourceConfig, targetDir: string): Promise<CloneResult> {
    const sourcePath = config.path;

    if (!existsSync(sourcePath)) {
      return this.createErrorResult(
        targetDir,
        `Local source not found: ${sourcePath}`
      );
    }

    try {
      const stats = statSync(sourcePath);
      if (!stats.isDirectory()) {
        return this.createErrorResult(targetDir, `Source is not a directory: ${sourcePath}`);
      }

      cpSync(sourcePath, targetDir, {
        recursive: true,
        filter: this.createCopyFilter(),
      });

      return this.createSuccessResult(targetDir);
    } catch (error) {
      return this.createErrorResult(
        targetDir,
        error instanceof Error ? error.message : 'Failed to copy local source'
      );
    }
  }

  private createCopyFilter(): (src: string) => boolean {
    const excludePatterns = [
      'node_modules',
      '.git',
      '.DS_Store',
      '__pycache__',
      '.venv',
      'dist',
      'build',
      '*.log',
      '.env',
      '.env.*',
    ];

    return (src: string) => {
      const name = basename(src);
      return !excludePatterns.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(name);
        }
        return name === pattern;
      });
    };
  }

  async update(_skillPath: string): Promise<UpdateResult> {
    return this.createUpdateError(
      'Local sources cannot be auto-updated. Re-run init to refresh from source.'
    );
  }

  canUpdate(): boolean {
    return false;
  }

  async refresh(config: LocalSourceConfig, targetDir: string): Promise<CloneResult> {
    return this.copyFromLocal(config, targetDir);
  }
}
