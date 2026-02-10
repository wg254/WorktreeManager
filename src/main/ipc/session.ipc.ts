import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-types';
import type { SessionService } from '../services/session';

export function registerSessionHandlers(sessionService: SessionService): void {
  ipcMain.handle(IPC_CHANNELS.SESSION_GET, async () => {
    return sessionService.get();
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_SAVE, async (_event, { session }) => {
    sessionService.save(session);
  });
}
