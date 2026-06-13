import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { SkillComposer } from './composer.js';
import { SkillLoader } from './loader.js';
import { SkillRenderer } from './renderer.js';
import { SkillValidator } from './validator.js';

let tempRoot: string | undefined;

async function createTempRoot(): Promise<string> {
  tempRoot = await mkdtemp(join(tmpdir(), 'lunor-agent-skills-'));
  return tempRoot;
}

async function writeSkill(root: string, category: string, id: string, dependsOn: string[] = []): Promise<void> {
  const dir = join(root, '.agents', 'skills', category, id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'manifest.json'), JSON.stringify({
    schemaVersion: '1.0.0',
    id,
    name: id,
    category,
    version: '0.1.0',
    description: `${id} test skill`,
    entry: 'SKILL.md',
    dependsOn,
    compatibleTargets: ['claude', 'cursor', 'kiro', 'antigravity', 'codex'],
    permissions: { filesystem: ['read'], shell: [], network: [], browser: [], mcp: [] },
    trust: { source: 'local', reviewRequired: false },
  }, null, 2), 'utf-8');
  await writeFile(join(dir, 'SKILL.md'), `---\nname: ${id}\ndescription: ${id} test skill\n---\n\n# ${id}\n`, 'utf-8');
}

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

describe('canonical agent skills', () => {
  it('loads and validates canonical skills', async () => {
    const root = await createTempRoot();
    await writeSkill(root, 'domains', 'backend-api');

    const skills = await new SkillLoader(root).loadAll();
    const result = await new SkillValidator().validateAll(skills);

    expect(skills).toHaveLength(1);
    expect(result.valid).toBe(true);
  });

  it('detects missing dependencies', async () => {
    const root = await createTempRoot();
    await writeSkill(root, 'project-kits', 'ecommerce-storefront', ['payment-extension']);

    const result = await new SkillValidator().validateAll(await new SkillLoader(root).loadAll());

    expect(result.valid).toBe(false);
    expect(result.issues.some(issue => issue.message.includes('Missing dependency'))).toBe(true);
  });

  it('composes dependencies before project kits', async () => {
    const root = await createTempRoot();
    await writeSkill(root, 'domains', 'backend-api');
    await writeSkill(root, 'project-kits', 'ecommerce-storefront', ['backend-api']);

    const skills = await new SkillLoader(root).loadAll();
    const composed = new SkillComposer(skills).compose('ecommerce-storefront');

    expect(composed.map(skill => skill.manifest.id)).toEqual(['backend-api', 'ecommerce-storefront']);
  });

  it('renders cursor skill and rule files', async () => {
    const root = await createTempRoot();
    await writeSkill(root, 'domains', 'backend-api');
    const skills = await new SkillLoader(root).loadAll();

    const result = await new SkillRenderer(root).render('cursor', skills);
    const rule = await readFile(join(root, '.cursor', 'rules', 'backend-api.md'), 'utf-8');

    expect(result.filesWritten).toHaveLength(2);
    expect(rule).toContain('Source: .agents/skills/domains/backend-api');
  });
});
