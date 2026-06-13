import type { IRuleValidator, RuleFormat } from '../types.js';
import { MarkdownValidator } from './markdown-validator.js';
import { YamlValidator } from './yaml-validator.js';
import { JsonValidator } from './json-validator.js';

export { BaseRuleValidator } from './base-validator.js';
export { MarkdownValidator } from './markdown-validator.js';
export { YamlValidator } from './yaml-validator.js';
export { JsonValidator } from './json-validator.js';

const validators: IRuleValidator[] = [
  new MarkdownValidator(),
  new YamlValidator(),
  new JsonValidator(),
];

export function getValidator(format: RuleFormat): IRuleValidator | null {
  return validators.find(v => v.canHandle(format)) || null;
}

export function registerValidator(validator: IRuleValidator): void {
  validators.push(validator);
}
