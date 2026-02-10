import type { Worktree, WorktreeStatus, DiffResult, DiffFile, DiffHunk, DiffLine } from '../../shared/types';

/**
 * Parse git worktree list --porcelain output
 */
export function parseWorktreeList(output: string): Worktree[] {
  const worktrees: Worktree[] = [];
  let current: Partial<Worktree> = {};

  for (const line of output.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current.path) {
        worktrees.push(current as Worktree);
      }
      current = {
        path: line.slice(9),
        isMain: false,
        isBare: false,
        locked: false,
        prunable: false,
      };
    } else if (line.startsWith('HEAD ')) {
      current.head = line.slice(5);
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice(7).replace('refs/heads/', '');
    } else if (line === 'bare') {
      current.isBare = true;
    } else if (line === 'locked') {
      current.locked = true;
    } else if (line === 'prunable') {
      current.prunable = true;
    } else if (line.startsWith('detached')) {
      current.branch = `(detached at ${current.head?.slice(0, 7)})`;
    }
  }

  if (current.path) {
    worktrees.push(current as Worktree);
  }

  // Mark the main worktree
  if (worktrees.length > 0) {
    worktrees[0].isMain = true;
  }

  return worktrees;
}

/**
 * Parse git status --porcelain output
 */
export function parseStatusOutput(output: string): Pick<WorktreeStatus, 'staged' | 'unstaged' | 'untracked' | 'hasConflicts'> {
  let staged = 0;
  let unstaged = 0;
  let untracked = 0;
  let hasConflicts = false;

  for (const line of output.split('\n')) {
    if (!line) continue;
    const indexStatus = line[0];
    const workingStatus = line[1];

    if (indexStatus === 'U' || workingStatus === 'U' ||
        (indexStatus === 'A' && workingStatus === 'A') ||
        (indexStatus === 'D' && workingStatus === 'D')) {
      hasConflicts = true;
    }
    if (indexStatus === '?' && workingStatus === '?') {
      untracked++;
    } else {
      if (indexStatus !== ' ' && indexStatus !== '?') {
        staged++;
      }
      if (workingStatus !== ' ' && workingStatus !== '?') {
        unstaged++;
      }
    }
  }

  return { staged, unstaged, untracked, hasConflicts };
}

/**
 * Parse git diff output into structured format
 */
export function parseDiff(diffOutput: string): DiffResult {
  const files: DiffFile[] = [];
  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;
  let stats = { filesChanged: 0, insertions: 0, deletions: 0 };

  const lines = diffOutput.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // New file diff header
    if (line.startsWith('diff --git')) {
      if (currentFile) {
        if (currentHunk) {
          currentFile.hunks.push(currentHunk);
        }
        files.push(currentFile);
      }
      currentFile = {
        path: '',
        status: 'modified',
        hunks: [],
        binary: false,
      };
      currentHunk = null;
      continue;
    }

    if (!currentFile) continue;

    // File paths
    if (line.startsWith('--- a/')) {
      currentFile.oldPath = line.slice(6);
    } else if (line.startsWith('--- /dev/null')) {
      currentFile.status = 'added';
    } else if (line.startsWith('+++ b/')) {
      currentFile.path = line.slice(6);
    } else if (line.startsWith('+++ /dev/null')) {
      currentFile.status = 'deleted';
      currentFile.path = currentFile.oldPath || '';
    } else if (line.startsWith('rename from ')) {
      currentFile.status = 'renamed';
      currentFile.oldPath = line.slice(12);
    } else if (line.startsWith('rename to ')) {
      currentFile.path = line.slice(10);
    } else if (line.startsWith('Binary files')) {
      currentFile.binary = true;
    } else if (line.startsWith('@@')) {
      // Hunk header
      if (currentHunk) {
        currentFile.hunks.push(currentHunk);
      }

      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/);
      if (match) {
        oldLineNum = parseInt(match[1], 10);
        newLineNum = parseInt(match[3], 10);
        currentHunk = {
          oldStart: oldLineNum,
          oldLines: parseInt(match[2] || '1', 10),
          newStart: newLineNum,
          newLines: parseInt(match[4] || '1', 10),
          header: line,
          lines: [],
        };
      }
    } else if (currentHunk) {
      // Diff content lines
      if (line.startsWith('+')) {
        const diffLine: DiffLine = {
          type: 'add',
          content: line.slice(1),
          newLineNumber: newLineNum++,
        };
        currentHunk.lines.push(diffLine);
        stats.insertions++;
      } else if (line.startsWith('-')) {
        const diffLine: DiffLine = {
          type: 'delete',
          content: line.slice(1),
          oldLineNumber: oldLineNum++,
        };
        currentHunk.lines.push(diffLine);
        stats.deletions++;
      } else if (line.startsWith(' ')) {
        const diffLine: DiffLine = {
          type: 'context',
          content: line.slice(1),
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
        };
        currentHunk.lines.push(diffLine);
      } else if (line === '\\ No newline at end of file') {
        // Ignore this marker
      }
    }
  }

  // Push last file and hunk
  if (currentFile) {
    if (currentHunk) {
      currentFile.hunks.push(currentHunk);
    }
    files.push(currentFile);
  }

  stats.filesChanged = files.length;

  return { files, stats };
}
