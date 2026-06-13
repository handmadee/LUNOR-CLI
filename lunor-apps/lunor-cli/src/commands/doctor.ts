import pc from 'picocolors';
import { KeyService } from '../services/key-service.js';
import { StateManager } from '../core/state-manager.js';
import { ConfigLoader } from '../core/config-loader.js';
import { prompts } from '../utils/prompts.js';
import { existsSync } from 'node:fs';
import { PATHS } from '../constants/paths.js';

interface HealthCheck {
  name: string;
  status: boolean;
  message?: string;
}

export async function doctorCommand(): Promise<void> {
  prompts.intro('LUNOR Health Check');

  const checks: HealthCheck[] = [];

  const configLoader = new ConfigLoader();
  const config = configLoader.getConfig();
  checks.push({
    name: 'Configuration',
    status: true,
    message: `Base URL: ${config.baseUrl}`,
  });

  const keyService = new KeyService(PATHS.keyFile);
  const hasKey = keyService.hasKey();
  checks.push({
    name: 'API Key',
    status: hasKey,
    message: hasKey ? 'Key file exists' : 'Key file not found',
  });

  const hasState = existsSync(PATHS.stateFile);
  checks.push({
    name: 'State File',
    status: hasState,
    message: hasState ? PATHS.stateFile : 'No saved state',
  });

  if (hasState) {
    const stateManager = new StateManager(PATHS.stateFile);
    const state = stateManager.getState();
    checks.push({
      name: 'Current Config',
      status: !!state,
      message: state ? `Profile: ${state.currentPreset}` : 'Failed to load state',
    });
  }

  const hasAnalytics = existsSync(PATHS.analyticsDb);
  checks.push({
    name: 'Analytics Database',
    status: hasAnalytics,
    message: hasAnalytics ? PATHS.analyticsDb : 'Not initialized',
  });

  console.log(pc.dim('─'.repeat(50)));
  console.log();

  for (const check of checks) {
    const icon = check.status ? pc.green('[+]') : pc.red('[x]');
    console.log(`${icon} ${pc.bold(check.name)}`);
    if (check.message) {
      console.log(`    ${pc.dim(check.message)}`);
    }
  }

  console.log();
  console.log(pc.dim('─'.repeat(50)));

  const allHealthy = checks.every((c) => c.status);

  if (allHealthy) {
    prompts.outro('[+] All systems operational');
  } else {
    console.log();
    console.log(pc.yellow('[!] Some issues detected'));
    console.log();
    console.log(pc.dim('Run: lunor keys add (if API key is missing)'));
    console.log(pc.dim('Run: lunor use coding (to initialize configuration)'));
    console.log();
  }
}
