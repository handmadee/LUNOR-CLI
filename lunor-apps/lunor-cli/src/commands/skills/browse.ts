import pc from 'picocolors';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getSkillManager, getAllSourceConfigs } from '../../lib/skills/index.js';
import { logger } from '../../utils/logger.js';

interface BrowseOptions {
  installed?: boolean;
  search?: string;
  lines?: number;
}

export async function skillsBrowseCommand(options: BrowseOptions = {}): Promise<void> {
  const manager = getSkillManager();
  const installed = manager.list();
  const sources = getAllSourceConfigs();

  const filterByInstall = options.installed === true;
  const search = (options.search ?? '').toLowerCase();
  const maxLines = Number.isFinite(options.lines) && options.lines! > 0 ? options.lines! : 40;

  const rows = sources
    .map((source) => {
      const status = manager.getSourceStatus(source.name);
      const inst = installed.find((s) => s.name === source.name);
      const matchSearch = search ? source.displayName.toLowerCase().includes(search) || source.name.includes(search) : true;
      if (!matchSearch) return null;
      if (filterByInstall && !status.installed) return null;

      return {
        name: source.name,
        displayName: source.displayName,
        type: source.type,
        installed: status.installed,
        path: inst?.path,
        skillMdPath: inst ? join(inst.path, 'SKILL.md') : undefined,
      };
    })
    .filter(Boolean) as {
      name: string;
      displayName: string;
      type: string;
      installed: boolean;
      path?: string;
      skillMdPath?: string;
    }[];

  if (rows.length === 0) {
    logger.info('No skills match your filters');
    return;
  }

  for (const row of rows) {
    const statusLabel = row.installed ? pc.green('[installed]') : pc.dim('[not installed]');
    const typeLabel = row.type === 'github' ? pc.cyan('[github]') : pc.yellow('[local]');
    console.log(`${pc.bold(row.displayName)} ${statusLabel} ${typeLabel}`);
    if (row.path) {
      console.log(pc.dim(`  path: ${row.path}`));
    }

    if (row.skillMdPath) {
      await printSkillPreview(row.skillMdPath, maxLines);
    } else {
      console.log(pc.dim('  SKILL.md preview: unavailable (not installed)'));
    }

    console.log();
  }
}

async function printSkillPreview(filePath: string, maxLines: number): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n').slice(0, maxLines);
    logger.info('  SKILL.md preview:');
    for (const line of lines) {
      console.log(pc.dim(`    ${line}`));
    }
    if (content.split('\n').length > maxLines) {
      console.log(pc.dim(`    ... (truncated to ${maxLines} lines)`));
    }
  } catch (error) {
    console.log(pc.dim('  SKILL.md preview: not found'));
    logger.debug?.(error instanceof Error ? error.message : String(error));
  }
}
