import pc from 'picocolors';
import { StateManager } from '../core/state-manager.js';
import { prompts } from '../utils/prompts.js';
import { ui } from '../utils/ui.js';
import { PATHS } from '../constants/paths.js';

export async function showCommand(): Promise<void> {
  const stateManager = new StateManager(PATHS.stateFile);

  const state = stateManager.getState();

  if (!state) {
    console.log();
    console.log(pc.yellow('[!] No active configuration found'));
    console.log(pc.dim('    Run: lunor use <preset> to activate'));
    console.log();
    return;
  }

  const timestamp = new Date(state.lastUpdated).toLocaleString();
  const profile = state.currentPreset || 'custom';

  prompts.intro('LUNOR CONFIGURATION STATUS');

  ui.section('Profile Information');
  console.log(`  ${pc.dim('Name:')}      ${pc.magenta(pc.bold(profile))}`);
  console.log(`  ${pc.dim('Updated:')}   ${timestamp}`);

  ui.section('Active Models');
  console.log(`  ${pc.yellow('OPUS')}   ${pc.dim('|')} ${state.opus}`);
  console.log(`  ${pc.blue('SONNET')} ${pc.dim('|')} ${state.sonnet}`);
  console.log(`  ${pc.green('HAIKU')}  ${pc.dim('|')} ${state.haiku}`);
  
  console.log();
  console.log(pc.dim('Tip: Use ') + pc.cyan('lunor use <preset>') + pc.dim(' to switch configurations'));
  console.log();
}
