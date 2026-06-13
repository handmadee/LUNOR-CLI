import pc from 'picocolors';
import { getRuleService } from '../../lib/rules/index.js';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';
import { createSpinner } from '../../utils/spinner.js';

export async function rulesRemoveCommand(name?: string): Promise<void> {
  prompts.intro('Remove Rule');

  const service = getRuleService();

  if (!name) {
    const selected = await selectRule(service);
    if (!selected) {
      logger.info('Cancelled');
      return;
    }
    name = selected;
  }

  const rule = await service.getRule(name);

  if (!rule) {
    logger.error(`Rule not found: ${name}`);
    return;
  }

  console.log();
  console.log(pc.yellow('[!] This will remove:'));
  console.log(`    ${pc.bold(rule.displayName)}`);
  console.log(`    ${pc.dim(rule.filePath)}`);
  console.log();

  const confirmed = await prompts.confirm(`Remove rule "${rule.name}"?`);

  if (!confirmed) {
    logger.info('Cancelled');
    return;
  }

  const spinner = createSpinner('Removing rule...').start();

  try {
    await service.removeRule(name);
    spinner.succeed('Rule removed successfully');
  } catch (error) {
    spinner.fail('Failed to remove rule');
    logger.error(error instanceof Error ? error.message : 'Unknown error');
  }
}

async function selectRule(service: ReturnType<typeof getRuleService>): Promise<string | null> {
  const rules = await service.listRules();

  if (rules.length === 0) {
    logger.warning('No rules found');
    return null;
  }

  return prompts.select(
    'Select rule to remove:',
    rules.map(r => ({
      value: r.name,
      label: r.displayName,
      hint: pc.dim(r.type),
    }))
  );
}
