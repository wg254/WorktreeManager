import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import type { Settings } from '../../shared/types';

const defaultSettings: Settings = {
  terminal: { fontSize: 14, fontFamily: "'SF Mono', Monaco, 'Courier New', monospace" },
  editor: { fontSize: 14, tabSize: 2 },
  behavior: { confirmOnClose: true, autoSave: false },
};

export class SettingsService {
  private settingsPath: string;
  private settings: Settings;

  constructor() {
    this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
    this.settings = this.load();
  }

  private load(): Settings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        const parsed = JSON.parse(data);
        // Merge with defaults to ensure all fields exist
        return {
          terminal: { ...defaultSettings.terminal, ...parsed.terminal },
          editor: { ...defaultSettings.editor, ...parsed.editor },
          behavior: { ...defaultSettings.behavior, ...parsed.behavior },
        };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return { ...defaultSettings };
  }

  get(): Settings {
    return this.settings;
  }

  save(settings: Settings): void {
    this.settings = settings;
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }
}
