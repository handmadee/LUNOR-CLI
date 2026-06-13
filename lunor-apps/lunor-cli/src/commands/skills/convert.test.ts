import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { skillsConvertCommand } from './convert.js';
import * as skillsModule from '../../lib/skills/index.js';
import * as loggerModule from '../../utils/logger.js';
import * as promptsModule from '../../utils/prompts.js';
import * as fsPromises from 'node:fs/promises';
import * as fs from 'node:fs';
import * as skillSources from '../../lib/skills/skill-sources.js';

vi.mock('../../lib/skills/index.js', () => ({
  getSkillManager: vi.fn(),
  getSourceStatus: vi.fn(),
  getSourceConfig: vi.fn(),
}));
vi.mock('../../lib/skills/skill-sources.js', () => ({
  updateSkillSource: vi.fn(),
}));
vi.mock('../../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));
vi.mock('../../utils/prompts.js', () => ({
  prompts: {
    confirm: vi.fn(),
  },
}));
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
}));
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

const mockConfig = {
  name: 'engineering',
  displayName: 'LUNOR Engineering',
  type: 'local',
  path: '/tmp/eng',
};

describe('skillsConvertCommand', () => {
  beforeEach(() => {
    vi.mocked(skillsModule.getSkillManager).mockReturnValue({
      getSourceStatus: vi.fn().mockReturnValue({ available: true }),
    } as any);
    vi.mocked(skillsModule.getSourceConfig).mockReturnValue(mockConfig as any);
    vi.mocked(promptsModule.prompts.confirm).mockResolvedValue(true);
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fsPromises.readFile).mockResolvedValue('[]');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requires a valid target type', async () => {
    await skillsConvertCommand('engineering', {} as any);

    expect(loggerModule.logger.error).toHaveBeenCalledWith('Currently only --to local is supported');
  });

  it('converts to local and updates source', async () => {
    await skillsConvertCommand('engineering', { to: 'local', path: '/tmp/new' });

    expect(promptsModule.prompts.confirm).toHaveBeenCalled();
    expect(skillSources.updateSkillSource).toHaveBeenCalledWith('engineering', {
      name: 'engineering',
      displayName: 'LUNOR Engineering',
      type: 'local',
      path: '/tmp/new',
    });
    expect(loggerModule.logger.success).toHaveBeenCalled();
  });

  it('records manifest entries', async () => {
    await skillsConvertCommand('engineering', { to: 'local', path: '/tmp/new' });

    expect(fsPromises.writeFile).toHaveBeenCalled();
  });
});
