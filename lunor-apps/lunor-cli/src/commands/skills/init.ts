import pc from 'picocolors';
import { rmSync, existsSync } from 'node:fs';
import { copyFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  getSkillManager,
  getSourceConfig,
  getSourceNames,
  SKILL_SOURCES,
  hasIdeSelection,
  hasAiSelection,
  getRootFiles,
  getPluginCategories,
  hasPluginCategories,
  getSkillsRootDir,
  getDefaultTargetFolder,
  IDE_TYPES,
  AI_TYPES,
  IDE_FOLDERS,
  AI_FOLDERS,
  getIDETypeDescription,
  getAITypeDescription,
} from '../../lib/skills/index.js';
import type { IDEType, AIType } from '../../lib/skills/types.js';
import { migrateToCursor } from '../../lib/skills/cursor-migrator.js';
import { createSpinner } from '../../utils/spinner.js';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';

interface InitOptions {
  yes?: boolean;
  quiet?: boolean;
  ideType?: IDEType;
  aiType?: AIType;
  includeCoverage?: boolean;
}

// =============================================================================
// IDE/AI Selection Prompts
// =============================================================================

async function promptIDEType(): Promise<IDEType | null> {
  const options = IDE_TYPES.map(type => ({
    value: type,
    label: getIDETypeDescription(type),
  }));

  return prompts.select('Select IDE type:', options);
}

async function promptAIType(): Promise<AIType | null> {
  const options = AI_TYPES.map(type => ({
    value: type,
    label: getAITypeDescription(type),
  }));

  return prompts.select('Select AI assistant type:', options);
}

async function promptIncludeCoverage(): Promise<boolean> {
  return prompts.confirm('Include .coverage file?', false);
}

// =============================================================================
// Main Init Command
// =============================================================================

export async function skillsInitCommand(source?: string, options: InitOptions = {}): Promise<void> {
  prompts.intro('Initialize Skills');

  const manager = getSkillManager();
  const availableSources = getSourceNames();

  if (!source) {
    const selected = await selectSource(availableSources);
    if (!selected) {
      logger.info('Cancelled');
      return;
    }
    source = selected;
  }

  if (source === 'all') {
    await initAllSources(manager, availableSources, options);
    return;
  }

  if (!availableSources.includes(source)) {
    logger.error(`Unknown source: ${source}`);
    console.log();
    console.log(pc.dim('Available sources:'));
    for (const name of availableSources) {
      const cfg = SKILL_SOURCES[name];
      console.log(`  ${pc.cyan(name.padEnd(15))} ${pc.dim(cfg.displayName)}`);
    }
    console.log(`  ${pc.cyan('all'.padEnd(15))} ${pc.dim('Install all sources')}`);
    return;
  }

  await initSingleSource(manager, source, options);
}

async function selectSource(sources: string[]): Promise<string | null> {
  const installed = getSkillManager().list();
  const installedNames = new Set(installed.map(s => s.name));

  const options = sources.map(name => {
    const cfg = SKILL_SOURCES[name];
    const isInstalled = installedNames.has(name);
    const group = sourceGroupLabel(cfg.extended?.category);
    const stats = [
      cfg.extended?.stars && `${cfg.extended.stars} stars`,
      cfg.extended?.skillCount,
    ].filter(Boolean).join(' · ');
    return {
      value: name,
      label: `${group} ${cfg.displayName}`,
      hint: [
        isInstalled ? pc.green('installed') : pc.dim('not installed'),
        stats && pc.dim(stats),
      ].filter(Boolean).join(' · '),
    };
  });

  options.push({
    value: 'all',
    label: 'All Sources',
    hint: pc.dim('install everything'),
  });

  return prompts.select('Select source to initialize:', options);
}

function sourceGroupLabel(category?: string): string {
  const labels: Record<string, string> = {
    lunor: '[LUNOR]',
    official: '[OFFICIAL]',
    engineering: '[ENGINEERING]',
    security: '[SECURITY]',
    growth: '[GROWTH]',
    marketplace: '[MARKETPLACE]',
    orchestration: '[ORCHESTRATION]',
    reference: '[REFERENCE]',
  };
  return labels[category ?? ''] ?? '[SOURCE]';
}

async function initAllSources(
  manager: ReturnType<typeof getSkillManager>,
  sources: string[],
  options: InitOptions
): Promise<void> {
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const sourceName of sources) {
    const result = await initSingleSource(manager, sourceName, options, true);
    if (result === 'success') successCount++;
    else if (result === 'skip') skipCount++;
    else failCount++;
  }

  console.log();
  logger.divider();

  const parts = [
    successCount > 0 && pc.green(`${successCount} installed`),
    skipCount > 0 && pc.yellow(`${skipCount} skipped`),
    failCount > 0 && pc.red(`${failCount} failed`),
  ].filter(Boolean);

  console.log(`[i] ${parts.join(' • ')}`);
}

async function initSingleSource(
  manager: ReturnType<typeof getSkillManager>,
  sourceName: string,
  options: InitOptions,
  silent = false
): Promise<'success' | 'skip' | 'fail'> {
  const config = getSourceConfig(sourceName);
  if (!config) return 'fail';

  const status = manager.getSourceStatus(sourceName);

  if (status.installed) {
    if (!silent) {
      logger.warning(`Already installed: ${config.displayName}`);
      const shouldOverwrite = await confirmWithOptions('Overwrite existing installation?', false, options);

      if (!shouldOverwrite) {
        logger.info('Skipped');
        return 'skip';
      }

      const skillPath = manager.list().find(s => s.name === sourceName)?.path;
      if (skillPath) {
        rmSync(skillPath, { recursive: true, force: true });
      }
    } else {
      console.log(pc.dim(`  → Skipping ${config.displayName} (already installed)`));
      return 'skip';
    }
  }

  const spinner = createSpinner(`Installing ${config.displayName}...`).start();

  const result = await manager.init(sourceName);

  if (!result.success) {
    spinner.fail(`Failed: ${config.displayName}`);
    logger.error(result.error || 'Unknown error');
    return 'fail';
  }

  spinner.succeed(`Installed: ${config.displayName}`);

  if (config.description && !silent) {
    console.log(pc.dim(`  ${config.description}`));
  }

  if (!silent) {
    const shouldCopyToProject = await confirmWithOptions(
      'Copy skill files to current project?',
      true,
      options
    );

    if (shouldCopyToProject) {
      await copySkillToProject(sourceName, config.displayName, options);
    } else {
      console.log();
      logger.info('Skill files are available at:');
      const skill = manager.list().find(s => s.name === sourceName);
      if (skill) {
        console.log(pc.dim(`  ${skill.path}`));
      }
      logger.info('You can copy them later with: lunor skills copy');
    }
  }

  return 'success';
}

async function copySkillToProject(
  sourceName: string,
  displayName: string,
  options: InitOptions
): Promise<void> {
  const config = getSourceConfig(sourceName);
  if (!config) {
    logger.error(`Source config not found: ${sourceName}`);
    return;
  }

  // Resolve source root: local sources have config.path; GitHub sources
  // are cloned into the skill manager registry directory.
  let sourceRoot: string;
  if (config.type === 'local') {
    sourceRoot = config.path;
  } else {
    // GitHub source: use the installed skill path from manager
    const manager = getSkillManager();
    const installedSkill = manager.list().find(s => s.name === sourceName);
    if (!installedSkill) {
      logger.error(`Skill not installed in registry: ${sourceName}. Run lunor skills init first.`);
      return;
    }
    sourceRoot = installedSkill.path;
  }

  const projectRoot = process.cwd();

  // Prompt for IDE type if skill supports it
  let ideType: IDEType | undefined = options.ideType;
  if (!ideType && hasIdeSelection(sourceName) && !options.quiet) {
    const selected = await promptIDEType();
    if (!selected) {
      logger.info('Cancelled');
      return;
    }
    ideType = selected;
  }

  // Prompt for AI type if ui-ux skill
  let aiType: AIType | undefined = options.aiType;
  if (!aiType && hasAiSelection(sourceName) && !options.quiet) {
    const selected = await promptAIType();
    if (!selected) {
      logger.info('Cancelled');
      return;
    }
    aiType = selected;
  }

  // Prompt for plugin category if skill has categories (e.g. claudekit-skills)
  let selectedPluginCategory: string | undefined;
  if (!options.quiet && hasPluginCategories(sourceName)) {
    const categories = getPluginCategories(sourceName);
    const categoryOptions = [
      { value: '__all__', label: 'All skills (copy entire .claude/skills/)', hint: pc.dim('recommended') },
      ...categories.map(cat => ({ value: cat, label: cat, hint: pc.dim('single category') })),
    ];
    const selectedCat = await prompts.select('Select plugin categories to install:', categoryOptions);
    if (!selectedCat) {
      logger.info('Cancelled');
      return;
    }
    if (selectedCat !== '__all__') {
      selectedPluginCategory = selectedCat;
    }
  }

  // Prompt for .coverage if engineering skill
  let includeCoverage = options.includeCoverage;
  if (includeCoverage === undefined && hasIdeSelection(sourceName) && !hasPluginCategories(sourceName) && !options.quiet) {
    includeCoverage = await promptIncludeCoverage();
  }

  const spinner = createSpinner(`Copying ${displayName} to project...`).start();

  try {
    const copiedItems: string[] = [];

    // Get folders to copy based on IDE/AI selection
    let foldersToCopy: string[] = [];
    if (ideType) {
      foldersToCopy = IDE_FOLDERS[ideType];
    } else if (aiType) {
      foldersToCopy = aiType === 'all'
        ? ['.claude', '.cursor', '.windsurf', '.agent', '.github', '.kiro', '.roo', '.codex', '.gemini', '.codebuddy', '.trae', '.opencode', '.continue', '.droid', '.shared']
        : AI_FOLDERS[aiType];
    }

    // Deduplicate folders
    const uniqueFolders = [...new Set(foldersToCopy)];

    // Copy selected folders
    for (const folder of uniqueFolders) {
      const sourcePath = join(sourceRoot, folder);
      const targetPath = join(projectRoot, folder);

      // Cursor: migrate from .claude/ when .cursor/ doesn't exist in source
      if (folder === '.cursor' && !existsSync(sourcePath)) {
        const claudeSource = join(sourceRoot, '.claude');
        if (existsSync(claudeSource)) {
          spinner.text = 'Migrating .claude/ → .cursor/ ...';
          const result = await migrateToCursor(claudeSource, targetPath);
          if (result.errors.length > 0) {
            for (const err of result.errors) logger.error(`  ${err}`);
          }
          copiedItems.push(`.cursor (migrated: ${result.commands} commands, ${result.workflows} workflows, ${result.skills} skills)`);
        }
        continue;
      }

      // Plugin category filter: for sources with categories (e.g. claudekit-skills),
      // only copy the selected skill subfolder instead of the entire folder.
      if (selectedPluginCategory && folder === '.claude') {
        const skillsSourcePath = join(sourceRoot, '.claude', 'skills', selectedPluginCategory);
        const skillsTargetPath = join(projectRoot, folder, 'skills', selectedPluginCategory);

        if (existsSync(skillsSourcePath)) {
          spinner.text = `Copying .claude/skills/${selectedPluginCategory}...`;
          await mkdir(join(projectRoot, folder, 'skills'), { recursive: true });
          await cp(skillsSourcePath, skillsTargetPath, { recursive: true, force: options.yes ?? false });
          copiedItems.push(`${folder}/skills/${selectedPluginCategory}`);
        } else {
          logger.warning(`Category folder not found: .claude/skills/${selectedPluginCategory}`);
        }
        continue;
      }

      if (existsSync(sourcePath)) {
        spinner.text = `Copying ${folder}...`;
        await mkdir(targetPath, { recursive: true });
        await cp(sourcePath, targetPath, { recursive: true, force: options.yes ?? false });
        copiedItems.push(folder);
      }
    }

    // ── skillsRootDir: source stores skills at repo root (e.g. sickn33/antigravity-awesome-skills)
    // Copy <sourceRoot>/<skillsRootDir>/ → <projectRoot>/<ideFolder>/skills/
    const skillsRootDir = getSkillsRootDir(sourceName);
    if (skillsRootDir && uniqueFolders.length === 0) {
      // fallback: no IDE folder selected, copy to source-specific default or .agent/skills
      uniqueFolders.push(getDefaultTargetFolder(sourceName) ?? '.agent');
    }
    if (skillsRootDir) {
      const skillsSrcPath = join(sourceRoot, skillsRootDir);
      if (existsSync(skillsSrcPath)) {
        for (const folder of uniqueFolders) {
          const ideSkillsTarget = join(projectRoot, folder, 'skills');
          spinner.text = `Copying ${skillsRootDir}/ → ${folder}/skills/ ...`;
          await mkdir(ideSkillsTarget, { recursive: true });
          await cp(skillsSrcPath, ideSkillsTarget, { recursive: true, force: options.yes ?? false });
          copiedItems.push(`${folder}/skills (from ${skillsRootDir}/)`);
        }
      } else {
        logger.warning(`skillsRootDir '${skillsRootDir}' not found in ${sourceRoot}`);
      }
    }
    // Copy root files (CLAUDE.md, GEMINI.md, .gitignore, etc.)
    const rootFiles = getRootFiles(sourceName);
    for (const file of rootFiles) {
      // Skip .coverage unless explicitly included
      if (file === '.coverage' && !includeCoverage) continue;

      const sourcePath = join(sourceRoot, file);
      const targetPath = join(projectRoot, file);

      if (existsSync(sourcePath)) {
        // Special handling for .gitignore to merge instead of overwrite
        if (file === '.gitignore' && existsSync(targetPath)) {
          const shouldMergeGitignore = await confirmWithOptions('Merge .gitignore with template?', true, options);
          if (shouldMergeGitignore) {
            spinner.text = `Merging .gitignore...`;
            await mergeGitignore(sourcePath, targetPath);
            copiedItems.push(file);
          }
          continue;
        }

        // Check if target exists
        if (existsSync(targetPath) && !options.yes) {
          const shouldOverwrite = await confirmWithOptions(`${file} exists. Overwrite?`, false, options);
          if (!shouldOverwrite) {
            continue;
          }
        }
        spinner.text = `Copying ${file}...`;
        await copyFile(sourcePath, targetPath);
        copiedItems.push(file);
      }
    }

    spinner.succeed(`Copied ${copiedItems.length} items to project`);

    // Show summary
    console.log();
    logger.info('Copied items:');
    for (const item of copiedItems) {
      console.log(`  ${pc.green('+')} ${item}`);
    }

    console.log();
    logger.success('Skill files installed to project successfully');
    logger.info(`  Location: ${pc.cyan(projectRoot)}`);
  } catch (error) {
    spinner.fail('Failed to copy skill files');
    logger.error(error instanceof Error ? error.message : String(error));
  }
}


async function mergeGitignore(templatePath: string, targetPath: string): Promise<void> {
  try {
    const [templateContent, targetContent] = await Promise.all([
      readFile(templatePath, 'utf-8'),
      readFile(targetPath, 'utf-8'),
    ]);

    const merged = dedupeLines([...templateContent.split('\n'), ...targetContent.split('\n')]);
    const backupPath = `${targetPath}.bak`;
    await copyFile(targetPath, backupPath);
    await writeFile(targetPath, merged.join('\n'), 'utf-8');
    logger.success('Merged .gitignore');
    logger.info(`Backup created at ${backupPath}`);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
  }
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const key = line.trim();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }

  return result;
}

async function confirmWithOptions(message: string, defaultValue: boolean, options: InitOptions): Promise<boolean> {
  if (options.yes) return true;
  if (options.quiet) return false;
  return prompts.confirm(message, defaultValue);
}
