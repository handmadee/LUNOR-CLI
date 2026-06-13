import pc from 'picocolors';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { getSkillManager, getSourceConfig } from '../../lib/skills/index.js';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';
import { updateSkillSource } from '../../lib/skills/skill-sources.js';

interface ConvertOptions {
  to?: 'local' | string;
  repo?: string;
  branch?: string;
  path?: string;
}

interface ManifestEntry {
  name: string;
  from: string;
  to: string;
  timestamp: string;
  repo?: string;
  branch?: string;
  path?: string;
}

const MANIFEST_PATH = join(process.cwd(), '.claude', 'skills', 'manifest.json');

export async function skillsConvertCommand(name: string, options: ConvertOptions = {}): Promise<void> {
  const targetType = options.to;
  if (!targetType || targetType !== 'local') {
    logger.error('Currently only --to local is supported');
    logger.info('All skills use local sources with extended config');
    return;
  }

  const manager = getSkillManager();
  const status = manager.getSourceStatus(name);
  if (!status.available) {
    logger.error(`Unknown skill: ${name}`);
    return;
  }

  if (!options.path) {
    logger.error('Missing --path <local-path> for local target');
    return;
  }
  await convertToLocal(name, options.path);
}

async function convertToLocal(name: string, path: string): Promise<void> {
  const config = getSourceConfig(name);
  if (!config) {
    logger.error(`Unknown skill: ${name}`);
    return;
  }

  const confirmed = await prompts.confirm(
    `Convert ${config.displayName} to local source at ${path}?`
  );
  if (!confirmed) {
    logger.info('Cancelled');
    return;
  }

  await recordManifest({
    name,
    from: config.type,
    to: 'local',
    path,
    timestamp: new Date().toISOString(),
  });

  await updateSkillSource(name, {
    name,
    displayName: config.displayName,
    type: 'local',
    path,
  });

  logger.success(`Converted: ${config.displayName} → local (${path}).`);
  logger.info('Run: lunor skills init to reinstall from the new local path.');
}

async function recordManifest(entry: ManifestEntry): Promise<void> {
  try {
    const manifestDir = join(process.cwd(), '.claude', 'skills');
    const manifestPath = MANIFEST_PATH;

    if (!existsSync(manifestDir)) {
      await mkdir(manifestDir, { recursive: true });
    }

    const entries: ManifestEntry[] = existsSync(manifestPath)
      ? JSON.parse(await readFile(manifestPath, 'utf-8'))
      : [];

    entries.push(entry);

    await writeFile(manifestPath, JSON.stringify(entries, null, 2), 'utf-8');
    logger.info(pc.dim(`Manifest updated: ${manifestPath}`));
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
  }
}
