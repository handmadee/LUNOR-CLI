import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from '../../constants/paths.js';
import type {
  ISkillRegistry,
  SkillManifest,
  InstalledSkill,
  InstalledSkillRecord,
  SourceType,
} from './types.js';
import { SKILL_SOURCES } from './skill-sources.js';
import { getStrategy } from './strategies/index.js';

const MANIFEST_VERSION = '1.0.0';
const MANIFEST_FILENAME = 'skills-manifest.json';

export class SkillRegistry implements ISkillRegistry {
  private readonly skillsDir: string;
  private readonly manifestPath: string;

  constructor(baseDir?: string) {
    this.skillsDir = baseDir ?? PATHS.skillsDir;
    this.manifestPath = join(this.skillsDir, MANIFEST_FILENAME);
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!existsSync(this.skillsDir)) {
      mkdirSync(this.skillsDir, { recursive: true, mode: 0o755 });
    }
  }

  getSkillsDir(): string {
    return this.skillsDir;
  }

  getSkillPath(name: string): string {
    const source = SKILL_SOURCES[name];
    if (!source) {
      throw new Error(`Unknown skill source: ${name}`);
    }
    return join(this.skillsDir, source.name);
  }

  isInstalled(name: string): boolean {
    try {
      const skillPath = this.getSkillPath(name);
      return existsSync(skillPath) && this.isValidInstallation(skillPath);
    } catch {
      return false;
    }
  }

  private isValidInstallation(skillPath: string): boolean {
    if (!existsSync(skillPath)) return false;

    const entries = readdirSync(skillPath);
    const hasContent = entries.length > 0;
    const hasClaudeDir = entries.includes('.claude') || entries.includes('CLAUDE.md');
    
    return hasContent && hasClaudeDir;
  }

  getInstalledSkills(): InstalledSkill[] {
    const manifest = this.getManifest();
    const installed: InstalledSkill[] = [];

    for (const [name, source] of Object.entries(SKILL_SOURCES)) {
      const skillPath = join(this.skillsDir, source.name);
      
      if (!existsSync(skillPath)) continue;

      const record = manifest?.skills.find(s => s.name === name);
      const strategy = getStrategy(source.type);

      installed.push({
        name,
        displayName: source.displayName,
        type: source.type,
        path: skillPath,
        version: strategy.getVersion(skillPath),
        installedAt: record?.installedAt ?? new Date().toISOString(),
        updatedAt: record?.updatedAt,
      });
    }

    return installed;
  }

  getManifest(): SkillManifest | null {
    if (!existsSync(this.manifestPath)) {
      return null;
    }

    try {
      const content = readFileSync(this.manifestPath, 'utf-8');
      return JSON.parse(content) as SkillManifest;
    } catch {
      return null;
    }
  }

  saveManifest(manifest: SkillManifest): void {
    const content = JSON.stringify(manifest, null, 2);
    writeFileSync(this.manifestPath, content, 'utf-8');
  }

  private getOrCreateManifest(): SkillManifest {
    const existing = this.getManifest();
    if (existing) return existing;

    return {
      version: MANIFEST_VERSION,
      skills: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  recordInstall(name: string, type: SourceType, commit?: string): void {
    const manifest = this.getOrCreateManifest();
    
    const existingIndex = manifest.skills.findIndex(s => s.name === name);
    const record: InstalledSkillRecord = {
      name,
      type,
      installedAt: new Date().toISOString(),
      commit,
    };

    const updatedSkills = existingIndex >= 0
      ? manifest.skills.map((s, i) => i === existingIndex ? record : s)
      : [...manifest.skills, record];

    this.saveManifest({
      ...manifest,
      skills: updatedSkills,
      lastUpdated: new Date().toISOString(),
    });
  }

  recordUpdate(name: string, commit?: string): void {
    const manifest = this.getOrCreateManifest();
    
    const updatedSkills = manifest.skills.map(s => 
      s.name === name 
        ? { ...s, updatedAt: new Date().toISOString(), commit } 
        : s
    );

    this.saveManifest({
      ...manifest,
      skills: updatedSkills,
      lastUpdated: new Date().toISOString(),
    });
  }

  removeRecord(name: string): void {
    const manifest = this.getOrCreateManifest();
    
    this.saveManifest({
      ...manifest,
      skills: manifest.skills.filter(s => s.name !== name),
      lastUpdated: new Date().toISOString(),
    });
  }

  getSkillRecord(name: string): InstalledSkillRecord | undefined {
    const manifest = this.getManifest();
    return manifest?.skills.find(s => s.name === name);
  }
}
