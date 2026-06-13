import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { skillsBrowseCommand } from './browse.js';
import * as skillsModule from '../../lib/skills/index.js';
import * as loggerModule from '../../utils/logger.js';
import * as fsPromises from 'node:fs/promises';

vi.mock('../../lib/skills/index.js', () => ({
  getSkillManager: vi.fn(),
  getAllSourceConfigs: vi.fn(),
}));
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    divider: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('skillsBrowseCommand', () => {
  let consoleLogSpy: any;
  const mockManager = { list: vi.fn(), getSourceStatus: vi.fn() } as any;

  beforeEach(() => {
    vi.mocked(skillsModule.getSkillManager).mockReturnValue(mockManager as any);

    vi.mocked(skillsModule.getAllSourceConfigs).mockReturnValue([
      {
        name: 'engineering',
        displayName: 'LUNOR Engineering',
        type: 'local',
      } as any,
      {
        name: 'design',
        displayName: 'Design Kit',
        type: 'github',
      } as any,
    ]);

    mockManager.list.mockReturnValue([
      { name: 'engineering', path: '/tmp/eng' },
    ]);

    mockManager.getSourceStatus.mockImplementation((name: string) => {
      if (name === 'engineering') return { available: true, installed: true } as any;
      return { available: true, installed: false } as any;
    });

    (skillsModule as any).getAllSourceConfigs = vi.fn().mockReturnValue([
      {
        name: 'engineering',
        displayName: 'LUNOR Engineering',
        type: 'local',
      },
      {
        name: 'design',
        displayName: 'Design Kit',
        type: 'github',
      },
    ]);

    vi.mocked(fsPromises.readFile).mockResolvedValue('line1\nline2\nline3');
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (consoleLogSpy) consoleLogSpy.mockRestore();
  });

  it('prints installed skill with preview', async () => {
    await skillsBrowseCommand({ lines: 2 });

    expect(fsPromises.readFile).toHaveBeenCalledWith('/tmp/eng/SKILL.md', 'utf-8');
    expect(loggerModule.logger.info).toHaveBeenCalledWith('  SKILL.md preview:');
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('filters to installed when requested', async () => {
    await skillsBrowseCommand({ installed: true });

    expect(fsPromises.readFile).toHaveBeenCalledTimes(1);
    // Only the installed skill should be previewed
    const paths = vi.mocked(fsPromises.readFile).mock.calls.map(c => c[0]);
    expect(paths).toContain('/tmp/eng/SKILL.md');
  });

  it('shows message when no matches', async () => {
    await skillsBrowseCommand({ search: 'nope' });

    expect(loggerModule.logger.info).toHaveBeenCalledWith('No skills match your filters');
    expect(fsPromises.readFile).not.toHaveBeenCalled();
  });
});
