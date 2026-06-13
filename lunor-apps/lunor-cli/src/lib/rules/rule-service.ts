import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import type {
  IRuleService,
  IRuleRepository,
  Rule,
  RuleMetadata,
  RuleType,
  ValidationResult,
  RuleTemplate,
  RuleFormat,
  IDETarget,
} from './types.js';
import { RuleRepository } from './rule-repository.js';
import { getValidator } from './validators/index.js';
import { getTemplate, listTemplates, renderTemplate } from './rule-templates.js';
import { getIDEConfig, getAllIDEConfigs } from './ide-targets.js';

export class RuleService implements IRuleService {
  constructor(private readonly repository: IRuleRepository = new RuleRepository()) {}

  async listRules(type?: RuleType): Promise<Rule[]> {
    const rules = await this.repository.list();
    
    if (!type) return rules;

    return rules.filter(r => r.type === type);
  }

  async getRule(name: string): Promise<Rule | null> {
    return this.repository.get(name);
  }

  async addRule(metadata: RuleMetadata, content: string): Promise<ValidationResult> {
    const validation = await this.validateRule(content, metadata.format);
    
    if (!validation.valid) {
      return validation;
    }

    try {
      await this.repository.add({
        ...metadata,
        content,
        filePath: '',
        size: Buffer.byteLength(content, 'utf8'),
      });

      return { valid: true, errors: [], warnings: validation.warnings };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Failed to add rule'],
        warnings: [],
      };
    }
  }

  async updateRule(name: string, content: string): Promise<ValidationResult> {
    const rule = await this.repository.get(name);
    
    if (!rule) {
      return {
        valid: false,
        errors: [`Rule not found: ${name}`],
        warnings: [],
      };
    }

    const validation = await this.validateRule(content, rule.format);
    
    if (!validation.valid) {
      return validation;
    }

    try {
      await this.repository.update(name, content);
      return { valid: true, errors: [], warnings: validation.warnings };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Failed to update rule'],
        warnings: [],
      };
    }
  }

  async removeRule(name: string): Promise<void> {
    await this.repository.remove(name);
  }

  async importFromFile(filePath: string, metadata?: Partial<RuleMetadata>): Promise<ValidationResult> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const ext = extname(filePath).toLowerCase();
      const format = this.getFormatFromExtension(ext);
      
      if (!format) {
        return {
          valid: false,
          errors: [`Unsupported file format: ${ext}`],
          warnings: [],
        };
      }

      const fullName = basename(filePath);
      const name = metadata?.name || fullName;
      
      const ruleMetadata: RuleMetadata = {
        name,
        displayName: metadata?.displayName || this.formatDisplayName(name),
        type: metadata?.type || 'custom',
        format,
        description: metadata?.description,
        tags: metadata?.tags,
        version: metadata?.version,
      };

      return this.addRule(ruleMetadata, content);
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Failed to import file'],
        warnings: [],
      };
    }
  }

  async exportToFile(name: string, outputPath: string): Promise<void> {
    const rule = await this.repository.get(name);
    
    if (!rule) {
      throw new Error(`Rule not found: ${name}`);
    }

    writeFileSync(outputPath, rule.content, 'utf-8');
  }

  async validateRule(content: string, format: RuleFormat): Promise<ValidationResult> {
    const validator = getValidator(format);
    
    if (!validator) {
      return {
        valid: true,
        errors: [],
        warnings: [`No validator available for format: ${format}`],
      };
    }

    return await validator.validate(content);
  }

  getTemplates(): RuleTemplate[] {
    return listTemplates();
  }

  async createFromTemplate(templateName: string, name: string, customContent?: string): Promise<ValidationResult> {
    const template = getTemplate(templateName);

    if (!template) {
      return {
        valid: false,
        errors: [`Template not found: ${templateName}`],
        warnings: [],
      };
    }

    const content = customContent || renderTemplate(template, {
      name,
      description: `Custom ${template.displayName.toLowerCase()}`,
    });

    const metadata: RuleMetadata = {
      name,
      displayName: this.formatDisplayName(name),
      type: template.type,
      format: 'markdown',
      description: template.description,
    };

    return this.addRule(metadata, content);
  }

  /**
   * Sync rule(s) to IDE home directories
   * @param ruleNames - Array of rule names to sync, or undefined for all rules
   * @param target - IDE target ('cursor', 'atigravity', 'claudecode', or 'all')
   * @returns Object with success status, synced count, and skipped count
   */
  async syncToIDE(
    ruleNames: string[] | undefined,
    target: IDETarget
  ): Promise<{ success: boolean; synced: number; skipped: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;
    let skipped = 0;

    // Get rules to sync
    const allRules = await this.repository.list();
    const rulesToSync = ruleNames
      ? allRules.filter(r => ruleNames.includes(r.name))
      : allRules;

    if (rulesToSync.length === 0) {
      return { success: false, synced: 0, skipped: 0, errors: ['No rules found to sync'] };
    }

    // Get target IDEs
    const targets = target === 'all' ? getAllIDEConfigs() : [getIDEConfig(target)].filter(Boolean);

    if (targets.length === 0) {
      return { success: false, synced: 0, skipped: 0, errors: ['No valid IDE targets'] };
    }

    // Sync to each target
    for (const ideConfig of targets) {
      if (!ideConfig) continue;

      const targetDir = ideConfig.rulesDir;

      // Create target directory if it doesn't exist
      if (!existsSync(targetDir)) {
        try {
          mkdirSync(targetDir, { recursive: true, mode: 0o755 });
        } catch (error) {
          errors.push(
            `Failed to create directory ${targetDir}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          continue;
        }
      }

      // Copy each rule
      for (const rule of rulesToSync) {
        const targetPath = join(targetDir, `${rule.name}.txt`);

        // Skip if file already exists
        if (existsSync(targetPath)) {
          skipped++;
          continue;
        }

        try {
          copyFileSync(rule.filePath, targetPath);
          synced++;
        } catch (error) {
          errors.push(
            `Failed to copy ${rule.name} to ${ideConfig.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    return {
      success: errors.length === 0,
      synced,
      skipped,
      errors,
    };
  }

  /**
   * Initialize default rules into the current project
   * @param ruleNames - Array of default rule names to initialize, or undefined for all
   * @returns ValidationResult with success status and any errors
   */
  async initializeDefaults(ruleNames?: string[]): Promise<ValidationResult> {
    const { getDefaultRules, getDefaultRule } = await import('./default-rules.js');
    const errors: string[] = [];
    const warnings: string[] = [];
    let initialized = 0;

    const defaultRules = ruleNames
      ? ruleNames.map(name => getDefaultRule(name)).filter(Boolean) as RuleTemplate[]
      : getDefaultRules();

    if (defaultRules.length === 0) {
      return {
        valid: false,
        errors: ['No default rules found'],
        warnings: [],
      };
    }

    for (const template of defaultRules) {
      // Check if rule already exists
      const existing = await this.repository.exists(template.name);
      if (existing) {
        warnings.push(`Skipped ${template.name} - already exists`);
        continue;
      }

      // Create rule from template
      const result = await this.createFromTemplate(template.name, template.name);

      if (result.valid) {
        initialized++;
      } else {
        errors.push(...result.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [...warnings, `Initialized ${initialized} default rule(s)`],
    };
  }

  private getFormatFromExtension(ext: string): RuleFormat | null {
    const formatMap: Record<string, RuleFormat> = {
      '.md': 'markdown',
      '.markdown': 'markdown',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.json': 'json',
      '.txt': 'text',
      '.rule': 'text',
      '.seo': 'text',
    };

    return formatMap[ext] || null;
  }

  private formatDisplayName(name: string): string {
    return name
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
}

let defaultService: RuleService | null = null;

export function getRuleService(): RuleService {
  if (!defaultService) {
    defaultService = new RuleService();
  }
  return defaultService;
}
