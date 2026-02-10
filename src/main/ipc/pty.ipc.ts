import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-types';
import type { PtyManager } from '../services/pty-manager';

export function registerPtyHandlers(
  ptyManager: PtyManager,
  getWindow: () => BrowserWindow | null
): void {
  // Set up data forwarding to renderer
  ptyManager.on('data', ({ sessionId, data }) => {
    const window = getWindow();
    if (window) {
      window.webContents.send(IPC_CHANNELS.PTY_DATA, { sessionId, data });
    }
  });

  ipcMain.handle(IPC_CHANNELS.PTY_CREATE, async (_event, { worktreePath, cols, rows }) => {
    return ptyManager.create(worktreePath, cols, rows);
  });

  ipcMain.handle(IPC_CHANNELS.PTY_WRITE, async (_event, { sessionId, data }) => {
    ptyManager.write(sessionId, data);
  });

  ipcMain.handle(IPC_CHANNELS.PTY_RESIZE, async (_event, { sessionId, cols, rows }) => {
    ptyManager.resize(sessionId, cols, rows);
  });

  ipcMain.handle(IPC_CHANNELS.PTY_DESTROY, async (_event, { sessionId }) => {
    ptyManager.destroy(sessionId);
  });
}
