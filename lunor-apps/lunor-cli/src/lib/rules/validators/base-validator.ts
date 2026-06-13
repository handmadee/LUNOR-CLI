import type { IRuleValidator, ValidationResult, RuleFormat } from '../types.js';

export abstract class BaseRuleValidator implements IRuleValidator {
  abstract canHandle(format: RuleFormat): boolean;
  abstract validate(content: string): Promise<ValidationResult>;

  protected createResult(valid: boolean, errors: string[] = [], warnings: string[] = []): ValidationResult {
    return { valid, errors, warnings };
  }

  protected validateNotEmpty(content: string): boolean {
    return content.trim().length > 0;
  }

  protected validateSize(content: string, maxSize = 1024 * 1024): boolean {
    return Buffer.byteLength(content, 'utf8') <= maxSize;
  }

  protected extractFrontmatter(content: string): { frontmatter: string; body: string } | null {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return null;
    return { frontmatter: match[1], body: match[2] };
  }
}
