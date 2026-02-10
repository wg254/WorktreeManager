// Core domain types for WorktreeManager

export interface Worktree {
  path: string;
  branch: string;
  head: string; // commit SHA
  isMain: boolean;
  isBare: boolean;
  locked: boolean;
  prunable: boolean;
}

export interface WorktreeStatus {
  path: string;
  branch: string;
  ahead: number;
  behind: number;
  staged: number;
  unstaged: number;
  untracked: number;
  hasConflicts: boolean;
}

export interface DiffFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  oldPath?: string; // for renamed files
  hunks: DiffHunk[];
  binary: boolean;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffResult {
  files: DiffFile[];
  stats: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
}

export interface Job {
  id: number;
  worktreePath: string;
  name: string;
  command: string;
  cron?: string; // cron expression, null for one-time
  status: JobStatus;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type JobStatus = 'pending' | 'running' | 'success' | 'failed' | 'scheduled';

export interface JobRun {
  id: number;
  jobId: number;
  startedAt: Date;
  finishedAt?: Date;
  exitCode?: number;
  stdout: string;
  stderr: string;
  status: 'running' | 'success' | 'failed';
}

export interface TerminalSession {
  id: string;
  worktreePath: string;
  pid: number;
  cols: number;
  rows: number;
}

export interface FileChange {
  path: string;
  type: 'add' | 'change' | 'unlink';
}

// App state types
export interface AppState {
  worktrees: Worktree[];
  selectedWorktree: string | null;
  activeView: ViewType;
  terminals: Map<string, TerminalSession>;
}

export type ViewType = 'terminal' | 'diff' | 'editor' | 'jobs';

// Tab types
export type TabType = 'terminal' | 'diff' | 'editor' | 'jobs';

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  worktreePath: string;
  terminalId?: string;  // for terminal tabs
  filePath?: string;    // for editor tabs
  isDirty?: boolean;    // for editor tabs
}

// Settings types
export interface Settings {
  terminal: {
    fontSize: number;
    fontFamily: string;
  };
  editor: {
    fontSize: number;
    tabSize: number;
  };
  behavior: {
    confirmOnClose: boolean;
    autoSave: boolean;
  };
}

// File tree types
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

// Session persistence types
export interface SessionState {
  selectedWorktreePath: string | null;
  tabs: Tab[];
  activeTabId: string | null;
  paneSizes: { sidebar: number; rightPanel: number };
  rightPanelVisible: boolean;
}
