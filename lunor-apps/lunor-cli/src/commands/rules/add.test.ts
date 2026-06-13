import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { rulesAddCommand } from './add.js';
import * as ruleService from '../../lib/rules/rule-service.js';
import * as prompts from '../../utils/prompts.js';
import { existsSync } from 'node:fs';

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

describe('rulesAddCommand', () => {
  let mockService: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    mockService = {
      importFromFile: vi.fn(),
      createFromTemplate: vi.fn(),
      addRule: vi.fn(),
    };

    vi.mocked(ruleService.getRuleService).mockReturnValue(mockService);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  describe('add from file', () => {
    it('should import rule from existing file', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      mockService.importFromFile.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
      });

      await rulesAddCommand('/path/to/rule.md');

      expect(existsSync).toHaveBeenCalledWith(expect.stringContaining('rule.md'));
      expect(mockService.importFromFile).toHaveBeenCalled();
    });

    it('should handle file not found', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await rulesAddCommand('/path/to/nonexistent.md');

      expect(mockService.importFromFile).not.toHaveBeenCalled();
    });

    it('should handle import errors', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      mockService.importFromFile.mockResolvedValue({
        valid: false,
        errors: ['Invalid format'],
        warnings: [],
      });

      await rulesAddCommand('/path/to/rule.md');

      expect(mockService.importFromFile).toHaveBeenCalled();
    });
  });

  describe('interactive add', () => {
    it('should create rule from template', async () => {
      vi.mocked(prompts.prompts.confirm).mockResolvedValue(true);
      vi.mocked(prompts.prompts.select).mockResolvedValue('cursor-basic');
      vi.mocked(prompts.prompts.text).mockResolvedValue('my-rule');

      mockService.createFromTemplate.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
      });

      await rulesAddCommand();

      expect(mockService.createFromTemplate).toHaveBeenCalledWith('cursor-basic', 'my-rule');
    });

    it('should create custom rule', async () => {
      vi.mocked(prompts.prompts.confirm).mockResolvedValue(false);
      vi.mocked(prompts.prompts.text)
        .mockResolvedValueOnce('my-rule')
        .mockResolvedValueOnce('Description')
        .mockResolvedValueOnce('# Content');
      vi.mocked(prompts.prompts.select).mockResolvedValue('cursor');

      mockService.addRule.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
      });

      await rulesAddCommand();

      expect(mockService.addRule).toHaveBeenCalled();
    });

    it('should handle cancellation', async () => {
      vi.mocked(prompts.prompts.confirm).mockResolvedValue(true);
      vi.mocked(prompts.prompts.select).mockResolvedValue(null);

      await rulesAddCommand();

      expect(mockService.createFromTemplate).not.toHaveBeenCalled();
      expect(mockService.addRule).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should reject invalid rule names', async () => {
      vi.mocked(prompts.prompts.confirm).mockResolvedValue(false);
      vi.mocked(prompts.prompts.text).mockResolvedValueOnce('Invalid Name!');

      await rulesAddCommand();

      expect(mockService.addRule).not.toHaveBeenCalled();
    });

    it('should accept valid rule names', async () => {
      vi.mocked(prompts.prompts.confirm).mockResolvedValue(false);
      vi.mocked(prompts.prompts.text)
        .mockResolvedValueOnce('valid-rule-name')
        .mockResolvedValueOnce('Description')
        .mockResolvedValueOnce('# Content');
      vi.mocked(prompts.prompts.select).mockResolvedValue('cursor');

      mockService.addRule.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
      });

      await rulesAddCommand();

      expect(mockService.addRule).toHaveBeenCalled();
    });
  });
});
