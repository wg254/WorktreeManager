import { describe, it, expect } from 'vitest';
import { parseWorktreeList, parseStatusOutput, parseDiff } from './git-parser';

describe('parseWorktreeList', () => {
  it('parses a single worktree', () => {
    const output = `worktree /path/to/repo
HEAD abc1234567890
branch refs/heads/main
`;
    const result = parseWorktreeList(output);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: '/path/to/repo',
      head: 'abc1234567890',
      branch: 'main',
      isMain: true,
      isBare: false,
      locked: false,
      prunable: false,
    });
  });

  it('parses multiple worktrees', () => {
    const output = `worktree /path/to/repo
HEAD abc1234567890
branch refs/heads/main

worktree /path/to/worktree1
HEAD def4567890123
branch refs/heads/feature-1

worktree /path/to/worktree2
HEAD 789012345abcd
branch refs/heads/feature-2
`;
    const result = parseWorktreeList(output);
    expect(result).toHaveLength(3);
    expect(result[0].isMain).toBe(true);
    expect(result[1].isMain).toBe(false);
    expect(result[2].isMain).toBe(false);
    expect(result[1].branch).toBe('feature-1');
    expect(result[2].branch).toBe('feature-2');
  });

  it('handles bare worktrees', () => {
    const output = `worktree /path/to/repo.git
bare
`;
    const result = parseWorktreeList(output);
    expect(result).toHaveLength(1);
    expect(result[0].isBare).toBe(true);
  });

  it('handles locked worktrees', () => {
    const output = `worktree /path/to/repo
HEAD abc1234567890
branch refs/heads/main
locked
`;
    const result = parseWorktreeList(output);
    expect(result[0].locked).toBe(true);
  });

  it('handles prunable worktrees', () => {
    const output = `worktree /path/to/repo
HEAD abc1234567890
branch refs/heads/main
prunable
`;
    const result = parseWorktreeList(output);
    expect(result[0].prunable).toBe(true);
  });

  it('handles detached HEAD', () => {
    const output = `worktree /path/to/repo
HEAD abc1234567890123456789012345678901234567890
detached
`;
    const result = parseWorktreeList(output);
    expect(result[0].branch).toBe('(detached at abc1234)');
  });

  it('handles empty output', () => {
    const result = parseWorktreeList('');
    expect(result).toHaveLength(0);
  });
});

describe('parseStatusOutput', () => {
  it('parses staged files', () => {
    const output = `M  file1.ts
A  file2.ts
D  file3.ts`;
    const result = parseStatusOutput(output);
    expect(result.staged).toBe(3);
    expect(result.unstaged).toBe(0);
    expect(result.untracked).toBe(0);
    expect(result.hasConflicts).toBe(false);
  });

  it('parses unstaged files', () => {
    const output = ` M file1.ts
 D file2.ts`;
    const result = parseStatusOutput(output);
    expect(result.staged).toBe(0);
    expect(result.unstaged).toBe(2);
    expect(result.untracked).toBe(0);
  });

  it('parses untracked files', () => {
    const output = `?? new-file.ts
?? another-new.ts`;
    const result = parseStatusOutput(output);
    expect(result.staged).toBe(0);
    expect(result.unstaged).toBe(0);
    expect(result.untracked).toBe(2);
  });

  it('parses mixed status', () => {
    const output = `M  staged.ts
 M unstaged.ts
MM both.ts
?? untracked.ts`;
    const result = parseStatusOutput(output);
    expect(result.staged).toBe(2); // M and first M of MM
    expect(result.unstaged).toBe(2); // M and second M of MM
    expect(result.untracked).toBe(1);
  });

  it('detects merge conflicts with U marker', () => {
    const output = `UU conflicted.ts`;
    const result = parseStatusOutput(output);
    expect(result.hasConflicts).toBe(true);
  });

  it('detects merge conflicts with both added', () => {
    const output = `AA conflicted.ts`;
    const result = parseStatusOutput(output);
    expect(result.hasConflicts).toBe(true);
  });

  it('detects merge conflicts with both deleted', () => {
    const output = `DD conflicted.ts`;
    const result = parseStatusOutput(output);
    expect(result.hasConflicts).toBe(true);
  });

  it('handles empty output', () => {
    const result = parseStatusOutput('');
    expect(result.staged).toBe(0);
    expect(result.unstaged).toBe(0);
    expect(result.untracked).toBe(0);
    expect(result.hasConflicts).toBe(false);
  });
});

describe('parseDiff', () => {
  it('parses a simple modification', () => {
    const diffOutput = `diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,4 @@
 line 1
-old line 2
+new line 2
+extra line
 line 3
`;
    const result = parseDiff(diffOutput);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('file.ts');
    expect(result.files[0].status).toBe('modified');
    expect(result.files[0].hunks).toHaveLength(1);
    expect(result.stats.insertions).toBe(2);
    expect(result.stats.deletions).toBe(1);
    expect(result.stats.filesChanged).toBe(1);
  });

  it('parses a new file', () => {
    const diffOutput = `diff --git a/new-file.ts b/new-file.ts
new file mode 100644
index 0000000..abc123
--- /dev/null
+++ b/new-file.ts
@@ -0,0 +1,3 @@
+line 1
+line 2
+line 3
`;
    const result = parseDiff(diffOutput);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('new-file.ts');
    expect(result.files[0].status).toBe('added');
    expect(result.stats.insertions).toBe(3);
    expect(result.stats.deletions).toBe(0);
  });

  it('parses a deleted file', () => {
    const diffOutput = `diff --git a/old-file.ts b/old-file.ts
deleted file mode 100644
index abc123..0000000
--- a/old-file.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-line 1
-line 2
`;
    const result = parseDiff(diffOutput);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('old-file.ts');
    expect(result.files[0].status).toBe('deleted');
    expect(result.stats.insertions).toBe(0);
    expect(result.stats.deletions).toBe(2);
  });

  it('parses a renamed file', () => {
    const diffOutput = `diff --git a/old-name.ts b/new-name.ts
similarity index 95%
rename from old-name.ts
rename to new-name.ts
index abc123..def456 100644
--- a/old-name.ts
+++ b/new-name.ts
@@ -1,3 +1,3 @@
 line 1
-old line 2
+new line 2
 line 3
`;
    const result = parseDiff(diffOutput);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('new-name.ts');
    expect(result.files[0].oldPath).toBe('old-name.ts');
    expect(result.files[0].status).toBe('renamed');
  });

  it('parses binary files', () => {
    const diffOutput = `diff --git a/image.png b/image.png
index abc123..def456 100644
Binary files a/image.png and b/image.png differ
`;
    const result = parseDiff(diffOutput);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].binary).toBe(true);
  });

  it('parses multiple files', () => {
    const diffOutput = `diff --git a/file1.ts b/file1.ts
index abc123..def456 100644
--- a/file1.ts
+++ b/file1.ts
@@ -1 +1 @@
-old
+new
diff --git a/file2.ts b/file2.ts
index abc123..def456 100644
--- a/file2.ts
+++ b/file2.ts
@@ -1 +1,2 @@
 existing
+added
`;
    const result = parseDiff(diffOutput);
    expect(result.files).toHaveLength(2);
    expect(result.files[0].path).toBe('file1.ts');
    expect(result.files[1].path).toBe('file2.ts');
    expect(result.stats.filesChanged).toBe(2);
  });

  it('parses multiple hunks in a file', () => {
    const diffOutput = `diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
 first section
-old line
+new line
 end of first
@@ -10,3 +10,3 @@
 second section
-another old
+another new
 end of second
`;
    const result = parseDiff(diffOutput);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].hunks).toHaveLength(2);
    expect(result.files[0].hunks[0].oldStart).toBe(1);
    expect(result.files[0].hunks[1].oldStart).toBe(10);
  });

  it('handles context lines with correct line numbers', () => {
    const diffOutput = `diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts
@@ -5,5 +5,6 @@
 context line 1
 context line 2
-deleted line
+added line 1
+added line 2
 context line 3
`;
    const result = parseDiff(diffOutput);
    const hunk = result.files[0].hunks[0];

    // First context line
    expect(hunk.lines[0].type).toBe('context');
    expect(hunk.lines[0].oldLineNumber).toBe(5);
    expect(hunk.lines[0].newLineNumber).toBe(5);

    // Deleted line
    expect(hunk.lines[2].type).toBe('delete');
    expect(hunk.lines[2].oldLineNumber).toBe(7);

    // Added lines
    expect(hunk.lines[3].type).toBe('add');
    expect(hunk.lines[3].newLineNumber).toBe(7);
    expect(hunk.lines[4].type).toBe('add');
    expect(hunk.lines[4].newLineNumber).toBe(8);
  });

  it('handles empty diff', () => {
    const result = parseDiff('');
    expect(result.files).toHaveLength(0);
    expect(result.stats.filesChanged).toBe(0);
    expect(result.stats.insertions).toBe(0);
    expect(result.stats.deletions).toBe(0);
  });

  it('handles "No newline at end of file" marker', () => {
    const diffOutput = `diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts
@@ -1 +1 @@
-old content
\\ No newline at end of file
+new content
\\ No newline at end of file
`;
    const result = parseDiff(diffOutput);
    expect(result.files).toHaveLength(1);
    // The marker should be ignored and not counted
    expect(result.stats.insertions).toBe(1);
    expect(result.stats.deletions).toBe(1);
  });
});
