import pc from 'picocolors';
import { PresetManager } from '../core/preset-manager.js';
import { ui } from '../utils/ui.js';
import { prompts } from '../utils/prompts.js';

export async function presetsListCommand(): Promise<void> {
  const manager = new PresetManager();
  const presets = manager.getAllPresets();

  if (presets.length === 0) {
    console.log(pc.yellow('[!]'), 'No presets found');
    return;
  }

  prompts.intro('LUNOR PRESET MANAGER');

  console.log();
  console.log(
    `  ${pc.dim('Preset'.padEnd(16))}` +
    `${pc.yellow('OPUS'.padEnd(32))}` +
    `${pc.blue('SONNET'.padEnd(32))}` +
    `${pc.green('HAIKU')}`
  );
  console.log(pc.dim('  ' + '─'.repeat(100)));

  for (const preset of presets.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(
      `  ${pc.magenta(pc.bold(preset.name.padEnd(16)))}` +
      `${pc.dim(preset.opus.padEnd(32))}` +
      `${pc.dim(preset.sonnet.padEnd(32))}` +
      `${pc.dim(preset.haiku)}`
    );
  }

  console.log();
  console.log(pc.dim('─'.repeat(50)));
  console.log(`${pc.blue('[i]')} Total: ${pc.bold(String(presets.length))} presets`);
  console.log();
}

export async function presetsSearchCommand(query: string): Promise<void> {
  const manager = new PresetManager();
  const presets = manager.searchPresets(query);

  if (presets.length === 0) {
    console.log();
    console.log(pc.yellow('[!]'), `No presets found matching: ${pc.cyan(pc.bold(query))}`);
    console.log();
    return;
  }

  prompts.intro('LUNOR PRESET MANAGER');
  console.log(`${pc.blue('[i]')} Search: ${pc.bold(query)}`);

  for (const preset of presets) {
    ui.section(preset.name.toUpperCase());
    
    if (preset.description) {
      console.log(`  ${pc.dim(preset.description)}`);
      console.log();
    }
    
    console.log(`  ${pc.yellow('OPUS')}   ${pc.dim('|')} ${preset.opus}`);
    console.log(`  ${pc.blue('SONNET')} ${pc.dim('|')} ${preset.sonnet}`);
    console.log(`  ${pc.green('HAIKU')}  ${pc.dim('|')} ${preset.haiku}`);
    
    if (preset.tags && preset.tags.length > 0) {
      console.log();
      console.log(`  ${pc.dim('Tags:')} ${preset.tags.map(t => pc.cyan(`#${t}`)).join(' ')}`);
    }
  }

  console.log();
  console.log(pc.dim('─'.repeat(50)));
  console.log(`${pc.blue('[i]')} Found: ${pc.bold(String(presets.length))} presets`);
  console.log();
}
