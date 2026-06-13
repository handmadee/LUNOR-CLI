import type { Preset } from '../types/index.js';

export class PresetManager {
  private presets: Map<string, Preset>;

  constructor() {
    this.presets = new Map();
    this.initializePresets();
  }

  private initializePresets(): void {
    const defaultPresets: Preset[] = [
      // ── Use-Case Presets ──────────────────────────────────
      {
        name: 'coding',
        description: 'Best coding stack: Opus 4.6 + Codex Max + Sonnet 4.6',
        opus: 'claude-opus-4-1-20250805',
        sonnet: 'gpt-5.1-codex-max',
        haiku: 'claude-sonnet-4-5-20250929',
        tags: ['coding', 'development'],
      },
      {
        name: 'coding-claude',
        description: 'Full Claude stack for coding',
        opus: 'claude-opus-4-1-20250805',
        sonnet: 'claude-sonnet-4-5-20250929',
        haiku: 'claude-sonnet-4-5-20250929',
        tags: ['coding', 'claude'],
      },
      {
        name: 'coding-codex',
        description: 'Full GPT Codex stack for coding',
        opus: 'gpt-5.1-codex-max',
        sonnet: 'gpt-5.3-codex',
        haiku: 'gpt-5.1-codex-mini',
        tags: ['coding', 'gpt', 'codex'],
      },
      {
        name: 'research',
        description: 'Deep research & analysis: reasoning-heavy models',
        opus: 'gemini-3.1-pro-high',
        sonnet: 'deepseek-v3.2-reasoner',
        haiku: 'qwen3-235b-a22b-thinking-2507',
        tags: ['research', 'analysis', 'deep-thinking'],
      },
      {
        name: 'reasoning',
        description: 'Complex reasoning & problem solving',
        opus: 'claude-opus-4-1-20250805',
        sonnet: 'deepseek-v3.2-reasoner',
        haiku: 'claude-sonnet-4-5-20250929',
        tags: ['reasoning', 'thinking', 'logic'],
      },
      {
        name: 'writing',
        description: 'Creative writing, content & copywriting',
        opus: 'claude-opus-4-1-20250805',
        sonnet: 'gemini-3.1-pro-high',
        haiku: 'gpt-5.2',
        tags: ['writing', 'content', 'creative'],
      },

      // ── Provider Presets ──────────────────────────────────
      {
        name: 'gpt',
        description: 'GPT models (5.2 → 5.1 → 5)',
        opus: 'gpt-5.2',
        sonnet: 'gpt-5.1',
        haiku: 'gpt-5',
        tags: ['gpt'],
      },
      {
        name: 'gpt-latest',
        description: 'Latest GPT models (5.4-codex → 5.3-codex-spark → 5.4)',
        opus: 'gpt-5.4-codex',
        sonnet: 'gpt-5.3-codex-spark',
        haiku: 'gpt-5.4',
        tags: ['gpt', 'latest'],
      },
      {
        name: 'gpt-oss',
        description: 'GPT OSS open-weights stack (oss-120b → 5.2 → 5)',
        opus: 'gpt-oss-120b-medium',
        sonnet: 'gpt-5.2',
        haiku: 'gpt-5',
        tags: ['gpt', 'oss', 'open-source'],
      },
      {
        name: 'gpt-codex',
        description: 'Full GPT Codex stack (5.4-codex → 5.1-codex-max → 5.1-codex-mini)',
        opus: 'gpt-5.4-codex',
        sonnet: 'gpt-5.1-codex-max',
        haiku: 'gpt-5.1-codex-mini',
        tags: ['gpt', 'codex', 'coding'],
      },
      {
        name: 'claude',
        description: 'Claude models (Opus 4.6 + Sonnet 4.6)',
        opus: 'claude-opus-4-1-20250805',
        sonnet: 'claude-sonnet-4-5-20250929',
        haiku: 'claude-sonnet-4-5-20250929',
        tags: ['claude'],
      },
      {
        name: 'gemini',
        description: 'Gemini models (3.1 Pro → 2.5 Flash)',
        opus: 'gemini-3.1-pro-high',
        sonnet: 'gemini-2.5-flash',
        haiku: 'gemini-2.5-flash-lite',
        tags: ['gemini'],
      },
      {
        name: 'deepseek',
        description: 'DeepSeek models (v3.2 stack)',
        opus: 'deepseek-v3.2-reasoner',
        sonnet: 'deepseek-v3.2',
        haiku: 'deepseek-v3.2-chat',
        tags: ['deepseek'],
      },
      {
        name: 'qwen',
        description: 'Qwen models (235B → Coder)',
        opus: 'qwen3-235b-a22b-thinking-2507',
        sonnet: 'qwen3-coder-plus',
        haiku: 'qwen3-coder-flash',
        tags: ['qwen'],
      },

      {
        name: 'mimo',
        description: 'MiMo models (V2.5-Pro → V2.5 → V2-Pro)',
        opus: 'mimo-v2.5-pro',
        sonnet: 'mimo-v2.5',
        haiku: 'mimo-v2-pro',
        tags: ['mimo', 'xiaomi'],
      },
      {
        name: 'agentrouter',
        description: 'Recommended stack for Agent Router gateway (Opus 4.6 + DeepSeek V4 Pro + Haiku 4.5)',
        opus: 'claude-opus-4-6',
        sonnet: 'deepseek-v4-pro',
        haiku: 'claude-haiku-4-5-20251001',
        tags: ['agentrouter', 'recommended'],
      },
      {
        name: 'agentrouter-claude',
        description: 'Full Claude stack on Agent Router (Opus 4.6 + Haiku 4.5)',
        opus: 'claude-opus-4-6',
        sonnet: 'claude-haiku-4-5-20251001',
        haiku: 'claude-haiku-4-5-20251001',
        tags: ['agentrouter', 'claude'],
      },
      {
        name: 'agentrouter-deepseek',
        description: 'DeepSeek stack on Agent Router (V4 Pro + V4 Flash)',
        opus: 'deepseek-v4-pro',
        sonnet: 'deepseek-v4-pro',
        haiku: 'deepseek-v4-flash',
        tags: ['agentrouter', 'deepseek'],
      },
      {
        name: 'cliproxy-claude',
        description: 'Claude Stack powered by CLIPPROXY Cloud (Latest)',
        opus: 'claude-opus-4-6-thinking',
        sonnet: 'claude-sonnet-4-6',
        haiku: 'gemini-3.5-flash-low',
        tags: ['cliproxy', 'claude'],
      },
      {
        name: 'cliproxy-codex',
        description: 'Codex GPT-5 Stack powered by CLIPPROXY Cloud (Latest)',
        opus: 'gpt-5.5',
        sonnet: 'gpt-5.3-codex',
        haiku: 'gpt-5.4-mini',
        tags: ['cliproxy', 'codex', 'gpt'],
      },

      // ── Speed & Specialty Presets ─────────────────────────
      {
        name: 'fast',
        description: 'Fastest response models for quick tasks',
        opus: 'gemini-3-flash-preview',
        sonnet: 'gemini-2.5-flash',
        haiku: 'gemini-2.5-flash-lite',
        tags: ['fast', 'speed'],
      },
      {
        name: 'vision',
        description: 'Vision & multimodal models',
        opus: 'gemini-3-pro-image-preview',
        sonnet: 'qwen3-vl-plus',
        haiku: 'vision-model',
        tags: ['vision', 'multimodal'],
      },
    ];

    for (const preset of defaultPresets) {
      this.presets.set(preset.name, preset);
    }
  }

  getPreset(name: string): Preset | undefined {
    return this.presets.get(name);
  }

  getAllPresets(): Preset[] {
    return Array.from(this.presets.values());
  }

  addPreset(preset: Preset): void {
    this.presets.set(preset.name, preset);
  }

  removePreset(name: string): boolean {
    return this.presets.delete(name);
  }

  isValidPreset(name: string): boolean {
    return this.presets.has(name);
  }

  searchPresets(query: string): Preset[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllPresets().filter(
      (preset) =>
        preset.name.toLowerCase().includes(lowerQuery) ||
        preset.description?.toLowerCase().includes(lowerQuery) ||
        preset.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }
}
