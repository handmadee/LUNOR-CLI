import { type WriteStream, createWriteStream } from 'node:fs';
import pc from 'picocolors';

const symbols = {
  info: pc.cyan('[i]'),
  success: pc.green('[+]'),
  warning: pc.yellow('[!]'),
  error: pc.red('[x]'),
  debug: pc.magenta('[~]'),
  arrow: pc.cyan('→'),
  check: pc.green('✓'),
  cross: pc.red('✗'),
  bullet: pc.dim('•'),
};

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private verboseEnabled = false;
  private logFileStream?: WriteStream;

  info(message: string): void {
    console.log(symbols.info, message);
  }

  success(message: string): void {
    console.log(symbols.success, message);
  }

  warning(message: string): void {
    console.log(symbols.warning, message);
  }

  error(message: string): void {
    console.error(symbols.error, message);
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(symbols.debug, pc.dim(message));
    }
  }

  step(message: string): void {
    console.log(`  ${symbols.arrow} ${message}`);
  }

  done(message: string): void {
    console.log(`  ${symbols.check} ${pc.green(message)}`);
  }

  fail(message: string): void {
    console.log(`  ${symbols.cross} ${pc.red(message)}`);
  }

  bullet(message: string): void {
    console.log(`  ${symbols.bullet} ${pc.dim(message)}`);
  }

  blank(): void {
    console.log();
  }

  divider(char = '─', width = 40): void {
    console.log(pc.dim(char.repeat(width)));
  }

  section(title: string): void {
    console.log();
    console.log(pc.bold(pc.cyan(title)));
    this.divider();
  }

  table(rows: [string, string][], labelWidth = 20): void {
    for (const [label, value] of rows) {
      console.log(`  ${pc.dim(label.padEnd(labelWidth))} ${value}`);
    }
  }

  box(content: string, title?: string): void {
    const lines = content.split('\n');
    const maxLen = Math.max(
      ...lines.map((l) => l.length),
      title ? title.length + 2 : 0
    );

    const horizontal = '─'.repeat(maxLen + 2);
    const top = title
      ? `┌─ ${pc.bold(title)} ${'─'.repeat(Math.max(0, maxLen - title.length - 1))}┐`
      : `┌${horizontal}┐`;

    console.log(pc.dim(top));
    for (const line of lines) {
      console.log(pc.dim(`│ ${line}${' '.repeat(maxLen - line.length)} │`));
    }
    console.log(pc.dim(`└${horizontal}┘`));
  }

  verbose(message: string, context?: LogContext): void {
    if (!this.verboseEnabled) return;

    const timestamp = this.getTimestamp();
    const sanitizedMessage = this.sanitize(message);
    const formattedContext = context ? this.formatContext(context) : '';

    const logLine = `${timestamp} ${pc.gray('[VERBOSE]')} ${sanitizedMessage}${formattedContext}`;

    console.error(logLine);

    if (this.logFileStream) {
      const plainLogLine = `${timestamp} [VERBOSE] ${sanitizedMessage}${formattedContext}`;
      this.logFileStream.write(`${plainLogLine}\n`);
    }
  }

  setVerbose(enabled: boolean): void {
    this.verboseEnabled = enabled;
    if (enabled) {
      this.verbose('Verbose logging enabled');
    }
  }

  isVerbose(): boolean {
    return this.verboseEnabled;
  }

  setLogFile(path?: string): void {
    if (this.logFileStream) {
      this.logFileStream.end();
      this.logFileStream = undefined;
    }

    if (path) {
      this.logFileStream = createWriteStream(path, {
        flags: 'a',
        mode: 0o600,
      });
      this.verbose(`Logging to file: ${path}`);
    }
  }

  sanitize(text: string): string {
    return text
      .replace(/ghp_[a-zA-Z0-9]{36}/g, 'ghp_***')
      .replace(/github_pat_[a-zA-Z0-9_]{82}/g, 'github_pat_***')
      .replace(/gho_[a-zA-Z0-9]{36}/g, 'gho_***')
      .replace(/ghu_[a-zA-Z0-9]{36}/g, 'ghu_***')
      .replace(/ghs_[a-zA-Z0-9]{36}/g, 'ghs_***')
      .replace(/ghr_[a-zA-Z0-9]{36}/g, 'ghr_***')
      .replace(/Bearer [a-zA-Z0-9_-]+/g, 'Bearer ***')
      .replace(/token=[a-zA-Z0-9_-]+/g, 'token=***')
      .replace(/sk-[a-zA-Z0-9]{48}/g, 'sk-***')
      .replace(/ANTHROPIC_API_KEY=[^\s]+/g, 'ANTHROPIC_API_KEY=***');
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatContext(context: LogContext): string {
    const sanitized = Object.entries(context).reduce((acc, [key, value]) => {
      if (typeof value === 'string') {
        acc[key] = this.sanitize(value);
      } else if (value && typeof value === 'object') {
        try {
          const stringified = JSON.stringify(value);
          const sanitizedStr = this.sanitize(stringified);
          acc[key] = JSON.parse(sanitizedStr);
        } catch {
          acc[key] = '[Object]';
        }
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as LogContext);

    return `\n  ${JSON.stringify(sanitized, null, 2).split('\n').join('\n  ')}`;
  }
}

export const logger = new Logger();
