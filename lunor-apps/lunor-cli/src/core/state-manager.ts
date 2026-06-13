import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import type { AppState } from '../types/index.js';
import { PATHS } from '../constants/paths.js';
import { DEFAULT_ANTHROPIC_BASE_URL } from '../constants/base-urls.js';
import { FREE_MODEL_KEYS } from './key-rotator.js';

export class StateManager {
  private stateFile: string;

  constructor(stateFile: string) {
    this.stateFile = stateFile;
    this.ensureStateDir();
  }

  private ensureStateDir(): void {
    const dir = dirname(this.stateFile);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  getState(): AppState | null {
    try {
      if (!existsSync(this.stateFile)) {
        return null;
      }
      const content = readFileSync(this.stateFile, 'utf-8');
      const envVars = this.parseEnvFile(content);
      
      return {
        currentPreset: envVars.LUNOR_PROFILE,
        endpoint: envVars.LUNOR_ENDPOINT,
        baseUrl: envVars.ANTHROPIC_BASE_URL,
        opus: envVars.ANTHROPIC_DEFAULT_OPUS_MODEL || envVars.ANTHROPIC_MODEL || '',
        sonnet: envVars.ANTHROPIC_DEFAULT_SONNET_MODEL || '',
        haiku: envVars.ANTHROPIC_DEFAULT_HAIKU_MODEL || envVars.ANTHROPIC_SMALL_FAST_MODEL || '',
        lastUpdated: new Date().toISOString(),
        freeModelKey: envVars.LUNOR_FREE_MODEL_KEY || '',
      };
    } catch (error) {
      return null;
    }
  }

  setState(state: AppState): void {
    const envContent = this.generateEnvContent(state);
    writeFileSync(this.stateFile, envContent, { mode: 0o600 });
    
    // Also update ~/.claude.json
    const keyToUse = this.resolveKeyToUse(state);
    this.updateClaudeJson(state, keyToUse);
  }

  private resolveKeyToUse(state: AppState): string {
    const profile = state.currentPreset || '';
    const endpoint = state.endpoint || '';
    let keyToUse = `$(cat ${PATHS.keyFile})`;

    if (profile === 'agentrouter' || endpoint === 'agentrouter') {
      keyToUse = 'sk-yGTxAX4fUcGYHrNlJTfgWStxZ0UVllsxDr8UmdBmm1BrKu3L';
    } else if (
      profile === 'freemodel' || 
      profile === 'claude-t0' || 
      profile === 'claude-t1' ||
      endpoint === 'freemodel' || 
      endpoint === 'claude-t0' || 
      endpoint === 'claude-t1'
    ) {
      keyToUse = state.freeModelKey || FREE_MODEL_KEYS[0];
    } else if (
      profile === 'cliproxy' || 
      profile === 'cliproxy-claude' || 
      profile === 'cliproxy-codex' ||
      endpoint === 'cliproxy' || 
      endpoint === 'cliproxy-claude' || 
      endpoint === 'cliproxy-codex'
    ) {
      keyToUse = 'lunor-proxy-api-key-2025';
    }

    return keyToUse;
  }

  private updateClaudeJson(state: AppState, keyToUse: string): void {
    try {
      const profile = state.currentPreset || '';
      const endpoint = state.endpoint || '';
      const isAgentRouter = profile === 'agentrouter' || endpoint === 'agentrouter';

      let actualKey = keyToUse;
      if (keyToUse.startsWith('$(')) {
        if (existsSync(PATHS.keyFile)) {
          actualKey = readFileSync(PATHS.keyFile, 'utf-8').trim();
        }
      }

      const activeUrl = state.baseUrl || DEFAULT_ANTHROPIC_BASE_URL;

      // Build the settings object (works for both ~/.claude.json and ~/.claude/settings.json)
      const applySettings = (existing: any): any => {
        const cfg = { ...existing };

        // Remove native OAuth token — causes "Auth conflict" warning with proxy key
        delete cfg.oauthToken;

        // SET primaryApiKey so Claude Code uses API key mode (skips login prompt)
        cfg.primaryApiKey = actualKey;

        // Mark onboarding complete so Claude Code skips the login selection screen
        cfg.hasCompletedOnboarding = true;

        // Build env block
        cfg.env = { ...(cfg.env || {}) };
        cfg.env.ANTHROPIC_API_KEY = actualKey;
        cfg.env.ANTHROPIC_BASE_URL = activeUrl;
        cfg.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';

        if (isAgentRouter) {
          // AgentRouter requires ANTHROPIC_AUTH_TOKEN set to its key
          cfg.env.ANTHROPIC_AUTH_TOKEN = actualKey;
        } else {
          // Other proxies: remove any lingering native auth token
          delete cfg.env.ANTHROPIC_AUTH_TOKEN;
        }

        // Ensure permissions block exists
        if (!cfg.permissions) {
          cfg.permissions = { allow: [], deny: [] };
        }

        // apiKeyHelper as fallback
        cfg.apiKeyHelper = `echo '${actualKey}'`;

        return cfg;
      };

      // ── Write to ~/.claude.json (legacy path) ──────────────────────────
      const claudeJsonPath = join(homedir(), '.claude.json');
      let claudeJson: any = {};
      if (existsSync(claudeJsonPath)) {
        try { claudeJson = JSON.parse(readFileSync(claudeJsonPath, 'utf-8')); } catch {}
      }
      writeFileSync(claudeJsonPath, JSON.stringify(applySettings(claudeJson), null, 2), 'utf-8');

      // ── Write to ~/.claude/settings.json (newer path used by FreeModel) ──
      const claudeSettingsDir = join(homedir(), '.claude');
      const claudeSettingsPath = join(claudeSettingsDir, 'settings.json');
      if (!existsSync(claudeSettingsDir)) {
        mkdirSync(claudeSettingsDir, { recursive: true, mode: 0o700 });
      }
      let claudeSettings: any = {};
      if (existsSync(claudeSettingsPath)) {
        try { claudeSettings = JSON.parse(readFileSync(claudeSettingsPath, 'utf-8')); } catch {}
      }
      writeFileSync(claudeSettingsPath, JSON.stringify(applySettings(claudeSettings), null, 2), 'utf-8');

    } catch (error) {
      // Ignore any file write issues
    }
  }

  private parseEnvFile(content: string): Record<string, string> {
    const vars: Record<string, string> = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^export\s+(\w+)="([^"]*)"/);
      if (match) {
        vars[match[1]] = match[2];
      }
    }
    
    return vars;
  }

  private generateEnvContent(state: AppState): string {
    const endpoint = state.endpoint || '';
    const isClaudeNativeEndpoint = 
      endpoint.startsWith('claude-') || 
      endpoint === 'freemodel' || 
      endpoint === 'agentrouter';
    const keyToUse = this.resolveKeyToUse(state);

    const lines = [
      `export ANTHROPIC_BASE_URL="${state.baseUrl || DEFAULT_ANTHROPIC_BASE_URL}"`,
      `export ANTHROPIC_API_KEY="${keyToUse}"`,
      `export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"`,
      ``,
    ];

    if (!isClaudeNativeEndpoint) {
      lines.push(
        `export ANTHROPIC_DEFAULT_OPUS_MODEL="${state.opus}"`,
        `export ANTHROPIC_DEFAULT_SONNET_MODEL="${state.sonnet}"`,
        `export ANTHROPIC_DEFAULT_HAIKU_MODEL="${state.haiku}"`,
        ``,
        `export ANTHROPIC_MODEL="${state.opus}"`,
        `export ANTHROPIC_SMALL_FAST_MODEL="${state.haiku}"`,
        ``,
      );
    }

    lines.push(
      `export CLAUDE_CODE_MAX_OUTPUT_TOKENS="32000"`,
      `export MAX_THINKING_TOKENS="31999"`,
      `export CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS="200000"`,
      `export MAX_MCP_OUTPUT_TOKENS="200000"`,
      ``,
      `export LUNOR_PROFILE="${state.currentPreset || 'custom'}"`,
      `export LUNOR_ENDPOINT="${state.endpoint || 'claude-t0'}"`,
    );

    if (state.freeModelKey) {
      lines.push(`export LUNOR_FREE_MODEL_KEY="${state.freeModelKey}"`);
    }
    
    return lines.join('\n') + '\n';
  }

  clearState(): void {
    if (existsSync(this.stateFile)) {
      writeFileSync(this.stateFile, '', { mode: 0o600 });
    }
  }
}
