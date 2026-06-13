import pc from 'picocolors';
import { ModelRegistry } from '../core/model-registry.js';
import { StateManager } from '../core/state-manager.js';
import { AnalyticsService } from '../services/analytics-service.js';
import { createError, ErrorCodes } from '../utils/errors.js';
import { prompts } from '../utils/prompts.js';
import { ui } from '../utils/ui.js';
import { PATHS } from '../constants/paths.js';

export async function setCommand(modelName: string): Promise<void> {
  const registry = new ModelRegistry();
  const stateManager = new StateManager(PATHS.stateFile);
  const analytics = new AnalyticsService(PATHS.analyticsDb);

  const modelInfo = registry.getModel(modelName);
  
  if (!modelInfo) {
    throw createError(
      ErrorCodes.INVALID_MODEL,
      `Model '${modelName}' not found`,
      'Run: lunor list to see available models'
    );
  }

  const newState = {
    currentPreset: `set:${modelName}`,
    opus: modelName,
    sonnet: modelName,
    haiku: modelName,
    lastUpdated: new Date().toISOString(),
  };

  stateManager.setState(newState);

  analytics.recordUsage({
    timestamp: new Date().toISOString(),
    action: 'set',
    model: modelName,
    provider: modelInfo.provider,
  });

  prompts.intro('MODEL CONFIGURED');

  ui.section('All slots set to');
  console.log(`  ${pc.dim('Model:')}    ${pc.bold(modelName)}`);
  console.log(`  ${pc.dim('Provider:')} ${modelInfo.provider}`);

  ui.section('Next Steps');
  console.log(`  ${pc.dim('-')} Restart shell or run: ${pc.cyan('source ~/.zshrc')}`);
  console.log(`  ${pc.dim('-')} Check status: ${pc.cyan('lunor status')}`);
  console.log();

  analytics.close();
}
