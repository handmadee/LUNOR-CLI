import pc from 'picocolors';
import { existsSync, copyFileSync, readdirSync } from 'node:fs';
import { getAllIDEConfigs, IDEConfig } from '../../lib/rules/ide-targets.js';
import type { IDETarget } from '../../lib/rules/types.js';
import { getRuleService } from '../../lib/rules/index.js';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';
import { createSpinner } from '../../utils/spinner.js';

export async function rulesSyncCommand(target?: IDETarget): Promise<void> {
  prompts.intro('Sync Rules Across IDEs');

  const service = getRuleService();
  const rules = await service.listRules();

  if (rules.length === 0) {
    logger.warning('No rules found to sync');
    console.log(pc.dim('Add rules: lunor rules add'));
    return;
  }

  const ideConfigs = getAllIDEConfigs();
  const targetIDEs = target && target !== 'all' 
    ? ideConfigs.filter(ide => ide.name === target)
    : ideConfigs;

  console.log();
  logger.section('Target IDEs');
  for (const ide of targetIDEs) {
    console.log(`  ${pc.cyan('•')} ${(ide as IDEConfig).displayName}`);
    console.log(`    ${pc.dim((ide as IDEConfig).rulesDir)}`);
  }
  console.log();

  const confirm = await prompts.confirm(`Sync ${rules.length} rule(s) to ${targetIDEs.length} IDE(s)?`, true);

  if (!confirm) {
    logger.info('Sync cancelled');
    return;
  }

  const spinner = createSpinner('Syncing rules...').start();
  let synced = 0;
  let skipped = 0;

  for (const rule of rules) {
    for (const ide of targetIDEs) {
      try {
        if (!existsSync(ide.rulesDir)) {
          const fs = await import('node:fs/promises');
          await fs.mkdir(ide.rulesDir, { recursive: true, mode: 0o755 });
        }

        const targetPath = `${ide.rulesDir}/${rule.name}.txt`;
        
        if (existsSync(targetPath) && !existsSync(rule.filePath)) {
          skipped++;
          continue;
        }

        copyFileSync(rule.filePath, targetPath);
        synced++;
      } catch (error) {
        logger.error(`Failed to sync ${rule.name} to ${ide.displayName}`);
      }
    }
  }

  spinner.succeed(`Synced ${synced} rule(s), skipped ${skipped}`);

  console.log();
  logger.divider();
  console.log(pc.dim('Rules synchronized across:'));
  for (const ide of targetIDEs) {
    console.log(`  ${pc.cyan('✓')} ${ide.displayName} - ${ide.rulesDir}`);
  }
  console.log();
}

export async function rulesListIDEsCommand(): Promise<void> {
  prompts.intro('Supported IDEs');

  const ideConfigs = getAllIDEConfigs();

  console.log();
  for (const ide of ideConfigs) {
    const exists = existsSync(ide.rulesDir);
    const badge = exists ? pc.green('[exists]') : pc.dim('[not found]');
    
    console.log(`  ${pc.bold(ide.displayName)} ${badge}`);
    console.log(`    ${pc.dim(ide.description)}`);
    console.log(`    ${pc.dim(`Rules: ${ide.rulesDir}`)}`);
    
    if (exists) {
      try {
        const files = readdirSync(ide.rulesDir);
        const ruleCount = files.filter(f => !f.startsWith('.')).length;
        console.log(`    ${pc.cyan(`${ruleCount} rule(s) installed`)}`);
      } catch {
        console.log(`    ${pc.dim('Unable to read directory')}`);
      }
    }
    
    console.log();
  }

  logger.divider();
  console.log(`[i] ${ideConfigs.length} IDE(s) supported`);
  console.log();
}
