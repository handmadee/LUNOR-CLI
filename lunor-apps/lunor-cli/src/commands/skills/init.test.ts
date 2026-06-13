import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { skillsInitCommand } from './init.js';
import * as skillsModule from '../../lib/skills/index.js';
import * as promptsModule from '../../utils/prompts.js';
import * as loggerModule from '../../utils/logger.js';

vi.mock('../../lib/skills/index.js', () => ({
  getSkillManager: vi.fn(),
  getSourceNames: vi.fn(),
  getSourceConfig: vi.fn(),
  getDefaultTargetFolder: vi.fn(),
  SKILL_SOURCES: {},
}));
vi.mock('../../utils/prompts.js', () => ({
  prompts: {
    intro: vi.fn(),
    select: vi.fn(),
    confirm: vi.fn(),
  },
}));
vi.mock('../../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    divider: vi.fn(),
  },
}));

describe('skillsInitCommand', () => {
  let mockManager: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    mockManager = {
      list: vi.fn().mockReturnValue([]),
      init: vi.fn().mockResolvedValue({ success: true }),
      getSourceStatus: vi.fn().mockReturnValue({ available: true, installed: false }),
    };

    vi.mocked(skillsModule.getSkillManager).mockReturnValue(mockManager);

    vi.mocked(skillsModule.getSourceNames).mockReturnValue(['engineering']);
    vi.mocked(skillsModule.getDefaultTargetFolder).mockReturnValue(undefined);
    vi.mocked(skillsModule.getSourceConfig).mockImplementation((name: string) => {
      if (name === 'engineering') {
        return {
          name: 'engineering',
          displayName: 'LUNOR Engineering',
          type: 'local',
          path: '/path/to/engineering',
          description: 'Engineering toolkit',
        } as any;
      }
      return undefined;
    });

    // ensure SKILL_SOURCES has entries for selectSource mapping
    (skillsModule as any).SKILL_SOURCES = {
      engineering: {
        name: 'engineering',
        displayName: 'LUNOR Engineering',
        type: 'local',
        path: '/path/to/engineering',
        description: 'Engineering toolkit',
      },
    };

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (consoleLogSpy) {
      consoleLogSpy.mockRestore();
    }
  });

  it('initializes provided source and skips copy when quiet', async () => {
    await skillsInitCommand('engineering', { quiet: true });

    expect(mockManager.init).toHaveBeenCalledWith('engineering');
    expect(promptsModule.prompts.confirm).not.toHaveBeenCalled();
  });

  it('logs error and aborts for unknown source', async () => {
    await skillsInitCommand('unknown', { quiet: true });

    expect(mockManager.init).not.toHaveBeenCalled();
    expect(loggerModule.logger.error).toHaveBeenCalled();
  });

  it('prompts for selection when no source provided', async () => {
    vi.mocked(promptsModule.prompts.select).mockResolvedValue('engineering');

    await skillsInitCommand(undefined, { quiet: true });

    expect(promptsModule.prompts.select).toHaveBeenCalled();
    expect(mockManager.init).toHaveBeenCalledWith('engineering');
  });

  it('cancels when selection is null', async () => {
    vi.mocked(promptsModule.prompts.select).mockResolvedValue(null);

    await skillsInitCommand(undefined, { quiet: true });

    expect(mockManager.init).not.toHaveBeenCalled();
  });
});
