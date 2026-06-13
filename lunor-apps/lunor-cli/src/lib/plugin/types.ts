/**
 * Plugin Marketplace types for LUNOR-CLI
 * 
 * Supports Claude Code Plugin Marketplace pattern:
 *   /plugin marketplace add mrgoonie/claudekit-skills
 *   /plugin install ai-ml-tools@claudekit-skills
 */

export interface MarketplaceRepo {
  readonly owner: string;
  readonly repo: string;
  /** Full identifier e.g. "mrgoonie/claudekit-skills" */
  readonly fullName: string;
  /** Resolved alias (last part of repo name) e.g. "claudekit-skills" */
  readonly alias: string;
  /** Path on disk where repo is cloned: ~/.config/lunor/plugins/<fullName> */
  readonly localPath: string;
  readonly addedAt: string;
  readonly availableCategories?: string[];
}

export interface PluginManifest {
  readonly version: string;
  readonly repos: MarketplaceRepo[];
}

/** Parsed from "ai-ml-tools@claudekit-skills" */
export interface PluginInstallSpec {
  readonly category: string;
  readonly repoAlias: string;
}

export const PLUGIN_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'ai-ml-tools':          'AI/ML — Gemini API, context-engineering, Google ADK',
  'web-dev-tools':        'Web Dev — React, Next.js, Tailwind, Three.js',
  'devops-tools':         'DevOps — Cloudflare, Docker, GCP, Databases',
  'backend-tools':        'Backend — Node.js, Python, Go, Authentication',
  'document-processing':  'Documents — Word, PDF, PowerPoint, Excel',
  'debugging-tools':      'Debugging — Systematic frameworks',
  'problem-solving-tools':'Problem Solving — Advanced thinking techniques',
  'platform-tools':       'Platforms — Shopify, Payments, MCP management',
  'meta-tools':           'Meta — Skill creation, code review',
  'media-tools':          'Media — FFmpeg, ImageMagick',
  'research-tools':       'Research — Documentation discovery',
  'specialized-tools':    'Specialized — Sequential thinking, Mermaid diagrams',
};
