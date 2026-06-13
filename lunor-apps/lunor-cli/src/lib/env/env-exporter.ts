import type { ClaudeConfig, MiMoConfig } from '../config/types.js';
import { DEFAULT_ANTHROPIC_BASE_URL } from '../../constants/base-urls.js';

export interface EnvExportResult {
  readonly variables: Record<string, string>;
  readonly shellScript: string;
}

export interface IEnvExporter {
  exportForClaude(config: ClaudeConfig): EnvExportResult;
  exportForMiMo(config: MiMoConfig): EnvExportResult;
  exportForAMP(url: string, apiKey: string): EnvExportResult;
  generateShellScript(vars: Record<string, string>): string;
}

export const FULL_TOKEN_ENV_VARS: Record<string, string> = {
  CLAUDE_CODE_MAX_OUTPUT_TOKENS: '32000',
  MAX_THINKING_TOKENS: '31999',
  CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: '200000',
  MAX_MCP_OUTPUT_TOKENS: '200000',
};

export class EnvExporter implements IEnvExporter {
  exportForClaude(config: ClaudeConfig): EnvExportResult {
    const variables: Record<string, string> = {
      ANTHROPIC_BASE_URL: config.baseUrl || DEFAULT_ANTHROPIC_BASE_URL,
      ANTHROPIC_API_KEY: config.apiKey,
      ...FULL_TOKEN_ENV_VARS,
    };

    if (config.organization) {
      variables.ANTHROPIC_ORGANIZATION = config.organization;
    }

    return {
      variables,
      shellScript: this.generateShellScript(variables),
    };
  }

  exportForMiMo(config: MiMoConfig): EnvExportResult {
    const variables: Record<string, string> = {
      ANTHROPIC_BASE_URL: config.baseUrl,
      ANTHROPIC_API_KEY: config.apiKey,
      ANTHROPIC_MODEL: config.model || 'mimo-v2.5-pro',
      ANTHROPIC_DEFAULT_SONNET_MODEL: config.model || 'mimo-v2.5-pro',
      ANTHROPIC_DEFAULT_OPUS_MODEL: config.model || 'mimo-v2.5-pro',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: config.model || 'mimo-v2.5-pro',
      ...FULL_TOKEN_ENV_VARS,
    };

    return {
      variables,
      shellScript: this.generateShellScript(variables),
    };
  }

  exportForAMP(url: string, apiKey: string): EnvExportResult {
    const variables: Record<string, string> = {
      AMP_URL: url,
      AMP_API_KEY: apiKey,
    };

    return {
      variables,
      shellScript: this.generateShellScript(variables),
    };
  }

  generateShellScript(vars: Record<string, string>): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(vars)) {
      if (value) {
        lines.push(`export ${key}="${value}"`);
      }
    }

    return lines.join('\n');
  }

  generateUnsetScript(keys: string[]): string {
    return `unset ${keys.join(' ')}`;
  }
}

let defaultExporter: EnvExporter | null = null;

export function getEnvExporter(): EnvExporter {
  if (!defaultExporter) {
    defaultExporter = new EnvExporter();
  }
  return defaultExporter;
}
