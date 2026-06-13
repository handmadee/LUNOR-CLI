import * as clack from '@clack/prompts';
import pc from 'picocolors';

export class PromptsManager {
  intro(message: string): void {
    console.log();
    console.log(pc.bold(pc.cyan(message)));
    console.log(pc.dim('─'.repeat(40)));
  }

  outro(message: string): void {
    console.log();
    console.log(pc.green(`[+] ${message}`));
    console.log();
  }

  note(message: string, title?: string): void {
    clack.note(message, title);
  }

  async confirm(message: string, initialValue = false): Promise<boolean> {
    const result = await clack.confirm({
      message,
      initialValue,
    });

    if (clack.isCancel(result)) {
      return false;
    }

    return result;
  }

  async select<T extends string>(
    message: string,
    options: Array<{ value: T; label: string; hint?: string }>
  ): Promise<T | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await clack.select({
      message,
      options: options as any,
    });

    if (clack.isCancel(result)) {
      return null;
    }

    return result as T;
  }

  async text(
    message: string,
    opts?: { placeholder?: string; defaultValue?: string; validate?: (value: string) => string | void }
  ): Promise<string | null> {
    const result = await clack.text({
      message,
      placeholder: opts?.placeholder,
      defaultValue: opts?.defaultValue,
      validate: opts?.validate,
    });

    if (clack.isCancel(result)) {
      return null;
    }

    return result;
  }

  step(message: string): void {
    clack.log.step(message);
  }

  message(message: string): void {
    clack.log.message(message);
  }
}

export const prompts = new PromptsManager();
