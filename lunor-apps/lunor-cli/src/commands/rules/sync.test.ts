import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { rulesSyncCommand, rulesListIDEsCommand } from './sync.js';
import * as ruleService from '../../lib/rules/rule-service.js';
import * as prompts from '../../utils/prompts.js';
import { existsSync, copyFileSync, readdirSync } from 'node:fs';

vi.mock('node:fs');
vi.mock('../../lib/rules/rule-service.js');
vi.mock('../../utils/prompts.js');
vi.mock('../../utils/spinner.js', () => ({
  createSpinner: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  })),
}));

describe('rulesSyncCommand', () => {
  let mockService: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    mockService = {
      listRules: vi.fn(),
    };

    vi.mocked(ruleService.getRuleService).mockReturnValue(mockService);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(prompts.prompts.confirm).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  it('should sync rules to all IDEs', async () => {
    const mockRules = [
      {
        name: 'rule1',
        displayName: 'Rule 1',
        type: 'cursor' as const,
        format: 'markdown' as const,
        content: '# Rule 1',
        filePath: '/source/rule1.md',
        size: 1024,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    mockService.listRules.mockResolvedValue(mockRules);

    await rulesSyncCommand();

    expect(mockService.listRules).toHaveBeenCalled();
    expect(copyFileSync).toHaveBeenCalled();
  });

  it('should sync to specific IDE target', async () => {
    const mockRules = [
      {
        name: 'rule1',
        displayName: 'Rule 1',
        type: 'cursor' as const,
        format: 'markdown' as const,
        content: '# Rule 1',
        filePath: '/source/rule1.md',
        size: 1024,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    mockService.listRules.mockResolvedValue(mockRules);

    await rulesSyncCommand('cursor');

    expect(mockService.listRules).toHaveBeenCalled();
  });

  it('should handle empty rules', async () => {
    mockService.listRules.mockResolvedValue([]);

    await rulesSyncCommand();

    expect(mockService.listRules).toHaveBeenCalled();
    expect(copyFileSync).not.toHaveBeenCalled();
  });

  it('should handle sync cancellation', async () => {
    const mockRules = [
      {
        name: 'rule1',
        displayName: 'Rule 1',
        type: 'cursor' as const,
        format: 'markdown' as const,
        content: '# Rule 1',
        filePath: '/source/rule1.md',
        size: 1024,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    mockService.listRules.mockResolvedValue(mockRules);
    vi.mocked(prompts.prompts.confirm).mockResolvedValue(false);

    await rulesSyncCommand();

    expect(copyFileSync).not.toHaveBeenCalled();
  });
});

describe('rulesListIDEsCommand', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readdirSync).mockReturnValue(['rule1.md', 'rule2.yaml'] as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  it('should list all supported IDEs', async () => {
    await rulesListIDEsCommand();

    expect(consoleLogSpy).toHaveBeenCalled();
    expect(existsSync).toHaveBeenCalled();
  });

  it('should show rule count for each IDE', async () => {
    await rulesListIDEsCommand();

    expect(readdirSync).toHaveBeenCalled();
  });

  it('should handle non-existent directories', async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    await rulesListIDEsCommand();

    expect(consoleLogSpy).toHaveBeenCalled();
  });
});
