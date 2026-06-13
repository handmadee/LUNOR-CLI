import type { ModelInfo, Provider } from '../types/index.js';

export class ModelRegistry {
  private models: Map<string, Provider>;

  constructor() {
    this.models = new Map();
    this.initializeModels();
  }

  private initializeModels(): void {
    const modelList: Record<string, Provider> = {
      // GPT - 14 models
      'gpt-5.5': 'GPT',
      'gpt-5.4': 'GPT',
      'gpt-5.4-mini': 'GPT',
      'gpt-5.4-codex': 'GPT',
      'gpt-5.3-codex-spark': 'GPT',
      'gpt-5.3-codex': 'GPT',
      'gpt-5.2-codex': 'GPT',
      'gpt-5.2': 'GPT',
      'gpt-5.1-codex-max': 'GPT',
      'gpt-5.1-codex': 'GPT',
      'gpt-5.1-codex-mini': 'GPT',
      'gpt-5.1': 'GPT',
      'gpt-5-codex': 'GPT',
      'gpt-5-codex-mini': 'GPT',
      'gpt-5': 'GPT',
      'gpt-oss-120b-medium': 'GPT',
      'codex-auto-review': 'GPT',

      // Claude - Claude Code / Anthropic native IDs
      'claude-haiku-4-5-20251001': 'Claude',
      'claude-opus-4-6': 'Claude',
      'claude-opus-4-1-20250805': 'Claude',
      'claude-sonnet-4-5-20250929': 'Claude',
      'claude-3-5-haiku-20241022': 'Claude',

      // Gemini - 14 models
      'gemini-3.1-pro-high': 'Gemini',
      'gemini-3.1-pro-low': 'Gemini',
      'gemini-3-pro-preview': 'Gemini',
      'gemini-3-pro-image-preview': 'Gemini',
      'gemini-3-flash-preview': 'Gemini',
      'gemini-2.5-pro': 'Gemini',
      'gemini-2.5-flash': 'Gemini',
      'gemini-2.5-flash-lite': 'Gemini',
      'UNTRAL/gemini-3-pro-preview': 'Gemini',
      'UNTRAL/gemini-3-pro-image-preview': 'Gemini',
      'UNTRAL/gemini-3-flash-preview': 'Gemini',
      'UNTRAL/gemini-2.5-pro': 'Gemini',
      'UNTRAL/gemini-2.5-flash': 'Gemini',
      'UNTRAL/gemini-2.5-flash-lite': 'Gemini',

      // Kimi - 4 models
      'kimi-k2': 'Kimi',
      'kimi-k2-thinking': 'Kimi',
      'kimi-k2.5': 'Kimi',
      'kimi-k2-0905': 'Kimi',

      // Qwen - 9 models
      'qwen3-235b': 'Qwen',
      'qwen3-235b-a22b-thinking-2507': 'Qwen',
      'qwen3-235b-a22b-instruct': 'Qwen',
      'qwen3-max-preview': 'Qwen',
      'qwen3-max': 'Qwen',
      'qwen3-vl-plus': 'Qwen',
      'qwen3-coder-plus': 'Qwen',
      'qwen3-coder-flash': 'Qwen',
      'qwen3-32b': 'Qwen',

      // GLM - 3 models
      'glm-5.1': 'GLM',
      'glm-5': 'GLM',
      'glm-4.7': 'GLM',
      'glm-4.6': 'GLM',

      // DeepSeek - 6 models
      'deepseek-v4-flash': 'DeepSeek',
      'deepseek-v4-pro': 'DeepSeek',
      'deepseek-v3.2': 'DeepSeek',
      'deepseek-v3.2-chat': 'DeepSeek',
      'deepseek-v3.2-reasoner': 'DeepSeek',
      'deepseek-v3.1': 'DeepSeek',
      'deepseek-v3': 'DeepSeek',
      'deepseek-r1': 'DeepSeek',

      // MiniMax - 3 models
      'minimax-m2.5': 'MiniMax',
      'minimax-m2.1': 'MiniMax',
      'minimax-m2': 'MiniMax',

      // MiMo - 8 models
      'mimo-v2.5-pro': 'MiMo',
      'mimo-v2.5': 'MiMo',
      'mimo-v2.5-tts-voiceclone': 'MiMo',
      'mimo-v2.5-tts-voicedesign': 'MiMo',
      'mimo-v2.5-tts': 'MiMo',
      'mimo-v2-pro': 'MiMo',
      'mimo-v2-omni': 'MiMo',
      'mimo-v2-tts': 'MiMo',

      // Other - 6 models
      'coder-model': 'Other',
      'vision-model': 'Other',
      'iflow-rome-30ba3b': 'Other',
      'tab_jump_flash_lite_preview': 'Other',
      'tab_flash_lite_preview': 'Other',
      'tstars2.0': 'Other',
    };

    for (const [model, provider] of Object.entries(modelList)) {
      this.models.set(model, provider);
    }
  }

  getModel(name: string): ModelInfo | undefined {
    const provider = this.models.get(name);
    if (!provider) return undefined;
    return { name, provider };
  }

  getAllModels(): ModelInfo[] {
    return Array.from(this.models.entries()).map(([name, provider]) => ({
      name,
      provider,
    }));
  }

  getModelsByProvider(provider: Provider): ModelInfo[] {
    return this.getAllModels().filter((m) => m.provider === provider);
  }

  isValidModel(name: string): boolean {
    return this.models.has(name);
  }

  getProviders(): Provider[] {
    return ['GPT', 'Claude', 'Gemini', 'Kimi', 'Qwen', 'GLM', 'DeepSeek', 'MiniMax', 'MiMo', 'Other'];
  }
}
