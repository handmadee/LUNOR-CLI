import { rmSync, existsSync } from 'node:fs';
import type {
  ISkillManager,
  ISkillRegistry,
  OperationResult,
  UpdateResult,
  InstalledSkill,
  AnySourceConfig,
} from './types.js';
import { SkillRegistry } from './skill-registry.js';
import { SKILL_SOURCES, getSourceConfig, getAllSourceConfigs } from './skill-sources.js';
import { getStrategyForConfig } from './strategies/index.js';

export class SkillManager implements ISkillManager {
  private readonly registry: ISkillRegistry;

  constructor(registry?: ISkillRegistry) {
    this.registry = registry ?? new SkillRegistry();
  }

  async init(sourceName: string): Promise<OperationResult> {
    const config = getSourceConfig(sourceName);
    
    if (!config) {
      return {
        success: false,
        error: `Unknown source: ${sourceName}. Available: ${Object.keys(SKILL_SOURCES).join(', ')}`,
      };
    }

    const targetDir = this.registry.getSkillPath(sourceName);
    
    if (this.registry.isInstalled(sourceName)) {
      return {
        success: false,
        error: `Already installed: ${config.displayName}. Use 'remove' first or 'update' to refresh.`,
      };
    }

    const strategy = getStrategyForConfig(config);
    const result = await strategy.clone(config, targetDir);

    if (result.success) {
      this.registry.recordInstall(sourceName, config.type);
    }

    return result;
  }

  async initAll(): Promise<Map<string, OperationResult>> {
    const results = new Map<string, OperationResult>();
    const sourceNames = Object.keys(SKILL_SOURCES);

    for (const name of sourceNames) {
      const result = await this.init(name);
      results.set(name, result);
    }

    return results;
  }

  async update(sourceName?: string): Promise<Map<string, UpdateResult>> {
    const results = new Map<string, UpdateResult>();
    const installed = this.registry.getInstalledSkills();

    if (installed.length === 0) {
      results.set('_error', {
        success: false,
        updated: false,
        error: 'No skills installed. Run init first.',
      });
      return results;
    }

    const toUpdate = sourceName
      ? installed.filter(s => s.name === sourceName)
      : installed;

    if (sourceName && toUpdate.length === 0) {
      results.set(sourceName, {
        success: false,
        updated: false,
        error: `Source not installed: ${sourceName}`,
      });
      return results;
    }

    for (const skill of toUpdate) {
      const config = getSourceConfig(skill.name);
      if (!config) continue;

      const strategy = getStrategyForConfig(config);
      
      if (!strategy.canUpdate()) {
        results.set(skill.name, {
          success: true,
          updated: false,
          error: 'Local sources cannot be auto-updated. Use remove + init to refresh.',
        });
        continue;
      }

      const result = await strategy.update(skill.path);
      
      if (result.success && result.updated) {
        this.registry.recordUpdate(skill.name, result.currentVersion);
      }

      results.set(skill.name, result);
    }

    return results;
  }

  list(): InstalledSkill[] {
    return this.registry.getInstalledSkills();
  }

  async remove(sourceName: string): Promise<OperationResult> {
    const config = getSourceConfig(sourceName);
    
    if (!config) {
      return {
        success: false,
        error: `Unknown source: ${sourceName}`,
      };
    }

    if (!this.registry.isInstalled(sourceName)) {
      return {
        success: false,
        error: `Not installed: ${config.displayName}`,
      };
    }

    const skillPath = this.registry.getSkillPath(sourceName);

    try {
      if (existsSync(skillPath)) {
        rmSync(skillPath, { recursive: true, force: true });
      }
      
      this.registry.removeRecord(sourceName);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove skill',
      };
    }
  }

  getAvailableSources(): AnySourceConfig[] {
    return getAllSourceConfigs();
  }

  async forceRefresh(sourceName: string): Promise<OperationResult> {
    const removeResult = await this.remove(sourceName);
    
    if (!removeResult.success && !removeResult.error?.includes('Not installed')) {
      return removeResult;
    }

    return this.init(sourceName);
  }

  getSourceStatus(sourceName: string): {
    available: boolean;
    installed: boolean;
    config?: AnySourceConfig;
  } {
    const config = getSourceConfig(sourceName);
    return {
      available: config !== undefined,
      installed: this.registry.isInstalled(sourceName),
      config,
    };
  }
}

let defaultManager: SkillManager | null = null;

export function getSkillManager(): SkillManager {
  if (!defaultManager) {
    defaultManager = new SkillManager();
  }
  return defaultManager;
}
