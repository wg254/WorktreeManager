import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPC_CHANNELS, IPCChannel, IPCRequest, IPCResponse, IPCEvents } from '../shared/ipc-types';

// Type-safe IPC invoke wrapper
async function invoke<C extends IPCChannel>(
  channel: C,
  ...args: IPCRequest<C> extends void ? [] : [IPCRequest<C>]
): Promise<IPCResponse<C>> {
  return ipcRenderer.invoke(channel, ...args);
}

// Type-safe event listener wrapper
function on<C extends keyof IPCEvents>(
  channel: C,
  callback: (data: IPCEvents[C]) => void
): () => void {
  const handler = (_event: IpcRendererEvent, data: IPCEvents[C]) => callback(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

// Expose API to renderer
const api = {
  // Git operations
  git: {
    listWorktrees: (basePath: string) =>
      invoke(IPC_CHANNELS.GIT_LIST_WORKTREES, { basePath }),
    getStatus: (worktreePath: string) =>
      invoke(IPC_CHANNELS.GIT_GET_STATUS, { worktreePath }),
    createWorktree: (basePath: string, name: string, branch: string, baseBranch?: string) =>
      invoke(IPC_CHANNELS.GIT_CREATE_WORKTREE, { basePath, name, branch, baseBranch }),
    deleteWorktree: (worktreePath: string, force?: boolean) =>
      invoke(IPC_CHANNELS.GIT_DELETE_WORKTREE, { worktreePath, force }),
    getDiff: (worktreePath: string, compareRef?: string) =>
      invoke(IPC_CHANNELS.GIT_GET_DIFF, { worktreePath, compareRef }),
    getStagedDiff: (worktreePath: string) =>
      invoke(IPC_CHANNELS.GIT_GET_STAGED_DIFF, { worktreePath }),
    stageFile: (worktreePath: string, filePath: string) =>
      invoke(IPC_CHANNELS.GIT_STAGE_FILE, { worktreePath, filePath }),
    unstageFile: (worktreePath: string, filePath: string) =>
      invoke(IPC_CHANNELS.GIT_UNSTAGE_FILE, { worktreePath, filePath }),
  },

  // Terminal operations
  pty: {
    create: (worktreePath: string, cols: number, rows: number) =>
      invoke(IPC_CHANNELS.PTY_CREATE, { worktreePath, cols, rows }),
    write: (sessionId: string, data: string) =>
      invoke(IPC_CHANNELS.PTY_WRITE, { sessionId, data }),
    resize: (sessionId: string, cols: number, rows: number) =>
      invoke(IPC_CHANNELS.PTY_RESIZE, { sessionId, cols, rows }),
    destroy: (sessionId: string) =>
      invoke(IPC_CHANNELS.PTY_DESTROY, { sessionId }),
    onData: (callback: (data: { sessionId: string; data: string }) => void) =>
      on(IPC_CHANNELS.PTY_DATA, callback),
  },

  // File operations
  file: {
    read: (filePath: string) =>
      invoke(IPC_CHANNELS.FILE_READ, { filePath }),
    write: (filePath: string, content: string) =>
      invoke(IPC_CHANNELS.FILE_WRITE, { filePath, content }),
    watchStart: (paths: string[]) =>
      invoke(IPC_CHANNELS.FILE_WATCH_START, { paths }),
    watchStop: () =>
      invoke(IPC_CHANNELS.FILE_WATCH_STOP),
    onChange: (callback: (change: { path: string; type: 'add' | 'change' | 'unlink' }) => void) =>
      on(IPC_CHANNELS.FILE_CHANGE, callback),
    list: (worktreePath: string) =>
      invoke(IPC_CHANNELS.FILE_LIST, { worktreePath }),
    readDir: (dirPath: string) =>
      invoke(IPC_CHANNELS.FILE_READ_DIR, { dirPath }),
  },

  // Job operations
  job: {
    create: (worktreePath: string, name: string, command: string, cron?: string) =>
      invoke(IPC_CHANNELS.JOB_CREATE, { worktreePath, name, command, cron }),
    delete: (jobId: number) =>
      invoke(IPC_CHANNELS.JOB_DELETE, { jobId }),
    run: (jobId: number) =>
      invoke(IPC_CHANNELS.JOB_RUN, { jobId }),
    stop: (jobId: number) =>
      invoke(IPC_CHANNELS.JOB_STOP, { jobId }),
    list: (worktreePath?: string) =>
      invoke(IPC_CHANNELS.JOB_LIST, { worktreePath }),
    getRuns: (jobId: number, limit?: number) =>
      invoke(IPC_CHANNELS.JOB_GET_RUNS, { jobId, limit }),
    onStatusChange: (callback: (data: { job: import('../shared/types').Job; run?: import('../shared/types').JobRun }) => void) =>
      on(IPC_CHANNELS.JOB_STATUS_CHANGE, callback),
  },

  // App operations
  app: {
    getBasePath: () => invoke(IPC_CHANNELS.APP_GET_BASE_PATH),
  },

  // Settings operations
  settings: {
    get: () => invoke(IPC_CHANNELS.SETTINGS_GET),
    save: (settings: import('../shared/types').Settings) =>
      invoke(IPC_CHANNELS.SETTINGS_SAVE, { settings }),
  },

  // Session operations
  session: {
    get: () => invoke(IPC_CHANNELS.SESSION_GET),
    save: (session: import('../shared/types').SessionState) =>
      invoke(IPC_CHANNELS.SESSION_SAVE, { session }),
  },
};

contextBridge.exposeInMainWorld('api', api);

// Type declaration for renderer
export type API = typeof api;
