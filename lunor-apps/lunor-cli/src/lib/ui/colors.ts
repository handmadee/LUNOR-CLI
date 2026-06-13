import pc from 'picocolors';
import { readFileSync, existsSync } from 'node:fs';
import yaml from 'js-yaml';
import { PATHS } from '../../constants/paths.js';

export type ColorFn = (text: string) => string;

const NO_COLOR = process.env.NO_COLOR !== undefined;
export const isColorSupported = !NO_COLOR && Boolean(process.stdout.isTTY);

const identity: ColorFn = (text: string) => text;

export type ThemeType = 'default' | 'dracula' | 'nord' | 'cyberpunk' | 'matrix' | 'sunset' | 'monochrome' | 'tokyonight' | 'catppuccin' | 'rosepine';

export interface ColorTheme {
  banner: ColorFn;
  bannerAccent: ColorFn;
  command: ColorFn;
  heading: ColorFn;
  flag: ColorFn;
  description: ColorFn;
  example: ColorFn;
  warning: ColorFn;
  error: ColorFn;
  muted: ColorFn;
  success: ColorFn;
  info: ColorFn;
  highlight: ColorFn;
  brand: ColorFn;
}

export interface InkThemePalette {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  text: string;
  muted: string;
  borderActive: string;
  borderInactive: string;
}

export function getActiveThemeName(): ThemeType {
  if (!existsSync(PATHS.configFile)) {
    return 'default';
  }
  try {
    const content = readFileSync(PATHS.configFile, 'utf-8');
    const loaded = yaml.load(content) as any;
    if (loaded && typeof loaded.theme === 'string') {
      const t = loaded.theme.toLowerCase();
      if (['default', 'dracula', 'nord', 'cyberpunk', 'matrix', 'sunset', 'monochrome', 'tokyonight', 'catppuccin', 'rosepine'].includes(t)) {
        return t as ThemeType;
      }
    }
  } catch (e) {
    // Ignore error, fallback to default
  }
  return 'default';
}

const themeAnsiMap: Record<ThemeType, ColorTheme> = {
  default: {
    banner: isColorSupported ? pc.cyan : identity,
    bannerAccent: isColorSupported ? pc.magenta : identity,
    command: isColorSupported ? pc.bold : identity,
    heading: isColorSupported ? pc.yellow : identity,
    flag: isColorSupported ? pc.green : identity,
    description: isColorSupported ? pc.gray : identity,
    example: isColorSupported ? pc.blue : identity,
    warning: isColorSupported ? pc.yellow : identity,
    error: isColorSupported ? pc.red : identity,
    muted: isColorSupported ? pc.dim : identity,
    success: isColorSupported ? pc.green : identity,
    info: isColorSupported ? pc.cyan : identity,
    highlight: isColorSupported ? pc.magenta : identity,
    brand: isColorSupported ? (t: string) => pc.bold(pc.cyan(t)) : identity,
  },
  dracula: {
    banner: isColorSupported ? pc.magenta : identity,
    bannerAccent: isColorSupported ? pc.cyan : identity,
    command: isColorSupported ? pc.bold : identity,
    heading: isColorSupported ? pc.yellow : identity,
    flag: isColorSupported ? pc.green : identity,
    description: isColorSupported ? pc.gray : identity,
    example: isColorSupported ? pc.cyan : identity,
    warning: isColorSupported ? pc.yellow : identity,
    error: isColorSupported ? pc.red : identity,
    muted: isColorSupported ? pc.dim : identity,
    success: isColorSupported ? pc.green : identity,
    info: isColorSupported ? pc.cyan : identity,
    highlight: isColorSupported ? pc.magenta : identity,
    brand: isColorSupported ? (t: string) => pc.bold(pc.magenta(t)) : identity,
  },
  nord: {
    banner: isColorSupported ? pc.blue : identity,
    bannerAccent: isColorSupported ? pc.cyan : identity,
    command: isColorSupported ? pc.bold : identity,
    heading: isColorSupported ? pc.cyan : identity,
    flag: isColorSupported ? pc.green : identity,
    description: isColorSupported ? pc.gray : identity,
    example: isColorSupported ? pc.blue : identity,
    warning: isColorSupported ? pc.yellow : identity,
    error: isColorSupported ? pc.red : identity,
    muted: isColorSupported ? pc.dim : identity,
    success: isColorSupported ? pc.green : identity,
    info: isColorSupported ? pc.cyan : identity,
    highlight: isColorSupported ? pc.blue : identity,
    brand: isColorSupported ? (t: string) => pc.bold(pc.blue(t)) : identity,
  },
  cyberpunk: {
    banner: isColorSupported ? pc.magenta : identity,
    bannerAccent: isColorSupported ? pc.yellow : identity,
    command: isColorSupported ? pc.bold : identity,
    heading: isColorSupported ? pc.yellow : identity,
    flag: isColorSupported ? pc.cyan : identity,
    description: isColorSupported ? pc.gray : identity,
    example: isColorSupported ? pc.magenta : identity,
    warning: isColorSupported ? pc.yellow : identity,
    error: isColorSupported ? pc.red : identity,
    muted: isColorSupported ? pc.dim : identity,
    success: isColorSupported ? pc.green : identity,
    info: isColorSupported ? pc.cyan : identity,
    highlight: isColorSupported ? pc.magenta : identity,
    brand: isColorSupported ? (t: string) => pc.bold(pc.yellow(t)) : identity,
  },
  matrix: {
    banner: isColorSupported ? pc.green : identity,
    bannerAccent: isColorSupported ? pc.green : identity,
    command: isColorSupported ? pc.bold : identity,
    heading: isColorSupported ? pc.green : identity,
    flag: isColorSupported ? pc.green : identity,
    description: isColorSupported ? pc.gray : identity,
    example: isColorSupported ? pc.green : identity,
    warning: isColorSupported ? pc.green : identity,
    error: isColorSupported ? pc.red : identity,
    muted: isColorSupported ? pc.dim : identity,
    success: isColorSupported ? pc.green : identity,
    info: isColorSupported ? pc.green : identity,
    highlight: isColorSupported ? pc.green : identity,
    brand: isColorSupported ? (t: string) => pc.bold(pc.green(t)) : identity,
  },
  sunset: {
    banner: isColorSupported ? pc.red : identity,
    bannerAccent: isColorSupported ? pc.yellow : identity,
    command: isColorSupported ? pc.bold : identity,
    heading: isColorSupported ? pc.yellow : identity,
    flag: isColorSupported ? pc.red : identity,
    description: isColorSupported ? pc.gray : identity,
    example: isColorSupported ? pc.magenta : identity,
    warning: isColorSupported ? pc.yellow : identity,
    error: isColorSupported ? pc.red : identity,
    muted: isColorSupported ? pc.dim : identity,
    success: isColorSupported ? pc.yellow : identity,
    info: isColorSupported ? pc.red : identity,
    highlight: isColorSupported ? pc.magenta : identity,
    brand: isColorSupported ? (t: string) => pc.bold(pc.red(t)) : identity,
  },
  monochrome: {
    banner: isColorSupported ? pc.white : identity,
    bannerAccent: isColorSupported ? pc.white : identity,
    command: isColorSupported ? pc.bold : identity,
    heading: isColorSupported ? pc.bold : identity,
    flag: isColorSupported ? pc.white : identity,
    description: isColorSupported ? pc.gray : identity,
    example: isColorSupported ? pc.white : identity,
    warning: isColorSupported ? pc.white : identity,
    error: isColorSupported ? pc.bold : identity,
    muted: isColorSupported ? pc.dim : identity,
    success: isColorSupported ? pc.white : identity,
    info: isColorSupported ? pc.white : identity,
    highlight: isColorSupported ? pc.white : identity,
    brand: isColorSupported ? (t: string) => pc.bold(pc.white(t)) : identity,
  },
  tokyonight: {
    banner: isColorSupported ? pc.blue : identity,
    bannerAccent: isColorSupported ? pc.magenta : identity,
    command: isColorSupported ? pc.bold : identity,
    heading: isColorSupported ? pc.cyan : identity,
    flag: isColorSupported ? pc.green : identity,
    description: isColorSupported ? pc.gray : identity,
    example: isColorSupported ? pc.blue : identity,
    warning: isColorSupported ? pc.yellow : identity,
    error: isColorSupported ? pc.red : identity,
    muted: isColorSupported ? pc.dim : identity,
    success: isColorSupported ? pc.green : identity,
    info: isColorSupported ? pc.cyan : identity,
    highlight: isColorSupported ? pc.magenta : identity,
    brand: isColorSupported ? (t: string) => pc.bold(pc.blue(t)) : identity,
  },
  catppuccin: {
    banner: isColorSupported ? pc.magenta : identity,
    bannerAccent: isColorSupported ? pc.cyan : identity,
    command: isColorSupported ? pc.bold : identity,
    heading: isColorSupported ? pc.magenta : identity,
    flag: isColorSupported ? pc.green : identity,
    description: isColorSupported ? pc.gray : identity,
    example: isColorSupported ? pc.blue : identity,
    warning: isColorSupported ? pc.yellow : identity,
    error: isColorSupported ? pc.red : identity,
    muted: isColorSupported ? pc.dim : identity,
    success: isColorSupported ? pc.green : identity,
    info: isColorSupported ? pc.cyan : identity,
    highlight: isColorSupported ? pc.magenta : identity,
    brand: isColorSupported ? (t: string) => pc.bold(pc.magenta(t)) : identity,
  },
  rosepine: {
    banner: isColorSupported ? pc.red : identity,
    bannerAccent: isColorSupported ? pc.magenta : identity,
    command: isColorSupported ? pc.bold : identity,
    heading: isColorSupported ? pc.magenta : identity,
    flag: isColorSupported ? pc.cyan : identity,
    description: isColorSupported ? pc.gray : identity,
    example: isColorSupported ? pc.red : identity,
    warning: isColorSupported ? pc.yellow : identity,
    error: isColorSupported ? pc.red : identity,
    muted: isColorSupported ? pc.dim : identity,
    success: isColorSupported ? pc.cyan : identity,
    info: isColorSupported ? pc.cyan : identity,
    highlight: isColorSupported ? pc.magenta : identity,
    brand: isColorSupported ? (t: string) => pc.bold(pc.red(t)) : identity,
  },
};

export const INK_THEME_PALETTES: Record<ThemeType, InkThemePalette> = {
  default: {
    primary: '#00e5ff', // Vibrant cyan
    secondary: '#e040fb', // Magenta
    success: '#4caf50', // Green
    warning: '#ffeb3b', // Yellow
    error: '#ff1744', // Red
    info: '#00e5ff',
    text: '#ffffff',
    muted: '#707080',
    borderActive: '#00e5ff',
    borderInactive: '#404048',
  },
  dracula: {
    primary: '#bd93f9', // Purple
    secondary: '#ff79c6', // Pink
    success: '#50fa7b', // Green
    warning: '#f1fa8c', // Yellow
    error: '#ff5555', // Red
    info: '#8be9fd', // Cyan
    text: '#f8f8f2', // Foreground
    muted: '#6272a4', // Comment/Gray
    borderActive: '#bd93f9',
    borderInactive: '#44475a',
  },
  nord: {
    primary: '#88c0d0', // Frost Cyan
    secondary: '#81a1c1', // Frost Blue
    success: '#a3be8c', // Aurora Green
    warning: '#ebcb8b', // Aurora Yellow
    error: '#bf616a', // Aurora Red
    info: '#8fbcbb', // Frost Teal
    text: '#e5e9f0', // Snow Storm White
    muted: '#4c566a', // Polar Night Gray
    borderActive: '#88c0d0',
    borderInactive: '#3b4252',
  },
  cyberpunk: {
    primary: '#ff0055', // Neon Pink
    secondary: '#00f0ff', // Neon Cyan
    success: '#00ff66', // Neon Green
    warning: '#ffe600', // Neon Yellow
    error: '#ff2a2a', // Neon Red
    info: '#00f0ff',
    text: '#ffffff',
    muted: '#555555',
    borderActive: '#ff0055',
    borderInactive: '#1a1a1a',
  },
  matrix: {
    primary: '#00ff00', // Lime Green
    secondary: '#00ff00',
    success: '#33ff33',
    warning: '#88ff88',
    error: '#ff0000',
    info: '#00cc00',
    text: '#00ff00',
    muted: '#005f00',
    borderActive: '#00ff00',
    borderInactive: '#003300',
  },
  sunset: {
    primary: '#ff5e62', // Coral Sunset
    secondary: '#ff9966', // Orange
    success: '#4ca1af', // Teal success
    warning: '#ffdb58', // Warm yellow
    error: '#e52d27',
    info: '#ff9966',
    text: '#ffe6e6',
    muted: '#8a6d6d',
    borderActive: '#ff5e62',
    borderInactive: '#4a3f3f',
  },
  monochrome: {
    primary: '#ffffff',
    secondary: '#dddddd',
    success: '#ffffff',
    warning: '#bbbbbb',
    error: '#ffffff',
    info: '#cccccc',
    text: '#ffffff',
    muted: '#666666',
    borderActive: '#ffffff',
    borderInactive: '#333333',
  },
  tokyonight: {
    primary: '#7aa2f7', // Soft Blue
    secondary: '#bb9af3', // Soft Purple
    success: '#9ece6a', // Green
    warning: '#e0af68', // Orange/Yellow
    error: '#f7768e', // Red
    info: '#0db9d7', // Cyan
    text: '#c0caf5',
    muted: '#565f89', // Storm Grey
    borderActive: '#7aa2f7',
    borderInactive: '#24283c',
  },
  catppuccin: {
    primary: '#cba6f7', // Mauve
    secondary: '#f5c2e7', // Pink
    success: '#a6e3a1', // Green
    warning: '#f9e2af', // Yellow
    error: '#f38ba8', // Red
    info: '#89dceb', // Cyan
    text: '#cdd6f4',
    muted: '#7f849c', // Overlay
    borderActive: '#cba6f7',
    borderInactive: '#1e1e2f',
  },
  rosepine: {
    primary: '#ebbcba', // Rose
    secondary: '#c4a7e7', // Iris
    success: '#9ccfd8', // Pine/Teal
    warning: '#f6c177', // Gold
    error: '#eb6f92', // Love
    info: '#9ccfd8',
    text: '#e0def4',
    muted: '#908caa', // Muted Grey
    borderActive: '#ebbcba',
    borderInactive: '#1f1d2e',
  },
};

export function getActiveInkPalette(): InkThemePalette {
  const themeName = getActiveThemeName();
  return INK_THEME_PALETTES[themeName];
}

const getThemeAnsi = (): ColorTheme => {
  const themeName = getActiveThemeName();
  return themeAnsiMap[themeName] || themeAnsiMap.default;
};

export const defaultTheme: ColorTheme = {
  get banner() { return getThemeAnsi().banner; },
  get bannerAccent() { return getThemeAnsi().bannerAccent; },
  get command() { return getThemeAnsi().command; },
  get heading() { return getThemeAnsi().heading; },
  get flag() { return getThemeAnsi().flag; },
  get description() { return getThemeAnsi().description; },
  get example() { return getThemeAnsi().example; },
  get warning() { return getThemeAnsi().warning; },
  get error() { return getThemeAnsi().error; },
  get muted() { return getThemeAnsi().muted; },
  get success() { return getThemeAnsi().success; },
  get info() { return getThemeAnsi().info; },
  get highlight() { return getThemeAnsi().highlight; },
  get brand() { return getThemeAnsi().brand; },
};

export function stripColors(text: string): string {
  // eslint-disable-next-line no-control-regex -- ANSI escape sequence pattern
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

export function getVisibleLength(text: string): number {
  return stripColors(text).length;
}

export function padEnd(text: string, width: number): string {
  const visibleLength = getVisibleLength(text);
  const padding = Math.max(0, width - visibleLength);
  return text + ' '.repeat(padding);
}

export function truncate(text: string, maxWidth: number): string {
  if (getVisibleLength(text) <= maxWidth) return text;
  const stripped = stripColors(text);
  return `${stripped.slice(0, maxWidth - 3)}...`;
}

export function centerText(text: string, width: number): string {
  const visibleLength = getVisibleLength(text);
  if (visibleLength >= width) return text;
  const padding = Math.floor((width - visibleLength) / 2);
  return ' '.repeat(padding) + text;
}

