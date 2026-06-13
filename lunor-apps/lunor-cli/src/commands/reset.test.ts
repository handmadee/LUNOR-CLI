/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resetCodex, resetClaude, resetCommand, emitResetCommand } from './reset.js';
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

    it('should modify config.toml and remove local .codex if they exist', async () => {
      const mockToml = `
model = "gpt-5.5"
model_provider = "cliproxyapi"
supports_websockets = true
model_reasoning_effort = "xhigh"
plan_mode_reasoning_effort = "xhigh"

[model_providers.cliproxyapi]
base_url = "https://proxy.lunor.cloud/v1/"
`;
      vi.mocked(existsSync).mockImplementation((path: any) => {
        if (typeof path === 'string') {
          if (path.includes('.codex/config.toml')) return true;
          if (path.includes('/mock-cwd/.codex')) return true;
        }
        return false;
      });

      vi.mocked(readFileSync).mockReturnValue(mockToml);

      const result = await resetCodex();

      expect(readFileSync).toHaveBeenCalled();
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.codex/config.toml'),
        expect.not.stringContaining('model_provider'),
        'utf-8'
      );
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.codex/config.toml'),
        expect.stringContaining('model = "gpt-4o"'),
        'utf-8'
      );
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.codex/config.toml'),
        expect.not.stringContaining('[model_providers.cliproxyapi]'),
        'utf-8'
      );
      expect(rmSync).toHaveBeenCalledWith(
        expect.stringContaining('/mock-cwd/.codex'),
        { recursive: true, force: true }
      );
      expect(result.steps).toEqual([
        expect.stringContaining('Reverted ~/.codex/config.toml'),
        expect.stringContaining('Removed local .codex/ directory'),
      ]);
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
