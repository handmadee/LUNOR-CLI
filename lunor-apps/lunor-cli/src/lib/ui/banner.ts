import pc from 'picocolors';
import { defaultTheme, centerText, isColorSupported } from './colors.js';
// eslint-disable-next-line no-control-regex -- ANSI art uses block characters intentionally

export const BANNER_LINES = [
  '██╗     ██╗   ██╗███╗   ██╗ ██████╗ ██████╗ ',
  '██║     ██║   ██║████╗  ██║██╔═══██╗██╔══██╗',
  '██║     ██║   ██║██╔██╗ ██║██║   ██║██████╔╝',
  '██║     ██║   ██║██║╚██╗██║██║   ██║██╔══██╗',
  '███████╗╚██████╔╝██║ ╚████║╚██████╔╝██║  ██║',
  '╚══════╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝',
] as const;

export const BANNER_WIDTH = 45;
export const CLI_VERSION = '1.0.0';
export const PRODUCT_NAME = 'LUNOR KIT';
export const PRODUCT_TAGLINE = 'Agentic AI Workspace & Model Switcher CLI';
export const COPYRIGHT = '© 2025 LEO';

type GradientFn = (line: string, index: number) => string;

const gradients: Record<string, GradientFn> = {
  cyan: (line) => pc.cyan(line),
  
  cyanToMagenta: (line, index) => {
    if (!isColorSupported) return line;
    const colors = [pc.cyan, pc.cyan, pc.blue, pc.magenta, pc.magenta, pc.magenta];
    return colors[index % colors.length](line);
  },

  rainbow: (line, index) => {
    if (!isColorSupported) return line;
    const colors = [pc.red, pc.yellow, pc.green, pc.cyan, pc.blue, pc.magenta];
    return colors[index % colors.length](line);
  },

  fire: (line, index) => {
    if (!isColorSupported) return line;
    const colors = [pc.red, pc.red, pc.yellow, pc.yellow, pc.red, pc.red];
    return colors[index % colors.length](line);
  },

  ocean: (line, index) => {
    if (!isColorSupported) return line;
    const colors = [pc.blue, pc.cyan, pc.cyan, pc.blue, pc.blue, pc.cyan];
    return colors[index % colors.length](line);
  },
};

export type GradientType = keyof typeof gradients;

export function getBanner(gradient: GradientType = 'cyanToMagenta'): string {
  const gradientFn = gradients[gradient] || gradients.cyan;
  return BANNER_LINES.map((line, i) => gradientFn(line, i)).join('\n');
}

export function getCenteredBanner(width = 80, gradient: GradientType = 'cyanToMagenta'): string {
  if (width < BANNER_WIDTH + 4) {
    return getBanner(gradient);
  }

  const padding = Math.floor((width - BANNER_WIDTH) / 2);
  const paddingStr = ' '.repeat(padding);
  const gradientFn = gradients[gradient] || gradients.cyan;

  return BANNER_LINES.map((line, i) => paddingStr + gradientFn(line, i)).join('\n');
}

export function getBannerWithInfo(
  version: string = CLI_VERSION,
  width = 80,
  gradient: GradientType = 'cyanToMagenta'
): string {
  const banner = getCenteredBanner(width, gradient);

  const productLine = pc.bold(pc.cyan(PRODUCT_NAME));
  const subtitle = defaultTheme.muted(PRODUCT_TAGLINE);
  const versionLine = defaultTheme.info(`v${version}`);
  const designedBy = pc.bold(pc.magenta('Designed by LEO'));
  const copyright = defaultTheme.muted(COPYRIGHT);

  const centeredProduct = centerText(productLine, width);
  const centeredSubtitle = centerText(subtitle, width);
  const centeredVersion = centerText(versionLine, width);
  const centeredDesigner = centerText(designedBy, width);
  const centeredCopyright = centerText(copyright, width);

  return [
    banner,
    '',
    centeredProduct,
    centeredSubtitle,
    centeredVersion,
    centeredDesigner,
    centeredCopyright,
  ].join('\n');
}

export function getBannerWithVersion(version: string, width = 80): string {
  return getBannerWithInfo(version, width, 'cyanToMagenta');
}

export function getDesignedBy(options: { centered?: boolean; width?: number } = {}): string {
  const { centered = false, width = 80 } = options;
  const text = 'Designed by LEO';

  if (centered) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + pc.bold(pc.magenta(text));
  }

  return pc.bold(pc.magenta(`  ${text}`));
}

export function getCopyright(options: { centered?: boolean; width?: number } = {}): string {
  const { centered = false, width = 80 } = options;
  const text = COPYRIGHT;

  if (centered) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + defaultTheme.muted(text);
  }

  return defaultTheme.muted(`  ${text}`);
}

export function printBanner(gradient: GradientType = 'cyanToMagenta'): void {
  const width = process.stdout.columns || 80;
  console.log(getBannerWithInfo(CLI_VERSION, width, gradient));
}

export function getMiniBanner(version: string = CLI_VERSION): string {
  const lunor = pc.bold(pc.cyan(PRODUCT_NAME));
  const ver = defaultTheme.muted(`v${version}`);
  const designer = pc.bold(pc.magenta('Designed by LEO'));
  const copyright = defaultTheme.muted(COPYRIGHT);

  return `${lunor} ${ver} • ${designer} • ${copyright}`;
}

export function printMiniBanner(): void {
  const width = process.stdout.columns || 80;
  const line = getMiniBanner();
  console.log(centerText(line, width));
}

export async function animateMiniBanner(version: string = CLI_VERSION, delayMs = 30): Promise<void> {
  const fullBanner = getMiniBanner(version);
  // eslint-disable-next-line no-control-regex
  const stripAnsi = (str: string): string => str.replace(/\u001b\[[0-9;]*m/g, '');
  const plainText = stripAnsi(fullBanner);

  for (let i = 0; i <= plainText.length; i++) {
    const currentText = plainText.slice(0, i);
    const coloredText = applyColorsToPartial(currentText, version);
    process.stdout.write(`\r${coloredText}`);
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  process.stdout.write('\n');
}

function applyColorsToPartial(text: string, version: string): string {
  let result = text;

  if (result.includes(PRODUCT_NAME)) {
    result = result.replace(PRODUCT_NAME, pc.bold(pc.cyan(PRODUCT_NAME)));
  }

  const verText = `v${version}`;
  if (result.includes(verText)) {
    result = result.replace(verText, defaultTheme.muted(verText));
  }

  if (result.includes('Designed by LEO')) {
    result = result.replace('Designed by LEO', pc.bold(pc.magenta('Designed by LEO')));
  }

  if (result.includes(COPYRIGHT)) {
    result = result.replace(COPYRIGHT, defaultTheme.muted(COPYRIGHT));
  }

  return result;
}
