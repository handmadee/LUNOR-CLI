/**
 * Centralized path constants for LUNOR CLI.
 *
 * Every hardcoded `~/.config/lunor/...` path in the codebase should
 * reference this module instead of constructing paths inline.
 */

import { join } from 'node:path';
import { homedir } from 'node:os';

const LUNOR_HOME = join(homedir(), '.config', 'lunor');

export const PATHS = {
  /** Root config directory: ~/.config/lunor */
  root: LUNOR_HOME,

  /** Encrypted API key file */
  keyFile: join(LUNOR_HOME, 'keys', 'lunor.key'),

  /** Persisted shell state (env export) */
  stateFile: join(LUNOR_HOME, 'state', 'current.env'),

  /** SQLite analytics database */
  analyticsDb: join(LUNOR_HOME, 'analytics.db'),

  /** YAML configuration backup */
  configBackup: join(LUNOR_HOME, 'config.backup.yml'),

  /** Usage export default output */
  usageExport: join(LUNOR_HOME, 'usage-export.json'),

  /** Skills installation directory */
  skillsDir: join(LUNOR_HOME, 'skills'),

  /** Marketplace plugins directory */
  pluginsDir: join(LUNOR_HOME, 'plugins'),

  /** LUNOR configuration file */
  configFile: join(LUNOR_HOME, 'config.yml'),

  /** State directory */
  stateDir: join(LUNOR_HOME, 'state'),
} as const;
