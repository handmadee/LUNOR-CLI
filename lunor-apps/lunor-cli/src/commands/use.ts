import pc from 'picocolors';
import { PresetManager } from '../core/preset-manager.js';
import { ModelRegistry } from '../core/model-registry.js';
import { StateManager } from '../core/state-manager.js';
import { AnalyticsService } from '../services/analytics-service.js';
import { createError, ErrorCodes } from '../utils/errors.js';
import { prompts } from '../utils/prompts.js';
import { ui } from '../utils/ui.js';
import { PATHS } from '../constants/paths.js';
import { ANTHROPIC_BASE_URLS, DEFAULT_ANTHROPIC_BASE_URL } from '../constants/base-urls.js';
import { getNextFreeModelKey, maskKey } from '../core/key-rotator.js';

export async function useCommand(presetName: string): Promise<void> {
  const presetManager = new PresetManager();
  const registry = new ModelRegistry();
  const stateManager = new StateManager(PATHS.stateFile);
  const analytics = new AnalyticsService(PATHS.analyticsDb);

  const endpoint = ANTHROPIC_BASE_URLS.find((option) => option.id === presetName);
  
  // For endpoint-only names (agentrouter, freemodel, etc.), map to a base preset
  const isKnownEndpoint = ['agentrouter', 'freemodel', 'claude-t0', 'claude-t1'].includes(presetName);
  const effectivePresetName = presetName === 'agentrouter' ? 'agentrouter' : (endpoint ? 'claude' : (isKnownEndpoint ? 'claude' : presetName));
  const preset = presetManager.getPreset(effectivePresetName);
  
  if (!preset) {
    throw createError(
      ErrorCodes.INVALID_PRESET,
      `Preset '${presetName}' not found`,
      `Run: lunor presets list${endpoint ? '' : ' or lunor endpoints'}`
    );
  }

  const modelsToValidate = [preset.opus, preset.sonnet, preset.haiku];
  for (const model of modelsToValidate) {
    if (!registry.isValidModel(model)) {
      throw createError(
        ErrorCodes.INVALID_MODEL,
        `Model '${model}' not found in registry`,
        'Run: lunor list to see available models'
      );
    }
  }

  let endpointId = endpoint?.id;
  if (!endpointId) {
    if (presetName.startsWith('cliproxy-') || presetName === 'cliproxy') {
      endpointId = 'cliproxy';
    } else if (presetName.startsWith('mimo-') || presetName === 'mimo') {
      endpointId = 'mimo';
    } else if (presetName === 'agentrouter') {
      endpointId = 'agentrouter';
    } else if (presetName === 'freemodel') {
      endpointId = 'freemodel';
    }
  }

  const finalEndpoint = endpointId || 'claude-t0';
  let finalBaseUrl = endpoint?.url;
  if (!finalBaseUrl && finalEndpoint) {
    const opt = ANTHROPIC_BASE_URLS.find(o => o.id === finalEndpoint);
    if (opt) finalBaseUrl = opt.url;
  }
  if (!finalBaseUrl) {
    finalBaseUrl = DEFAULT_ANTHROPIC_BASE_URL;
  }

  const existingState = stateManager.getState();
  const isFreeModel = presetName === 'freemodel' || presetName === 'claude-t0' || presetName === 'claude-t1' || finalEndpoint === 'freemodel' || finalEndpoint === 'claude-t0' || finalEndpoint === 'claude-t1';
  const rotatedKey = isFreeModel ? getNextFreeModelKey(existingState?.freeModelKey) : undefined;

  const newState = {
    currentPreset: effectivePresetName,
    endpoint: finalEndpoint,
    baseUrl: finalBaseUrl,
    opus: preset.opus,
    sonnet: preset.sonnet,
    haiku: preset.haiku,
    lastUpdated: new Date().toISOString(),
    freeModelKey: isFreeModel ? rotatedKey : existingState?.freeModelKey,
  };

  stateManager.setState(newState);

  const opusInfo = registry.getModel(preset.opus);
  if (opusInfo) {
    analytics.recordUsage({
      timestamp: new Date().toISOString(),
      action: 'use',
      preset: effectivePresetName,
      model: preset.opus,
      provider: opusInfo.provider,
    });
  }

  prompts.intro('PRESET ACTIVATED');

  ui.section(`${effectivePresetName.toUpperCase()} · ${(endpoint?.id || 'claude-t0').toUpperCase()}`);
  
  console.log(`  ${pc.yellow('OPUS')}   ${pc.dim('|')} ${preset.opus}`);
  console.log(`  ${pc.blue('SONNET')} ${pc.dim('|')} ${preset.sonnet}`);
  console.log(`  ${pc.green('HAIKU')}  ${pc.dim('|')} ${preset.haiku}`);
  console.log(`  ${pc.magenta('ENDPOINT')} ${pc.dim('|')} ${endpoint?.url || DEFAULT_ANTHROPIC_BASE_URL}`);
  if (isFreeModel && rotatedKey) {
    console.log(`  ${pc.cyan('API KEY')}  ${pc.dim('|')} ${maskKey(rotatedKey)} (Rotated)`);
  }
  console.log();
  
  if (preset.description) {
    console.log();
    console.log(pc.dim(`  ${preset.description}`));
  }

  console.log();
  ui.section('Next Steps');
  console.log(`  ${pc.dim('-')} Restart shell or run: ${pc.cyan('source ~/.zshrc')}`);
  console.log(`  ${pc.dim('-')} Check status: ${pc.cyan('lunor status')}`);
  console.log();

  analytics.close();
}
