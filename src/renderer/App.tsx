import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useStore } from './store';
import { api } from './lib/ipc-client';
import { Sidebar } from './components/Sidebar';
import { Terminal } from './components/Terminal';
import { DiffView } from './components/Diff';
import { Editor } from './components/Editor';
import { Jobs } from './components/Jobs';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer, toast } from './components/Toast';
import { ResizableLayout } from './components/Layout/ResizableLayout';
import { TabBar } from './components/TabBar';
import { QuickOpen } from './components/QuickOpen';
import { FileTree } from './components/FileTree';
import { SettingsPanel } from './components/Settings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { Tab, TabType } from '../shared/types';
import './App.css';

export default function App() {
  const {
    basePath,
    setBasePath,
    worktrees,
    setWorktrees,
    setWorktreeStatus,
    selectedWorktree,
    activeView,
    setActiveView,
    tabs,
    activeTabId,
    addTab,
    removeTab,
    setActiveTab,
    updateTab,
    setOpenFile,
    setSettings,
    rightPanelVisible,
    setRightPanelVisible,
    setPaneSizes,
    setQuickOpenVisible,
  } = useStore();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save session state (debounced)
  const saveSession = useCallback(() => {
    if (sessionSaveTimeoutRef.current) {
      clearTimeout(sessionSaveTimeoutRef.current);
    }
    sessionSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const state = useStore.getState();
        await api.session.save({
          selectedWorktreePath: state.selectedWorktree,
          tabs: state.tabs,
          activeTabId: state.activeTabId,
          paneSizes: state.paneSizes,
          rightPanelVisible: state.rightPanelVisible,
        });
      } catch (err) {
        console.error('Failed to save session:', err);
      }
    }, 500);
  }, []);

  // Initialize app
  useEffect(() => {
    async function init() {
      try {
        if (!api) {
          throw new Error('API not available - preload script may not have loaded');
        }

        // Load settings
        const savedSettings = await api.settings.get();
        setSettings(savedSettings);

        // Load session
        const savedSession = await api.session.get();
        if (savedSession) {
          setPaneSizes(savedSession.paneSizes);
          setRightPanelVisible(savedSession.rightPanelVisible);
        }

        const path = await api.app.getBasePath();
        setBasePath(path);

        // Load worktrees
        const wts = await api.git.listWorktrees(path);
        setWorktrees(wts);

        // Restore selected worktree from session if valid
        if (savedSession?.selectedWorktreePath) {
          const exists = wts.some((wt) => wt.path === savedSession.selectedWorktreePath);
          if (exists) {
            useStore.getState().selectWorktree(savedSession.selectedWorktreePath);
          }
        }

        // Load status for each worktree
        for (const wt of wts) {
          try {
            const status = await api.git.getStatus(wt.path);
            setWorktreeStatus(wt.path, status);
          } catch (err) {
            console.error(`Failed to get status for ${wt.path}:`, err);
          }
        }

        // Start watching
        const paths = wts.map((wt) => wt.path);
        await api.file.watchStart(paths);

        setLoading(false);
      } catch (err) {
        console.error('Init error:', err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    }

    init();

    // Set up file change listener
    if (!api) return;
    const unsubscribe = api.file.onChange((change) => {
      // Refresh worktree status when files change
      const worktree = worktrees.find((wt) =>
        change.path.startsWith(wt.path)
      );
      if (worktree) {
        api.git.getStatus(worktree.path).then((status) => {
          setWorktreeStatus(worktree.path, status);
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if (api) api.file.watchStop();
      if (sessionSaveTimeoutRef.current) {
        clearTimeout(sessionSaveTimeoutRef.current);
      }
    };
  }, []);

  // Save session on state changes
  useEffect(() => {
    if (!loading) {
      saveSession();
    }
  }, [selectedWorktree, tabs, activeTabId, rightPanelVisible, saveSession, loading]);

  // Refresh worktree status periodically and on file changes
  useEffect(() => {
    if (worktrees.length === 0 || !api) return;

    const refreshStatuses = async () => {
      for (const wt of worktrees) {
        try {
          const status = await api.git.getStatus(wt.path);
          setWorktreeStatus(wt.path, status);
        } catch (err) {
          // Worktree may have been deleted
        }
      }
    };

    // Refresh every 30 seconds
    const interval = setInterval(refreshStatuses, 30000);

    return () => clearInterval(interval);
  }, [worktrees]);

  // Open file in editor (used by quick open and file tree)
  const openFileInEditor = useCallback(
    async (filePath: string) => {
      try {
        const content = await api.file.read(filePath);
        setOpenFile({ path: filePath, content });
        setActiveView('editor');
        toast.success(`Opened ${filePath.split('/').pop()}`);
      } catch (err) {
        toast.error('Failed to open file');
      }
    },
    [setOpenFile, setActiveView]
  );

  // Keyboard shortcuts
  const { refreshWorktrees } = useKeyboardShortcuts({
    onRefresh: async () => {
      await refreshWorktrees();
      toast.info('Refreshed');
    },
    onQuickOpen: () => {
      if (selectedWorktree) {
        setQuickOpenVisible(true);
      }
    },
    onToggleSettings: () => {
      useStore.getState().setSettingsVisible(true);
    },
    onToggleFileTree: () => {
      setRightPanelVisible(!rightPanelVisible);
    },
  });

  const renderMainPanel = () => {
    if (!selectedWorktree) {
      return (
        <div className="empty-state">
          <h2>Select a worktree</h2>
          <p>Choose a worktree from the sidebar to get started</p>
        </div>
      );
    }

    switch (activeView) {
      case 'terminal':
        return <Terminal worktreePath={selectedWorktree} />;
      case 'diff':
        return <DiffView worktreePath={selectedWorktree} />;
      case 'editor':
        return <Editor />;
      case 'jobs':
        return <Jobs worktreePath={selectedWorktree} />;
      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="app" style={{ padding: 40 }}>
        <h1 style={{ color: '#f44336' }}>Initialization Error</h1>
        <p style={{ marginTop: 16 }}>{error}</p>
        <p style={{ marginTop: 16, color: '#808080' }}>
          Make sure you're running this app from a git repository with worktrees.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 24,
            padding: '8px 16px',
            background: '#094771',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading worktrees...</p>
      </div>
    );
  }

  const sidebarContent = <Sidebar />;

  const mainContent = (
    <div className="main">
      <div className="view-tabs">
        <button
          className={`tab ${activeView === 'terminal' ? 'active' : ''}`}
          onClick={() => setActiveView('terminal')}
          title="Terminal (Cmd+1)"
        >
          Terminal
        </button>
        <button
          className={`tab ${activeView === 'diff' ? 'active' : ''}`}
          onClick={() => setActiveView('diff')}
          title="Diff (Cmd+2)"
        >
          Diff
        </button>
        <button
          className={`tab ${activeView === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveView('editor')}
          title="Editor (Cmd+3)"
        >
          Editor
        </button>
        <button
          className={`tab ${activeView === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveView('jobs')}
          title="Jobs (Cmd+4)"
        >
          Jobs
        </button>
        <div style={{ flex: 1 }} />
        <button
          className={`tab ${rightPanelVisible ? 'active' : ''}`}
          onClick={() => setRightPanelVisible(!rightPanelVisible)}
          title="Toggle File Tree (Cmd+B)"
        >
          Files
        </button>
      </div>
      <div className="main-content">{renderMainPanel()}</div>
    </div>
  );

  const fileTreeContent = selectedWorktree ? (
    <FileTree worktreePath={selectedWorktree} onSelectFile={openFileInEditor} />
  ) : null;

  return (
    <ErrorBoundary>
      <div className="app">
        <ResizableLayout
          sidebar={sidebarContent}
          main={mainContent}
          rightPanel={fileTreeContent}
        />
        <ToastContainer />
        <QuickOpen onSelectFile={openFileInEditor} />
        <SettingsPanel />
      </div>
    </ErrorBoundary>
  );
}
