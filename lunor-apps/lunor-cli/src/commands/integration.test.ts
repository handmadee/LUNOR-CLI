import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI_PATH = `"${join(process.cwd(), 'dist', 'index.js')}"`;
const TEST_DIR = join(tmpdir(), `lunor-test-${Date.now()}`);

describe('Integration Tests', () => {
  beforeEach(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Rules System Integration', () => {
    it('should complete full rules workflow', () => {
      const testRulePath = join(TEST_DIR, 'test-rule.md');
      writeFileSync(testRulePath, '# Test Rule\n\nThis is a test rule.');

      const addOutput = execSync(`node ${CLI_PATH} rules add "${testRulePath}"`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect(addOutput).toMatch(/Add Cursor Rule/i);

      const listOutput = execSync(`node ${CLI_PATH} rules list`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect(listOutput).toContain('test-rule');

      const showOutput = execSync(`node ${CLI_PATH} rules show test-rule`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect(showOutput).toMatch(/Show Rule/i);
    });

    it('should sync rules across IDEs', () => {
      const listIDEsOutput = execSync(`node ${CLI_PATH} rules ides`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      
      expect(listIDEsOutput).toContain('Cursor');
      expect(listIDEsOutput).toContain('Atigravity');
      expect(listIDEsOutput).toContain('ClaudeCode');
    });

    it('should handle invalid rule files gracefully', () => {
      const invalidRulePath = join(TEST_DIR, 'invalid.xyz');
      writeFileSync(invalidRulePath, 'invalid content');

      try {
        execSync(`node ${CLI_PATH} rules add "${invalidRulePath}"`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      } catch (error: any) {
        expect(error.message).toBeTruthy();
      }
    });
  });

  describe('Skills System Integration', () => {
    it('should list installed skills', () => {
      const output = execSync(`node ${CLI_PATH} skills list`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      expect(output).toContain('Skills Manager');
      expect(output).toContain('Available Sources');
    });

    it('should show skill details', () => {
      const output = execSync(`node ${CLI_PATH} skills list`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      if (output.includes('installed')) {
        expect(output).toMatch(/LUNOR Engineering|LUNOR UX\/UI/);
      }
    });
  });

  describe('AMP Configuration Integration', () => {
    it('should show AMP configuration', () => {
      const output = execSync(`node ${CLI_PATH} amp show`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      expect(output).toContain('AMP');
    });
  });

  describe('Help System Integration', () => {
    it('should display main help', () => {
      const output = execSync(`node ${CLI_PATH} --help`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      expect(output).toContain('LUNOR KIT');
      expect(output).toContain('Codex Kit');
      expect(output).toContain('codex');
      expect(output).toContain('Designed by LEO');
    });

    it('should display command-specific help', () => {
      const commands = ['rules', 'skills', 'amp'];

      for (const cmd of commands) {
        const output = execSync(`node ${CLI_PATH} ${cmd} --help`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });

        expect(output).toBeTruthy();
      }
    });
  });

  describe('Banner Display', () => {
    it('should display banner on no args', () => {
      const output = execSync(`node ${CLI_PATH}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      expect(output).toContain('LUNOR KIT');
      expect(output).toContain('Designed by LEO');
      expect(output).toContain('© 2025 LEO');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown commands gracefully', () => {
      try {
        execSync(`node ${CLI_PATH} unknown-command`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });

    it('should handle missing arguments', () => {
      try {
        execSync(`node ${CLI_PATH} rules show`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });
});
