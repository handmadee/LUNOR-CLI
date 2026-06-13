import pc from 'picocolors';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { getSkillManager, getSourceConfig, getGitHubRepo, isLocalSource } from '../../lib/skills/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';

const execAsync = promisify(exec);

// =============================================================================
// Git Pull Helper
// =============================================================================

async function gitPullFromLocal(localPath: string): Promise<{ success: boolean; message: string }> {
  const gitDir = join(localPath, '.git');

  if (!existsSync(gitDir)) {
    return { success: false, message: 'Not a git repository' };
  }

  try {
    const { stdout, stderr } = await execAsync('git pull origin main', { cwd: localPath });
    const output = stdout || stderr;

    if (output.includes('Already up to date')) {
      return { success: true, message: 'Already up-to-date' };
    }

    return { success: true, message: 'Pulled latest changes' };
  } catch (error) {
    // Try other branches if main doesn't exist
    try {
      const { stdout, stderr } = await execAsync('git pull', { cwd: localPath });
      const output = stdout || stderr;

      if (output.includes('Already up to date')) {
        return { success: true, message: 'Already up-to-date' };
      }

      return { success: true, message: 'Pulled latest changes' };
    } catch (fallbackError) {
      return {
        success: false,
        message: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      };
    }
  }
}

// =============================================================================
// Update Command
// =============================================================================

export async function skillsUpdateCommand(source?: string): Promise<void> {
  prompts.intro('Update Skills');

  const manager = getSkillManager();
  const installed = manager.list();

  if (installed.length === 0) {
    logger.warning('No skills installed');
    console.log(pc.dim('Run: lunor skills init <source>'));
    return;
  }

  if (source) {
    await updateSingleSource(manager, source, installed);
    return;
  }

  // Update all sources (including local with git)
  await updateAllSources(manager, installed);
}

async function updateSingleSource(
  manager: ReturnType<typeof getSkillManager>,
  sourceName: string,
  installed: ReturnType<typeof getSkillManager>['list'] extends () => infer R ? R : never
): Promise<void> {
  const skill = installed.find(s => s.name === sourceName);

  if (!skill) {
    logger.error(`Source not installed: ${sourceName}`);
    console.log(pc.dim('Run: lunor skills list'));
    return;
  }

  const config = getSourceConfig(sourceName);
  const spinner = createSpinner(`Updating ${skill.displayName}...`).start();

  if (skill.type === 'local' && config && isLocalSource(config)) {
    // Use source config path for git operations (not installed path)
    const sourcePath = config.path;
    const gitDir = join(sourcePath, '.git');

    if (existsSync(gitDir)) {
      // Attempt git pull from source directory
      const pullResult = await gitPullFromLocal(sourcePath);

      if (pullResult.success) {
        spinner.succeed(`${skill.displayName}: ${pullResult.message}`);

        // Show GitHub repo URL if available
        const repoUrl = getGitHubRepo(sourceName);
        if (repoUrl) {
          console.log(pc.dim(`  Remote: ${repoUrl}`));
        }
        console.log(pc.dim(`  Path: ${sourcePath}`));
      } else {
        spinner.fail(`Failed to update ${skill.displayName}`);
        logger.error(pullResult.message);
      }
    } else {
      spinner.info(`${skill.displayName} (local, no git)`);
      console.log(pc.dim(`  Path: ${sourcePath}`));
      console.log(pc.dim('  Use: lunor skills init <source> --force to refresh'));
    }
    return;
  }

  // GitHub-based source
  const results = await manager.update(sourceName);
  const result = results.get(sourceName);

  if (!result) {
    spinner.fail('Update failed');
    return;
  }

  if (result.success) {
    if (result.updated) {
      spinner.succeed(
        `Updated: ${skill.displayName} (${result.previousVersion} → ${result.currentVersion})`
      );
    } else {
      spinner.succeed(`Already up-to-date: ${skill.displayName}`);
    }
  } else {
    spinner.fail(`Failed: ${skill.displayName}`);
    logger.error(result.error || 'Unknown error');
  }
}

async function updateAllSources(
  manager: ReturnType<typeof getSkillManager>,
  sources: ReturnType<typeof getSkillManager>['list'] extends () => infer R ? R : never
): Promise<void> {
  let updatedCount = 0;
  let upToDateCount = 0;
  let failCount = 0;

  for (const skill of sources) {
    const spinner = createSpinner(`Updating ${skill.displayName}...`).start();
    const config = getSourceConfig(skill.name);

    if (skill.type === 'local' && config && isLocalSource(config)) {
      // Use source config path for git operations (not installed path)
      const sourcePath = config.path;
      const gitDir = join(sourcePath, '.git');

      if (existsSync(gitDir)) {
        const pullResult = await gitPullFromLocal(sourcePath);

        if (pullResult.success) {
          if (pullResult.message === 'Already up-to-date') {
            spinner.succeed(`Already up-to-date: ${skill.displayName}`);
            upToDateCount++;
          } else {
            spinner.succeed(`Updated: ${skill.displayName}`);
            updatedCount++;
          }
          // Show source path
          console.log(pc.dim(`  Path: ${sourcePath}`));
        } else {
          spinner.fail(`Failed: ${skill.displayName}`);
          console.log(pc.dim(`  ${pullResult.message}`));
          failCount++;
        }
      } else {
        spinner.info(`${skill.displayName} (local, no git)`);
        upToDateCount++;
      }
      continue;
    }

    // GitHub-based source
    const results = await manager.update(skill.name);
    const result = results.get(skill.name);

    if (!result) {
      spinner.fail(`Failed: ${skill.displayName}`);
      failCount++;
      continue;
    }

    if (result.success) {
      if (result.updated) {
        spinner.succeed(
          `Updated: ${skill.displayName} (${result.previousVersion} → ${result.currentVersion})`
        );
        updatedCount++;
      } else {
        spinner.succeed(`Already up-to-date: ${skill.displayName}`);
        upToDateCount++;
      }
    } else {
      spinner.fail(`Failed: ${skill.displayName}`);
      if (result.error) {
        console.log(pc.dim(`  ${result.error}`));
      }
      failCount++;
    }
  }

  console.log();
  console.log(pc.dim('─'.repeat(50)));
  
  const summary = [
    updatedCount > 0 && pc.green(`${updatedCount} updated`),
    upToDateCount > 0 && pc.blue(`${upToDateCount} up-to-date`),
    failCount > 0 && pc.red(`${failCount} failed`),
  ].filter(Boolean).join(', ');

  console.log(`[i] ${summary}`);
}

