import pc from 'picocolors';
import { KeyService } from '../services/key-service.js';
import { getConfigService } from '../lib/config/index.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';
import { prompts } from '../utils/prompts.js';
import { PATHS } from '../constants/paths.js';
import {
  DEFAULT_ANTHROPIC_BASE_URL,
  formatAnthropicBaseUrlOptions,
} from '../constants/base-urls.js';

export async function keysAddCommand(): Promise<void> {
  prompts.intro('Add API Key');

  const key = await prompts.text('Enter your Lunor API key:', {
    placeholder: 'sk-... or lunor-proxy-api-key-...',
    validate: (input: string) => {
      if (!input || input.trim().length === 0) {
        return 'API key cannot be empty';
      }
      if (input.trim().length < 10) {
        return 'API key too short';
      }
      return undefined;
    },
  });

  if (!key) {
    logger.warning('Cancelled');
    return;
  }

  const baseUrl = await prompts.text('Enter Anthropic Base URL:', {
    placeholder: DEFAULT_ANTHROPIC_BASE_URL,
    defaultValue: DEFAULT_ANTHROPIC_BASE_URL,
  });

  console.log(pc.dim('Available Anthropic native /v1/messages endpoints:'));
  console.log(pc.dim(formatAnthropicBaseUrlOptions()));
  console.log();

  const spinner = createSpinner('Encrypting and saving key...').start();

  try {
    const configService = getConfigService();
    await configService.setClaudeConfig({ 
      apiKey: key.trim(),
      baseUrl: (baseUrl && baseUrl.trim()) || DEFAULT_ANTHROPIC_BASE_URL,
    });

    const keyService = new KeyService(PATHS.keyFile);
    keyService.addKey(key.trim());
    
    spinner.succeed('API key saved successfully');
    logger.info('Key is encrypted and stored securely');
    console.log();
    console.log(pc.dim('Environment variables will be exported on:'));
    console.log(pc.cyan('  lunor use <preset>'));
  } catch (error) {
    spinner.fail('Failed to save API key');
    throw error;
  }
}

export async function keysAddMiMoCommand(): Promise<void> {
  prompts.intro('Add MiMo API Key');

  const key = await prompts.text('Enter your MiMo API key:', {
    placeholder: 'tp-...',
    validate: (input: string) => {
      if (!input || input.trim().length === 0) {
        return 'API key cannot be empty';
      }
      if (input.trim().length < 10) {
        return 'API key too short';
      }
      return undefined;
    },
  });

  if (!key) {
    logger.warning('Cancelled');
    return;
  }

  const baseUrl = await prompts.text('Enter MiMo Base URL:', {
    placeholder: 'https://token-plan-sgp.xiaomimimo.com/anthropic',
    defaultValue: 'https://token-plan-sgp.xiaomimimo.com/anthropic',
  });

  const spinner = createSpinner('Encrypting and saving MiMo key...').start();

  try {
    const configService = getConfigService();
    await configService.setMiMoConfig({
      apiKey: key.trim(),
      baseUrl: (baseUrl && baseUrl.trim()) || 'https://token-plan-sgp.xiaomimimo.com/anthropic',
    });

    spinner.succeed('MiMo API key saved successfully');
    logger.info('Key is encrypted and stored securely');
    console.log();
    console.log(pc.dim('Environment variables will be exported on:'));
    console.log(pc.cyan('  lunor use mimo'));
    console.log(pc.cyan('  lunor use mimo-v2.5-pro'));
  } catch (error) {
    spinner.fail('Failed to save MiMo API key');
    throw error;
  }
}

export async function keysListCommand(): Promise<void> {
  prompts.intro('API Keys');

  const configService = getConfigService();
  const claudeConfig = await configService.getClaudeConfig();

  if (claudeConfig && claudeConfig.apiKey) {
    console.log(`${pc.green('[+]')} Lunor API Key`);
    console.log(`    ${pc.dim('Key:')} ${claudeConfig.apiKey.substring(0, 20)}...`);
    if (claudeConfig.baseUrl) {
      console.log(`    ${pc.dim('Base URL:')} ${claudeConfig.baseUrl}`);
    }
    
    const keyService = new KeyService(PATHS.keyFile);
    const info = keyService.getKeyInfo();
    if (info.createdAt) {
      console.log(`    ${pc.dim('Created:')} ${new Date(info.createdAt).toLocaleString()}`);
    }
  } else {
    console.log(`${pc.yellow('[!]')} No API key found`);
    console.log(pc.dim('    Run: lunor keys add'));
  }

  const mimoConfig = await configService.getMiMoConfig();
  if (mimoConfig && mimoConfig.apiKey) {
    console.log(`${pc.green('[+]')} MiMo API Key`);
    console.log(`    ${pc.dim('Key:')} ${mimoConfig.apiKey.substring(0, 20)}...`);
    console.log(`    ${pc.dim('Base URL:')} ${mimoConfig.baseUrl}`);
    if (mimoConfig.model) {
      console.log(`    ${pc.dim('Model:')} ${mimoConfig.model}`);
    }
  } else {
    console.log(`${pc.yellow('[!]')} No MiMo API key found`);
    console.log(pc.dim('    Run: lunor keys add-mimo'));
  }

  console.log();
}

export async function keysTestCommand(): Promise<void> {
  const keyService = new KeyService(PATHS.keyFile);

  const spinner = createSpinner('Validating API key...').start();

  try {
    const isValid = await keyService.validateKey();
    
    if (isValid) {
      spinner.succeed('API key is valid');
    } else {
      spinner.fail('API key validation failed');
    }
  } catch (error) {
    spinner.fail('Failed to validate API key');
    throw error;
  }
}

export async function keysRemoveCommand(): Promise<void> {
  const confirmed = await prompts.confirm('Are you sure you want to remove the API key?');

  if (!confirmed) {
    logger.info('Cancelled');
    return;
  }

  const keyService = new KeyService(PATHS.keyFile);
  keyService.removeKey();

  logger.success('API key removed');
}
