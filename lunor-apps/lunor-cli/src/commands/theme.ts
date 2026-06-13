import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import pc from 'picocolors';
import { logger } from '../utils/logger.js';
import { ConfigLoader } from '../core/config-loader.js';

interface TerminalColors {
  bg: [number, number, number];
  fg: [number, number, number];
  cursor: [number, number, number];
}

export const TERMINAL_THEMES: Record<string, TerminalColors> = {
  default: {
    bg: [7453, 9252, 11308],    // #1D242B
    fg: [65535, 65535, 65535], // #FFFFFF
    cursor: [0, 58596, 65535]  // #00E5FF
  },
  dracula: {
    bg: [10280, 10794, 13878], // #282a36
    fg: [63736, 63736, 62194], // #f8f8f2
    cursor: [61937, 64250, 35980] // #f1fa8c
  },
  nord: {
    bg: [11822, 13364, 16448], // #2e3440
    fg: [55512, 57054, 59881], // #d8dee9
    cursor: [34952, 49344, 53456] // #88c0d0
  },
  cyberpunk: {
    bg: [4112, 3598, 5911],    // #100e17
    fg: [65535, 65535, 65535], // #ffffff
    cursor: [65535, 0, 21845]  // #ff0055
  },
  matrix: {
    bg: [0, 2570, 0],          // #000a00
    fg: [0, 65535, 0],         // #00ff00
    cursor: [13107, 65535, 13107] // #33ff33
  },
  sunset: {
    bg: [7710, 4883, 5397],    // #1e1315
    fg: [65535, 59110, 59110], // #ffe6e6
    cursor: [65535, 24158, 25186] // #ff5e62
  },
  monochrome: {
    bg: [4626, 4626, 4626],    // #121212
    fg: [62965, 62965, 62965], // #f5f5f5
    cursor: [65535, 65535, 65535] // #ffffff
  },
  tokyonight: {
    bg: [6682, 6939, 9766],    // #1a1b26
    fg: [49344, 51914, 62965], // #c0caf5
    cursor: [31354, 41634, 63479] // #7aa2f7
  },
  catppuccin: {
    bg: [7710, 7710, 11822],   // #1e1e2e
    fg: [52685, 54998, 62708], // #cdd6f4
    cursor: [52171, 42662, 63479] // #cba6f7
  },
  rosepine: {
    bg: [6425, 5911, 9252],    // #191724
    fg: [57568, 57054, 62708], // #e0def4
    cursor: [60395, 48316, 47802] // #ebbcba
  }
};

const toFloat = (rgb: [number, number, number]) => ({
  r: Number((rgb[0] / 65535).toFixed(5)),
  g: Number((rgb[1] / 65535).toFixed(5)),
  b: Number((rgb[2] / 65535).toFixed(5))
});

export function applyTerminalTheme(themeName: string): boolean {
  const theme = TERMINAL_THEMES[themeName];
  if (!theme) return false;

  const termProg = process.env.TERM_PROGRAM;
  const bg = theme.bg.join(', ');
  const fg = theme.fg.join(', ');
  const cursor = theme.cursor.join(', ');

  // 1. Configure Terminal.app default settings globally
  try {
    const defaultScript = `
      tell application "Terminal"
        set background color of default settings to {${bg}}
        set normal text color of default settings to {${fg}}
        set cursor color of default settings to {${cursor}}
      end tell
    `;
    execSync(`osascript -e '${defaultScript}'`, { stdio: 'ignore' });
  } catch (e) {
    // Ignore setting default settings failure
  }

  // 2. Configure iTerm2 dynamic profiles globally
  try {
    const itermDir = join(homedir(), 'Library', 'Application Support', 'iTerm2', 'DynamicProfiles');
    if (existsSync(join(homedir(), 'Library', 'Application Support', 'iTerm2')) || existsSync(itermDir)) {
      if (!existsSync(itermDir)) {
        mkdirSync(itermDir, { recursive: true });
      }

      const bgFloat = toFloat(theme.bg);
      const fgFloat = toFloat(theme.fg);
      const cursorFloat = toFloat(theme.cursor);

      const itermProfile = {
        "Profiles": [
          {
            "Name": `LUNOR - ${themeName.charAt(0).toUpperCase() + themeName.slice(1)}`,
            "Guid": `lunor-theme-${themeName}`,
            "Dynamic Profile Parent Name": "Default",
            "Background Color": {
              "Red Component": bgFloat.r,
              "Green Component": bgFloat.g,
              "Blue Component": bgFloat.b
            },
            "Foreground Color": {
              "Red Component": fgFloat.r,
              "Green Component": fgFloat.g,
              "Blue Component": fgFloat.b
            },
            "Cursor Color": {
              "Red Component": cursorFloat.r,
              "Green Component": cursorFloat.g,
              "Blue Component": cursorFloat.b
            }
          }
        ]
      };

      writeFileSync(join(itermDir, `lunor_${themeName}.json`), JSON.stringify(itermProfile, null, 2), 'utf-8');
    }
  } catch (e) {
    // Ignore iTerm2 profile writing failure
  }

  // 3. Apply to the active window/session instantly
  try {
    if (termProg === 'Apple_Terminal') {
      const script = `
        tell application "Terminal"
          set background color of window 1 to {${bg}}
          set normal text color of window 1 to {${fg}}
          set cursor color of window 1 to {${cursor}}
        end tell
      `;
      execSync(`osascript -e '${script}'`, { stdio: 'ignore' });
      return true;
    } else if (termProg === 'iTerm.app') {
      const script = `
        tell application "iTerm"
          tell current session of current window
            set background color to {${bg}}
            set foreground color to {${fg}}
            set cursor color to {${cursor}}
          end tell
        end tell
      `;
      execSync(`osascript -e '${script}'`, { stdio: 'ignore' });
      return true;
    } else {
      // General fallbacks: try both apps silently for active session
      try {
        const tScript = `tell application "Terminal" to set background color of window 1 to {${bg}}`;
        execSync(`osascript -e '${tScript}'`, { stdio: 'ignore' });
      } catch {}
      try {
        const iScript = `tell application "iTerm" to tell current session of current window to set background color to {${bg}}`;
        execSync(`osascript -e '${iScript}'`, { stdio: 'ignore' });
      } catch {}
      return true;
    }
  } catch (error) {
    // AppleScript execution failed or not supported in this shell context
  }
  return false;
}

export function themeListCommand(): void {
  console.log(pc.bold(pc.cyan('🎨 Available LUNOR CLI Terminal Themes:')));
  console.log();
  for (const name of Object.keys(TERMINAL_THEMES)) {
    const formattedName = name.padEnd(12);
    if (name === 'default') console.log(`  - ${pc.bold(formattedName)} (Default clean theme)`);
    else if (name === 'dracula') console.log(`  - ${pc.magenta(formattedName)} (Vibrant Dracula palette)`);
    else if (name === 'nord') console.log(`  - ${pc.blue(formattedName)} (Calm arctic frost)`);
    else if (name === 'cyberpunk') console.log(`  - ${pc.yellow(formattedName)} (Neon cyberpunk vibe)`);
    else if (name === 'matrix') console.log(`  - ${pc.green(formattedName)} (Lime green code rain)`);
    else if (name === 'sunset') console.log(`  - ${pc.red(formattedName)} (Warm coral sunset)`);
    else if (name === 'monochrome') console.log(`  - ${pc.white(formattedName)} (Sleek minimalist grays)`);
    else if (name === 'tokyonight') console.log(`  - ${pc.blue(formattedName)} (Beautiful soft blue Tokyo Night)`);
    else if (name === 'catppuccin') console.log(`  - ${pc.magenta(formattedName)} (Soft pastel Catppuccin Mocha)`);
    else if (name === 'rosepine') console.log(`  - ${pc.red(formattedName)} (Warm cozy Rose Pine)`);
  }
  console.log();
  console.log(pc.dim('  To apply a theme instantly, run:'));
  console.log(`  ${pc.cyan('lunor theme apply <theme-name>')}`);
  console.log();
}

export async function themeApplyCommand(themeName: string): Promise<void> {
  const lowerName = themeName.toLowerCase();
  if (!(lowerName in TERMINAL_THEMES)) {
    logger.error(`Theme '${themeName}' not found. Run 'lunor theme list' to see options.`);
    return;
  }

  // Update CLI config so it applies to TUI as well
  const configLoader = new ConfigLoader();
  configLoader.set('theme', lowerName as any);

  // Apply terminal colors
  const success = applyTerminalTheme(lowerName);
  
  if (success) {
    logger.success(`Instantly applied theme ${pc.cyan(lowerName)} to your active macOS Terminal window!`);
  } else {
    logger.success(`Set theme to ${pc.cyan(lowerName)} in configuration.`);
    logger.info(pc.dim('Note: Instant terminal coloring requires macOS Terminal or iTerm2.'));
  }
}
