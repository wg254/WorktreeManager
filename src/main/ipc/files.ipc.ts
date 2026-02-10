import { ipcMain, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';
import { IPC_CHANNELS } from '../../shared/ipc-types';
import type { FileWatcher } from '../services/file-watcher';
import type { FileEntry } from '../../shared/types';

export function registerFileHandlers(
  fileWatcher: FileWatcher,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle(IPC_CHANNELS.FILE_READ, async (_event, { filePath }) => {
    return fs.readFile(filePath, 'utf-8');
  });

  ipcMain.handle(IPC_CHANNELS.FILE_WRITE, async (_event, { filePath, content }) => {
    await fs.writeFile(filePath, content, 'utf-8');
  });

  ipcMain.handle(IPC_CHANNELS.FILE_WATCH_START, async (_event, { paths }) => {
    fileWatcher.start(paths);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_WATCH_STOP, async () => {
    fileWatcher.stop();
  });

  // List all files in a worktree (for quick open)
  ipcMain.handle(IPC_CHANNELS.FILE_LIST, async (_event, { worktreePath }) => {
    try {
      const files = await fg('**/*', {
        cwd: worktreePath,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**', 'coverage/**'],
        onlyFiles: true,
        dot: false,
      });
      return files.slice(0, 1000); // Limit to 1000 files
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  });

  // Read directory contents (for file tree)
  ipcMain.handle(IPC_CHANNELS.FILE_READ_DIR, async (_event, { dirPath }): Promise<FileEntry[]> => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter((entry) => !entry.name.startsWith('.') && entry.name !== 'node_modules')
        .map((entry) => ({
          name: entry.name,
          path: path.join(dirPath, entry.name),
          isDirectory: entry.isDirectory(),
        }))
        .sort((a, b) => {
          // Directories first, then alphabetical
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
    } catch (error) {
      console.error('Failed to read directory:', error);
      return [];
    }
  });
}
