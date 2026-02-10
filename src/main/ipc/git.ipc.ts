import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-types';
import type { GitService } from '../services/git.service';

export function registerGitHandlers(gitService: GitService): void {
  ipcMain.handle(IPC_CHANNELS.GIT_LIST_WORKTREES, async (_event, { basePath }) => {
    return gitService.listWorktrees(basePath);
  });

  ipcMain.handle(IPC_CHANNELS.GIT_GET_STATUS, async (_event, { worktreePath }) => {
    return gitService.getStatus(worktreePath);
  });

  ipcMain.handle(IPC_CHANNELS.GIT_CREATE_WORKTREE, async (_event, { basePath, name, branch, baseBranch }) => {
    return gitService.createWorktree(basePath, name, branch, baseBranch);
  });

  ipcMain.handle(IPC_CHANNELS.GIT_DELETE_WORKTREE, async (_event, { worktreePath, force }) => {
    return gitService.deleteWorktree(worktreePath, force);
  });

  ipcMain.handle(IPC_CHANNELS.GIT_GET_DIFF, async (_event, { worktreePath, compareRef }) => {
    return gitService.getDiff(worktreePath, compareRef);
  });

  ipcMain.handle(IPC_CHANNELS.GIT_GET_STAGED_DIFF, async (_event, { worktreePath }) => {
    return gitService.getStagedDiff(worktreePath);
  });

  ipcMain.handle(IPC_CHANNELS.GIT_STAGE_FILE, async (_event, { worktreePath, filePath }) => {
    return gitService.stageFile(worktreePath, filePath);
  });

  ipcMain.handle(IPC_CHANNELS.GIT_UNSTAGE_FILE, async (_event, { worktreePath, filePath }) => {
    return gitService.unstageFile(worktreePath, filePath);
  });
}
