import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { MarketplaceRepo, PluginManifest } from './types.js';
import { PATHS } from '../../constants/paths.js';

const MANIFEST_VERSION = '1.0.0';

/**
 * PluginRegistry — manages marketplace repos added via
 * `lunor plugin marketplace add <owner/repo>`
 *
 * Persists state to ~/.config/lunor/plugins/manifest.json
 *
 * SOLID:
 * - Single Responsibility: only manages manifest persistence
 * - Open/Closed: extensible without modifying existing methods
 */
export class PluginRegistry {
  private readonly manifestPath: string;
  private readonly pluginsDir: string;

  constructor(configDir?: string) {
    const base = configDir ?? PATHS.root;
    this.pluginsDir = join(base, 'plugins');
    this.manifestPath = join(this.pluginsDir, 'manifest.json');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async getManifest(): Promise<PluginManifest> {
    if (!existsSync(this.manifestPath)) {
      return this.createEmptyManifest();
    }

    try {
      const raw = await readFile(this.manifestPath, 'utf-8');
      return JSON.parse(raw) as PluginManifest;
    } catch {
      return this.createEmptyManifest();
    }
  }

  async getRepos(): Promise<MarketplaceRepo[]> {
    const manifest = await this.getManifest();
    return manifest.repos;
  }

  async isAdded(fullName: string): Promise<boolean> {
    const repos = await this.getRepos();
    return repos.some(r => r.fullName === fullName);
  }

  async addRepo(repo: MarketplaceRepo): Promise<void> {
    const manifest = await this.getManifest();
    const existing = manifest.repos.findIndex(r => r.fullName === repo.fullName);

    let updatedRepos: MarketplaceRepo[];
    if (existing >= 0) {
      // Update existing entry (re-add / refresh)
      updatedRepos = [...manifest.repos];
      updatedRepos[existing] = repo;
    } else {
      updatedRepos = [...manifest.repos, repo];
    }

    await this.saveManifest({ ...manifest, repos: updatedRepos });
  }

  async removeRepo(fullName: string): Promise<boolean> {
    const manifest = await this.getManifest();
    const filtered = manifest.repos.filter(r => r.fullName !== fullName);

    if (filtered.length === manifest.repos.length) {
      return false; // not found
    }

    await this.saveManifest({ ...manifest, repos: filtered });
    return true;
  }

  async findRepo(alias: string): Promise<MarketplaceRepo | undefined> {
    const repos = await this.getRepos();
    return repos.find(r => r.alias === alias || r.fullName === alias);
  }

  getRepoLocalPath(fullName: string): string {
    return join(this.pluginsDir, ...fullName.split('/'));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private createEmptyManifest(): PluginManifest {
    return { version: MANIFEST_VERSION, repos: [] };
  }

  private async saveManifest(manifest: PluginManifest): Promise<void> {
    await mkdir(this.pluginsDir, { recursive: true });
    await writeFile(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }
}

// Singleton
let defaultRegistry: PluginRegistry | null = null;

export function getPluginRegistry(): PluginRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new PluginRegistry();
  }
  return defaultRegistry;
}
