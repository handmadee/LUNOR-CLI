import pc from 'picocolors';
import { isColorSupported } from './colors.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function typeWriter(
  text: string,
  speed = 20,
  startDelay = 0
): Promise<void> {
  if (startDelay > 0) await sleep(startDelay);
  
  for (const char of text) {
    process.stdout.write(char);
    await sleep(speed);
  }
  process.stdout.write('\n');
}

export async function fadeInLines(
  lines: string[],
  delayBetween = 50
): Promise<void> {
  for (const line of lines) {
    console.log(line);
    await sleep(delayBetween);
  }
}

export async function pulseText(
  text: string,
  duration = 1000,
  interval = 100
): Promise<void> {
  if (!isColorSupported) {
    console.log(text);
    return;
  }

  const frames = duration / interval;
  const colors = [pc.dim, pc.reset, pc.bold, pc.reset];
  
  for (let i = 0; i < frames; i++) {
    const colorFn = colors[i % colors.length];
    process.stdout.write(`\r${colorFn(text)}`);
    await sleep(interval);
  }
  process.stdout.write('\n');
}

export function createProgressBar(
  total: number,
  width = 30
): {
  update: (current: number, label?: string) => void;
  complete: (message?: string) => void;
} {
  const barChars = {
    filled: '█',
    empty: '░',
    start: '[',
    end: ']',
  };

  return {
    update(current: number, label = '') {
      const percentage = Math.min(100, Math.floor((current / total) * 100));
      const filledWidth = Math.floor((current / total) * width);
      const emptyWidth = width - filledWidth;

      const bar = 
        barChars.start +
        pc.cyan(barChars.filled.repeat(filledWidth)) +
        pc.dim(barChars.empty.repeat(emptyWidth)) +
        barChars.end;

      const percentStr = pc.yellow(`${percentage}%`.padStart(4));
      const labelStr = label ? pc.dim(` ${label}`) : '';

      process.stdout.write(`\r${bar} ${percentStr}${labelStr}`);
    },

    complete(message = 'Done!') {
      process.stdout.write('\r' + ' '.repeat(60) + '\r');
      console.log(pc.green(`[+] ${message}`));
    },
  };
}

export const spinnerFrames = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  arrows: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
  simple: ['-', '\\', '|', '/'],
  blocks: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'],
  pulse: ['◐', '◓', '◑', '◒'],
};

export function createSpinnerEffect(
  message: string,
  frames = spinnerFrames.dots
): {
  start: () => void;
  stop: (finalMessage?: string) => void;
  update: (newMessage: string) => void;
} {
  let frameIndex = 0;
  let intervalId: NodeJS.Timeout | null = null;
  let currentMessage = message;

  return {
    start() {
      if (intervalId) return;
      
      intervalId = setInterval(() => {
        const frame = isColorSupported ? pc.cyan(frames[frameIndex]) : frames[frameIndex];
        process.stdout.write(`\r${frame} ${currentMessage}`);
        frameIndex = (frameIndex + 1) % frames.length;
      }, 80);
    },

    stop(finalMessage?: string) {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      process.stdout.write('\r' + ' '.repeat(currentMessage.length + 10) + '\r');
      if (finalMessage) {
        console.log(finalMessage);
      }
    },

    update(newMessage: string) {
      currentMessage = newMessage;
    },
  };
}

export function box(content: string, title?: string): string {
  const lines = content.split('\n');
  const maxLen = Math.max(
    ...lines.map((l) => l.length),
    title ? title.length + 2 : 0
  );

  const horizontal = '─'.repeat(maxLen + 2);
  const top = title
    ? `┌─ ${pc.bold(title)} ${'─'.repeat(Math.max(0, maxLen - title.length - 1))}┐`
    : `┌${horizontal}┐`;

  const paddedLines = lines.map(
    (l) => `│ ${l}${' '.repeat(maxLen - l.length)} │`
  );

  const bottom = `└${horizontal}┘`;

  return [pc.dim(top), ...paddedLines.map(pc.dim), pc.dim(bottom)].join('\n');
}

export function divider(char = '─', width?: number): string {
  const w = width || process.stdout.columns || 50;
  return pc.dim(char.repeat(w));
}

export function section(title: string): void {
  console.log();
  console.log(pc.bold(pc.cyan(title)));
  console.log(pc.dim('─'.repeat(40)));
}

export function statusLine(
  label: string,
  value: string,
  status?: 'success' | 'warning' | 'error' | 'info'
): void {
  const statusColors = {
    success: pc.green,
    warning: pc.yellow,
    error: pc.red,
    info: pc.cyan,
  };

  const colorFn = status ? statusColors[status] : pc.white;
  console.log(`  ${pc.dim(label.padEnd(20))} ${colorFn(value)}`);
}
