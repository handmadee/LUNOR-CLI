import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { 
  ISourceStrategy, 
  SourceType, 
  AnySourceConfig, 
  CloneResult, 
  UpdateResult 
} from '../types.js';

export abstract class BaseSourceStrategy implements ISourceStrategy {
  abstract readonly type: SourceType;

  abstract clone(config: AnySourceConfig, targetDir: string): Promise<CloneResult>;
  abstract update(skillPath: string): Promise<UpdateResult>;
  abstract canUpdate(): boolean;

  getVersion(skillPath: string): string | undefined {
    const pkgPath = join(skillPath, 'package.json');
    
    if (!existsSync(pkgPath)) {
      return this.getVersionFromClaudemd(skillPath);
    }

    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      return pkg.version;
    } catch {
      return undefined;
    }
  }

  private getVersionFromClaudemd(skillPath: string): string | undefined {
    const claudePath = join(skillPath, 'CLAUDE.md');
    
    if (!existsSync(claudePath)) {
      return undefined;
    }

    try {
      const content = readFileSync(claudePath, 'utf-8');
      const versionMatch = content.match(/version[:\s]+v?(\d+\.\d+\.\d+)/i);
      return versionMatch?.[1];
    } catch {
      return undefined;
    }
  }

  protected createSuccessResult(path: string): CloneResult {
    return { success: true, path };
  }

  protected createErrorResult(path: string, error: string): CloneResult {
    return { success: false, path, error };
  }

  protected createUpdateSuccess(updated: boolean, prev?: string, curr?: string): UpdateResult {
    return {
      success: true,
      updated,
      previousVersion: prev,
      currentVersion: curr,
    };
  }

  protected createUpdateError(error: string): UpdateResult {
    return { success: false, updated: false, error };
  }
}
