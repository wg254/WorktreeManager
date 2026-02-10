import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import type { TerminalSession } from '../../shared/types';

interface PtyProcess {
  session: TerminalSession;
  process: pty.IPty;
}

export class PtyManager extends EventEmitter {
  private sessions: Map<string, PtyProcess> = new Map();
  private sessionCounter = 0;

  /**
   * Create a new PTY session
   */
  create(worktreePath: string, cols: number, rows: number): TerminalSession {
    const sessionId = `pty-${++this.sessionCounter}-${Date.now()}`;

    // Determine shell - try multiple options
    let shell = process.env.SHELL;
    if (!shell) {
      // Try common shell paths
      const fs = require('fs');
      const possibleShells = ['/bin/zsh', '/bin/bash', '/bin/sh'];
      for (const s of possibleShells) {
        if (fs.existsSync(s)) {
          shell = s;
          break;
        }
      }
    }
    if (!shell) {
      shell = '/bin/sh'; // Fallback
    }

    console.log('Spawning shell:', shell, 'in', worktreePath);

    // Spawn PTY process
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: worktreePath,
      env: {
        ...process.env,
        SHELL: shell,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        HOME: process.env.HOME || require('os').homedir(),
        // Ensure proper locale
        LANG: process.env.LANG || 'en_US.UTF-8',
        LC_ALL: process.env.LC_ALL || 'en_US.UTF-8',
      },
    });

    const session: TerminalSession = {
      id: sessionId,
      worktreePath,
      pid: ptyProcess.pid,
      cols,
      rows,
    };

    // Set up data handler
    ptyProcess.onData((data) => {
      this.emit('data', { sessionId, data });
    });

    // Handle process exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      this.emit('exit', { sessionId, exitCode, signal });
      this.sessions.delete(sessionId);
    });

    this.sessions.set(sessionId, { session, process: ptyProcess });

    return session;
  }

  /**
   * Write data to a PTY session
   */
  write(sessionId: string, data: string): void {
    const ptyData = this.sessions.get(sessionId);
    if (!ptyData) {
      throw new Error(`PTY session not found: ${sessionId}`);
    }
    ptyData.process.write(data);
  }

  /**
   * Resize a PTY session
   */
  resize(sessionId: string, cols: number, rows: number): void {
    const ptyData = this.sessions.get(sessionId);
    if (!ptyData) {
      throw new Error(`PTY session not found: ${sessionId}`);
    }
    ptyData.process.resize(cols, rows);
    ptyData.session.cols = cols;
    ptyData.session.rows = rows;
  }

  /**
   * Destroy a PTY session
   */
  destroy(sessionId: string): void {
    const ptyData = this.sessions.get(sessionId);
    if (!ptyData) {
      return; // Already destroyed
    }
    ptyData.process.kill();
    this.sessions.delete(sessionId);
  }

  /**
   * Destroy all PTY sessions
   */
  destroyAll(): void {
    for (const [sessionId] of this.sessions) {
      this.destroy(sessionId);
    }
  }

  /**
   * Get a PTY session
   */
  get(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId)?.session;
  }

  /**
   * Get all sessions for a worktree
   */
  getByWorktree(worktreePath: string): TerminalSession[] {
    const sessions: TerminalSession[] = [];
    for (const { session } of this.sessions.values()) {
      if (session.worktreePath === worktreePath) {
        sessions.push(session);
      }
    }
    return sessions;
  }
}
