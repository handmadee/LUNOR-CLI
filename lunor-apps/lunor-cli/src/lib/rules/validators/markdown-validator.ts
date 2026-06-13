import type { RuleFormat, ValidationResult } from '../types.js';
import { BaseRuleValidator } from './base-validator.js';

export class MarkdownValidator extends BaseRuleValidator {
  canHandle(format: RuleFormat): boolean {
    return format === 'markdown';
  }

  async validate(content: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.validateNotEmpty(content)) {
      errors.push('Content is empty');
      return this.createResult(false, errors, warnings);
    }

    if (!this.validateSize(content)) {
      errors.push('File size exceeds 1MB limit');
      return this.createResult(false, errors, warnings);
    }

    const hasHeading = /^#+\s+.+$/m.test(content);
    if (!hasHeading) {
      warnings.push('No markdown headings found - consider adding structure');
    }

    const codeBlocks = content.match(/```[\s\S]*?```/g);
    if (codeBlocks && codeBlocks.length > 20) {
      warnings.push(`Large number of code blocks (${codeBlocks.length}) - consider splitting`);
    }

    const lines = content.split('\n');
    if (lines.length > 1000) {
      warnings.push(`Long file (${lines.length} lines) - consider splitting into multiple rules`);
    }

    return this.createResult(true, errors, warnings);
  }
}
