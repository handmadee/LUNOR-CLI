import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { AGENT_SKILL_CATEGORIES, AGENT_TARGETS, type LoadedAgentSkill, type ValidationIssue, type ValidationResult } from './types.js';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class SkillValidator {
  async validateAll(skills: LoadedAgentSkill[]): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const ids = new Set<string>();
    for (const skill of skills) {
      issues.push(...await this.validateSkill(skill));
      if (ids.has(skill.manifest.id)) {
        issues.push({ severity: 'error', skillId: skill.manifest.id, message: `Duplicate skill id: ${skill.manifest.id}` });
      }
      ids.add(skill.manifest.id);
    }
    for (const skill of skills) {
      for (const dependency of skill.manifest.dependsOn) {
        if (!ids.has(dependency)) {
          issues.push({ severity: 'error', skillId: skill.manifest.id, message: `Missing dependency: ${dependency}` });
        }
      }
    }
    return { valid: issues.every(issue => issue.severity !== 'error'), issues };
  }

  async validateSkill(skill: LoadedAgentSkill): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const { manifest } = skill;
    if (!KEBAB_CASE.test(manifest.id)) {
      issues.push({ severity: 'error', skillId: manifest.id, message: 'Skill id must be lower-kebab-case' });
    }
    if (basename(skill.skillPath) !== manifest.id) {
      issues.push({ severity: 'warning', skillId: manifest.id, message: 'Skill folder name should match manifest id' });
    }
    if (!AGENT_SKILL_CATEGORIES.includes(manifest.category)) {
      issues.push({ severity: 'error', skillId: manifest.id, message: `Unsupported category: ${manifest.category}` });
    }
    if (!existsSync(skill.entryPath)) {
      issues.push({ severity: 'error', skillId: manifest.id, file: manifest.entry, message: 'Missing SKILL.md entry file' });
      return issues;
    }
    const skillText = await readFile(skill.entryPath, 'utf-8');
    if (!skillText.startsWith('---')) {
      issues.push({ severity: 'error', skillId: manifest.id, file: manifest.entry, message: 'SKILL.md must start with YAML frontmatter' });
    }
    if (!skillText.includes('description:')) {
      issues.push({ severity: 'error', skillId: manifest.id, file: manifest.entry, message: 'SKILL.md frontmatter must include description' });
    }
    for (const target of manifest.compatibleTargets) {
      if (!AGENT_TARGETS.includes(target)) {
        issues.push({ severity: 'error', skillId: manifest.id, message: `Unsupported target: ${target}` });
      }
    }
    if (manifest.permissions.shell.length > 0 && !manifest.trust.reviewRequired) {
      issues.push({ severity: 'warning', skillId: manifest.id, message: 'Shell permissions should require review' });
    }
    return issues;
  }
}
