import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AGENT_SKILLS_DIR } from './paths.js';
import { AGENT_SKILL_CATEGORIES, type AgentSkillCategory, type AgentSkillManifest, type LoadedAgentSkill } from './types.js';

export class SkillLoader {
  constructor(private readonly projectRoot = process.cwd()) {}

  async loadAll(): Promise<LoadedAgentSkill[]> {
    const skillsRoot = join(this.projectRoot, AGENT_SKILLS_DIR);
    if (!existsSync(skillsRoot)) return [];

    const loaded: LoadedAgentSkill[] = [];
    for (const category of AGENT_SKILL_CATEGORIES) {
      const categoryDir = join(skillsRoot, category);
      if (!existsSync(categoryDir)) continue;
      const entries = await readdir(categoryDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const skill = await this.loadFromPath(join(categoryDir, entry.name), category);
        if (skill) loaded.push(skill);
      }
    }

    return loaded.sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));
  }

  async loadById(skillId: string): Promise<LoadedAgentSkill | undefined> {
    const skills = await this.loadAll();
    return skills.find(skill => skill.manifest.id === skillId);
  }

  private async loadFromPath(skillPath: string, category: AgentSkillCategory): Promise<LoadedAgentSkill | undefined> {
    const manifestPath = join(skillPath, 'manifest.json');
    if (!existsSync(manifestPath)) return undefined;
    const raw = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as AgentSkillManifest;
    const entryPath = join(skillPath, manifest.entry || 'SKILL.md');
    const readmePath = join(skillPath, 'README.md');

    return {
      manifest: { ...manifest, category },
      rootDir: this.projectRoot,
      skillPath,
      entryPath,
      readmePath: existsSync(readmePath) ? readmePath : undefined,
    };
  }
}
