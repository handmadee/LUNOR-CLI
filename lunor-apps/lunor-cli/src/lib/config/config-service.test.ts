import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from './config-service.js';
import type { IConfigRepository } from './types.js';

class MockConfigRepository implements IConfigRepository {
  private store = new Map<string, { value: string; encrypted: boolean }>();

  async get(key: string): Promise<string | undefined> {
    return this.store.get(key)?.value;
  }

  async set(key: string, value: string, encrypt = false): Promise<void> {
    this.store.set(key, { value, encrypted: encrypt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list() {
    return Array.from(this.store.entries()).map(([key, { value, encrypted }]) => ({
      key,
      value,
      encrypted,
      updatedAt: new Date().toISOString(),
    }));
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  clear() {
    this.store.clear();
  }
}

describe('ConfigService', () => {
  let repository: MockConfigRepository;
  let service: ConfigService;

  beforeEach(() => {
    repository = new MockConfigRepository();
    service = new ConfigService(repository);
  });

  describe('AMP Configuration', () => {
    it('should return null when AMP not configured', async () => {
      const config = await service.getAMPConfig();
      expect(config).toBeNull();
    });

    it('should set and get AMP configuration', async () => {
      await service.setAMPConfig({
        url: 'http://localhost:8317',
        apiKey: 'test-key-1234567890123456',
      });

      const config = await service.getAMPConfig();
      expect(config).toEqual({
        url: 'http://localhost:8317',
        apiKey: 'test-key-1234567890123456',
      });
    });

    it('should partially update AMP configuration', async () => {
      await service.setAMPConfig({
        url: 'http://localhost:8317',
        apiKey: 'original-key',
      });

      await service.setAMPConfig({ apiKey: 'new-key' });

      const config = await service.getAMPConfig();
      expect(config?.url).toBe('http://localhost:8317');
      expect(config?.apiKey).toBe('new-key');
    });
  });

  describe('Claude Configuration', () => {
    it('should return null when Claude not configured', async () => {
      const config = await service.getClaudeConfig();
      expect(config).toBeNull();
    });

    it('should set and get Claude configuration', async () => {
      await service.setClaudeConfig({
        apiKey: 'sk-ant-1234567890',
        model: 'claude-3-5-sonnet-20241022',
      });

      const config = await service.getClaudeConfig();
      expect(config).toEqual({
        apiKey: 'sk-ant-1234567890',
        model: 'claude-3-5-sonnet-20241022',
      });
    });
  });

  describe('Environment Export', () => {
    it('should export AMP config to env variables', async () => {
      await service.setAMPConfig({
        url: 'http://localhost:8317',
        apiKey: 'test-key',
      });

      const envVars = await service.exportToEnvAsync();
      
      expect(envVars).toContain('export AMP_URL="http://localhost:8317"');
      expect(envVars).toContain('export AMP_API_KEY="test-key"');
    });

    it('should export Claude config to env variables', async () => {
      await service.setClaudeConfig({
        apiKey: 'sk-ant-test',
        model: 'claude-3-5-sonnet-20241022',
      });

      const envVars = await service.exportToEnvAsync();
      
      expect(envVars).toContain('export ANTHROPIC_API_KEY="sk-ant-test"');
      expect(envVars).toContain('export ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"');
    });
  });

  describe('Validation', () => {
    it('should validate AMP URL format', async () => {
      await service.setAMPConfig({
        url: 'invalid-url',
        apiKey: '12345678901234567890123456789012',
      });

      const result = await service.validateConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid AMP_URL format');
    });

    it('should validate API key length', async () => {
      await service.setAMPConfig({
        url: 'http://localhost:8317',
        apiKey: 'short',
      });

      const result = await service.validateConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('AMP_API_KEY is too short (minimum 32 characters)');
    });

    it('should validate Claude API key format', async () => {
      await service.setClaudeConfig({
        apiKey: 'invalid-key',
      });

      const result = await service.validateConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid ANTHROPIC_API_KEY format');
    });

    it('should pass validation with correct config', async () => {
      await service.setAMPConfig({
        url: 'http://localhost:8317',
        apiKey: '12345678901234567890123456789012',
      });
      await service.setClaudeConfig({
        apiKey: 'sk-ant-1234567890',
      });

      const result = await service.validateConfig();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return warnings for missing configs', async () => {
      const result = await service.validateConfig();
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('AMP configuration not set');
      expect(result.warnings).toContain('Claude configuration not set');
    });
  });
});
