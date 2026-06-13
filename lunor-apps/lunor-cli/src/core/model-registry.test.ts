import { describe, test, expect } from 'vitest';
import { ModelRegistry } from './model-registry.js';

describe('ModelRegistry', () => {
  test('should initialize with models', () => {
    const registry = new ModelRegistry();
    const models = registry.getAllModels();
    expect(models.length).toBeGreaterThan(0);
  });

  test('should get model by name', () => {
    const registry = new ModelRegistry();
    const model = registry.getModel('gpt-5');
    expect(model).toBeDefined();
    expect(model?.name).toBe('gpt-5');
    expect(model?.provider).toBe('GPT');
  });

  test('should return undefined for invalid model', () => {
    const registry = new ModelRegistry();
    const model = registry.getModel('invalid-model');
    expect(model).toBeUndefined();
  });

  test('should validate model names', () => {
    const registry = new ModelRegistry();
    expect(registry.isValidModel('gpt-5')).toBe(true);
    expect(registry.isValidModel('invalid')).toBe(false);
  });

  test('should filter models by provider', () => {
    const registry = new ModelRegistry();
    const gptModels = registry.getModelsByProvider('GPT');
    expect(gptModels.length).toBeGreaterThan(0);
    expect(gptModels.every(m => m.provider === 'GPT')).toBe(true);
  });

  test('should return all providers', () => {
    const registry = new ModelRegistry();
    const providers = registry.getProviders();
    expect(providers).toContain('GPT');
    expect(providers).toContain('Claude');
    expect(providers).toContain('Gemini');
  });
});
