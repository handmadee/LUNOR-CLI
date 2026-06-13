import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { 
  SourceType, 
  AnySourceConfig, 
  GitHubSourceConfig, 
  CloneResult, 
  UpdateResult 
} from '../types.js';
import { BaseSourceStrategy } from './base-strategy.js';
import { isGitHubSource } from '../skill-sources.js';

export class GitHubSourceStrategy extends BaseSourceStrategy {
  readonly type: SourceType = 'github';

  async clone(config: AnySourceConfig, targetDir: string): Promise<CloneResult> {
    if (!isGitHubSource(config)) {
      return this.createErrorResult(targetDir, 'Invalid config type for GitHubSourceStrategy');
    }

    return this.cloneFromGitHub(config, targetDir);
  }

  private async cloneFromGitHub(config: GitHubSourceConfig, targetDir: string): Promise<CloneResult> {
    const url = this.buildCloneUrl(config);
    const branch = config.branch || 'main';

    try {
      this.validateGitInstalled();

      // If the directory already exists (previously cloned), pull latest instead
      if (existsSync(targetDir)) {
        const pullCmd = `git -C "${targetDir}" pull --rebase 2>&1 || true`;
        execSync(pullCmd, { stdio: 'pipe', timeout: 60000 });
        return this.createSuccessResult(targetDir);
      }

      const cmd = `git clone --depth 1 --single-branch -b ${branch} ${url} "${targetDir}"`;
      
      execSync(cmd, {
        stdio: 'pipe',
        timeout: 60000,
      });

      return this.createSuccessResult(targetDir);
    } catch (error) {
      const message = this.parseGitError(error);
      return this.createErrorResult(targetDir, message);
    }
  }

  private buildCloneUrl(config: GitHubSourceConfig): string {
    return `https://github.com/${config.repo}.git`;
  }

  private validateGitInstalled(): void {
    try {
      execSync('git --version', { stdio: 'pipe' });
    } catch {
      throw new Error('Git is not installed or not in PATH');
    }
  }

  private parseGitError(error: unknown): string {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      
      if (msg.includes('repository not found')) {
        return 'Repository not found. Check if the repo exists and is accessible.';
      }
      if (msg.includes('could not resolve host')) {
        return 'Network error. Check your internet connection.';
      }
      if (msg.includes('authentication failed')) {
        return 'Authentication failed. Repository may be private.';
      }
      if (msg.includes('timeout')) {
        return 'Clone operation timed out. Try again later.';
      }
      
      return error.message;
    }
    return 'Unknown git error occurred';
  }

  async update(skillPath: string): Promise<UpdateResult> {
    if (!this.isGitRepository(skillPath)) {
      return this.createUpdateError('Not a git repository. Cannot update.');
    }

    try {
      const previousCommit = this.getCurrentCommit(skillPath);
      
      this.fetchOrigin(skillPath);
      this.resetToOrigin(skillPath);
      
      const currentCommit = this.getCurrentCommit(skillPath);
      const wasUpdated = previousCommit !== currentCommit;

      return this.createUpdateSuccess(wasUpdated, previousCommit, currentCommit);
    } catch (error) {
      return this.createUpdateError(
        error instanceof Error ? error.message : 'Failed to update from GitHub'
      );
    }
  }

  private isGitRepository(dir: string): boolean {
    return existsSync(join(dir, '.git'));
  }

  private getCurrentCommit(dir: string): string {
    try {
      const output = execSync('git rev-parse --short HEAD', {
        cwd: dir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return output.trim();
    } catch {
      return 'unknown';
    }
  }

  private fetchOrigin(dir: string): void {
    execSync('git fetch origin', {
      cwd: dir,
      stdio: 'pipe',
      timeout: 30000,
    });
  }

  private resetToOrigin(dir: string): void {
    execSync('git reset --hard origin/HEAD', {
      cwd: dir,
      stdio: 'pipe',
    });
  }

  canUpdate(): boolean {
    return true;
  }

  async getRemoteVersion(config: GitHubSourceConfig): Promise<string | undefined> {
    try {
      const url = `https://api.github.com/repos/${config.repo}/releases/latest`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
      });
      
      if (!response.ok) return undefined;
      
      const data = (await response.json()) as { tag_name?: string };
      return data.tag_name?.replace(/^v/, '');
    } catch {
      return undefined;
    }
  }
}
