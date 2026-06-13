import pc from 'picocolors';
import { getPluginRegistry } from '../../lib/plugin/plugin-registry.js';
import { getMarketplaceInstaller } from '../../lib/plugin/marketplace-installer.js';
import { PLUGIN_CATEGORY_DESCRIPTIONS } from '../../lib/plugin/types.js';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';

// ---------------------------------------------------------------------------
// Plugin List Command
// lunor plugin list
// ---------------------------------------------------------------------------

export async function pluginListCommand(): Promise<void> {
  prompts.intro('Plugin Marketplace — Installed Repositories');

  const registry = getPluginRegistry();
  const installer = getMarketplaceInstaller();
  const repos = await registry.getRepos();

  if (repos.length === 0) {
    logger.info('No marketplace repositories added yet.');
    console.log();
    logger.info('Get started with:');
    console.log(pc.dim('  lunor plugin marketplace add mrgoonie/claudekit-skills'));
    return;
  }

  console.log();
  logger.info(`${pc.yellow(String(repos.length))} repository(ies) in marketplace:`);
  console.log();

  for (const repo of repos) {
    console.log(`  ${pc.cyan('◆')} ${pc.bold(repo.fullName)}`);
    console.log(`    ${pc.dim(`alias: ${repo.alias}  |  added: ${new Date(repo.addedAt).toLocaleDateString()}`)}`);

    // Get live categories from disk
    const categories = repo.availableCategories?.length
      ? repo.availableCategories
      : await installer.discoverCategories(repo.localPath);

    if (categories.length > 0) {
      console.log(`    ${pc.dim('Categories:')}`);
      for (const cat of categories) {
        const desc = PLUGIN_CATEGORY_DESCRIPTIONS[cat] ?? '';
        console.log(`      ${pc.green('•')} ${cat.padEnd(24)} ${pc.dim(desc)}`);
      }
    } else {
      console.log(`    ${pc.dim('(no categories discovered — repo may not be cloned)')}`);
    }

    console.log();
  }

  logger.info('Install a plugin with:');
  console.log(pc.dim('  lunor plugin install <category>@<repo-alias>'));
  console.log(pc.dim('  e.g. lunor plugin install ai-ml-tools@claudekit-skills'));
}
