import pc from 'picocolors';
import { getRuleService } from '../../lib/rules/index.js';
import type { RuleType } from '../../lib/rules/index.js';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';

export async function rulesListCommand(type?: string): Promise<void> {
  prompts.intro('Cursor Rules');

  const service = getRuleService();
  const rules = await service.listRules(type as RuleType);

  if (rules.length === 0) {
    logger.warning('No rules found');
    console.log();
    console.log(pc.dim('Add rules: lunor rules add'));
    return;
  }

  type RuleItem = typeof rules[0];
  const grouped: Record<string, RuleItem[]> = {};

  for (const rule of rules) {
    if (!grouped[rule.type]) {
      grouped[rule.type] = [];
    }
    grouped[rule.type].push(rule);
  }

  for (const [ruleType, typeRules] of Object.entries(grouped)) {
    logger.section(formatTypeLabel(ruleType));
    console.log();

    for (const rule of typeRules) {
      const sizeKb = (rule.size / 1024).toFixed(1);
      const formatBadge = pc.dim(`[${rule.format}]`);
      
      console.log(`  ${pc.bold(rule.displayName)}`);
      console.log(`    ${pc.dim(`${rule.name}`)} ${formatBadge} ${pc.dim(`${sizeKb}KB`)}`);
      
      if (rule.description) {
        console.log(`    ${pc.dim(rule.description)}`);
      }
      
      if (rule.tags && rule.tags.length > 0) {
        const tagStr = rule.tags.map((t: string) => pc.cyan(`#${t}`)).join(' ');
        console.log(`    ${tagStr}`);
      }
      
      console.log();
    }
  }

  logger.divider();
  console.log(`[i] ${rules.length} rule${rules.length !== 1 ? 's' : ''} total`);
  console.log();
}

function formatTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    cursor: 'Cursor Rules',
    framework: 'Framework Rules',
    'code-style': 'Code Style Rules',
    custom: 'Custom Rules',
  };

  return labels[type] || type;
}
