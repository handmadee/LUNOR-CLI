import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { listCommand } from './list.js';
import { ModelRegistry } from '../core/model-registry.js';

vi.mock('../core/model-registry.js');
vi.mock('../utils/prompts.js', () => ({
  prompts: {
    intro: vi.fn(),
  },
}));

describe('List Commands', () => {
  let mockRegistry: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    mockRegistry = {
      getAllModels: vi.fn(),
      searchModels: vi.fn(),
      getModelsByProvider: vi.fn(),
    };

    vi.mocked(ModelRegistry).mockImplementation(() => mockRegistry);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (consoleLogSpy) consoleLogSpy.mockRestore();
  });

  describe('listCommand', () => {
    it('should list all models grouped by provider', async () => {
      const mockModels = [
        {
          id: 'claude-3-opus',
          name: 'Claude 3 Opus',
          provider: 'anthropic',
          tier: 'opus',
        },
        {
          id: 'gemini-2.5-flash',
          name: 'Gemini 2.5 Flash',
          provider: 'google',
          tier: 'sonnet',
        },
      ];

      mockRegistry.getAllModels.mockReturnValue(mockModels);

      await listCommand({});

      expect(mockRegistry.getAllModels).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle empty model list', async () => {
      mockRegistry.getAllModels.mockReturnValue([]);

      await listCommand({});

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('model filtering', () => {
    it('should filter models by provider', async () => {
      const mockModels = [
        {
          id: 'claude-3-opus',
          name: 'Claude 3 Opus',
          provider: 'anthropic',
          tier: 'opus',
        },
      ];

      mockRegistry.getModelsByProvider.mockReturnValue(mockModels);

      await listCommand({ provider: 'anthropic' });

      expect(mockRegistry.getModelsByProvider).toHaveBeenCalledWith('anthropic');
    });

    it('should search models by query', async () => {
      const mockModels = [
        {
          id: 'claude-3-opus',
          name: 'Claude 3 Opus',
          provider: 'anthropic',
          tier: 'opus',
        },
      ];

      mockRegistry.getAllModels.mockReturnValue(mockModels);

      await listCommand({ search: 'claude' });

      // listCommand uses getAllModels and filters internally
      expect(mockRegistry.getAllModels).toHaveBeenCalled();
    });
  });
});
