import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { emitCommand } from './init.js';
import * as configModule from '../lib/config/index.js';

vi.mock('../lib/config/index.js');

describe('emitCommand', () => {
  let mockConfigService: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    mockConfigService = {
      getClaudeConfig: vi.fn(),
      getAMPConfig: vi.fn(),
    };

    vi.mocked(configModule.getConfigService).mockReturnValue(mockConfigService);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (consoleLogSpy) consoleLogSpy.mockRestore();
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
  });

  describe('use/set action', () => {
    it('should export Claude environment variables', async () => {
      mockConfigService.getClaudeConfig.mockResolvedValue({
        apiKey: 'test-key-12345',
        baseUrl: 'https://proxy.lunor.cloud',
      });
      mockConfigService.getAMPConfig.mockResolvedValue(null);

      await emitCommand('use', 'coding');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('export ANTHROPIC_BASE_URL="https://proxy.lunor.cloud"')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('export ANTHROPIC_API_KEY="test-key-12345"')
      );
    });

    it('should export AMP variables if configured', async () => {
      mockConfigService.getClaudeConfig.mockResolvedValue({
        apiKey: 'test-key-12345',
      });
      mockConfigService.getAMPConfig.mockResolvedValue({
        url: 'http://localhost:8317',
        apiKey: 'amp-key',
      });

      await emitCommand('use', 'coding');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('export AMP_URL="http://localhost:8317"')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('export AMP_API_KEY="amp-key"')
      );
    });

    it('should error if no API key configured', async () => {
      mockConfigService.getClaudeConfig.mockResolvedValue(null);

      await expect(async () => {
        await emitCommand('use', 'coding');
      }).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No API key configured')
      );
    });
  });

  describe('off action', () => {
    it('should generate unset commands', async () => {
      await emitCommand('off');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('unset')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('ANTHROPIC_BASE_URL')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('ANTHROPIC_AUTH_TOKEN')
      );
    });
  });
});
