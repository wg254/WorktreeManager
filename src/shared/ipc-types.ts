// IPC channel definitions and types
// All communication between main and renderer goes through these typed channels

import type {
  Worktree,
  WorktreeStatus,
  DiffResult,
  Job,
  JobRun,
  TerminalSession,
  FileChange,
  FileEntry,
  Settings,
  SessionState,
} from './types';

// Channel names as const for type safety
export const IPC_CHANNELS = {
  // Git operations
  GIT_LIST_WORKTREES: 'git:list-worktrees',
  GIT_GET_STATUS: 'git:get-status',
  GIT_CREATE_WORKTREE: 'git:create-worktree',
  GIT_DELETE_WORKTREE: 'git:delete-worktree',
  GIT_GET_DIFF: 'git:get-diff',
  GIT_GET_STAGED_DIFF: 'git:get-staged-diff',
  GIT_STAGE_FILE: 'git:stage-file',
  GIT_UNSTAGE_FILE: 'git:unstage-file',

  // Terminal operations
  PTY_CREATE: 'pty:create',
  PTY_WRITE: 'pty:write',
  PTY_RESIZE: 'pty:resize',
  PTY_DESTROY: 'pty:destroy',
  PTY_DATA: 'pty:data', // main -> renderer

  // File operations
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_WATCH_START: 'file:watch-start',
  FILE_WATCH_STOP: 'file:watch-stop',
  FILE_CHANGE: 'file:change', // main -> renderer

  // Job operations
  JOB_CREATE: 'job:create',
  JOB_DELETE: 'job:delete',
  JOB_RUN: 'job:run',
  JOB_STOP: 'job:stop',
  JOB_LIST: 'job:list',
  JOB_GET_RUNS: 'job:get-runs',
  JOB_STATUS_CHANGE: 'job:status-change', // main -> renderer

  // App operations
  APP_GET_BASE_PATH: 'app:get-base-path',

  // File operations (extended)
  FILE_LIST: 'file:list',
  FILE_READ_DIR: 'file:read-dir',

  // Settings operations
  SETTINGS_GET: 'settings:get',
  SETTINGS_SAVE: 'settings:save',

  // Session operations
  SESSION_GET: 'session:get',
  SESSION_SAVE: 'session:save',
} as const;

// Request/Response types for each channel
export interface IPCHandlers {
  // Git
  [IPC_CHANNELS.GIT_LIST_WORKTREES]: {
    request: { basePath: string };
    response: Worktree[];
  };
  [IPC_CHANNELS.GIT_GET_STATUS]: {
    request: { worktreePath: string };
    response: WorktreeStatus;
  };
  [IPC_CHANNELS.GIT_CREATE_WORKTREE]: {
    request: { basePath: string; name: string; branch: string; baseBranch?: string };
    response: Worktree;
  };
  [IPC_CHANNELS.GIT_DELETE_WORKTREE]: {
    request: { worktreePath: string; force?: boolean };
    response: void;
  };
  [IPC_CHANNELS.GIT_GET_DIFF]: {
    request: { worktreePath: string; compareRef?: string };
    response: DiffResult;
  };
  [IPC_CHANNELS.GIT_GET_STAGED_DIFF]: {
    request: { worktreePath: string };
    response: DiffResult;
  };
  [IPC_CHANNELS.GIT_STAGE_FILE]: {
    request: { worktreePath: string; filePath: string };
    response: void;
  };
  [IPC_CHANNELS.GIT_UNSTAGE_FILE]: {
    request: { worktreePath: string; filePath: string };
    response: void;
  };

  // Terminal
  [IPC_CHANNELS.PTY_CREATE]: {
    request: { worktreePath: string; cols: number; rows: number };
    response: TerminalSession;
  };
  [IPC_CHANNELS.PTY_WRITE]: {
    request: { sessionId: string; data: string };
    response: void;
  };
  [IPC_CHANNELS.PTY_RESIZE]: {
    request: { sessionId: string; cols: number; rows: number };
    response: void;
  };
  [IPC_CHANNELS.PTY_DESTROY]: {
    request: { sessionId: string };
    response: void;
  };

  // Files
  [IPC_CHANNELS.FILE_READ]: {
    request: { filePath: string };
    response: string;
  };
  [IPC_CHANNELS.FILE_WRITE]: {
    request: { filePath: string; content: string };
    response: void;
  };
  [IPC_CHANNELS.FILE_WATCH_START]: {
    request: { paths: string[] };
    response: void;
  };
  [IPC_CHANNELS.FILE_WATCH_STOP]: {
    request: void;
    response: void;
  };

  // Jobs
  [IPC_CHANNELS.JOB_CREATE]: {
    request: { worktreePath: string; name: string; command: string; cron?: string };
    response: Job;
  };
  [IPC_CHANNELS.JOB_DELETE]: {
    request: { jobId: number };
    response: void;
  };
  [IPC_CHANNELS.JOB_RUN]: {
    request: { jobId: number };
    response: JobRun;
  };
  [IPC_CHANNELS.JOB_STOP]: {
    request: { jobId: number };
    response: void;
  };
  [IPC_CHANNELS.JOB_LIST]: {
    request: { worktreePath?: string };
    response: Job[];
  };
  [IPC_CHANNELS.JOB_GET_RUNS]: {
    request: { jobId: number; limit?: number };
    response: JobRun[];
  };

  // App
  [IPC_CHANNELS.APP_GET_BASE_PATH]: {
    request: void;
    response: string;
  };

  // Extended file operations
  [IPC_CHANNELS.FILE_LIST]: {
    request: { worktreePath: string };
    response: string[];
  };
  [IPC_CHANNELS.FILE_READ_DIR]: {
    request: { dirPath: string };
    response: FileEntry[];
  };

  // Settings
  [IPC_CHANNELS.SETTINGS_GET]: {
    request: void;
    response: Settings;
  };
  [IPC_CHANNELS.SETTINGS_SAVE]: {
    request: { settings: Settings };
    response: void;
  };

  // Session
  [IPC_CHANNELS.SESSION_GET]: {
    request: void;
    response: SessionState | null;
  };
  [IPC_CHANNELS.SESSION_SAVE]: {
    request: { session: SessionState };
    response: void;
  };
}

// Event types for push notifications from main to renderer
export interface IPCEvents {
  [IPC_CHANNELS.PTY_DATA]: { sessionId: string; data: string };
  [IPC_CHANNELS.FILE_CHANGE]: FileChange;
  [IPC_CHANNELS.JOB_STATUS_CHANGE]: { job: Job; run?: JobRun };
}

// Helper types for type-safe IPC
export type IPCChannel = keyof IPCHandlers;
export type IPCRequest<C extends IPCChannel> = IPCHandlers[C]['request'];
export type IPCResponse<C extends IPCChannel> = IPCHandlers[C]['response'];
