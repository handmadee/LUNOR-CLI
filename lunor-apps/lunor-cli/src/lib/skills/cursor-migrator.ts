import { dirname, join, relative } from 'node:path';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export interface CursorMigrationResult {
  commands: number;
  workflows: number;
  skills: number;
  errors: string[];
}

export async function migrateToCursor(
  sourceClaudeDir: string,
  targetCursorDir: string,
  dryRun = false,
): Promise<CursorMigrationResult> {
  const result: CursorMigrationResult = { commands: 0, workflows: 0, skills: 0, errors: [] };

  await migrateCommands(sourceClaudeDir, targetCursorDir, result, dryRun);
  await migrateWorkflows(sourceClaudeDir, targetCursorDir, result, dryRun);
  await migrateSkills(sourceClaudeDir, targetCursorDir, result, dryRun);

  return result;
}

// -----------------------------------------------------------------------------

async function migrateCommands(
  claudeDir: string,
  cursorDir: string,
  result: CursorMigrationResult,
  dryRun: boolean,
): Promise<void> {
  const commandsDir = join(claudeDir, 'commands');
  if (!existsSync(commandsDir)) return;

  const files = await collectMdFiles(commandsDir);
  for (const filePath of files) {
    const content = await readFile(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    if (!frontmatter.description) continue;

    const slug = deriveSlug(filePath, commandsDir, 'cmd');
    const destPath = join(cursorDir, 'rules', `${slug}.mdc`);

    await writeMdc(destPath, { description: frontmatter.description, alwaysApply: false, body }, result, dryRun);
    result.commands++;
  }
}

async function migrateWorkflows(
  claudeDir: string,
  cursorDir: string,
  result: CursorMigrationResult,
  dryRun: boolean,
): Promise<void> {
  const workflowsDir = join(claudeDir, 'workflows');
  if (!existsSync(workflowsDir)) return;

  const files = await collectMdFiles(workflowsDir);
  for (const filePath of files) {
    const content = await readFile(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    const slug = deriveSlug(filePath, workflowsDir, 'wf');
    const titleMatch = body.match(/^#\s+(.+)$/m);
    const description =
      frontmatter.description || titleMatch?.[1] || slug.replace('wf-', '').replace(/-/g, ' ');
    const destPath = join(cursorDir, 'rules', `${slug}.mdc`);

    await writeMdc(destPath, { description, alwaysApply: true, body }, result, dryRun);
    result.workflows++;
  }
}

async function migrateSkills(
  claudeDir: string,
  cursorDir: string,
  result: CursorMigrationResult,
  dryRun: boolean,
): Promise<void> {
  const skillsDir = join(claudeDir, 'skills');
  if (!existsSync(skillsDir)) return;

  const entries = await readdir(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const src = join(skillsDir, entry.name);
    const dest = join(cursorDir, 'skills', entry.name);

    if (!dryRun) {
      try {
        await cp(src, dest, {
          recursive: true,
          force: false,
          filter: (s) => !s.includes('.DS_Store'),
        });

        const skillMd = join(dest, 'SKILL.md');
        if (existsSync(skillMd)) {
          const raw = await readFile(skillMd, 'utf-8');
          const patched = raw.replace(/\.claude\//g, '.cursor/');
          if (patched !== raw) await writeFile(skillMd, patched, 'utf-8');
        }
      } catch (e) {
        result.errors.push(`skill ${entry.name}: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
    }

    result.skills++;
  }
}

// -----------------------------------------------------------------------------
// Helpers

async function writeMdc(
  destPath: string,
  opts: { description: string; alwaysApply: boolean; body: string },
  result: CursorMigrationResult,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) return;
  try {
    await mkdir(dirname(destPath), { recursive: true });
    const content = `---\ndescription: ${opts.description}\nglobs: \nalwaysApply: ${opts.alwaysApply}\n---\n${opts.body.trimStart()}`;
    await writeFile(destPath, content, 'utf-8');
  } catch (e) {
    result.errors.push(`${destPath}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) frontmatter[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }

  return { frontmatter, body: match[2] };
}

function deriveSlug(filePath: string, baseDir: string, prefix: string): string {
  return `${prefix}-${relative(baseDir, filePath).replace(/\.md$/, '').replace(/[\\/]/g, '-')}`;
}

async function collectMdFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...(await collectMdFiles(fullPath)));
    else if (entry.isFile() && entry.name.endsWith('.md')) results.push(fullPath);
  }
  return results;
}
