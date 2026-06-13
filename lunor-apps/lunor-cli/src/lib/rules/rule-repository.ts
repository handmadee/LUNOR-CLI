import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import type { IRuleRepository, Rule, RuleFormat } from './types.js';

export class RuleRepository implements IRuleRepository {
  private readonly rulesDir: string;

  constructor(rulesDir?: string) {
    this.rulesDir = rulesDir ?? join(process.cwd(), '.cursor', 'rules');
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!existsSync(this.rulesDir)) {
      mkdirSync(this.rulesDir, { recursive: true, mode: 0o755 });
    }
  }

  getRulesDir(): string {
    return this.rulesDir;
  }

  async list(): Promise<Rule[]> {
    const files = readdirSync(this.rulesDir);
    const rules: Rule[] = [];

    for (const file of files) {
      const filePath = join(this.rulesDir, file);
      const stats = statSync(filePath);

      if (!stats.isFile()) continue;

      try {
        const rule = await this.loadRuleFromFile(file, filePath, stats);
        if (rule) rules.push(rule);
      } catch (error) {
        console.warn(`Failed to load rule: ${file}`, error);
      }
    }

    return rules.sort((a, b) => a.name.localeCompare(b.name));
  }

  private async loadRuleFromFile(fileName: string, filePath: string, stats: any): Promise<Rule | null> {
    const ext = extname(fileName).toLowerCase();
    const format = this.getFormatFromExtension(ext);
    
    if (!format) return null;

    const content = readFileSync(filePath, 'utf-8');
    const name = basename(fileName, ext);

    const metadata = await this.extractMetadataAsync(content, format);

    return {
      name,
      displayName: metadata.displayName || this.formatDisplayName(name),
      type: metadata.type || this.inferType(name, content),
      format,
      content,
      filePath,
      size: stats.size,
      description: metadata.description,
      tags: metadata.tags,
      version: metadata.version,
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
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

  private async extractMetadataAsync(content: string, format: RuleFormat): Promise<Partial<Rule>> {
    if (format === 'markdown') {
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        try {
          const yaml = await import('js-yaml');
          return yaml.load(match[1]) || {};
        } catch {
          return {};
        }
      }
    }

    if (format === 'yaml') {
      try {
        const yaml = await import('js-yaml');
        const data = yaml.load(content);
        return data || {};
      } catch {
        return {};
      }
    }

    if (format === 'json') {
      try {
        return JSON.parse(content);
      } catch {
        return {};
      }
    }

    return {};
  }

  private extractMetadata(content: string, format: RuleFormat): Partial<Rule> {
    if (format === 'json') {
      try {
        return JSON.parse(content);
      } catch {
        return {};
      }
    }
    return {};
  }

  private formatDisplayName(name: string): string {
    return name
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  private inferType(name: string, content: string): Rule['type'] {
    const lowerName = name.toLowerCase();
    const lowerContent = content.toLowerCase().substring(0, 500);

    if (lowerName.includes('next') || lowerContent.includes('next.js')) return 'framework';
    if (lowerName.includes('nest') || lowerContent.includes('nestjs')) return 'framework';
    if (lowerName.includes('react') || lowerContent.includes('react')) return 'framework';
    if (lowerName.includes('style') || lowerName.includes('format')) return 'code-style';
    if (lowerName.includes('cursor') || lowerName.includes('rule')) return 'cursor';

    return 'custom';
  }

  async get(name: string): Promise<Rule | null> {
    const rules = await this.list();
    return rules.find(r => r.name === name) || null;
  }

  async add(rule: Omit<Rule, 'createdAt' | 'updatedAt'>): Promise<void> {
    const ext = this.getExtensionFromFormat(rule.format);
    const filePath = join(this.rulesDir, `${rule.name}${ext}`);

    if (existsSync(filePath)) {
      throw new Error(`Rule already exists: ${rule.name}`);
    }

    writeFileSync(filePath, rule.content, { mode: 0o644 });
  }

  async update(name: string, content: string): Promise<void> {
    const rule = await this.get(name);
    if (!rule) {
      throw new Error(`Rule not found: ${name}`);
    }

    writeFileSync(rule.filePath, content, { mode: 0o644 });
  }

  async remove(name: string): Promise<void> {
    const rule = await this.get(name);
    if (!rule) {
      throw new Error(`Rule not found: ${name}`);
    }

    unlinkSync(rule.filePath);
  }

  async exists(name: string): Promise<boolean> {
    const rule = await this.get(name);
    return rule !== null;
  }

  private getExtensionFromFormat(format: RuleFormat): string {
    const extMap: Record<RuleFormat, string> = {
      markdown: '.md',
      yaml: '.yaml',
      json: '.json',
      text: '.txt',
    };

    return extMap[format] || '.txt';
  }
}
