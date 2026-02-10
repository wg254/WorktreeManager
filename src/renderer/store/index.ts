import { create } from 'zustand';
import type { Worktree, WorktreeStatus, DiffResult, Job, JobRun, TerminalSession, ViewType, Tab, Settings } from '../../shared/types';

interface PaneSizes {
  sidebar: number;
  rightPanel: number;
}

interface AppState {
  // Worktrees
  basePath: string | null;
  worktrees: Worktree[];
  worktreeStatuses: Map<string, WorktreeStatus>;
  selectedWorktree: string | null;

  // View
  activeView: ViewType;

  // Terminals
  terminals: Map<string, TerminalSession>;
  activeTerminal: string | null;

  // Diff
  currentDiff: DiffResult | null;
  diffMode: 'unstaged' | 'staged' | 'compare';
  compareRef: string | null;

  // Editor
  openFile: { path: string; content: string } | null;
  unsavedChanges: boolean;

  // Jobs
  jobs: Job[];
  selectedJob: number | null;
  jobRuns: Map<number, JobRun[]>;

  // Layout
  paneSizes: PaneSizes;
  rightPanelVisible: boolean;

  // Tabs
  tabs: Tab[];
  activeTabId: string | null;

  // Quick Open
  quickOpenVisible: boolean;

  // File Tree
  expandedPaths: Set<string>;

  // Settings
  settings: Settings;
  settingsVisible: boolean;

  // Actions
  setBasePath: (path: string) => void;
  setWorktrees: (worktrees: Worktree[]) => void;
  setWorktreeStatus: (path: string, status: WorktreeStatus) => void;
  selectWorktree: (path: string | null) => void;
  setActiveView: (view: ViewType) => void;
  addTerminal: (session: TerminalSession) => void;
  removeTerminal: (id: string) => void;
  setActiveTerminal: (id: string | null) => void;
  setDiff: (diff: DiffResult | null) => void;
  setDiffMode: (mode: 'unstaged' | 'staged' | 'compare') => void;
  setCompareRef: (ref: string | null) => void;
  setOpenFile: (file: { path: string; content: string } | null) => void;
  setUnsavedChanges: (unsaved: boolean) => void;
  setJobs: (jobs: Job[]) => void;
  updateJob: (job: Job) => void;
  selectJob: (id: number | null) => void;
  setJobRuns: (jobId: number, runs: JobRun[]) => void;

  // Layout actions
  setPaneSizes: (sizes: PaneSizes) => void;
  setRightPanelVisible: (visible: boolean) => void;

  // Tab actions
  addTab: (tab: Tab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;

  // Quick Open actions
  setQuickOpenVisible: (visible: boolean) => void;

  // File Tree actions
  toggleExpandedPath: (path: string) => void;
  setExpandedPaths: (paths: Set<string>) => void;

  // Settings actions
  setSettings: (settings: Settings) => void;
  setSettingsVisible: (visible: boolean) => void;
}

const defaultSettings: Settings = {
  terminal: { fontSize: 14, fontFamily: "'SF Mono', Monaco, 'Courier New', monospace" },
  editor: { fontSize: 14, tabSize: 2 },
  behavior: { confirmOnClose: true, autoSave: false },
};

export const useStore = create<AppState>((set) => ({
  // Initial state
  basePath: null,
  worktrees: [],
  worktreeStatuses: new Map(),
  selectedWorktree: null,
  activeView: 'terminal',
  terminals: new Map(),
  activeTerminal: null,
  currentDiff: null,
  diffMode: 'unstaged',
  compareRef: null,
  openFile: null,
  unsavedChanges: false,
  jobs: [],
  selectedJob: null,
  jobRuns: new Map(),

  // Layout
  paneSizes: { sidebar: 280, rightPanel: 300 },
  rightPanelVisible: false,

  // Tabs
  tabs: [],
  activeTabId: null,

  // Quick Open
  quickOpenVisible: false,

  // File Tree
  expandedPaths: new Set(),

  // Settings
  settings: defaultSettings,
  settingsVisible: false,

  // Actions
  setBasePath: (path) => set({ basePath: path }),

  setWorktrees: (worktrees) => set({ worktrees }),

  setWorktreeStatus: (path, status) =>
    set((state) => ({
      worktreeStatuses: new Map(state.worktreeStatuses).set(path, status),
    })),

  selectWorktree: (path) => set({ selectedWorktree: path }),

  setActiveView: (view) => set({ activeView: view }),

  addTerminal: (session) =>
    set((state) => ({
      terminals: new Map(state.terminals).set(session.id, session),
      activeTerminal: session.id,
    })),

  removeTerminal: (id) =>
    set((state) => {
      const terminals = new Map(state.terminals);
      terminals.delete(id);
      return {
        terminals,
        activeTerminal:
          state.activeTerminal === id
            ? terminals.keys().next().value || null
            : state.activeTerminal,
      };
    }),

  setActiveTerminal: (id) => set({ activeTerminal: id }),

  setDiff: (diff) => set({ currentDiff: diff }),

  setDiffMode: (mode) => set({ diffMode: mode }),

  setCompareRef: (ref) => set({ compareRef: ref }),

  setOpenFile: (file) => set({ openFile: file, unsavedChanges: false }),

  setUnsavedChanges: (unsaved) => set({ unsavedChanges: unsaved }),

  setJobs: (jobs) => set({ jobs }),

  updateJob: (job) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === job.id ? job : j)),
    })),

  selectJob: (id) => set({ selectedJob: id }),

  setJobRuns: (jobId, runs) =>
    set((state) => ({
      jobRuns: new Map(state.jobRuns).set(jobId, runs),
    })),

  // Layout actions
  setPaneSizes: (sizes) => set({ paneSizes: sizes }),
  setRightPanelVisible: (visible) => set({ rightPanelVisible: visible }),

  // Tab actions
  addTab: (tab) =>
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    })),

  removeTab: (id) =>
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== id);
      let activeTabId = state.activeTabId;
      if (state.activeTabId === id) {
        // Find next tab to activate
        const removedIndex = state.tabs.findIndex((t) => t.id === id);
        if (tabs.length > 0) {
          activeTabId = tabs[Math.max(0, removedIndex - 1)]?.id ?? null;
        } else {
          activeTabId = null;
        }
      }
      return { tabs, activeTabId };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTab: (id, updates) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  // Quick Open actions
  setQuickOpenVisible: (visible) => set({ quickOpenVisible: visible }),

  // File Tree actions
  toggleExpandedPath: (path) =>
    set((state) => {
      const expandedPaths = new Set(state.expandedPaths);
      if (expandedPaths.has(path)) {
        expandedPaths.delete(path);
      } else {
        expandedPaths.add(path);
      }
      return { expandedPaths };
    }),

  setExpandedPaths: (paths) => set({ expandedPaths: paths }),

  // Settings actions
  setSettings: (settings) => set({ settings }),
  setSettingsVisible: (visible) => set({ settingsVisible: visible }),
}));
