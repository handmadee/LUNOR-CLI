import type { RuleFormat, ValidationResult } from '../types.js';
import { BaseRuleValidator } from './base-validator.js';

export class JsonValidator extends BaseRuleValidator {
  canHandle(format: RuleFormat): boolean {
    return format === 'json';
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
      const parsed = JSON.parse(content);
      
      if (typeof parsed !== 'object' || parsed === null) {
        errors.push('JSON must be an object or array');
        return this.createResult(false, errors, warnings);
      }

      if (Array.isArray(parsed) && parsed.length === 0) {
        warnings.push('Empty JSON array');
      }

      if (!Array.isArray(parsed) && Object.keys(parsed).length === 0) {
        warnings.push('Empty JSON object');
      }
    } catch (error) {
      errors.push(`Invalid JSON syntax: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.createResult(false, errors, warnings);
    }

    return this.createResult(true, errors, warnings);
  }
}
