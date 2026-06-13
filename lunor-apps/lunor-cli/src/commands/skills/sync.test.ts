import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { skillsSyncCommand } from './sync.js';
import * as skillsModule from '../../lib/skills/index.js';
import { SkillInstaller } from '../../lib/skills/skill-installer.js';

vi.mock('../../lib/skills/index.js');
vi.mock('../../lib/skills/skill-installer.js');
vi.mock('../../utils/spinner.js', () => ({
  createSpinner: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  })),
}));
vi.mock('../../utils/prompts.js', () => ({
  prompts: {
    intro: vi.fn(),
    select: vi.fn(),
  },
}));
vi.mock('../../utils/logger.js', () => ({
  logger: {
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    divider: vi.fn(),
  },
}));

describe('skillsSyncCommand', () => {
  let mockManager: any;
  let mockInstaller: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    mockManager = {
      list: vi.fn(),
    };

    mockInstaller = {
      installToProject: vi.fn(),
    };

    vi.mocked(skillsModule.getSkillManager).mockReturnValue(mockManager);
    vi.mocked(SkillInstaller).mockImplementation(() => mockInstaller);

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (consoleLogSpy) consoleLogSpy.mockRestore();
  });

  describe('sync specific skill', () => {
    it('should sync engineering skill to current project', async () => {
      const mockSkill = {
        name: 'claudekit-engineering',
        displayName: 'LUNOR Engineering',
        path: '/Users/admin/.config/lunor/skills/claudekit-engineering',
        version: '1.0.0',
      };

      mockManager.list.mockReturnValue([mockSkill]);
      mockInstaller.installToProject.mockResolvedValue({
        filesCopied: 782,
        filesSkipped: 0,
        copiedFiles: ['.claude/agents/brainstormer.md', '.claude/agents/code-reviewer.md'],
        targetDir: '/tmp/test-project/.claude',
      });

      await skillsSyncCommand('claudekit-engineering');

      expect(mockManager.list).toHaveBeenCalled();
      expect(mockInstaller.installToProject).toHaveBeenCalledWith({
        skill: mockSkill,
        targetDir: process.cwd(),
        overwrite: false,
        onProgress: expect.any(Function),
      });
    });

    it('should handle force overwrite option', async () => {
      const mockSkill = {
        name: 'ui-ux-pro-max-skill',
        displayName: 'LUNOR UX/UI PROMAX',
        path: '/Users/admin/.config/lunor/skills/ui-ux-pro-max-skill',
      };

      mockManager.list.mockReturnValue([mockSkill]);
      mockInstaller.installToProject.mockResolvedValue({
        filesCopied: 50,
        filesSkipped: 0,
        copiedFiles: [],
        targetDir: process.cwd(),
      });

      await skillsSyncCommand('ui-ux-pro-max-skill', { force: true });

      expect(mockInstaller.installToProject).toHaveBeenCalledWith(
        expect.objectContaining({
          overwrite: true,
        })
      );
    });

    it('should show error for non-existent skill', async () => {
      mockManager.list.mockReturnValue([]);

      await skillsSyncCommand('non-existent-skill');

      expect(mockInstaller.installToProject).not.toHaveBeenCalled();
    });
  });

  describe('sync all skills', () => {
    it('should sync all installed skills', async () => {
      const mockSkills = [
        {
          name: 'claudekit-engineering',
          displayName: 'LUNOR Engineering',
          path: '/path1',
        },
        {
          name: 'ui-ux-pro-max-skill',
          displayName: 'LUNOR UX/UI PROMAX',
          path: '/path2',
        },
      ];

      mockManager.list.mockReturnValue(mockSkills);
      mockInstaller.installToProject.mockResolvedValue({
        filesCopied: 100,
        filesSkipped: 0,
        copiedFiles: [],
        targetDir: process.cwd(),
      });

      await skillsSyncCommand(undefined, { all: true });

      expect(mockInstaller.installToProject).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during bulk sync', async () => {
      const mockSkills = [
        { name: 'skill1', displayName: 'Skill 1', path: '/path1' },
        { name: 'skill2', displayName: 'Skill 2', path: '/path2' },
      ];

      mockManager.list.mockReturnValue(mockSkills);
      mockInstaller.installToProject
        .mockResolvedValueOnce({
          filesCopied: 50,
          filesSkipped: 0,
          copiedFiles: [],
          targetDir: process.cwd(),
        })
        .mockRejectedValueOnce(new Error('Copy failed'));

      await skillsSyncCommand(undefined, { all: true });

      // Should continue despite error
      expect(mockInstaller.installToProject).toHaveBeenCalledTimes(2);
    });
  });

  describe('no skills installed', () => {
    it('should show warning when no skills are installed', async () => {
      mockManager.list.mockReturnValue([]);

      await skillsSyncCommand();

      expect(mockInstaller.installToProject).not.toHaveBeenCalled();
    });
  });

  describe('progress reporting', () => {
    it('should report progress during file copy', async () => {
      const mockSkill = {
        name: 'test-skill',
        displayName: 'Test Skill',
        path: '/path',
      };

      mockManager.list.mockReturnValue([mockSkill]);
      
      let progressCallback: ((file: string) => void) | undefined;
      mockInstaller.installToProject.mockImplementation((opts: any) => {
        progressCallback = opts.onProgress;
        // Simulate progress
        if (progressCallback) {
          progressCallback('.claude/agents/test.md');
          progressCallback('.claude/skills/test-skill/README.md');
        }
        return Promise.resolve({
          filesCopied: 2,
          filesSkipped: 0,
          copiedFiles: ['.claude/agents/test.md', '.claude/skills/test-skill/README.md'],
          targetDir: process.cwd(),
        });
      });

      await skillsSyncCommand('test-skill');

      expect(progressCallback).toBeDefined();
    });
  });
});
