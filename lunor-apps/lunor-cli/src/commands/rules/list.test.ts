import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { rulesListCommand } from './list.js';
import * as ruleService from '../../lib/rules/rule-service.js';

vi.mock('../../lib/rules/rule-service.js');
vi.mock('../../utils/prompts.js');

describe('rulesListCommand', () => {
  let mockService: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    mockService = {
      listRules: vi.fn(),
    };

    vi.mocked(ruleService.getRuleService).mockReturnValue(mockService);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  it('should list all rules', async () => {
    const mockRules = [
      {
        name: 'rule1',
        displayName: 'Rule 1',
        type: 'cursor' as const,
        format: 'markdown' as const,
        content: '# Rule 1',
        filePath: '/path/to/rule1.md',
        size: 1024,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        name: 'rule2',
        displayName: 'Rule 2',
        type: 'framework' as const,
        format: 'yaml' as const,
        content: 'key: value',
        filePath: '/path/to/rule2.yaml',
        size: 512,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    mockService.listRules.mockResolvedValue(mockRules);

    await rulesListCommand();

    expect(mockService.listRules).toHaveBeenCalledWith(undefined);
    expect(consoleLogSpy).toHaveBeenCalled();
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
        size: 1024,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    mockService.listRules.mockResolvedValue(mockRules);

    await rulesListCommand('cursor');

    expect(mockService.listRules).toHaveBeenCalledWith('cursor');
  });

  it('should handle empty rules list', async () => {
    mockService.listRules.mockResolvedValue([]);

    await rulesListCommand();

    expect(mockService.listRules).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('should display rule metadata', async () => {
    const mockRules = [
      {
        name: 'test-rule',
        displayName: 'Test Rule',
        type: 'cursor' as const,
        format: 'markdown' as const,
        content: '# Test',
        filePath: '/path/to/test.md',
        size: 2048,
        description: 'A test rule',
        tags: ['test', 'example'],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    mockService.listRules.mockResolvedValue(mockRules);

    await rulesListCommand();

    expect(consoleLogSpy).toHaveBeenCalled();
  });
});
