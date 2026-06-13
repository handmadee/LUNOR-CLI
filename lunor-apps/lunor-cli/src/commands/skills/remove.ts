import pc from 'picocolors';
import { getSkillManager, getSourceConfig, getSourceNames } from '../../lib/skills/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';

export async function skillsRemoveCommand(source?: string): Promise<void> {
  prompts.intro('Remove Skill');

  const manager = getSkillManager();
  const installed = manager.list();

  if (installed.length === 0) {
    logger.warning('No skills installed');
    return;
  }

  if (!source) {
    const selected = await selectInstalledSource(installed);
    if (!selected) {
      logger.info('Cancelled');
      return;
    }
    source = selected;
  }

  const availableSources = getSourceNames();

  if (!availableSources.includes(source)) {
    logger.error(`Unknown source: ${source}`);
    console.log(pc.dim(`Available: ${availableSources.join(', ')}`));
    return;
  }

  const config = getSourceConfig(source);
  if (!config) return;

  const status = manager.getSourceStatus(source);

  if (!status.installed) {
    logger.warning(`Not installed: ${config.displayName}`);
    return;
  }

  const skill = installed.find(s => s.name === source);

  console.log();
  console.log(pc.yellow('[!] This will remove:'));
  console.log(`    ${pc.bold(config.displayName)}`);
  if (skill?.path) {
    console.log(`    ${pc.dim(skill.path)}`);
  }
  console.log();

  const confirmed = await prompts.confirm(
    `Remove ${config.displayName} and all its files?`
  );

  if (!confirmed) {
    logger.info('Cancelled');
    return;
  }

  const spinner = createSpinner(`Removing ${config.displayName}...`).start();

  const result = await manager.remove(source);

  if (result.success) {
    spinner.succeed(`Removed: ${config.displayName}`);
  } else {
    spinner.fail(`Failed to remove: ${config.displayName}`);
    logger.error(result.error || 'Unknown error');
  }
}

async function selectInstalledSource(
  installed: ReturnType<typeof getSkillManager>['list'] extends () => infer R ? R : never
): Promise<string | null> {
  const options = installed.map(skill => ({
    value: skill.name,
    label: skill.displayName,
    hint: pc.dim(skill.type),
  }));

  return prompts.select('Select skill to remove:', options);
}

export async function skillsRefreshCommand(source?: string): Promise<void> {
  prompts.intro('Refresh Skill');

  const manager = getSkillManager();
  const installed = manager.list();

  if (!source) {
    if (installed.length === 0) {
      logger.warning('No skills installed to refresh');
      return;
    }

    const options = installed.map(skill => ({
      value: skill.name,
      label: skill.displayName,
      hint: pc.dim(skill.type),
    }));

    const selected = await prompts.select('Select skill to refresh:', options);
    if (!selected) {
      logger.info('Cancelled');
      return;
    }
    source = selected;
  }

  const config = getSourceConfig(source);

  if (!config) {
    logger.error(`Unknown source: ${source}`);
    return;
  }

  const confirmed = await prompts.confirm(
    `This will remove and re-install ${config.displayName}. Continue?`
  );

  if (!confirmed) {
    logger.info('Cancelled');
    return;
  }

  const spinner = createSpinner(`Refreshing ${config.displayName}...`).start();

  const result = await manager.forceRefresh(source);

  if (result.success) {
    spinner.succeed(`Refreshed: ${config.displayName}`);
  } else {
    spinner.fail(`Failed to refresh: ${config.displayName}`);
    logger.error(result.error || 'Unknown error');
  }
}
