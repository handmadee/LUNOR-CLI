/**
 * Lazy singleton factory for core services.
 *
 * Avoids the repeated `new StateManager(stateFile)` /
 * `new AnalyticsService(analyticsDb)` construction scattered
 * across command files.
 */

import { PATHS } from './paths.js';

// ── Lazy singletons ──────────────────────────────────────────────────────────

let _stateManager: InstanceType<typeof import('../core/state-manager.js').StateManager> | undefined;
let _analytics: InstanceType<typeof import('../services/analytics-service.js').AnalyticsService> | undefined;
let _keyService: InstanceType<typeof import('../services/key-service.js').KeyService> | undefined;

export async function getStateManager() {
  if (!_stateManager) {
    const { StateManager } = await import('../core/state-manager.js');
    _stateManager = new StateManager(PATHS.stateFile);
  }
  return _stateManager;
}

export async function getAnalyticsService() {
  if (!_analytics) {
    const { AnalyticsService } = await import('../services/analytics-service.js');
    _analytics = new AnalyticsService(PATHS.analyticsDb);
  }
  return _analytics;
}

export async function getKeyService() {
  if (!_keyService) {
    const { KeyService } = await import('../services/key-service.js');
    _keyService = new KeyService(PATHS.keyFile);
  }
  return _keyService;
}

/**
 * Close any open resources (e.g. SQLite connections).
 * Call this at program exit if analytics was used.
 */
export function closeAllServices(): void {
  _analytics?.close();
  _analytics = undefined;
}
