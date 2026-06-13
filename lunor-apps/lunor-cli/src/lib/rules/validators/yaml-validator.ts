import type { RuleFormat, ValidationResult } from '../types.js';
import { BaseRuleValidator } from './base-validator.js';

export class YamlValidator extends BaseRuleValidator {
  canHandle(format: RuleFormat): boolean {
    return format === 'yaml';
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

    try {
      const yaml = await import('js-yaml');
      yaml.load(content);
    } catch (error) {
      errors.push(`Invalid YAML syntax: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.createResult(false, errors, warnings);
    }

    const hasKey = /^\w+:/m.test(content);
    if (!hasKey) {
      warnings.push('No YAML keys found - ensure proper formatting');
    }

    return this.createResult(true, errors, warnings);
  }
}
