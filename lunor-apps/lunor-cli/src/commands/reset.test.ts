/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import {
  resetCodex,
  resetClaude,
  resetCommand,
  emitResetCommand,
  buildFactoryCodexConfig,
  extractPluginSections,
} from './reset.js';
import { PATHS } from '../constants/paths.js';

vi.mock('node:fs');
vi.mock('node:os', () => ({
  homedir: () => '/mock-home',
}));

describe('reset command functionality', () => {
  let consoleLogSpy: any;
  let processCwdSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processCwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/mock-cwd');
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
    processCwdSpy.mockRestore();
  });

  describe('buildFactoryCodexConfig', () => {
    it('keeps prefs + plugins and drops model/proxy/mcp/projects', () => {
      const input = `
model = "gpt-5.5" # comment
model_provider = "cliproxyapi"
personality = "pragmatic"
approval_policy = "never"
sandbox_mode = "danger-full-access"
service_tier = "default"
notify = ["/path/to/notify", "turn-ended"]
model_reasoning_effort = "xhigh"
supports_websockets = true

[projects."/Users/admin"]
trust_level = "trusted"

[model_providers.cliproxyapi]
base_url = "https://proxy.lunor.cloud/v1/"

[plugins."browser@openai-bundled"]
enabled = true

[plugins."pdf@openai-primary-runtime"]
enabled = true

[mcp_servers.context7]
command = "npx"
`;
      const out = buildFactoryCodexConfig(input);

      expect(out).toContain('personality = "pragmatic"');
      expect(out).toContain('approval_policy = "never"');
      expect(out).toContain('sandbox_mode = "danger-full-access"');
      expect(out).toContain('service_tier = "default"');
      expect(out).toContain('notify = ["/path/to/notify", "turn-ended"]');
      expect(out).toContain('[plugins."browser@openai-bundled"]');
      expect(out).toContain('[plugins."pdf@openai-primary-runtime"]');

      expect(out).not.toContain('model =');
      expect(out).not.toContain('model_provider');
      expect(out).not.toContain('cliproxy');
      expect(out).not.toContain('model_reasoning_effort');
      expect(out).not.toContain('supports_websockets');
      expect(out).not.toContain('[projects.');
      expect(out).not.toContain('mcp_servers');
    });

    it('extracts only plugin sections', () => {
      const toml = `
[plugins."a@x"]
enabled = true

[mcp_servers.x]
command = "npx"

[plugins."b@y"]
enabled = false
`;
      expect(extractPluginSections(toml)).toHaveLength(2);
    });
  });

  describe('resetCodex', () => {
    it('should handle missing config file and missing local directory gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await resetCodex();

      expect(result.steps).toEqual([
        expect.stringContaining('~/.codex/config.toml — not found'),
      ]);
      expect(readFileSync).not.toHaveBeenCalled();
      expect(rmSync).not.toHaveBeenCalled();
    });

    it('should factory-rewrite config.toml, clear models cache, and remove local .codex', async () => {
      const mockToml = `
model = "gpt-5.5"
model_provider = "cliproxyapi"
personality = "pragmatic"
approval_policy = "never"
sandbox_mode = "danger-full-access"
service_tier = "default"
supports_websockets = true
model_reasoning_effort = "xhigh"
plan_mode_reasoning_effort = "xhigh"

[model_providers.cliproxyapi]
base_url = "https://proxy.lunor.cloud/v1/"

[plugins."browser@openai-bundled"]
enabled = true
`;
      vi.mocked(existsSync).mockImplementation((path: any) => {
        if (typeof path === 'string') {
          if (path.includes('.codex/config.toml')) return true;
          if (path.includes('auth.json')) return true;
          if (path.includes('models_cache.json')) return true;
          if (path.includes('/mock-cwd/.codex')) return true;
        }
        return false;
      });

      vi.mocked(readFileSync).mockReturnValue(mockToml);

      const result = await resetCodex();

      expect(readFileSync).toHaveBeenCalled();
      const written = vi.mocked(writeFileSync).mock.calls.find(
        (c) => typeof c[0] === 'string' && String(c[0]).includes('config.toml'),
      );
      expect(written).toBeTruthy();
      const content = String(written![1]);
      expect(content).toContain('personality = "pragmatic"');
      expect(content).toContain('approval_policy = "never"');
      expect(content).toContain('[plugins."browser@openai-bundled"]');
      expect(content).not.toContain('model_provider');
      expect(content).not.toContain('cliproxyapi');
      expect(content).not.toMatch(/^model\s*=/m);

      expect(unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('models_cache.json'),
      );
      expect(rmSync).toHaveBeenCalledWith(
        expect.stringContaining('/mock-cwd/.codex'),
        { recursive: true, force: true },
      );
      expect(result.steps.some((s) => s.includes('Factory-reset'))).toBe(true);
      expect(result.steps.some((s) => s.includes('auth.json') && s.includes('preserved'))).toBe(true);
      expect(result.steps.some((s) => s.includes('models_cache.json'))).toBe(true);
      expect(result.steps.some((s) => s.includes('Removed local .codex/'))).toBe(true);
    });

    it('should not delete global ~/.codex when cwd is home', async () => {
      processCwdSpy.mockReturnValue('/mock-home');
      vi.mocked(existsSync).mockImplementation((path: any) => {
        if (typeof path === 'string') {
          if (path.endsWith('.codex/config.toml') || path.endsWith('/.codex/config.toml')) return false;
          if (path === '/mock-home/.codex' || path.endsWith('/mock-home/.codex')) return true;
        }
        return false;
      });

      const result = await resetCodex();

      expect(rmSync).not.toHaveBeenCalled();
      expect(result.steps.some((s) => s.includes('Skipped removing .codex/'))).toBe(true);
    });

    it('should drop model pin even when the line has a trailing comment', async () => {
      const mockToml = `
model = "gpt-5.5" # Or gpt-5.5, you can also use any of the models that we support.
model_provider = "cliproxyapi"
personality = "pragmatic"
approval_policy = "never"
supports_websockets = true

[model_providers.cliproxyapi]
base_url = "https://proxy.lunor.cloud/v1/"
`;
      vi.mocked(existsSync).mockImplementation((path: any) => {
        if (typeof path === 'string' && path.includes('.codex/config.toml')) return true;
        return false;
      });
      vi.mocked(readFileSync).mockReturnValue(mockToml);

      await resetCodex();

      const written = vi.mocked(writeFileSync).mock.calls.find(
        (c) => typeof c[0] === 'string' && String(c[0]).includes('config.toml'),
      );
      expect(written).toBeTruthy();
      const content = String(written![1]);
      expect(content).not.toMatch(/model\s*=/);
      expect(content).not.toContain('cliproxyapi');
      expect(content).toContain('personality = "pragmatic"');
    });
  });

  describe('resetClaude', () => {
    it('should handle missing config/settings files gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await resetClaude();

      expect(result.steps).toEqual([
        expect.stringContaining('~/.claude.json — not found'),
        expect.stringContaining('~/.claude/settings.json — not found'),
      ]);
      expect(readFileSync).not.toHaveBeenCalled();
      expect(writeFileSync).not.toHaveBeenCalled();
      expect(rmSync).not.toHaveBeenCalled();
    });

    it('should clean files, clear state, and remove local .claude if they exist', async () => {
      const mockJson = JSON.stringify({
        primaryApiKey: 'sk-ant-xxx',
        apiKeyHelper: 'helper',
        otherField: 'keep-me',
        env: {
          ANTHROPIC_API_KEY: 'xxx',
          ANTHROPIC_BASE_URL: 'xxx',
          OTHER_ENV: 'keep-env',
        },
      });

      vi.mocked(existsSync).mockImplementation((path: any) => {
        if (typeof path === 'string') {
          if (path.includes('.claude.json')) return true;
          if (path.includes('.claude/settings.json')) return true;
          if (path === PATHS.stateFile) return true;
          if (path.includes('/mock-cwd/.claude')) return true;
        }
        return false;
      });

      vi.mocked(readFileSync).mockReturnValue(mockJson);

      const result = await resetClaude();

      expect(readFileSync).toHaveBeenCalled();
      // Verifies ~/.claude.json cleanup
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude.json'),
        expect.stringContaining('"otherField": "keep-me"'),
        'utf-8'
      );
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude.json'),
        expect.not.stringContaining('primaryApiKey'),
        'utf-8'
      );
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude.json'),
        expect.not.stringContaining('ANTHROPIC_API_KEY'),
        'utf-8'
      );
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude.json'),
        expect.stringContaining('"OTHER_ENV": "keep-env"'),
        'utf-8'
      );

      // Verifies stateFile clearing
      expect(writeFileSync).toHaveBeenCalledWith(
        PATHS.stateFile,
        '',
        { mode: 0o600 }
      );

      // Verifies local dir removal
      expect(rmSync).toHaveBeenCalledWith(
        expect.stringContaining('/mock-cwd/.claude'),
        { recursive: true, force: true }
      );

      expect(result.envUnsets).toContain('ANTHROPIC_API_KEY');
      expect(result.envUnsets).toContain('LUNOR_PROFILE');
    });
  });

  describe('resetCommand', () => {
    it('should execute both Codex and Claude resets by default', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await resetCommand('all');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Resetting Codex + Claude')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Codex')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Claude')
      );
    });

    it('should execute only Codex reset', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await resetCommand('codex');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Resetting codex')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Codex')
      );
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Claude')
      );
    });
  });

  describe('emitResetCommand', () => {
    it('should output unset commands for Claude', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await emitResetCommand('claude');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('unset ANTHROPIC_API_KEY')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('unset LUNOR_PROFILE')
      );
    });
  });
});
