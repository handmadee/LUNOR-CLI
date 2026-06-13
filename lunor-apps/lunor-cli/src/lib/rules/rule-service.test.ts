import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RuleService } from './rule-service.js';
import type { IRuleRepository, RuleMetadata } from './types.js';

describe('RuleService', () => {
  let service: RuleService;
  let mockRepository: IRuleRepository;

  beforeEach(() => {
    mockRepository = {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockResolvedValue(false),
      getRulesDir: vi.fn().mockReturnValue('.cursor/rules'),
    };

    service = new RuleService(mockRepository);
  });

  describe('listRules', () => {
    it('should list all rules when no type is specified', async () => {
      const mockRules = [
        {
          name: 'test-rule',
          displayName: 'Test Rule',
          type: 'cursor' as const,
          format: 'markdown' as const,
          content: '# Test',
          filePath: '/path/to/rule.md',
          size: 100,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      mockRepository.list = vi.fn().mockResolvedValue(mockRules);

      const rules = await service.listRules();

      expect(rules).toEqual(mockRules);
      expect(mockRepository.list).toHaveBeenCalledTimes(1);
    });

    it('should filter rules by type', async () => {
      const mockRules = [
        {
          name: 'cursor-rule',
          displayName: 'Cursor Rule',
          type: 'cursor' as const,
          format: 'markdown' as const,
          content: '# Cursor',
          filePath: '/path/to/cursor.md',
          size: 100,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          name: 'framework-rule',
          displayName: 'Framework Rule',
          type: 'framework' as const,
          format: 'markdown' as const,
          content: '# Framework',
          filePath: '/path/to/framework.md',
          size: 100,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      mockRepository.list = vi.fn().mockResolvedValue(mockRules);

      const rules = await service.listRules('cursor');

      expect(rules).toHaveLength(1);
      expect(rules[0].type).toBe('cursor');
    });
  });

  describe('addRule', () => {
    it('should add a valid rule', async () => {
      const metadata: RuleMetadata = {
        name: 'test-rule',
        displayName: 'Test Rule',
        type: 'cursor',
        format: 'markdown',
      };
      const content = '# Test Rule\n\nSome content';

      const result = await service.addRule(metadata, content);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockRepository.add).toHaveBeenCalledTimes(1);
    });

    it('should reject empty content', async () => {
      const metadata: RuleMetadata = {
        name: 'test-rule',
        displayName: 'Test Rule',
        type: 'cursor',
        format: 'markdown',
      };
      const content = '';

      const result = await service.addRule(metadata, content);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content is empty');
      expect(mockRepository.add).not.toHaveBeenCalled();
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      const existingRule = {
        name: 'test-rule',
        displayName: 'Test Rule',
        type: 'cursor' as const,
        format: 'markdown' as const,
        content: '# Old Content',
        filePath: '/path/to/rule.md',
        size: 100,
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      mockRepository.get = vi.fn().mockResolvedValue(existingRule);

      const newContent = '# Updated Content';
      const result = await service.updateRule('test-rule', newContent);

      expect(result.valid).toBe(true);
      expect(mockRepository.update).toHaveBeenCalledWith('test-rule', newContent);
    });

    it('should fail when rule does not exist', async () => {
      mockRepository.get = vi.fn().mockResolvedValue(null);

      const result = await service.updateRule('nonexistent', '# Content');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Rule not found: nonexistent');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('removeRule', () => {
    it('should remove a rule', async () => {
      await service.removeRule('test-rule');

      expect(mockRepository.remove).toHaveBeenCalledWith('test-rule');
    });
  });

  describe('getTemplates', () => {
    it('should return available templates', () => {
      const templates = service.getTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('displayName');
      expect(templates[0]).toHaveProperty('type');
    });
  });

  describe('createFromTemplate', () => {
    it('should create a rule from template', async () => {
      const result = await service.createFromTemplate('cursor-basic', 'my-rule');

      expect(result.valid).toBe(true);
      expect(mockRepository.add).toHaveBeenCalledTimes(1);
    });

    it('should fail for unknown template', async () => {
      const result = await service.createFromTemplate('unknown-template', 'my-rule');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template not found: unknown-template');
      expect(mockRepository.add).not.toHaveBeenCalled();
    });
  });
});
