import pc from 'picocolors';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { getPluginRegistry } from '../../lib/plugin/plugin-registry.js';
import { getMarketplaceInstaller } from '../../lib/plugin/marketplace-installer.js';
import { PLUGIN_CATEGORY_DESCRIPTIONS } from '../../lib/plugin/types.js';
import type { MarketplaceRepo } from '../../lib/plugin/types.js';
import { createSpinner } from '../../utils/spinner.js';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';

// ---------------------------------------------------------------------------
// Plugin Marketplace Add Command
// lunor plugin marketplace add mrgoonie/claudekit-skills
// ---------------------------------------------------------------------------

export async function pluginMarketplaceAddCommand(repoFullName: string): Promise<void> {
  prompts.intro('Plugin Marketplace — Add Repository');

  // Parse owner/repo
  const parts = repoFullName.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    logger.error(`Invalid repository format: ${pc.cyan(repoFullName)}`);
    logger.info('Expected format: owner/repo  (e.g. mrgoonie/claudekit-skills)');
    return;
  }

  const [owner, repoName] = parts;
  const registry = getPluginRegistry();
  const installer = getMarketplaceInstaller();

  const localPath = registry.getRepoLocalPath(repoFullName);

  const isAlreadyAdded = await registry.isAdded(repoFullName);
  if (isAlreadyAdded && existsSync(join(localPath, '.git'))) {
    logger.warning(`Repository already added: ${pc.cyan(repoFullName)}`);
    const shouldRefresh = await prompts.confirm('Pull latest changes?', true);
    if (!shouldRefresh) {
      await showCategories(repoFullName, localPath, installer);
      return;
    }
  }

  const spinner = createSpinner(`Cloning ${pc.cyan(repoFullName)}...`).start();

  const repo: MarketplaceRepo = {
    owner,
    repo: repoName,
    fullName: repoFullName,
    alias: repoName,
    localPath,
    addedAt: new Date().toISOString(),
  };

  try {
    await installer.cloneRepo(repo);
    const categories = await installer.discoverCategories(localPath);

    const updatedRepo: MarketplaceRepo = { ...repo, availableCategories: categories };
    await registry.addRepo(updatedRepo);

    spinner.succeed(`Added: ${pc.cyan(repoFullName)}`);

    // Show available categories
    console.log();
    logger.info(`Available plugin categories (${pc.yellow(String(categories.length))} total):`);
    console.log();

    for (const cat of categories) {
      const desc = PLUGIN_CATEGORY_DESCRIPTIONS[cat] ?? cat;
      console.log(`  ${pc.cyan(cat.padEnd(24))}  ${pc.dim(desc)}`);
    }

    console.log();
    logger.success('Install a plugin with:');
    console.log(pc.dim(`  lunor plugin install <category>@${repoName}`));
    console.log(pc.dim(`  e.g. lunor plugin install ai-ml-tools@${repoName}`));
  } catch (error) {
    spinner.fail(`Failed to add ${repoFullName}`);
    logger.error(error instanceof Error ? error.message : String(error));
  }
}

async function showCategories(
  repoFullName: string,
  localPath: string,
  installer: ReturnType<typeof getMarketplaceInstaller>
): Promise<void> {
  const categories = await installer.discoverCategories(localPath);
  const repoName = repoFullName.split('/')[1] ?? repoFullName;

  console.log();
  logger.info(`Available plugin categories for ${pc.cyan(repoFullName)}:`);
  console.log();
  for (const cat of categories) {
    const desc = PLUGIN_CATEGORY_DESCRIPTIONS[cat] ?? cat;
    console.log(`  ${pc.cyan(cat.padEnd(24))}  ${pc.dim(desc)}`);
  }
  console.log();
  logger.info('Install with:');
  console.log(pc.dim(`  lunor plugin install <category>@${repoName}`));
}
