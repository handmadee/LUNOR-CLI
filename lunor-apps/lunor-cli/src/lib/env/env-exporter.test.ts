import { describe, it, expect, beforeEach } from 'vitest';
import { EnvExporter } from './env-exporter.js';
import type { ClaudeConfig } from '../config/types.js';
import { DEFAULT_ANTHROPIC_BASE_URL } from '../../constants/base-urls.js';

describe('EnvExporter', () => {
  let exporter: EnvExporter;

  beforeEach(() => {
    exporter = new EnvExporter();
  });

  describe('exportForClaude', () => {
    it('should export required Claude environment variables', () => {
      const config: ClaudeConfig = {
        apiKey: 'test-key-12345',
        baseUrl: 'https://proxy.lunor.cloud',
      };

      const result = exporter.exportForClaude(config);

      expect(result.variables).toEqual({
        ANTHROPIC_BASE_URL: 'https://proxy.lunor.cloud',
        ANTHROPIC_API_KEY: 'test-key-12345',
        CLAUDE_CODE_MAX_OUTPUT_TOKENS: '32000',
        MAX_THINKING_TOKENS: '31999',
        CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS: '200000',
        MAX_MCP_OUTPUT_TOKENS: '200000',
      });

      expect(result.shellScript).toContain('export ANTHROPIC_BASE_URL="https://proxy.lunor.cloud"');
      expect(result.shellScript).toContain('export ANTHROPIC_API_KEY="test-key-12345"');
      expect(result.shellScript).toContain('export CLAUDE_CODE_MAX_OUTPUT_TOKENS="32000"');
      expect(result.shellScript).toContain('export MAX_THINKING_TOKENS="31999"');
      expect(result.shellScript).toContain('export CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS="200000"');
      expect(result.shellScript).toContain('export MAX_MCP_OUTPUT_TOKENS="200000"');
    });

    it('should use default base URL if not provided', () => {
      const config: ClaudeConfig = {
        apiKey: 'test-key-12345',
      };

      const result = exporter.exportForClaude(config);

      expect(result.variables.ANTHROPIC_BASE_URL).toBe(DEFAULT_ANTHROPIC_BASE_URL);
    });

    it('should include organization if provided', () => {
      const config: ClaudeConfig = {
        apiKey: 'test-key-12345',
        organization: 'my-org',
      };

      const result = exporter.exportForClaude(config);

      expect(result.variables.ANTHROPIC_ORGANIZATION).toBe('my-org');
      expect(result.shellScript).toContain('export ANTHROPIC_ORGANIZATION="my-org"');
    });

    it('should export full token mode for MiMo', () => {
      const result = exporter.exportForMiMo({
        apiKey: 'mimo-key-12345',
        baseUrl: 'https://token-plan-sgp.xiaomimimo.com/anthropic',
      });

      expect(result.variables.CLAUDE_CODE_MAX_OUTPUT_TOKENS).toBe('32000');
      expect(result.variables.MAX_THINKING_TOKENS).toBe('31999');
      expect(result.variables.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS).toBe('200000');
      expect(result.variables.MAX_MCP_OUTPUT_TOKENS).toBe('200000');
    });
  });

  describe('exportForAMP', () => {
    it('should export AMP environment variables', () => {
      const result = exporter.exportForAMP('http://localhost:8317', 'amp-key-123');

      expect(result.variables).toEqual({
        AMP_URL: 'http://localhost:8317',
        AMP_API_KEY: 'amp-key-123',
      });

      expect(result.shellScript).toContain('export AMP_URL="http://localhost:8317"');
      expect(result.shellScript).toContain('export AMP_API_KEY="amp-key-123"');
    });
  });

  describe('generateShellScript', () => {
    it('should generate valid shell export commands', () => {
      const vars = {
        VAR1: 'value1',
        VAR2: 'value2',
        VAR3: 'value3',
      };

      const script = exporter.generateShellScript(vars);

      expect(script).toBe('export VAR1="value1"\nexport VAR2="value2"\nexport VAR3="value3"');
    });

    it('should skip empty values', () => {
      const vars = {
        VAR1: 'value1',
        VAR2: '',
        VAR3: 'value3',
      };

      const script = exporter.generateShellScript(vars);

      expect(script).not.toContain('VAR2');
      expect(script).toContain('VAR1');
      expect(script).toContain('VAR3');
    });
  });

  describe('generateUnsetScript', () => {
    it('should generate unset command for multiple keys', () => {
      const keys = ['VAR1', 'VAR2', 'VAR3'];

      const script = exporter.generateUnsetScript(keys);

      expect(script).toBe('unset VAR1 VAR2 VAR3');
    });

    it('should handle single key', () => {
      const keys = ['VAR1'];

      const script = exporter.generateUnsetScript(keys);

      expect(script).toBe('unset VAR1');
    });
  });
});
