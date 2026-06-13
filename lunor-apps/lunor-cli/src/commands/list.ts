import pc from 'picocolors';
import { ModelRegistry } from '../core/model-registry.js';
import { SearchService } from '../services/search-service.js';
import type { Provider } from '../types/index.js';
import { ui } from '../utils/ui.js';
import { prompts } from '../utils/prompts.js';

const PROVIDER_COLORS: Record<string, (s: string) => string> = {
  GPT: pc.cyan,
  Claude: pc.magenta,
  Gemini: pc.yellow,
  Kimi: pc.blue,
  Qwen: pc.green,
  GLM: pc.red,
  DeepSeek: pc.cyan,
  MiniMax: pc.blue,
  Other: pc.gray,
};

export async function listCommand(options: {
  provider?: string;
  search?: string;
}): Promise<void> {
  const registry = new ModelRegistry();
  const searchService = new SearchService();

  let models = registry.getAllModels();

  prompts.intro('LUNOR MODEL REGISTRY');

  if (options.search) {
    console.log(`${pc.blue('[i]')} Search: ${pc.bold(options.search)}`);
    console.log();
    models = searchService.searchModels(models, options.search);
  } else if (options.provider) {
    const provider = options.provider as Provider;
    console.log(`${pc.blue('[i]')} Provider: ${pc.bold(provider)}`);
    console.log();
    models = registry.getModelsByProvider(provider);
  }

  if (models.length === 0) {
    console.log(pc.yellow('[!]'), 'No models found');
    console.log();
    return;
  }

  const groupedByProvider: Record<string, string[]> = {};
  
  for (const model of models) {
    if (!groupedByProvider[model.provider]) {
      groupedByProvider[model.provider] = [];
    }
    groupedByProvider[model.provider].push(model.name);
  }

  for (const [provider, modelNames] of Object.entries(groupedByProvider)) {
    const colorFn = PROVIDER_COLORS[provider] || pc.white;
    
    ui.section(provider);
    
    for (const name of modelNames.sort()) {
      const displayName = options.search && name.toLowerCase().includes(options.search.toLowerCase())
        ? name.replace(new RegExp(`(${options.search})`, 'gi'), pc.bgCyan(pc.black('$1')))
        : name;
      
      console.log(`  ${colorFn('[-]')} ${displayName}`);
    }
  }

  console.log();
  console.log(pc.dim('─'.repeat(50)));
  console.log(`${pc.blue('[i]')} Total: ${pc.bold(String(models.length))} models`);
  console.log();
}
