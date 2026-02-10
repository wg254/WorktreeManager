import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import type { SessionState } from '../../shared/types';

export class SessionService {
  private sessionPath: string;

  constructor() {
    this.sessionPath = path.join(app.getPath('userData'), 'session.json');
  }

  get(): SessionState | null {
    try {
      if (fs.existsSync(this.sessionPath)) {
        const data = fs.readFileSync(this.sessionPath, 'utf-8');
        return JSON.parse(data) as SessionState;
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
    return null;
  }

  save(session: SessionState): void {
    try {
      fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  }
}
