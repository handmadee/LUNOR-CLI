import pc from 'picocolors';
import { getConfigService } from '../lib/config/index.js';
import { logger } from '../utils/logger.js';
import { prompts } from '../utils/prompts.js';
import { createSpinner } from '../utils/spinner.js';

export async function ampSetCommand(): Promise<void> {
  prompts.intro('Configure AMP');

  const service = getConfigService();
  const existing = await service.getAMPConfig();

  const url = await prompts.text('AMP URL:', {
    placeholder: 'http://localhost:8317',
    defaultValue: existing?.url,
    validate: (value) => {
      try {
        new URL(value);
      } catch {
        return 'Invalid URL format';
      }
    },
  });

  if (!url) {
    logger.info('Cancelled');
    return;
  }

  const apiKey = await prompts.text('AMP API Key:', {
    placeholder: 'your-client-secret-key',
    validate: (value) => {
      if (value.length < 16) return 'API key too short (minimum 16 characters)';
    },
  });

  if (!apiKey) {
    logger.info('Cancelled');
    return;
  }

  await service.setAMPConfig({ url, apiKey });

  logger.success('AMP configuration saved');
  console.log();
  
  // Auto-export environment variables
  console.log(pc.dim('Exporting environment variables...'));
  console.log(pc.cyan(`  export AMP_URL="${url}"`));
  console.log(pc.cyan(`  export AMP_API_KEY="${apiKey}"`));
  
  console.log();
  logger.info('To apply changes to current shell, run:');
  console.log(pc.cyan('  source ~/.zshrc'));
  console.log(pc.dim('Or restart your terminal'));
  
  console.log();
  logger.info('AMP variables will be auto-exported with:');
  console.log(pc.cyan('  lunor use <preset>'));
}

export async function ampShowCommand(): Promise<void> {
  prompts.intro('AMP Configuration');

  const service = getConfigService();
  const config = await service.getAMPConfig();

  if (!config) {
    logger.warning('AMP not configured');
    console.log();
    console.log(pc.dim('Run: lunor amp set'));
    return;
  }

  logger.section('Current Configuration');
  
  const masked = config.apiKey.slice(0, 8) + '...' + config.apiKey.slice(-4);
  
  logger.table([
    ['AMP URL', pc.cyan(config.url)],
    ['API Key', pc.dim(masked)],
  ]);

  console.log();
  console.log(pc.dim('Environment Export:'));
  const envVars = await service.exportToEnvAsync();
  for (const envVar of envVars.filter(v => v.includes('AMP'))) {
    console.log(pc.cyan(`  ${envVar}`));
  }
}

export async function ampTestCommand(): Promise<void> {
  prompts.intro('Test AMP Connection');

  const service = getConfigService();
  const config = await service.getAMPConfig();

  if (!config) {
    logger.error('AMP not configured');
    console.log(pc.dim('Run: lunor amp set'));
    return;
  }

  const spinner = createSpinner('Testing connection...').start();

  try {
    const response = await fetch(`${config.url}/health`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      spinner.succeed('Connection successful');
      const data = (await response.json()) as { version?: string };
      console.log();
      logger.table([
        ['Status', pc.green('healthy')],
        ['URL', pc.cyan(config.url)],
        ['Version', pc.dim(data.version || 'unknown')],
      ]);
    } else {
      spinner.fail(`Connection failed (${response.status})`);
      logger.error(await response.text());
    }
  } catch (error) {
    spinner.fail('Connection failed');
    logger.error(error instanceof Error ? error.message : 'Unknown error');
  }
}

export async function ampRemoveCommand(): Promise<void> {
  prompts.intro('Remove AMP Configuration');

  const service = getConfigService();
  const config = await service.getAMPConfig();

  if (!config) {
    logger.warning('AMP not configured');
    return;
  }

  console.log();
  console.log(pc.yellow('[!] This will remove:'));
  console.log(`    AMP URL: ${pc.dim(config.url)}`);
  console.log(`    AMP API Key`);
  console.log();

  const confirmed = await prompts.confirm('Remove AMP configuration?');

  if (!confirmed) {
    logger.info('Cancelled');
    return;
  }

  const repo = service['repository'];
  await repo.delete('amp.url');
  await repo.delete('amp.apiKey');

  logger.success('AMP configuration removed');
}
