import { describe, test, expect } from 'vitest';
import { PresetManager } from './preset-manager.js';

describe('PresetManager', () => {
  test('should initialize with default presets', () => {
    const manager = new PresetManager();
    const presets = manager.getAllPresets();
    expect(presets.length).toBeGreaterThan(0);
  });

  test('should get preset by name', () => {
    const manager = new PresetManager();
    const preset = manager.getPreset('coding');
    expect(preset).toBeDefined();
    expect(preset?.name).toBe('coding');
    expect(preset?.opus).toBeDefined();
    expect(preset?.sonnet).toBeDefined();
    expect(preset?.haiku).toBeDefined();
  });

  test('should return undefined for invalid preset', () => {
    const manager = new PresetManager();
    const preset = manager.getPreset('invalid');
    expect(preset).toBeUndefined();
  });

  test('should validate preset names', () => {
    const manager = new PresetManager();
    expect(manager.isValidPreset('coding')).toBe(true);
    expect(manager.isValidPreset('invalid')).toBe(false);
  });

  test('should search presets', () => {
    const manager = new PresetManager();
    const results = manager.searchPresets('claude');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(p => p.name.includes('claude'))).toBe(true);
  });

  test('should add new preset', () => {
    const manager = new PresetManager();
    const newPreset = {
      name: 'test',
      opus: 'gpt-5',
      sonnet: 'gpt-5.1',
      haiku: 'gpt-5',
    };
    manager.addPreset(newPreset);
    const retrieved = manager.getPreset('test');
    expect(retrieved).toEqual(newPreset);
  });

  test('should remove preset', () => {
    const manager = new PresetManager();
    manager.addPreset({
      name: 'temp',
      opus: 'gpt-5',
      sonnet: 'gpt-5.1',
      haiku: 'gpt-5',
    });
    expect(manager.isValidPreset('temp')).toBe(true);
    manager.removePreset('temp');
    expect(manager.isValidPreset('temp')).toBe(false);
  });
});
