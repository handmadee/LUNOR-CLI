import pc from 'picocolors';
import { getRuleService } from '../../lib/rules/index.js';
import { getDefaultRuleNames } from '../../lib/rules/default-rules.js';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';
import { createSpinner } from '../../utils/spinner.js';

/**
 * Initialize rules with default templates
 * @param ruleNames - Optional specific rule names to initialize, or 'all' for all defaults
 */
export async function rulesInitCommand(ruleNames?: string): Promise<void> {
  prompts.intro('Initialize Rules');

  const service = getRuleService();

  // Handle 'all' argument
  if (ruleNames === 'all') {
    await initializeAll(service);
    return;
  }

  // Handle specific rule name
  if (ruleNames) {
    await initializeSpecific(service, ruleNames);
    return;
  }

  // Interactive mode
  await initializeInteractive(service);
}

async function initializeAll(service: ReturnType<typeof getRuleService>): Promise<void> {
  const spinner = createSpinner('Initializing all default rules...').start();

  const result = await service.initializeDefaults();

  if (result.valid) {
    spinner.succeed('Default rules initialized');

    if (result.warnings.length > 0) {
      console.log();
      for (const warning of result.warnings) {
        logger.info(warning);
      }
    }

    console.log();
    logger.success('Rules have been added to .cursor/rules');
    console.log(pc.dim('  View with: lunor rules list'));
  } else {
    spinner.fail('Failed to initialize default rules');
    for (const error of result.errors) {
      logger.error(error);
    }
  }
}

async function initializeSpecific(
  service: ReturnType<typeof getRuleService>,
  ruleName: string
): Promise<void> {
  const availableRules = getDefaultRuleNames();

  if (!availableRules.includes(ruleName)) {
    logger.error(`Unknown default rule: ${ruleName}`);
    console.log();
    console.log('Available default rules:');
    for (const name of availableRules) {
      console.log(pc.dim(`  - ${name}`));
    }
    return;
  }

  const spinner = createSpinner(`Initializing ${ruleName}...`).start();

  const result = await service.initializeDefaults([ruleName]);

  if (result.valid) {
    spinner.succeed(`Initialized ${ruleName}`);

    if (result.warnings.length > 0) {
      console.log();
      for (const warning of result.warnings) {
        logger.info(warning);
      }
    }

    console.log();
    logger.success(`Rule added to .cursor/rules/${ruleName}.md`);
    console.log(pc.dim('  View with: lunor rules show ' + ruleName));
  } else {
    spinner.fail(`Failed to initialize ${ruleName}`);
    for (const error of result.errors) {
      logger.error(error);
    }
  }
}

async function initializeInteractive(service: ReturnType<typeof getRuleService>): Promise<void> {
  const { getDefaultRules } = await import('../../lib/rules/default-rules.js');
  const defaultRules = getDefaultRules();

  // Show available default rules
  console.log();
  logger.section('Available Default Rules:');
  for (const rule of defaultRules) {
    console.log(`  ${pc.cyan('•')} ${pc.bold(rule.displayName)}`);
    console.log(`    ${pc.dim(rule.description)}`);
  }
  console.log();

  const initAll = await prompts.confirm('Initialize all default rules?', true);

  let selectedRules: string[];

  if (initAll) {
    selectedRules = defaultRules.map(r => r.name);
  } else {
    // Let user select which specific rule to initialize
    const selected = await prompts.select<string>(
      'Select a rule to initialize:',
      defaultRules.map(rule => ({
        value: rule.name,
        label: rule.displayName,
        hint: pc.dim(rule.description),
      }))
    );

    if (!selected) {
      logger.info('No rule selected');
      return;
    }

    selectedRules = [selected];
  }

  const spinner = createSpinner(`Initializing ${selectedRules.length} rule(s)...`).start();

  const result = await service.initializeDefaults(selectedRules);

  if (result.valid) {
    spinner.succeed(`Initialized ${selectedRules.length} rule(s)`);

    if (result.warnings.length > 0) {
      console.log();
      for (const warning of result.warnings) {
        logger.info(warning);
      }
    }

    console.log();
    logger.success('Rules have been added to .cursor/rules');
    console.log(pc.dim('  View with: lunor rules list'));
  } else {
    spinner.fail('Failed to initialize rules');
    for (const error of result.errors) {
      logger.error(error);
    }
  }
}
