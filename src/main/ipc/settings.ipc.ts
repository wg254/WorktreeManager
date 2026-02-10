import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-types';
import type { SettingsService } from '../services/settings';

export function registerSettingsHandlers(settingsService: SettingsService): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return settingsService.get();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE, async (_event, { settings }) => {
    settingsService.save(settings);
  });
}
