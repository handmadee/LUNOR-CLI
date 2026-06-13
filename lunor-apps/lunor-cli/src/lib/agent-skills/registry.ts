import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AGENT_REGISTRY_DIR } from './paths.js';
import { TARGET_ADAPTERS } from './target-adapters.js';
import type { LoadedAgentSkill } from './types.js';

export class SkillRegistryWriter {
  constructor(private readonly projectRoot = process.cwd()) {}

  async writeCatalog(skills: LoadedAgentSkill[]): Promise<string> {
    const registryDir = join(this.projectRoot, AGENT_REGISTRY_DIR);
    await mkdir(registryDir, { recursive: true });
    const path = join(registryDir, 'skills.catalog.json');
    await writeFile(path, `${JSON.stringify({
      schemaVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      skills: skills.map(skill => ({
        id: skill.manifest.id,
        name: skill.manifest.name,
        category: skill.manifest.category,
        version: skill.manifest.version,
        dependsOn: skill.manifest.dependsOn,
        compatibleTargets: skill.manifest.compatibleTargets,
      })),
    }, null, 2)}\n`, 'utf-8');
    return path;
  }

  async writeTargetsCatalog(): Promise<string> {
    const registryDir = join(this.projectRoot, AGENT_REGISTRY_DIR);
    await mkdir(registryDir, { recursive: true });
    const path = join(registryDir, 'targets.catalog.json');
    await writeFile(path, `${JSON.stringify({ schemaVersion: '1.0.0', targets: Object.values(TARGET_ADAPTERS) }, null, 2)}\n`, 'utf-8');
    return path;
  }
}
