import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ampSetCommand, ampShowCommand, ampTestCommand, ampRemoveCommand } from './amp.js';
import * as configModule from '../lib/config/index.js';
import * as prompts from '../utils/prompts.js';

vi.mock('../lib/config/index.js');
vi.mock('../utils/prompts.js');
vi.mock('../utils/spinner.js', () => ({
  createSpinner: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  })),
}));

describe('AMP Commands', () => {
  let mockConfigService: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    mockConfigService = {
      getAMPConfig: vi.fn(),
      setAMPConfig: vi.fn(),
      removeAMPConfig: vi.fn(),
      repository: {
        delete: vi.fn(),
      },
    };

    vi.mocked(configModule.getConfigService).mockReturnValue(mockConfigService);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (consoleLogSpy) {
      consoleLogSpy.mockRestore();
    }
  });

  describe('ampSetCommand', () => {
    it('should set AMP configuration', async () => {
      mockConfigService.getAMPConfig.mockResolvedValue(null);
      vi.mocked(prompts.prompts.text)
        .mockResolvedValueOnce('http://localhost:8317')
        .mockResolvedValueOnce('test-api-key');

      mockConfigService.setAMPConfig.mockResolvedValue(undefined);

      await ampSetCommand();

      expect(mockConfigService.setAMPConfig).toHaveBeenCalledWith({
        url: 'http://localhost:8317',
        apiKey: 'test-api-key',
      });
    });

    it('should handle cancellation', async () => {
      mockConfigService.getAMPConfig.mockResolvedValue(null);
      vi.mocked(prompts.prompts.text).mockResolvedValueOnce(null);

      await ampSetCommand();

      expect(mockConfigService.setAMPConfig).not.toHaveBeenCalled();
    });

    it('should use existing config as defaults', async () => {
      mockConfigService.getAMPConfig.mockResolvedValue({
        url: 'http://existing:8317',
        apiKey: 'existing-key',
      });

      vi.mocked(prompts.prompts.text)
        .mockResolvedValueOnce('http://localhost:8317')
        .mockResolvedValueOnce('new-api-key');

      mockConfigService.setAMPConfig.mockResolvedValue(undefined);

      await ampSetCommand();

      expect(mockConfigService.setAMPConfig).toHaveBeenCalled();
    });
  });

  describe('ampShowCommand', () => {
    it('should show AMP configuration', async () => {
      mockConfigService.getAMPConfig.mockResolvedValue({
        url: 'http://localhost:8317',
        apiKey: 'test-key',
      });
      mockConfigService.exportToEnvAsync = vi.fn().mockResolvedValue([
        'AMP_URL=http://localhost:8317',
        'AMP_API_KEY=test-key',
      ]);

      await ampShowCommand();

      expect(mockConfigService.getAMPConfig).toHaveBeenCalled();
    });

    it('should handle no configuration', async () => {
      mockConfigService.getAMPConfig.mockResolvedValue(null);

      await ampShowCommand();

      expect(mockConfigService.getAMPConfig).toHaveBeenCalled();
    });
  });

  describe('ampTestCommand', () => {
    it('should test AMP connection', async () => {
      mockConfigService.getAMPConfig.mockResolvedValue({
        url: 'http://localhost:8317',
        apiKey: 'test-key',
      });

      await ampTestCommand();

      expect(mockConfigService.getAMPConfig).toHaveBeenCalled();
    });

    it('should handle missing configuration', async () => {
      mockConfigService.getAMPConfig.mockResolvedValue(null);

      await ampTestCommand();

      expect(mockConfigService.getAMPConfig).toHaveBeenCalled();
    });
  });

  describe('ampRemoveCommand', () => {
    it('should remove AMP configuration', async () => {
      vi.mocked(prompts.prompts.confirm).mockResolvedValue(true);
      mockConfigService.getAMPConfig.mockResolvedValue({ url: 'http://localhost:8317', apiKey: 'test-key' });
      mockConfigService.removeAMPConfig.mockResolvedValue(undefined);

      await ampRemoveCommand();

      expect(vi.mocked(prompts.prompts.confirm)).toHaveBeenCalled();
      expect(mockConfigService.repository.delete).toHaveBeenCalledWith('amp.url');
      expect(mockConfigService.repository.delete).toHaveBeenCalledWith('amp.apiKey');
    });

    it('should handle cancellation', async () => {
      vi.mocked(prompts.prompts.confirm).mockResolvedValue(false);

      await ampRemoveCommand();

      expect(mockConfigService.removeAMPConfig).not.toHaveBeenCalled();
    });
  });
});
