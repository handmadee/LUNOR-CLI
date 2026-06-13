import pc from 'picocolors';
import { ConfigLoader } from '../core/config-loader.js';
import { logger } from '../utils/logger.js';
import { prompts } from '../utils/prompts.js';
import { PATHS } from '../constants/paths.js';

export async function configGetCommand(key?: string): Promise<void> {
  const configLoader = new ConfigLoader();
  const config = configLoader.getConfig();

  if (key) {
    if (key in config) {
      const value = config[key as keyof typeof config];
      console.log(pc.cyan(JSON.stringify(value, null, 2)));
    } else {
      logger.error(`Config key '${key}' not found`);
    }
    return;
  }

  prompts.intro('Lunor Configuration');
  
  for (const [k, v] of Object.entries(config)) {
    console.log(`  ${pc.dim(k.padEnd(15))} ${pc.cyan(JSON.stringify(v))}`);
  }

  console.log();
}

export async function configSetCommand(key: string, value: string): Promise<void> {
  const configLoader = new ConfigLoader();
  const config = configLoader.getConfig();

  if (!(key in config)) {
    logger.error(`Config key '${key}' not found`);
    return;
  }

  let parsedValue: unknown = value;
  
  if (key === 'theme') {
    const validThemes = ['default', 'dracula', 'nord', 'cyberpunk', 'matrix', 'sunset', 'monochrome', 'tokyonight', 'catppuccin', 'rosepine'];
    const lowerValue = value.toLowerCase();
    if (!validThemes.includes(lowerValue)) {
      logger.error(`Invalid theme '${value}'. Valid options: ${validThemes.join(', ')}`);
      return;
    }
    parsedValue = lowerValue;
    
    // Instantly apply colors to active terminal window
    const { applyTerminalTheme } = await import('./theme.js');
    applyTerminalTheme(lowerValue);
  } else if (value === 'true') {
    parsedValue = true;
  } else if (value === 'false') {
    parsedValue = false;
  } else if (!isNaN(Number(value))) {
    parsedValue = Number(value);
  }

  configLoader.set(key as keyof typeof config, parsedValue as never);

  logger.success(`Set ${pc.cyan(key)} = ${pc.yellow(JSON.stringify(parsedValue))}`);
}

export async function configBackupCommand(): Promise<void> {
  const configLoader = new ConfigLoader();

  configLoader.backup(PATHS.configBackup);
  logger.success(`Config backed up to: ${pc.cyan(PATHS.configBackup)}`);
}

export async function configRestoreCommand(): Promise<void> {
  const configLoader = new ConfigLoader();

  configLoader.restore(PATHS.configBackup);
  logger.success('Config restored from backup');
}
