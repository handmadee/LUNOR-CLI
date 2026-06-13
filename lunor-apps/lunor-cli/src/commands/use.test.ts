import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useCommand } from './use.js';
import { PresetManager } from '../core/preset-manager.js';
import { ModelRegistry } from '../core/model-registry.js';
import { StateManager } from '../core/state-manager.js';
import { AnalyticsService } from '../services/analytics-service.js';

vi.mock('../core/preset-manager.js');
vi.mock('../core/model-registry.js');
vi.mock('../core/state-manager.js');
vi.mock('../services/analytics-service.js');
vi.mock('../utils/prompts.js', () => ({
  prompts: {
    intro: vi.fn(),
  },
}));
vi.mock('../utils/ui.js', () => ({
  ui: {
    section: vi.fn(),
  },
}));

describe('useCommand', () => {
  let mockPresetManager: any;
  let mockRegistry: any;
  let mockStateManager: any;
  let mockAnalytics: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    mockPresetManager = {
      getPreset: vi.fn(),
    };

    mockRegistry = {
      isValidModel: vi.fn().mockReturnValue(true),
      getModel: vi.fn().mockReturnValue({
        id: 'test-model',
        provider: 'anthropic',
      }),
    };

    mockStateManager = {
      setState: vi.fn(),
      getState: vi.fn().mockReturnValue(null),
    };

    mockAnalytics = {
      recordUsage: vi.fn(),
      close: vi.fn(),
    };

    vi.mocked(PresetManager).mockImplementation(() => mockPresetManager);
    vi.mocked(ModelRegistry).mockImplementation(() => mockRegistry);
    vi.mocked(StateManager).mockImplementation(() => mockStateManager);
    vi.mocked(AnalyticsService).mockImplementation(() => mockAnalytics);

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (consoleLogSpy) consoleLogSpy.mockRestore();
  });

  it('should activate a valid preset', async () => {
    const mockPreset = {
      name: 'fast',
      opus: 'gemini-3-flash-preview',
      sonnet: 'gemini-2.5-flash',
      haiku: 'gemini-2.5-flash-lite',
      description: 'Fast models',
    };

    mockPresetManager.getPreset.mockReturnValue(mockPreset);

    await useCommand('fast');

    expect(mockPresetManager.getPreset).toHaveBeenCalledWith('fast');
    expect(mockStateManager.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPreset: 'fast',
        opus: mockPreset.opus,
        sonnet: mockPreset.sonnet,
        haiku: mockPreset.haiku,
      })
    );
    expect(mockAnalytics.recordUsage).toHaveBeenCalled();
    expect(mockAnalytics.close).toHaveBeenCalled();
  });

  it('should throw error for invalid preset', async () => {
    mockPresetManager.getPreset.mockReturnValue(null);

    await expect(useCommand('invalid-preset')).rejects.toThrow(
      "Preset 'invalid-preset' not found"
    );
  });

  it('should validate all models in preset', async () => {
    const mockPreset = {
      name: 'coding',
      opus: 'model-opus',
      sonnet: 'model-sonnet',
      haiku: 'model-haiku',
    };

    mockPresetManager.getPreset.mockReturnValue(mockPreset);
    mockRegistry.isValidModel.mockReturnValue(false);

    await expect(useCommand('coding')).rejects.toThrow('not found in registry');
  });

  it('should record analytics for preset usage', async () => {
    const mockPreset = {
      name: 'fast',
      opus: 'gemini-3-flash-preview',
      sonnet: 'gemini-2.5-flash',
      haiku: 'gemini-2.5-flash-lite',
    };

    mockPresetManager.getPreset.mockReturnValue(mockPreset);

    await useCommand('fast');

    expect(mockAnalytics.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'use',
        preset: 'fast',
        model: mockPreset.opus,
      })
    );
  });
});
