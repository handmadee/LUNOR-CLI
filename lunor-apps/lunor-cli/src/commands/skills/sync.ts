import pc from 'picocolors';
import { getSkillManager } from '../../lib/skills/index.js';
import type { InstalledSkill } from '../../lib/skills/types.js';
import { SkillInstaller } from '../../lib/skills/skill-installer.js';
import { AGENT_TARGETS, SkillLoader, SkillRenderer, type AgentTarget } from '../../lib/agent-skills/index.js';
import { createSpinner } from '../../utils/spinner.js';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';

/**
 * Sync (copy) installed skills to current project
 * 
 * This command copies skill files from ~/.config/lunor/skills/
 * to the current project directory, maintaining the source structure.
 * 
 * Usage:
 *   lunor skills sync              # Interactive selection
 *   lunor skills sync engineering  # Sync specific skill
 *   lunor skills sync --all        # Sync all installed skills
 *   lunor skills sync --force      # Overwrite existing files
 */
export async function skillsSyncCommand(
  skillName?: string,
  options: { all?: boolean; force?: boolean; target?: AgentTarget | 'all' } = {}
): Promise<void> {
  prompts.intro('Sync Skills to Project');

  if (options.target) {
    await syncCanonicalSkills(skillName, options.target);
    return;
  }

  const manager = getSkillManager();
  const installedSkills = manager.list();

  if (installedSkills.length === 0) {
    logger.warning('No skills installed');
    logger.info('Run: lunor skills init');
    return;
  }

  // Sync all skills
  if (options.all) {
    await syncAllSkills(installedSkills, options.force || false);
    return;
  }

  // Sync specific skill
  if (skillName) {
    const skill = installedSkills.find(s => s.name === skillName);
    if (!skill) {
      logger.error(`Skill not found: ${skillName}`);
      logger.info('Available skills:');
      for (const s of installedSkills) {
        console.log(`  ${pc.cyan(s.name.padEnd(20))} ${pc.dim(s.displayName)}`);
      }
      return;
    }

    await syncSkillToProject(skill, options.force || false);
    return;
  }

  // Interactive selection
  const selectedSkill = await selectSkillToSync(installedSkills);
  if (!selectedSkill) {
    logger.info('Cancelled');
    return;
  }

  await syncSkillToProject(selectedSkill, options.force || false);
}

async function syncCanonicalSkills(skillName: string | undefined, target: AgentTarget | 'all'): Promise<void> {
  if (target !== 'all' && !AGENT_TARGETS.includes(target)) {
    throw new Error(`Unsupported target: ${target}. Supported: ${AGENT_TARGETS.join(', ')}, all`);
  }

  const loaded = await new SkillLoader().loadAll();
  const skills = skillName ? loaded.filter(skill => skill.manifest.id === skillName) : loaded;

  if (skills.length === 0) {
    logger.warning(skillName ? `No canonical skill found: ${skillName}` : 'No canonical skills found');
    logger.info('Run: lunor skills validate');
    return;
  }

  const targets = target === 'all' ? [...AGENT_TARGETS] : [target];
  const renderer = new SkillRenderer();

  for (const targetName of targets) {
    const spinner = createSpinner(`Rendering canonical skills for ${targetName}...`).start();
    const result = await renderer.render(targetName, skills);
    spinner.succeed(`Rendered ${result.filesWritten.length} files for ${targetName}`);

    if (result.skippedSkills.length > 0) {
      logger.warning(`Skipped incompatible skills: ${result.skippedSkills.join(', ')}`);
    }
  }
}

/**
 * Interactive skill selection
 */
async function selectSkillToSync(skills: InstalledSkill[]): Promise<InstalledSkill | null> {
  const options = skills.map(skill => ({
    value: skill.name,
    label: skill.displayName,
    hint: pc.dim(skill.path),
  }));

  const selected = await prompts.select('Select skill to sync:', options);
  if (!selected) return null;

  return skills.find(s => s.name === selected) ?? null;
}

/**
 * Sync all installed skills
 */
async function syncAllSkills(skills: InstalledSkill[], force: boolean): Promise<void> {
  let successCount = 0;
  let failCount = 0;

  for (const skill of skills) {
    try {
      await syncSkillToProject(skill, force, true);
      successCount++;
    } catch (error) {
      logger.error(`Failed to sync ${skill.displayName}: ${error instanceof Error ? error.message : String(error)}`);
      failCount++;
    }
  }

  console.log();
  logger.divider();
  
  const parts = [
    successCount > 0 && pc.green(`${successCount} synced`),
    failCount > 0 && pc.red(`${failCount} failed`),
  ].filter(Boolean);

  console.log(`[i] ${parts.join(' • ')}`);
}

/**
 * Sync a single skill to project
 */
async function syncSkillToProject(
  skill: InstalledSkill,
  force: boolean,
  silent = false
): Promise<void> {
  const displayName = skill.displayName || skill.name;
  const spinner = createSpinner(`Syncing ${displayName}...`).start();

  try {
    const installer = new SkillInstaller();
    
    const result = await installer.installToProject({
      skill,
      targetDir: process.cwd(),
      overwrite: force,
      onProgress: (file) => {
        if (!silent) {
          spinner.text = `Syncing: ${file.substring(0, 40)}...`;
        }
      },
    });

    spinner.succeed(`Synced ${result.filesCopied} files from ${displayName}`);

    if (!silent) {
      if (result.filesSkipped > 0) {
        console.log(pc.dim(`  Skipped ${result.filesSkipped} existing files`));
        logger.info('Use --force to overwrite existing files');
      }

      console.log();
      logger.success('Files synced to project successfully');
      logger.info(`  Location: ${pc.cyan(result.targetDir)}`);
      
      // Show sample files
      if (result.copiedFiles.length > 0) {
        logger.info('Sample files:');
        result.copiedFiles.slice(0, 5).forEach(file => {
          console.log(pc.dim(`  → ${file}`));
        });
        if (result.copiedFiles.length > 5) {
          console.log(pc.dim(`  ... and ${result.copiedFiles.length - 5} more`));
        }
      }
    }
  } catch (error) {
    spinner.fail(`Failed to sync ${displayName}`);
    throw error;
  }
}
