import pc from 'picocolors';

export const symbols = {
  info: '[i]',
  success: '[+]',
  warning: '[!]',
  error: '[x]',
  bullet: '[-]',
  arrow: '->',
};

export const ui = {
  header(title: string, color: (s: string) => string = pc.cyan): void {
    console.log();
    console.log(color(`${'─'.repeat(60)}`));
    console.log(color(`  ${title}`));
    console.log(color(`${'─'.repeat(60)}`));
  },

  section(title: string): void {
    console.log();
    console.log(pc.bold(pc.cyan(title)));
    console.log(pc.dim('─'.repeat(40)));
  },

  row(label: string, value: string, labelWidth = 16): void {
    console.log(`  ${pc.dim(label.padEnd(labelWidth))} ${value}`);
  },

  divider(char = '─', width = 60): void {
    console.log(pc.dim(char.repeat(width)));
  },

  spacer(): void {
    console.log();
  },

  box(lines: string[], color: (s: string) => string = pc.cyan): void {
    const maxLen = Math.max(...lines.map(l => l.length));
    const width = maxLen + 4;
    
    console.log(color(`┌${'─'.repeat(width - 2)}┐`));
    for (const line of lines) {
      console.log(color('│') + ` ${line.padEnd(width - 4)} ` + color('│'));
    }
    console.log(color(`└${'─'.repeat(width - 2)}┘`));
  },

  badge(text: string, color: (s: string) => string = pc.cyan): string {
    return color(`[${text}]`);
  },

  dim(text: string): string {
    return pc.dim(text);
  },

  bold(text: string): string {
    return pc.bold(text);
  },
};

export { pc };
