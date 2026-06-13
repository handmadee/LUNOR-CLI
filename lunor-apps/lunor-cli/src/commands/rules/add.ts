import pc from 'picocolors';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getRuleService, listTemplates } from '../../lib/rules/index.js';
import type { RuleType } from '../../lib/rules/index.js';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';
import { createSpinner } from '../../utils/spinner.js';

export async function rulesAddCommand(filePath?: string): Promise<void> {
  prompts.intro('Add Cursor Rule');

  const service = getRuleService();

  if (filePath) {
    await addFromFile(service, filePath);
  } else {
    await addInteractive(service);
  }
}

async function addFromFile(service: ReturnType<typeof getRuleService>, filePath: string): Promise<void> {
  const resolvedPath = resolve(filePath);

  if (!existsSync(resolvedPath)) {
    logger.error(`File not found: ${filePath}`);
    return;
  }

  const spinner = createSpinner('Importing rule...').start();

  const result = await service.importFromFile(resolvedPath);

  if (result.valid) {
    spinner.succeed('Rule added successfully');
    
    if (result.warnings.length > 0) {
      console.log();
      logger.warning('Warnings:');
      for (const warning of result.warnings) {
        console.log(pc.yellow(`  • ${warning}`));
      }
    }
  } else {
    spinner.fail('Failed to add rule');
    console.log();
    for (const error of result.errors) {
      logger.error(error);
    }
  }
}

async function addInteractive(service: ReturnType<typeof getRuleService>): Promise<void> {
  const useTemplate = await prompts.confirm('Create from template?', true);

  if (useTemplate) {
    await createFromTemplate(service);
  } else {
    await createCustomRule(service);
  }
}

async function createFromTemplate(service: ReturnType<typeof getRuleService>): Promise<void> {
  const templates = listTemplates();

  const templateName = await prompts.select(
    'Select template:',
    templates.map(t => ({
      value: t.name,
      label: t.displayName,
      hint: pc.dim(t.description),
    }))
  );

  if (!templateName) {
    logger.info('Cancelled');
    return;
  }

  const name = await prompts.text('Rule name:', {
    placeholder: 'my-custom-rule',
    validate: (value) => {
      if (!value) return 'Name is required';
      if (!/^[a-z0-9-]+$/.test(value)) {
        return 'Use lowercase letters, numbers, and dashes only';
      }
    },
  });

  if (!name) {
    logger.info('Cancelled');
    return;
  }

  const spinner = createSpinner('Creating rule...').start();

  const result = await service.createFromTemplate(templateName, name);

  if (result.valid) {
    spinner.succeed('Rule created successfully');
    console.log();
    console.log(pc.dim(`  Location: .cursor/rules/${name}.md`));
    console.log(pc.dim('  Edit the file to customize'));
  } else {
    spinner.fail('Failed to create rule');
    for (const error of result.errors) {
      logger.error(error);
    }
  }
}

async function createCustomRule(service: ReturnType<typeof getRuleService>): Promise<void> {
  const name = await prompts.text('Rule name:', {
    placeholder: 'my-custom-rule',
    validate: (value) => {
      if (!value) return 'Name is required';
      if (!/^[a-z0-9-]+$/.test(value)) {
        return 'Use lowercase letters, numbers, and dashes only';
      }
    },
  });

  if (!name) {
    logger.info('Cancelled');
    return;
  }

  const type = await prompts.select<RuleType>(
    'Rule type:',
    [
      { value: 'cursor', label: 'Cursor Rule', hint: 'General cursor rules' },
      { value: 'framework', label: 'Framework', hint: 'Framework-specific rules' },
      { value: 'code-style', label: 'Code Style', hint: 'Formatting and style' },
      { value: 'custom', label: 'Custom', hint: 'Custom rules' },
    ]
  );

  if (!type) {
    logger.info('Cancelled');
    return;
  }

  const description = await prompts.text('Description (optional):', {
    placeholder: 'A brief description',
  });

  const content = await prompts.text('Content:', {
    placeholder: 'Paste your rule content here',
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Content is required';
      }
    },
  });

  if (!content) {
    logger.info('Cancelled');
    return;
  }

  const spinner = createSpinner('Adding rule...').start();

  const result = await service.addRule(
    {
      name,
      displayName: name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      type,
      format: 'markdown',
      description: description || undefined,
    },
    content
  );

  if (result.valid) {
    spinner.succeed('Rule added successfully');
  } else {
    spinner.fail('Failed to add rule');
    for (const error of result.errors) {
      logger.error(error);
    }
  }
}
