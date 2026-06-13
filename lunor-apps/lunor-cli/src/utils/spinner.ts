import ora, { type Ora, type Options } from 'ora';

export function createSpinner(options: string | Options): Ora {
  const spinnerOptions: Options = typeof options === 'string' ? { text: options } : options;

  const spinner = ora({
    ...spinnerOptions,
    spinner: 'dots',
    prefixText: '',
  });

  spinner.succeed = (text?: string) => {
    spinner.stopAndPersist({
      symbol: '[+]',
      text: text || spinner.text,
    });
    return spinner;
  };

  spinner.fail = (text?: string) => {
    spinner.stopAndPersist({
      symbol: '[x]',
      text: text || spinner.text,
    });
    return spinner;
  };

  return spinner;
}

export type { Ora } from 'ora';
