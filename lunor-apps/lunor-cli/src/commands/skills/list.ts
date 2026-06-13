import pc from 'picocolors';
import { getSkillManager, getSourceNames, SKILL_SOURCES } from '../../lib/skills/index.js';
import { prompts } from '../../utils/prompts.js';
import { ui } from '../../utils/ui.js';

export async function skillsListCommand(): Promise<void> {
  prompts.intro('Skills Manager');

  const manager = getSkillManager();
  const installed = manager.list();
  const sourceNames = getSourceNames();

  ui.section('Available Sources');

  for (const key of sourceNames) {
    const source = SKILL_SOURCES[key];
    const installedSkill = installed.find(s => s.name === key);
    const isInstalled = manager.getSourceStatus(key).installed;

    const status = isInstalled
      ? pc.green('[installed]')
      : pc.dim('[not installed]');

    const typeLabel = source.type === 'github' ? pc.cyan('[github]') : pc.yellow('[local]');

    console.log(
      `  ${pc.bold(source.displayName.padEnd(24))} ${status} ${typeLabel}`
    );

    if (source.description) {
      console.log(pc.dim(`    ${source.description}`));
    }

    const sourceStats = [
      source.extended?.category && `group: ${source.extended.category}`,
      source.extended?.stars && `stars: ${source.extended.stars}`,
      source.extended?.skillCount && `scope: ${source.extended.skillCount}`,
    ].filter(Boolean);

    if (sourceStats.length > 0) {
      console.log(pc.dim(`    ${sourceStats.join(' • ')}`));
    }

    if (isInstalled && installedSkill) {
      const details = [
        installedSkill.version && `v${installedSkill.version}`,
        installedSkill.path && pc.dim(truncatePath(installedSkill.path, 50)),
      ].filter(Boolean);

      if (details.length > 0) {
        console.log(`    ${details.join(' • ')}`);
      }
    }

    console.log();
  }

  console.log(pc.dim('─'.repeat(50)));
  
  const installedCount = installed.length;
  const totalCount = sourceNames.length;
  
  console.log(
    `${pc.blue('[i]')} ${installedCount}/${totalCount} sources installed`
  );

  if (installedCount < totalCount) {
    console.log(pc.dim(`\nInstall more: lunor skills init <source>`));
  }

  console.log();
}

function truncatePath(path: string, maxLen: number): string {
  if (path.length <= maxLen) return path;
  
  const parts = path.split('/');
  let result = path;
  
  while (result.length > maxLen && parts.length > 3) {
    parts.splice(1, 1);
    result = parts[0] + '/.../' + parts.slice(1).join('/');
  }
  
  return result.length > maxLen 
    ? '...' + path.slice(-(maxLen - 3)) 
    : result;
}
