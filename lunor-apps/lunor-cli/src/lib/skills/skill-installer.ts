import { mkdir, readdir, copyFile, stat } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import type { InstalledSkill } from './types.js';
import { PATHS } from '../../constants/paths.js';

/**
 * Options for skill installation to project
 */
export interface SkillInstallOptions {
  /** Source skill to install */
  readonly skill: InstalledSkill;
  /** Target directory (usually project root or .claude) */
  readonly targetDir: string;
  /** Whether to overwrite existing files */
  readonly overwrite?: boolean;
  /** Callback for progress reporting */
  readonly onProgress?: (file: string) => void;
}

/**
 * Result of skill installation
 */
export interface SkillInstallResult {
  /** Number of files copied */
  readonly filesCopied: number;
  /** Number of files skipped */
  readonly filesSkipped: number;
  /** List of copied file paths */
  readonly copiedFiles: string[];
  /** Target directory where files were installed */
  readonly targetDir: string;
}

/**
 * Service for installing skills into project directories
 * 
 * Responsibilities:
 * - Copy skill files from source to project
 * - Handle directory structure creation
 * - Respect file overwrite preferences
 * - Provide installation progress feedback
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles file copying
 * - Open/Closed: Extensible via options
 * - Dependency Inversion: Depends on abstractions (types)
 * 
 * @example
 * ```typescript
 * const installer = new SkillInstaller();
 * const result = await installer.installToProject({
 *   skill: installedSkill,
 *   targetDir: process.cwd(),
 *   overwrite: false,
 *   onProgress: (file) => console.log(`Copying ${file}`)
 * });
 * ```
 */
export class SkillInstaller {
  private readonly configDir: string;

  /**
   * Create a new skill installer
   * 
   * @param configDir - Configuration directory (default: ~/.config/lunor)
   */
  constructor(configDir?: string) {
    this.configDir = configDir || PATHS.root;
  }

  /**
   * Install a skill to a project directory
   * 
   * Copies all files from the skill's installation directory
   * to the target project directory, preserving structure.
   * 
   * @param options - Installation options
   * @returns Installation result with statistics
   * @throws Error if source skill not found or target not writable
   */
  async installToProject(options: SkillInstallOptions): Promise<SkillInstallResult> {
    this.validateOptions(options);

    // Use the actual path from the skill object if available
    const sourceDir = options.skill.path || join(this.configDir, 'skills', options.skill.name);
    const targetDir = this.resolveTargetDir(options.targetDir);

    // Collect files to copy
    const filesToCopy = await this.collectFiles(sourceDir);
    
    let filesCopied = 0;
    let filesSkipped = 0;
    const copiedFiles: string[] = [];

    // Copy each file
    for (const relPath of filesToCopy) {
      const sourcePath = join(sourceDir, relPath);
      const targetPath = join(targetDir, relPath);

      if (await this.shouldSkipFile(relPath)) {
        filesSkipped++;
        continue;
      }

      const copied = await this.copyFileIfNeeded(
        sourcePath,
        targetPath,
        options.overwrite || false
      );

      if (copied) {
        filesCopied++;
        copiedFiles.push(relative(targetDir, targetPath));
        options.onProgress?.(relPath);
      } else {
        filesSkipped++;
      }
    }

    return {
      filesCopied,
      filesSkipped,
      copiedFiles,
      targetDir,
    };
  }

  /**
   * Validate installation options
   * 
   * @param options - Options to validate
   * @throws Error if validation fails
   */
  private validateOptions(options: SkillInstallOptions): void {
    if (!options.skill) {
      throw new Error('Skill is required');
    }

    if (!options.targetDir) {
      throw new Error('Target directory is required');
    }

    if (options.targetDir.includes('..')) {
      throw new Error('Target directory contains path traversal');
    }
  }

  /**
   * Resolve target directory based on skill type
   * 
   * For engineering skills, uses .claude directory
   * For UX/UI skills, uses project root
   * 
   * @param targetDir - Base target directory
   * @returns Resolved target directory
   */
  private resolveTargetDir(targetDir: string): string {
    // If target already points to .claude, use as-is
    if (targetDir.endsWith('.claude')) {
      return targetDir;
    }

    // Otherwise, create .claude subdirectory
    return join(targetDir, '.claude');
  }

  /**
   * Recursively collect all files in a directory
   * 
   * @param dir - Directory to scan
   * @param baseDir - Base directory for relative paths
   * @returns Array of relative file paths
   */
  private async collectFiles(
    dir: string,
    baseDir: string = dir
  ): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relPath = relative(baseDir, fullPath);

        if (entry.isDirectory()) {
          // Skip common directories that shouldn't be copied
          if (this.shouldSkipDirectory(entry.name)) {
            continue;
          }

          const subFiles = await this.collectFiles(fullPath, baseDir);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(relPath);
        }
      }
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        throw new Error(`Source directory not found: ${dir}`);
      }
      throw error;
    }

    return files;
  }

  /**
   * Check if a directory should be skipped during copy
   * 
   * @param name - Directory name
   * @returns True if should skip
   */
  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = new Set([
      'node_modules',
      '.git',
      '.github',
      'dist',
      'build',
      '__pycache__',
      '.pytest_cache',
      '.venv',
      'venv',
    ]);

    return skipDirs.has(name);
  }

  /**
   * Check if a file should be skipped during copy
   * 
   * @param relPath - Relative file path
   * @returns True if should skip
   */
  private async shouldSkipFile(relPath: string): Promise<boolean> {
    const skipPatterns = [
      /\.pyc$/,
      /\.pyo$/,
      /\.DS_Store$/,
      /Thumbs\.db$/,
      /\.gitkeep$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /pnpm-lock\.yaml$/,
      /bun\.lockb$/,
    ];

    return skipPatterns.some(pattern => pattern.test(relPath));
  }

  /**
   * Copy a file if it doesn't exist or overwrite is enabled
   * 
   * @param sourcePath - Source file path
   * @param targetPath - Target file path
   * @param overwrite - Whether to overwrite existing files
   * @returns True if file was copied
   */
  private async copyFileIfNeeded(
    sourcePath: string,
    targetPath: string,
    overwrite: boolean
  ): Promise<boolean> {
    try {
      // Check if target exists
      const targetExists = await this.fileExists(targetPath);

      if (targetExists && !overwrite) {
        return false;
      }

      // Ensure target directory exists
      await mkdir(dirname(targetPath), { recursive: true });

      // Copy file
      await copyFile(sourcePath, targetPath);

      return true;
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      throw new Error(
        `Failed to copy ${sourcePath} to ${targetPath}: ${error.message}`
      );
    }
  }

  /**
   * Check if a file exists
   * 
   * @param path - File path to check
   * @returns True if exists
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }
}
