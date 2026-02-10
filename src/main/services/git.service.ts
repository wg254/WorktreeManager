import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import type { Worktree, WorktreeStatus, DiffResult } from '../../shared/types';
import { parseWorktreeList, parseStatusOutput, parseDiff } from './git-parser';

const execAsync = promisify(exec);

export class GitService {
  /**
   * Execute a git command in a given directory
   */
  private async git(cwd: string, args: string): Promise<string> {
    const { stdout } = await execAsync(`git ${args}`, { cwd, maxBuffer: 50 * 1024 * 1024 });
    return stdout;
  }

  /**
   * List all worktrees for a repository
   */
  async listWorktrees(basePath: string): Promise<Worktree[]> {
    const output = await this.git(basePath, 'worktree list --porcelain');
    return parseWorktreeList(output);
  }

  /**
   * Get the status of a worktree
   */
  async getStatus(worktreePath: string): Promise<WorktreeStatus> {
    // Get branch name
    const branch = (await this.git(worktreePath, 'rev-parse --abbrev-ref HEAD')).trim();

    // Get ahead/behind counts
    let ahead = 0;
    let behind = 0;
    try {
      const tracking = (await this.git(worktreePath, 'rev-parse --abbrev-ref @{upstream}')).trim();
      if (tracking) {
        const counts = await this.git(worktreePath, `rev-list --left-right --count HEAD...${tracking}`);
        const [a, b] = counts.trim().split(/\s+/).map(Number);
        ahead = a || 0;
        behind = b || 0;
      }
    } catch {
      // No upstream configured
    }

    // Get status counts using extracted parser
    const statusOutput = await this.git(worktreePath, 'status --porcelain');
    const { staged, unstaged, untracked, hasConflicts } = parseStatusOutput(statusOutput);

    return {
      path: worktreePath,
      branch,
      ahead,
      behind,
      staged,
      unstaged,
      untracked,
      hasConflicts,
    };
  }

  /**
   * Create a new worktree
   */
  async createWorktree(basePath: string, name: string, branch: string, baseBranch?: string): Promise<Worktree> {
    const worktreePath = path.join(path.dirname(basePath), name);

    if (baseBranch) {
      await this.git(basePath, `worktree add "${worktreePath}" -b ${branch} ${baseBranch}`);
    } else {
      await this.git(basePath, `worktree add "${worktreePath}" -b ${branch}`);
    }

    const worktrees = await this.listWorktrees(basePath);
    const created = worktrees.find(w => w.path === worktreePath);

    if (!created) {
      throw new Error(`Failed to create worktree at ${worktreePath}`);
    }

    return created;
  }

  /**
   * Delete a worktree
   */
  async deleteWorktree(worktreePath: string, force = false): Promise<void> {
    // Find the main worktree to run the command from
    const mainWorktree = await this.findMainWorktree(worktreePath);
    const forceFlag = force ? ' --force' : '';
    await this.git(mainWorktree, `worktree remove "${worktreePath}"${forceFlag}`);
  }

  /**
   * Find the main worktree path from any worktree
   */
  private async findMainWorktree(anyWorktreePath: string): Promise<string> {
    const gitDir = (await this.git(anyWorktreePath, 'rev-parse --git-common-dir')).trim();
    // git-common-dir returns the path to the shared .git directory
    // The main worktree is the parent of .git
    if (gitDir.endsWith('.git')) {
      return path.dirname(gitDir);
    }
    return path.dirname(gitDir);
  }

  /**
   * Get unstaged diff for a worktree
   */
  async getDiff(worktreePath: string, compareRef?: string): Promise<DiffResult> {
    let diffOutput: string;

    if (compareRef) {
      // Compare against a specific ref (merge-base comparison)
      const mergeBase = (await this.git(worktreePath, `merge-base HEAD ${compareRef}`)).trim();
      diffOutput = await this.git(worktreePath, `diff ${mergeBase}`);
    } else {
      // Get unstaged changes
      diffOutput = await this.git(worktreePath, 'diff');
    }

    return parseDiff(diffOutput);
  }

  /**
   * Get staged diff for a worktree
   */
  async getStagedDiff(worktreePath: string): Promise<DiffResult> {
    const diffOutput = await this.git(worktreePath, 'diff --cached');
    return parseDiff(diffOutput);
  }

  /**
   * Stage a file
   */
  async stageFile(worktreePath: string, filePath: string): Promise<void> {
    await this.git(worktreePath, `add "${filePath}"`);
  }

  /**
   * Unstage a file
   */
  async unstageFile(worktreePath: string, filePath: string): Promise<void> {
    await this.git(worktreePath, `reset HEAD "${filePath}"`);
  }
}
