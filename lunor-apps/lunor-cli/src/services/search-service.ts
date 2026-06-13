import Fuse from 'fuse.js';
import type { ModelInfo, Preset } from '../types/index.js';

export class SearchService {
  searchModels(models: ModelInfo[], query: string): ModelInfo[] {
    const fuse = new Fuse(models, {
      keys: ['name', 'provider'],
      threshold: 0.3,
      includeScore: true,
    });

    const results = fuse.search(query);
    return results.map((result) => result.item);
  }

  searchPresets(presets: Preset[], query: string): Preset[] {
    const fuse = new Fuse(presets, {
      keys: ['name', 'description', 'tags'],
      threshold: 0.4,
      includeScore: true,
    });

    const results = fuse.search(query);
    return results.map((result) => result.item);
  }

  filterModelsByProvider(models: ModelInfo[], provider: string): ModelInfo[] {
    const lowerProvider = provider.toLowerCase();
    return models.filter((m) => m.provider.toLowerCase() === lowerProvider);
  }
}
