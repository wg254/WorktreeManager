import { useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { api } from '../lib/ipc-client';

interface ShortcutHandlers {
  onNewTerminal?: () => void;
  onCloseTerminal?: () => void;
  onSave?: () => void;
  onRefresh?: () => void;
  onNewWorktree?: () => void;
  onQuickOpen?: () => void;
  onToggleSettings?: () => void;
  onToggleFileTree?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
  const {
    setActiveView,
    selectedWorktree,
    worktrees,
    selectWorktree,
    setWorktrees,
    setWorktreeStatus,
    basePath,
  } = useStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Check if we're in an input field or the terminal
    const target = e.target as HTMLElement;
    const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const isInTerminal = target.closest('.terminal-view') !== null;
    const isInEditor = target.closest('.cm-editor') !== null;

    // Allow Cmd+S in editor
    if (isInEditor && e.metaKey && e.key === 's') {
      e.preventDefault();
      handlers.onSave?.();
      return;
    }

    // Don't intercept shortcuts when in input/terminal/editor (except for specific ones)
    if (isInInput || isInTerminal || isInEditor) {
      return;
    }

    // Meta (Cmd on Mac) + number for view switching
    if (e.metaKey && !e.shiftKey && !e.altKey) {
      switch (e.key) {
        case '1':
          e.preventDefault();
          setActiveView('terminal');
          break;
        case '2':
          e.preventDefault();
          setActiveView('diff');
          break;
        case '3':
          e.preventDefault();
          setActiveView('editor');
          break;
        case '4':
          e.preventDefault();
          setActiveView('jobs');
          break;
        case 't':
          e.preventDefault();
          handlers.onNewTerminal?.();
          break;
        case 'w':
          e.preventDefault();
          handlers.onCloseTerminal?.();
          break;
        case 'r':
          e.preventDefault();
          handlers.onRefresh?.();
          break;
        case 'n':
          e.preventDefault();
          handlers.onNewWorktree?.();
          break;
        case 'p':
          e.preventDefault();
          handlers.onQuickOpen?.();
          break;
        case ',':
          e.preventDefault();
          handlers.onToggleSettings?.();
          break;
        case 'b':
          e.preventDefault();
          handlers.onToggleFileTree?.();
          break;
      }
    }

    // Arrow keys for worktree navigation (when not in input)
    if (!e.metaKey && !e.ctrlKey && !e.altKey) {
      const currentIndex = worktrees.findIndex(w => w.path === selectedWorktree);

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            selectWorktree(worktrees[currentIndex - 1].path);
          } else if (currentIndex === -1 && worktrees.length > 0) {
            selectWorktree(worktrees[worktrees.length - 1].path);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < worktrees.length - 1) {
            selectWorktree(worktrees[currentIndex + 1].path);
          } else if (currentIndex === -1 && worktrees.length > 0) {
            selectWorktree(worktrees[0].path);
          }
          break;
      }
    }
  }, [
    setActiveView,
    selectedWorktree,
    worktrees,
    selectWorktree,
    handlers,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Return a refresh function that components can use
  const refreshWorktrees = useCallback(async () => {
    if (!basePath || !api) return;

    try {
      const wts = await api.git.listWorktrees(basePath);
      setWorktrees(wts);

      for (const wt of wts) {
        try {
          const status = await api.git.getStatus(wt.path);
          setWorktreeStatus(wt.path, status);
        } catch {
          // Ignore individual failures
        }
      }
    } catch (error) {
      console.error('Failed to refresh worktrees:', error);
    }
  }, [basePath, setWorktrees, setWorktreeStatus]);

  return { refreshWorktrees };
}
