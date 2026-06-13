import type { AnySourceConfig, LocalSourceConfig, GitHubSourceConfig, ExtendedSourceConfig } from './types.js';

interface ExtendedLocalSourceConfig extends LocalSourceConfig {
  readonly extended?: ExtendedSourceConfig;
}

interface ExtendedGitHubSourceConfig extends GitHubSourceConfig {
  readonly extended?: ExtendedSourceConfig;
}

type ExtendedAnySourceConfig = ExtendedLocalSourceConfig | ExtendedGitHubSourceConfig;

const createLocalSource = (
  name: string,
  displayName: string,
  path: string,
  description?: string,
  extended?: ExtendedSourceConfig
): ExtendedLocalSourceConfig => ({
  name,
  displayName,
  type: 'local',
  path,
  description,
  extended,
});

const createGitHubSource = (
  name: string,
  displayName: string,
  repo: string,
  branch: string = 'main',
  description?: string,
  extended?: ExtendedSourceConfig
): ExtendedGitHubSourceConfig => ({
  name,
  displayName,
  type: 'github',
  repo,
  branch,
  description,
  extended,
});


export const SKILL_SOURCES: Record<string, ExtendedAnySourceConfig> = {
  'engineering': createLocalSource(
    'claudekit-engineering',
    'LUNOR Engineering',
    '/Users/admin/Dev_HQ/Personal/Startups/LUNOR KIT/claudekit-engineering',
    'Professional engineering toolkit with agents, skills, and workflows',
    {
      supportsIdeSelection: true,
      category: 'lunor',
      stars: 'local',
      skillCount: 'internal engineering kit',
      priority: 10,
      rootFiles: ['CLAUDE.md', 'GEMINI.md', '.gitignore', '.coverage', 'AGENT.md'],
      githubRepo: undefined, // Local only for now
    }
  ),

  'lunor-domain-kits': createLocalSource(
    'lunor-domain-kits',
    'LUNOR Domain Skill Kits',
    '/Users/admin/Dev_HQ/Personal/Startups/LUNOR KIT/LUNOR-CLI/.agents',
    'Canonical LUNOR-owned project/domain/extension/provider/workflow kits for ecommerce, extensions, backend, security, and delivery',
    {
      supportsIdeSelection: true,
      category: 'lunor',
      stars: 'local',
      skillCount: 'domain kits',
      priority: 20,
      rootFiles: ['AGENTS.md'],
      skillsRootDir: 'skills',
    }
  ),

  'codex-kit': createLocalSource(
    'codex-kit',
    'Codex Kit',
    '/Users/admin/Dev_HQ/Personal/Startups/LUNOR KIT/agentic-frameworks/codex-kit',
    'LUNOR-owned Codex Kit with 25 skills, steering docs, memory/runtime templates, and the 7-stage harmet chain',
    {
      category: 'lunor',
      stars: 'local',
      skillCount: '25 skills · 7 harmet stages',
      priority: 25,
      rootFiles: ['AGENTS.md'],
      skillsRootDir: '.agents/skills',
      defaultTargetFolder: '.agents',
    }
  ),

  'ui-ux': createGitHubSource(
    'ui-ux-pro-max-skill',
    'LUNOR UX/UI PROMAX',
    'nextlevelbuilder/ui-ux-pro-max-skill',
    'main',
    'Comprehensive UI/UX design intelligence with 50+ styles and patterns',
    {
      supportsAiSelection: true,
      category: 'lunor',
      stars: 'local',
      skillCount: '50+ design patterns',
      priority: 30,
      rootFiles: ['.gitignore'],
      githubRepo: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
    }
  ),

  'anthropic-skills': createGitHubSource(
    'anthropic-agent-skills',
    'Anthropic Agent Skills',
    'anthropics/skills',
    'main',
    'Official Anthropic reference repo for Agent Skills, examples, spec, templates, and document skills (~130k+ ⭐)',
    {
      supportsIdeSelection: true,
      category: 'official',
      stars: '130k+',
      skillCount: 'official reference + examples',
      priority: 100,
      rootFiles: [],
      githubRepo: 'https://github.com/anthropics/skills',
      skillsRootDir: 'skills',
      pluginCategories: ['document-skills', 'example-skills'],
    }
  ),

  'vercel-skills': createGitHubSource(
    'vercel-agent-skills',
    'Vercel Agent Skills',
    'vercel-labs/agent-skills',
    'main',
    "Vercel's official collection of agent skills for Claude Code",
    {
      supportsIdeSelection: true,
      category: 'official',
      stars: '26.3k',
      skillCount: 'Vercel web/deploy skills',
      priority: 110,
      rootFiles: [],
      githubRepo: 'https://github.com/vercel-labs/agent-skills',
      skillsRootDir: 'skills',
    }
  ),

  'addyosmani-skills': createGitHubSource(
    'addyosmani-agent-skills',
    'Addy Osmani Agent Skills',
    'addyosmani/agent-skills',
    'main',
    'Production-grade engineering skills across define, plan, build, verify, review, and ship (~32.8k ⭐)',
    {
      supportsIdeSelection: true,
      category: 'engineering',
      stars: '32.8k',
      skillCount: 'engineering lifecycle skills',
      priority: 120,
      rootFiles: ['AGENTS.md', 'CLAUDE.md'],
      githubRepo: 'https://github.com/addyosmani/agent-skills',
      skillsRootDir: 'skills',
    }
  ),

  'trailofbits-skills': createGitHubSource(
    'trailofbits-skills',
    'Trail of Bits Security Skills',
    'trailofbits/skills',
    'main',
    'Security research, vulnerability detection, code auditing, smart contract, and workflow audit skills from Trail of Bits (~5.1k ⭐)',
    {
      supportsIdeSelection: true,
      category: 'security',
      stars: '5.1k',
      skillCount: 'security audit plugins',
      priority: 130,
      rootFiles: ['CLAUDE.md'],
      githubRepo: 'https://github.com/trailofbits/skills',
    }
  ),

  'claudekit-skills': createGitHubSource(
    'claudekit-skills',
    'ClaudeKit Skills',
    'mrgoonie/claudekit-skills',
    'main',
    '40+ powerful agent skills: AI/ML, web-dev, DevOps, debugging, and more (1.8k ⭐)',
    {
      supportsIdeSelection: true,
      category: 'marketplace',
      stars: '1.8k+',
      skillCount: '40+ skills',
      priority: 200,
      rootFiles: [],
      githubRepo: 'https://github.com/mrgoonie/claudekit-skills',
      pluginCategories: [
        'ai-ml-tools',
        'web-dev-tools',
        'devops-tools',
        'backend-tools',
        'document-processing',
        'debugging-tools',
        'problem-solving-tools',
        'platform-tools',
        'meta-tools',
        'media-tools',
        'research-tools',
        'specialized-tools',
      ],
    }
  ),

  'composio-skills': createGitHubSource(
    'awesome-claude-skills',
    'Composio Awesome Claude Skills',
    'ComposioHQ/awesome-claude-skills',
    'master',
    '42.6k ⭐ — 30+ curated skills: document processing, dev tools, business automation, Composio app integrations (Gmail, Slack, GitHub...)',
    {
      supportsIdeSelection: true,
      category: 'marketplace',
      stars: '44k+',
      skillCount: '1000+ curated skills/resources',
      priority: 210,
      rootFiles: [],
      githubRepo: 'https://github.com/ComposioHQ/awesome-claude-skills',
    }
  ),

  'voltagent-awesome-skills': createGitHubSource(
    'awesome-agent-skills',
    'VoltAgent Awesome Agent Skills',
    'VoltAgent/awesome-agent-skills',
    'main',
    'Hand-picked collection of 1000+ official and community agent skills from Anthropic, Vercel, Stripe, Cloudflare, Trail of Bits, Sentry, Expo, Hugging Face, Figma, and more (~13k+ ⭐)',
    {
      supportsIdeSelection: true,
      category: 'marketplace',
      stars: '13k+',
      skillCount: '1000+ curated skills',
      priority: 215,
      rootFiles: [],
      githubRepo: 'https://github.com/VoltAgent/awesome-agent-skills',
    }
  ),

  'marketing-skills': createGitHubSource(
    'marketingskills',
    'Marketing Skills',
    'coreyhaines31/marketingskills',
    'main',
    'CRO, copywriting, SEO, analytics, RevOps, launch, pricing, and growth engineering skills for AI agents (~27.2k ⭐)',
    {
      supportsIdeSelection: true,
      category: 'growth',
      stars: '27.2k',
      skillCount: 'growth and marketing skills',
      priority: 216,
      rootFiles: ['AGENTS.md', 'CLAUDE.md'],
      githubRepo: 'https://github.com/coreyhaines31/marketingskills',
      skillsRootDir: 'skills',
    }
  ),

  'antigravity-skills': createGitHubSource(
    'antigravity-awesome-skills',
    'Antigravity Awesome Skills',
    'sickn33/antigravity-awesome-skills',
    'main',
    '23.1k ⭐ — 1,239+ universal agentic skills for Claude Code, Gemini CLI, Antigravity, Cursor, Codex & more (v7.4.1)',
    {
      supportsIdeSelection: true,
      category: 'marketplace',
      stars: '23k+',
      skillCount: '1,445+ skills',
      priority: 220,
      rootFiles: [],
      githubRepo: 'https://github.com/sickn33/antigravity-awesome-skills',
      skillsRootDir: 'skills',
    }
  ),

  'wshobson-agents': createGitHubSource(
    'wshobson-agents',
    'wshobson Claude Agents',
    'wshobson/agents',
    'main',
    'Large Claude Code plugin/orchestration system with specialized agents, commands, workflows, and 150+ skills',
    {
      supportsIdeSelection: true,
      category: 'orchestration',
      stars: 'public',
      skillCount: '150+ skills / 185 agents',
      priority: 300,
      rootFiles: ['AGENTS.md', 'CLAUDE.md'],
      githubRepo: 'https://github.com/wshobson/agents',
    }
  ),

  'simota-agent-skills': createGitHubSource(
    'simota-agent-skills',
    'Simota Agent Skills',
    'simota/agent-skills',
    'main',
    '136 specialized agent skills with orchestration, testing, security, UI/UX, observability, FinOps, and compliance domains',
    {
      supportsIdeSelection: true,
      category: 'orchestration',
      stars: 'public',
      skillCount: '136 agents',
      priority: 310,
      rootFiles: [],
      githubRepo: 'https://github.com/simota/agent-skills',
      skillsRootDir: 'skills',
    }
  ),
};

export function getSourceConfig(name: string): ExtendedAnySourceConfig | undefined {
  return SKILL_SOURCES[name];
}

export function getAllSourceConfigs(): ExtendedAnySourceConfig[] {
  return Object.values(SKILL_SOURCES);
}

export function getSourceNames(): string[] {
  return Object.keys(SKILL_SOURCES).sort((a, b) => {
    const left = SKILL_SOURCES[a].extended?.priority ?? 999;
    const right = SKILL_SOURCES[b].extended?.priority ?? 999;
    return left - right || a.localeCompare(b);
  });
}

export function isLocalSource(config: AnySourceConfig): config is LocalSourceConfig {
  return config.type === 'local';
}

export function isGitHubSource(config: AnySourceConfig): config is GitHubSourceConfig {
  return config.type === 'github';
}

export function updateSkillSource(name: string, config: ExtendedAnySourceConfig): void {
  SKILL_SOURCES[name] = config;
}

export function hasIdeSelection(name: string): boolean {
  const config = SKILL_SOURCES[name];
  return config?.extended?.supportsIdeSelection ?? false;
}

export function hasAiSelection(name: string): boolean {
  const config = SKILL_SOURCES[name];
  return config?.extended?.supportsAiSelection ?? false;
}

export function getGitHubRepo(name: string): string | undefined {
  const config = SKILL_SOURCES[name];
  return config?.extended?.githubRepo;
}

export function getRootFiles(name: string): string[] {
  const config = SKILL_SOURCES[name];
  return config?.extended?.rootFiles ?? [];
}

export function getPluginCategories(name: string): string[] {
  const config = SKILL_SOURCES[name];
  return config?.extended?.pluginCategories ?? [];
}

export function hasPluginCategories(name: string): boolean {
  return getPluginCategories(name).length > 0;
}

/** Returns the root skills folder name (e.g. "skills") when a source stores skills
 *  at the repo root instead of in IDE-specific subfolders. */
export function getSkillsRootDir(name: string): string | undefined {
  const config = SKILL_SOURCES[name];
  return config?.extended?.skillsRootDir;
}

export function getDefaultTargetFolder(name: string): string | undefined {
  const config = SKILL_SOURCES[name];
  return config?.extended?.defaultTargetFolder;
}
