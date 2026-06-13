import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { MarketplaceRepo } from './types.js';

/**
 * MarketplaceInstaller — clones and installs plugin repos/categories
 *
 * Handles:
 * 1. Cloning a GitHub repo to ~/.config/lunor/plugins/<owner>/<repo>/
 * 2. Discovering available plugin categories (`.claude-plugin/` or plugins/ dir)
 * 3. Installing specific category to project's .claude/skills/ (or .agent/skills/)
 *
 * SOLID:
 * - Single Responsibility: only handles file system operations for plugins
 * - Open/Closed: extensible for new IDE targets
 */
export class MarketplaceInstaller {
  /**
   * Clone a marketplace repo from GitHub.
   * Uses --depth 1 for speed. Returns the local path.
   */
  async cloneRepo(repo: MarketplaceRepo): Promise<string> {
    const url = `https://github.com/${repo.fullName}.git`;
    const targetDir = repo.localPath;

    // Already cloned — pull latest instead
    if (existsSync(join(targetDir, '.git'))) {
      execSync('git pull --ff-only', {
        cwd: targetDir,
        stdio: 'pipe',
        timeout: 60_000,
      });
      return targetDir;
    }

    await mkdir(targetDir, { recursive: true });

    execSync(`git clone --depth 1 --single-branch -b main "${url}" "${targetDir}"`, {
      stdio: 'pipe',
      timeout: 120_000,
    });

    return targetDir;
  }

  /**
   * Discover available plugin categories by reading `.claude-plugin/` directory
   * or falling back to the `plugins/` directory structure in the cloned repo.
   *
   * claudekit-skills structure:
   *   .claude-plugin/
   *     ai-ml-tools/       ← plugin config
   *     web-dev-tools/
   *     ...
   */
  async discoverCategories(localPath: string): Promise<string[]> {
    // Primary: .claude-plugin/ folder
    const claudePluginDir = join(localPath, '.claude-plugin');
    if (existsSync(claudePluginDir)) {
      return this.listSubdirs(claudePluginDir);
    }

    // Fallback: plugins/ folder
    const pluginsDir = join(localPath, 'plugins');
    if (existsSync(pluginsDir)) {
      return this.listSubdirs(pluginsDir);
    }

    return [];
  }

  /**
   * Discover skills belonging to a plugin category.
   *
   * claudekit-skills stores the actual skill files in `.claude/skills/`.
   * The `.claude-plugin/<category>/` folder contains a config listing which skills
   * belong to this category. We read plugin.json or list symlinks to discover them.
   *
   * Returns list of skill folder names under `.claude/skills/` for this category.
   */
  async getCategorySkills(localPath: string, category: string): Promise<string[]> {
    // Try to read plugin.json to get skills list
    const pluginJsonPath = join(localPath, '.claude-plugin', category, 'plugin.json');
    if (existsSync(pluginJsonPath)) {
      try {
        const { readFile } = await import('node:fs/promises');
        const raw = await readFile(pluginJsonPath, 'utf-8');
        const config = JSON.parse(raw) as { skills?: string[] };
        if (Array.isArray(config.skills) && config.skills.length > 0) {
          return config.skills;
        }
      } catch {
        // fall through
      }
    }

    // Fallback: list symlinks inside .claude-plugin/<category>/skills/
    const symlinkDir = join(localPath, '.claude-plugin', category, 'skills');
    if (existsSync(symlinkDir)) {
      return this.listSubdirs(symlinkDir);
    }

    // Last resort: directly read the .claude/skills/ dir and return all
    const claudeSkillsDir = join(localPath, '.claude', 'skills');
    if (existsSync(claudeSkillsDir)) {
      return this.listSubdirs(claudeSkillsDir);
    }

    return [];
  }

  /**
   * Install a specific plugin category into the project.
   *
   * Copies skill folders from:
   *   <localPath>/.claude/skills/<skillName>/
   * into:
   *   <targetProjectDir>/.claude/skills/<skillName>/   (Claude IDE)
   *   OR <targetProjectDir>/.agent/skills/<skillName>/ (Antigravity IDE)
   */
  async installCategory(
    localPath: string,
    category: string,
    targetProjectDir: string,
    ideFolder: string = '.claude',
    overwrite: boolean = false
  ): Promise<{ installedSkills: string[]; skippedSkills: string[] }> {
    const skillNames = await this.getCategorySkills(localPath, category);
    const claudeSkillsSource = join(localPath, '.claude', 'skills');
    const targetSkillsDir = join(targetProjectDir, ideFolder, 'skills');

    await mkdir(targetSkillsDir, { recursive: true });

    const installedSkills: string[] = [];
    const skippedSkills: string[] = [];

    for (const skillName of skillNames) {
      const sourcePath = join(claudeSkillsSource, skillName);
      const targetPath = join(targetSkillsDir, skillName);

      if (!existsSync(sourcePath)) continue;

      if (existsSync(targetPath) && !overwrite) {
        skippedSkills.push(skillName);
        continue;
      }

      await cp(sourcePath, targetPath, { recursive: true, force: overwrite });
      installedSkills.push(skillName);
    }

    return { installedSkills, skippedSkills };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async listSubdirs(dir: string): Promise<string[]> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory() || e.isSymbolicLink())
        .map(e => e.name)
        .filter(name => !name.startsWith('.'));
    } catch {
      return [];
    }
  }
}

let defaultInstaller: MarketplaceInstaller | null = null;

export function getMarketplaceInstaller(): MarketplaceInstaller {
  if (!defaultInstaller) {
    defaultInstaller = new MarketplaceInstaller();
  }
  return defaultInstaller;
}
