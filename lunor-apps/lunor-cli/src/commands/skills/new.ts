import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { logger } from '../../utils/logger.js';
import { prompts } from '../../utils/prompts.js';
import { createSpinner } from '../../utils/spinner.js';

interface SkillTemplate {
  name: string;
  description: string;
  files: { path: string; content: string }[];
}

const SKILL_TEMPLATES: Record<string, SkillTemplate> = {
  basic: {
    name: 'Basic Skill',
    description: 'Empty skill template with basic structure',
    files: [
      {
        path: 'SKILL.md',
        content: `# {{NAME}}

{{DESCRIPTION}}

## Usage

Activate this skill and follow the instructions.

## Features

- Feature 1
- Feature 2
- Feature 3

## Version

1.0.0
`,
      },
      {
        path: 'instructions.md',
        content: `# Instructions

## Overview

This skill provides...

## Commands

\`\`\`bash
command-example
\`\`\`

## Examples

Example usage here.
`,
      },
    ],
  },

  agent: {
    name: 'Agent Skill',
    description: 'Agent-based skill with role definitions',
    files: [
      {
        path: 'SKILL.md',
        content: `# {{NAME}}

{{DESCRIPTION}}

## Role

You are a specialized agent for {{NAME}}.

## Responsibilities

- Responsibility 1
- Responsibility 2
- Responsibility 3

## Version

1.0.0
`,
      },
      {
        path: 'agent-config.yaml',
        content: `name: {{NAME_SLUG}}
displayName: {{NAME}}
role: |
  You are a specialized agent...

capabilities:
  - capability1
  - capability2

context:
  - File patterns to watch
  - Relevant documentation

version: 1.0.0
`,
      },
    ],
  },

  workflow: {
    name: 'Workflow Skill',
    description: 'Workflow-based skill with step definitions',
    files: [
      {
        path: 'SKILL.md',
        content: `# {{NAME}}

{{DESCRIPTION}}

## Workflow Steps

1. Step 1: Description
2. Step 2: Description
3. Step 3: Description

## Version

1.0.0
`,
      },
      {
        path: 'workflow.yaml',
        content: `name: {{NAME_SLUG}}
displayName: {{NAME}}

steps:
  - id: step1
    name: Step 1
    action: |
      Action description

  - id: step2
    name: Step 2
    action: |
      Action description

version: 1.0.0
`,
      },
    ],
  },
};

export async function skillsNewCommand(): Promise<void> {
  prompts.intro('Create New Skill');

  const name = await prompts.text('Skill name:', {
    placeholder: 'my-awesome-skill',
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

  const description = await prompts.text('Description:', {
    placeholder: 'A brief description of your skill',
  });

  if (!description) {
    logger.info('Cancelled');
    return;
  }

  const templateType = await prompts.select<keyof typeof SKILL_TEMPLATES>(
    'Select template:',
    Object.entries(SKILL_TEMPLATES).map(([key, tpl]) => ({
      value: key as keyof typeof SKILL_TEMPLATES,
      label: tpl.name,
      hint: pc.dim(tpl.description),
    }))
  );

  if (!templateType) {
    logger.info('Cancelled');
    return;
  }

  const targetDir = await prompts.text('Output directory:', {
    placeholder: './skills',
    defaultValue: './skills',
  });

  if (!targetDir) {
    logger.info('Cancelled');
    return;
  }

  const skillDir = join(process.cwd(), targetDir, name);

  if (existsSync(skillDir)) {
    logger.error(`Directory already exists: ${skillDir}`);
    return;
  }

  const template = SKILL_TEMPLATES[templateType];
  const spinner = createSpinner('Creating skill...').start();

  try {
    mkdirSync(skillDir, { recursive: true });

    const nameSlug = name.toLowerCase().replace(/\s+/g, '-');
    const replacements = {
      '{{NAME}}': name,
      '{{NAME_SLUG}}': nameSlug,
      '{{DESCRIPTION}}': description,
    };

    for (const file of template.files) {
      let content = file.content;
      for (const [placeholder, value] of Object.entries(replacements)) {
        content = content.replace(new RegExp(placeholder, 'g'), value);
      }

      const filePath = join(skillDir, file.path);
      const fileDir = join(filePath, '..');
      
      if (!existsSync(fileDir)) {
        mkdirSync(fileDir, { recursive: true });
      }

      writeFileSync(filePath, content, 'utf-8');
    }

    spinner.succeed('Skill created successfully');

    console.log();
    logger.section('Next Steps');
    console.log(pc.dim(`  cd ${skillDir}`));
    console.log(pc.dim('  Edit skill files'));
    console.log(pc.dim(`  lunor skills init ${name} --from ${skillDir}`));
    console.log();

    logger.table([
      ['Name', pc.cyan(name)],
      ['Type', pc.dim(template.name)],
      ['Location', pc.dim(skillDir)],
      ['Files', pc.dim(template.files.length.toString())],
    ]);

  } catch (error) {
    spinner.fail('Failed to create skill');
    logger.error(error instanceof Error ? error.message : 'Unknown error');
  }
}
