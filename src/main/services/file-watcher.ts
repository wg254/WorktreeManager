import chokidar, { FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import path from 'path';
import type { FileChange } from '../../shared/types';

export class FileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private watchedPaths: Set<string> = new Set();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 100;

  /**
   * Start watching paths
   */
  start(paths: string[]): void {
    if (this.watcher) {
      // Add new paths to existing watcher
      for (const p of paths) {
        if (!this.watchedPaths.has(p)) {
          this.watcher.add(p);
          this.watchedPaths.add(p);
        }
      }
      return;
    }

    this.watcher = chokidar.watch(paths, {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      depth: 3, // Reduced depth to avoid too many file handles
      usePolling: false, // Use native OS events (fewer file handles)
      // Ignore common large/noisy directories
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.cache/**',
        '**/.next/**',
        '**/coverage/**',
        '**/*.log',
        '**/tmp/**',
        '**/temp/**',
      ],
      // Debounce at the watcher level
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    for (const p of paths) {
      this.watchedPaths.add(p);
    }

    this.watcher.on('add', (filePath) => this.handleChange(filePath, 'add'));
    this.watcher.on('change', (filePath) => this.handleChange(filePath, 'change'));
    this.watcher.on('unlink', (filePath) => this.handleChange(filePath, 'unlink'));

    this.watcher.on('error', (error) => {
      this.emit('error', error);
    });
  }

  /**
   * Handle a file change with debouncing
   */
  private handleChange(filePath: string, type: FileChange['type']): void {
    // Debounce changes for the same file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      const change: FileChange = { path: filePath, type };
      this.emit('change', change);
    }, this.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Stop watching specific paths
   */
  removePaths(paths: string[]): void {
    if (!this.watcher) return;

    for (const p of paths) {
      this.watcher.unwatch(p);
      this.watchedPaths.delete(p);
    }
  }

  /**
   * Stop watching all paths
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.watchedPaths.clear();

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /**
   * Get currently watched paths
   */
  getWatchedPaths(): string[] {
    return Array.from(this.watchedPaths);
  }

  /**
   * Watch worktree directories and their .git references
   */
  watchWorktrees(worktreePaths: string[]): void {
    const pathsToWatch: string[] = [];

    for (const worktreePath of worktreePaths) {
      // Watch the worktree directory itself
      pathsToWatch.push(worktreePath);

      // Watch .git directory or file (for worktrees, .git is a file pointing to the actual git dir)
      const gitPath = path.join(worktreePath, '.git');
      pathsToWatch.push(gitPath);
    }

    this.start(pathsToWatch);
  }
}
