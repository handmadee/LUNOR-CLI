import pc from 'picocolors';
import { getPluginRegistry } from '../../lib/plugin/plugin-registry.js';
import { getMarketplaceInstaller } from '../../lib/plugin/marketplace-installer.js';
import { PLUGIN_CATEGORY_DESCRIPTIONS } from '../../lib/plugin/types.js';
import type { PluginInstallSpec } from '../../lib/plugin/types.js';
import { createSpinner } from '../../utils/spinner.js';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';
import { IDE_TYPES, getIDETypeDescription } from '../../lib/skills/index.js';
import type { IDEType } from '../../lib/skills/types.js';

// ---------------------------------------------------------------------------
// Plugin Install Command
// lunor plugin install ai-ml-tools@claudekit-skills
// ---------------------------------------------------------------------------

interface InstallOptions {
  yes?: boolean;
  ide?: string;
  overwrite?: boolean;
}

export async function pluginInstallCommand(spec: string, options: InstallOptions = {}): Promise<void> {
  prompts.intro('Plugin Install');

  // Parse "category@repo-alias"
  const parsed = parsePluginSpec(spec);
  if (!parsed) {
    logger.error(`Invalid plugin spec: ${pc.cyan(spec)}`);
    logger.info('Expected format: category@repo-alias  (e.g. ai-ml-tools@claudekit-skills)');
    return;
  }

  const { category, repoAlias } = parsed;
  const registry = getPluginRegistry();
  const installer = getMarketplaceInstaller();

  // Lookup repo by alias
  const repo = await registry.findRepo(repoAlias);
  if (!repo) {
    logger.error(`Repository not found: ${pc.cyan(repoAlias)}`);
    logger.info(`Add it first with: ${pc.dim(`lunor plugin marketplace add <owner>/${repoAlias}`)}`);
    return;
  }

  // Validate category exists
  const categories = await installer.discoverCategories(repo.localPath);
  if (categories.length > 0 && !categories.includes(category)) {
    logger.error(`Category not found: ${pc.cyan(category)}`);
    console.log();
    logger.info('Available categories:');
    for (const cat of categories) {
      const desc = PLUGIN_CATEGORY_DESCRIPTIONS[cat] ?? '';
      console.log(`  ${pc.cyan(cat.padEnd(24))} ${pc.dim(desc)}`);
    }
    return;
  }

  // Prompt for IDE type (which folder to install into)
  let ideType: IDEType = (options.ide as IDEType) ?? 'claude';
  if (!options.ide && !options.yes) {
    const ideOptions = IDE_TYPES.map(type => ({
      value: type,
      label: getIDETypeDescription(type),
    }));
    const selected = await prompts.select('Select IDE target:', ideOptions);
    if (!selected) {
      logger.info('Cancelled');
      return;
    }
    ideType = selected as IDEType;
  }

  // Map IDE type to folder name
  const ideFolderMap: Record<IDEType, string> = {
    claude: '.claude',
    cursor: '.cursor',
    opencode: '.opencode',
    antigravity: '.agent',
    all: '.claude',
  };
  const ideFolder = ideFolderMap[ideType] ?? '.claude';

  const projectDir = process.cwd();
  const categoryDesc = PLUGIN_CATEGORY_DESCRIPTIONS[category] ?? category;

  const spinner = createSpinner(`Installing ${pc.cyan(category)} (${categoryDesc})...`).start();

  try {
    const result = await installer.installCategory(
      repo.localPath,
      category,
      projectDir,
      ideFolder,
      options.overwrite ?? false
    );

    if (result.installedSkills.length === 0 && result.skippedSkills.length === 0) {
      spinner.fail(`No skills found for category: ${category}`);
      logger.info(`The repo may use a different structure. Try: ${pc.dim('lunor skills init claudekit-skills')}`);
      return;
    }

    spinner.succeed(
      `Installed ${pc.green(String(result.installedSkills.length))} skills` +
      (result.skippedSkills.length > 0 ? ` (${result.skippedSkills.length} skipped)` : '')
    );

    // Summary
    if (result.installedSkills.length > 0) {
      console.log();
      logger.info('Installed skills:');
      for (const skill of result.installedSkills) {
        console.log(`  ${pc.green('+')} ${skill}`);
      }
    }

    if (result.skippedSkills.length > 0) {
      console.log();
      logger.info('Skipped (already exist — use --overwrite to replace):');
      for (const skill of result.skippedSkills) {
        console.log(`  ${pc.yellow('~')} ${skill}`);
      }
    }

    // For "all" IDE type, also copy to other IDE folders
    if (ideType === 'all') {
    const otherFolders = ['.cursor', '.opencode', '.agent', '.windsurf', '.github', '.kiro', '.roo', '.gemini', '.codebuddy', '.trae', '.continue', '.droid'];
      for (const folder of otherFolders) {
        const extra = await installer.installCategory(repo.localPath, category, projectDir, folder, options.overwrite ?? false);
        if (extra.installedSkills.length > 0) {
          console.log(`  ${pc.dim(`→ also copied to ${folder}/skills/`)}`);
        }
      }
    }

    console.log();
    logger.success(`Plugin ${pc.cyan(spec)} installed successfully`);
    logger.info(`  Location: ${pc.cyan(`${projectDir}/${ideFolder}/skills/`)}`);
  } catch (error) {
    spinner.fail(`Failed to install ${spec}`);
    logger.error(error instanceof Error ? error.message : String(error));
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePluginSpec(spec: string): PluginInstallSpec | null {
  const atIndex = spec.lastIndexOf('@');
  if (atIndex <= 0) return null;

  const category = spec.slice(0, atIndex).trim();
  const repoAlias = spec.slice(atIndex + 1).trim();

  if (!category || !repoAlias) return null;

  return { category, repoAlias };
}
