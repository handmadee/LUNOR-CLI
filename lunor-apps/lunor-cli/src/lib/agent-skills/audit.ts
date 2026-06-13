import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { PermissionPolicy } from './permission-policy.js';
import type { AuditFinding, LoadedAgentSkill } from './types.js';

const SUSPICIOUS_PATTERNS = [
  { pattern: /rm\s+-rf/, message: 'Destructive remove command detected', severity: 'high' as const },
  { pattern: /git\s+reset\s+--hard/, message: 'Destructive git reset detected', severity: 'high' as const },
  { pattern: /curl\s+.*\|\s*(sh|bash)/, message: 'Remote shell execution pattern detected', severity: 'high' as const },
  { pattern: /(API_KEY|TOKEN|SECRET|PASSWORD)/, message: 'Secret-like environment reference detected', severity: 'medium' as const },
  { pattern: /(fetch|axios|https?:\/\/)/, message: 'Network access pattern detected', severity: 'medium' as const },
];

export class SkillAuditor {
  private readonly permissionPolicy = new PermissionPolicy();

  async audit(skill: LoadedAgentSkill): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    for (const warning of this.permissionPolicy.validate(skill.manifest)) {
      findings.push({ severity: 'medium', skillId: skill.manifest.id, message: warning, file: 'manifest.json' });
    }
    const files = await this.collectTextFiles(skill.skillPath);
    for (const file of files) {
      const text = await readFile(file, 'utf-8');
      for (const suspicious of SUSPICIOUS_PATTERNS) {
        if (suspicious.pattern.test(text)) {
          findings.push({ severity: suspicious.severity, skillId: skill.manifest.id, message: suspicious.message, file: relative(skill.skillPath, file) });
        }
      }
    }
    return findings;
  }

  private async collectTextFiles(dir: string): Promise<string[]> {
    if (!existsSync(dir)) return [];
    const files: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) files.push(...await this.collectTextFiles(fullPath));
      else if (/\.(md|json|ts|js|sh|py|txt|yml|yaml)$/.test(entry.name)) files.push(fullPath);
    }
    return files;
  }
}
