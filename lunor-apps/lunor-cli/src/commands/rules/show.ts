import pc from 'picocolors';
import { getRuleService } from '../../lib/rules/index.js';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';

export async function rulesShowCommand(name: string): Promise<void> {
  prompts.intro('Show Rule');

  const service = getRuleService();
  const rule = await service.getRule(name);

  if (!rule) {
    logger.error(`Rule not found: ${name}`);
    console.log(pc.dim('List rules: lunor rules list'));
    return;
  }

  logger.section(rule.displayName);
  console.log();

  logger.table([
    ['Name', pc.cyan(rule.name)],
    ['Type', pc.dim(rule.type)],
    ['Format', pc.dim(rule.format)],
    ['Size', pc.dim(`${(rule.size / 1024).toFixed(1)}KB`)],
    ['Path', pc.dim(rule.filePath)],
  ]);

  if (rule.description) {
    console.log();
    console.log(pc.bold('Description:'));
    console.log(pc.dim(rule.description));
  }

  if (rule.tags && rule.tags.length > 0) {
    console.log();
    console.log(pc.bold('Tags:'));
    console.log(rule.tags.map(t => pc.cyan(`#${t}`)).join(' '));
  }

  console.log();
  logger.divider();
  console.log(pc.bold('Content:'));
  console.log();

  const lines = rule.content.split('\n');
  const preview = lines.slice(0, 30);
  
  for (const line of preview) {
    console.log(pc.dim(line));
  }

  if (lines.length > 30) {
    console.log();
    console.log(pc.yellow(`... ${lines.length - 30} more lines`));
    console.log(pc.dim(`View full: cat ${rule.filePath}`));
  }

  console.log();
}
