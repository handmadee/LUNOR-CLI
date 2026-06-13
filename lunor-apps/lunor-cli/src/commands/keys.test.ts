import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { keysAddCommand, keysListCommand, keysRemoveCommand } from './keys.js';
import * as configModule from '../lib/config/index.js';
import * as prompts from '../utils/prompts.js';
import { KeyService } from '../services/key-service.js';

vi.mock('../lib/config/index.js');
vi.mock('../utils/prompts.js');
vi.mock('../services/key-service.js');
vi.mock('../utils/spinner.js', () => ({
  createSpinner: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  })),
}));

describe('Keys Commands', () => {
  let mockConfigService: any;
  let mockKeyService: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    mockConfigService = {
      getClaudeConfig: vi.fn(),
      setClaudeConfig: vi.fn(),
      removeClaudeConfig: vi.fn(),
      getMiMoConfig: vi.fn(),
    };

    mockKeyService = {
      addKey: vi.fn(),
      getKeyInfo: vi.fn(),
      removeKey: vi.fn(),
    };

    vi.mocked(configModule.getConfigService).mockReturnValue(mockConfigService);
    vi.mocked(KeyService).mockImplementation(() => mockKeyService);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (consoleLogSpy) consoleLogSpy.mockRestore();
  });

  describe('keysAddCommand', () => {
    it('should save API key to both ConfigService and KeyService', async () => {
      vi.mocked(prompts.prompts.text)
        .mockResolvedValueOnce('lunor-proxy-api-key-2025')
        .mockResolvedValueOnce('https://proxy.lunor.cloud');
      mockConfigService.setClaudeConfig.mockResolvedValue(undefined);

      await keysAddCommand();

      expect(mockConfigService.setClaudeConfig).toHaveBeenCalledWith({
        apiKey: 'lunor-proxy-api-key-2025',
        baseUrl: 'https://proxy.lunor.cloud',
      });
      expect(mockKeyService.addKey).toHaveBeenCalledWith('lunor-proxy-api-key-2025');
    });

    it('should validate key length', async () => {
      vi.mocked(prompts.prompts.text).mockResolvedValue('short');

      await keysAddCommand();

      expect(prompts.prompts.text).toHaveBeenCalled();
    });

    it('should handle cancellation', async () => {
      vi.mocked(prompts.prompts.text).mockResolvedValue(null);

      await keysAddCommand();

      expect(mockConfigService.setClaudeConfig).not.toHaveBeenCalled();
      expect(mockKeyService.addKey).not.toHaveBeenCalled();
    });
  });

  describe('keysListCommand', () => {
    it('should display key from ConfigService', async () => {
      mockConfigService.getClaudeConfig.mockResolvedValue({
        apiKey: 'lunor-proxy-api-key-2025-very-long-key',
        baseUrl: 'https://proxy.lunor.cloud',
      });
      mockKeyService.getKeyInfo.mockReturnValue({
        exists: true,
        createdAt: new Date('2025-01-13').toISOString(),
      });

      await keysListCommand();

      expect(mockConfigService.getClaudeConfig).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should show message when no key exists', async () => {
      mockConfigService.getClaudeConfig.mockResolvedValue(null);

      await keysListCommand();

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('keysRemoveCommand', () => {
    it('should remove key from both services', async () => {
      mockConfigService.getClaudeConfig.mockResolvedValue({
        apiKey: 'test-key',
      });
      mockConfigService.removeClaudeConfig.mockResolvedValue(undefined);
      mockKeyService.getKeyInfo.mockReturnValue({ exists: true });
      vi.mocked(prompts.prompts.confirm).mockResolvedValue(true);

      await keysRemoveCommand();

      expect(vi.mocked(prompts.prompts.confirm)).toHaveBeenCalled();
    });

    it('should handle cancellation', async () => {
      mockConfigService.getClaudeConfig.mockResolvedValue({
        apiKey: 'test-key',
      });
      vi.mocked(prompts.prompts.confirm).mockResolvedValue(false);

      await keysRemoveCommand();

      expect(mockConfigService.removeClaudeConfig).not.toHaveBeenCalled();
    });

    it('should handle missing key', async () => {
      mockConfigService.getClaudeConfig.mockResolvedValue(null);

      await keysRemoveCommand();

      expect(mockConfigService.removeClaudeConfig).not.toHaveBeenCalled();
    });
  });
});
