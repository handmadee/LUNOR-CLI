import type {
  IConfigService,
  IConfigRepository,
  AMPConfig,
  ClaudeConfig,
  MiMoConfig,
  ValidationResult,
} from './types.js';
import { ConfigRepository } from './config-repository.js';

export class ConfigService implements IConfigService {
  constructor(private readonly repository: IConfigRepository = new ConfigRepository()) {}

  async getAMPConfig(): Promise<AMPConfig | null> {
    const url = await this.repository.get('amp.url');
    const apiKey = await this.repository.get('amp.apiKey');

    if (!url || !apiKey) return null;

    return { url, apiKey };
  }

  async setAMPConfig(config: Partial<AMPConfig>): Promise<void> {
    if (config.url) {
      await this.repository.set('amp.url', config.url, false);
    }
    if (config.apiKey) {
      await this.repository.set('amp.apiKey', config.apiKey, true);
    }
  }

  async getClaudeConfig(): Promise<ClaudeConfig | null> {
    const apiKey = await this.repository.get('claude.apiKey');
    if (!apiKey) return null;

    const model = await this.repository.get('claude.model');
    const baseUrl = await this.repository.get('claude.baseUrl');
    const organization = await this.repository.get('claude.organization');
    
    return { 
      apiKey, 
      model, 
      baseUrl,
      organization 
    };
  }

  async setClaudeConfig(config: Partial<ClaudeConfig>): Promise<void> {
    if (config.apiKey) {
      await this.repository.set('claude.apiKey', config.apiKey, true);
    }
    if (config.model) {
      await this.repository.set('claude.model', config.model, false);
    }
    if (config.baseUrl) {
      await this.repository.set('claude.baseUrl', config.baseUrl, false);
    }
    if (config.organization) {
      await this.repository.set('claude.organization', config.organization, false);
    }
  }

  async removeClaudeConfig(): Promise<void> {
    await this.repository.delete('claude.apiKey');
    await this.repository.delete('claude.model');
    await this.repository.delete('claude.baseUrl');
    await this.repository.delete('claude.organization');
  }

  async getMiMoConfig(): Promise<MiMoConfig | null> {
    const apiKey = await this.repository.get('mimo.apiKey');
    if (!apiKey) return null;

    const baseUrl = await this.repository.get('mimo.baseUrl');
    const model = await this.repository.get('mimo.model');

    return {
      apiKey,
      baseUrl: baseUrl || 'https://token-plan-sgp.xiaomimimo.com/anthropic',
      model,
    };
  }

  async setMiMoConfig(config: Partial<MiMoConfig>): Promise<void> {
    if (config.apiKey) {
      await this.repository.set('mimo.apiKey', config.apiKey, true);
    }
    if (config.baseUrl) {
      await this.repository.set('mimo.baseUrl', config.baseUrl, false);
    }
    if (config.model) {
      await this.repository.set('mimo.model', config.model, false);
    }
  }

  async removeMiMoConfig(): Promise<void> {
    await this.repository.delete('mimo.apiKey');
    await this.repository.delete('mimo.baseUrl');
    await this.repository.delete('mimo.model');
  }

  exportToEnv(): string[] {
    const entries: string[] = [];
    
    return entries;
  }

  async exportToEnvAsync(): Promise<string[]> {
    const entries: string[] = [];

    const ampConfig = await this.getAMPConfig();
    if (ampConfig) {
      entries.push(`export AMP_URL="${ampConfig.url}"`);
      entries.push(`export AMP_API_KEY="${ampConfig.apiKey}"`);
    }

    const claudeConfig = await this.getClaudeConfig();
    if (claudeConfig) {
      entries.push(`export ANTHROPIC_API_KEY="${claudeConfig.apiKey}"`);
      if (claudeConfig.model) {
        entries.push(`export ANTHROPIC_MODEL="${claudeConfig.model}"`);
      }
    }

    return entries;
  }

  async validateConfig(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const ampConfig = await this.getAMPConfig();
    if (ampConfig) {
      if (!this.isValidUrl(ampConfig.url)) {
        errors.push('Invalid AMP_URL format');
      }
      if (!ampConfig.apiKey || ampConfig.apiKey.length < 32) {
        errors.push('AMP_API_KEY is too short (minimum 32 characters)');
      }
    } else {
      warnings.push('AMP configuration not set');
    }

    const claudeConfig = await this.getClaudeConfig();
    if (claudeConfig) {
      const key = claudeConfig.apiKey;
      const isValidFormat = 
        key.startsWith('sk-ant-') || 
        key.startsWith('fe_oa_') || 
        key.startsWith('lunor-') || 
        key.startsWith('sk-');
      
      if (!isValidFormat) {
        errors.push('Invalid ANTHROPIC_API_KEY format');
      }
    } else {
      warnings.push('Claude configuration not set');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

let defaultService: ConfigService | null = null;

export function getConfigService(): ConfigService {
  if (!defaultService) {
    defaultService = new ConfigService();
  }
  return defaultService;
}
