# WorktreeManager Implementation Plan

## Overview
A local-first desktop app that acts as a **control plane for git worktrees** - giving developers a single place to see, manage, and intervene across parallel worktrees.

---

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Desktop Framework | **Electron** | Mature terminal support (xterm.js + node-pty), JS throughout |
| Frontend | **React + TypeScript** | Strong ecosystem, component model |
| State Management | **Zustand** | Lightweight, no boilerplate |
| Terminal | **xterm.js + node-pty** | VS Code's proven stack, Claude Code compatible |
| Git Operations | **simple-git + raw commands** | Reliability, matches `git diff` exactly |
| Editor | **CodeMirror 6** | Lightweight (~300KB vs 5MB Monaco), modular |
| File Watching | **chokidar** | Battle-tested, cross-platform |
| Job Persistence | **better-sqlite3** | Synchronous, durable, survives restarts |
| Job Scheduling | **node-cron** | Standard cron expressions |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Electron Main Process                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Git Service │  │ PTY Manager │  │ Job Scheduler (SQLite)  │  │
│  │ - worktree  │  │ - spawn PTY │  │ - persist jobs          │  │
│  │   CRUD      │  │ - resize    │  │ - cron scheduling       │  │
│  │ - diff      │  │ - I/O       │  │ - output capture        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ File Watcher (chokidar) - watches .git dirs + worktrees     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │ IPC (typed channels)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Electron Renderer Process                    │
│  ┌───────────┐  ┌───────────────────────────────────────────┐   │
│  │  Sidebar  │  │              Main Panel                    │   │
│  │ Worktree  │  │  - Terminal View (xterm.js)               │   │
│  │ List      │  │  - Diff View (file tree + hunks)          │   │
│  │           │  │  - Editor View (CodeMirror 6)             │   │
│  │           │  │  - Jobs View (list + logs)                │   │
│  └───────────┘  └───────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ State Store (Zustand)                                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation
**Goal**: Basic Electron app with worktree listing

- [ ] Electron + React + TypeScript project scaffolding
- [ ] Git service: list worktrees, get status
- [ ] Sidebar component displaying worktree list
- [ ] File watcher for real-time updates
- [ ] IPC infrastructure (typed channels)

**Testable outcome**: Open app, see worktree list, status updates when external git runs

---

### Phase 2: Terminal Integration
**Goal**: Functional terminal per worktree

- [ ] node-pty integration in main process
- [ ] xterm.js terminal component
- [ ] Terminal lifecycle (create, resize, destroy)
- [ ] Terminal spawns in correct worktree directory
- [ ] Environment variable pass-through

**Testable outcome**: Select worktree → Open Terminal → Run `claude` → Works exactly like native terminal

---

### Phase 3: Diff View
**Goal**: Reliable diff matching `git diff` exactly

- [ ] Execute `git diff` and parse output (no abstraction)
- [ ] Diff UI: file tree + hunks
- [ ] Unstaged vs staged changes
- [ ] Branch comparison (vs merge-base)
- [ ] Graphite stack support

**Testable outcome**: View diff, compare to `git diff` in terminal - must match exactly

---

### Phase 4: File Editor
**Goal**: Minimal but functional file editing

- [ ] CodeMirror 6 integration
- [ ] Open file from diff view
- [ ] Basic editing: insert, delete, save
- [ ] Immediate reflection in diff (file watcher triggers refresh)
- [ ] Syntax highlighting (auto-detect)

**Testable outcome**: Click file in diff → edit → save → see diff update

---

### Phase 5: Jobs & Cron
**Goal**: Persistent background task execution

- [ ] SQLite database for job storage
- [ ] Job creation UI (command, optional cron)
- [ ] Job execution engine (spawn, capture output)
- [ ] Job status view (last run, stdout/stderr, exit code)
- [ ] Cron scheduling with node-cron
- [ ] Jobs survive app restart

**Testable outcome**: Schedule `npm test` hourly → close app → reopen → job still scheduled

---

### Phase 6: Worktree CRUD
**Goal**: Full worktree lifecycle management

- [ ] Create worktree dialog (name, branch, base)
- [ ] Delete worktree with confirmation
- [ ] Handle edge cases (dirty worktree, running jobs)
- [ ] Graceful error handling

**Testable outcome**: Create/delete worktrees from UI, no phantom worktrees

---

### Phase 7: Polish & Testing
**Goal**: Production-ready MVP

- [ ] Error handling throughout
- [ ] Loading states and empty states
- [ ] Keyboard shortcuts
- [ ] Window state persistence
- [ ] App installer (electron-builder)
- [ ] Comprehensive testing

---

## Project Structure

```
src/
├── main/                          # Electron main process
│   ├── index.ts
│   ├── ipc/
│   │   ├── git.ipc.ts
│   │   ├── pty.ipc.ts
│   │   ├── jobs.ipc.ts
│   │   └── files.ipc.ts
│   └── services/
│       ├── git.service.ts         # Core git operations
│       ├── pty-manager.ts         # Terminal process management
│       ├── job-scheduler.ts       # Cron + execution
│       ├── file-watcher.ts        # chokidar wrapper
│       └── database.ts            # SQLite connection
│
├── renderer/                      # React app
│   ├── App.tsx
│   ├── components/
│   │   ├── Sidebar/
│   │   ├── Terminal/
│   │   ├── Diff/
│   │   ├── Editor/
│   │   └── Jobs/
│   ├── hooks/
│   ├── store/
│   └── lib/ipc-client.ts
│
├── shared/
│   ├── types.ts
│   └── ipc-types.ts
│
└── preload/index.ts
```

---

## Decisions Made

- **Framework**: Electron (mature terminal support, JS throughout)
- **Target Platform**: macOS only initially (faster to ship)
- **Build Strategy**: Parallel streams across worktrees

---

## Worktree Assignments

Each worktree runs an independent Claude session working in parallel:

| Worktree | Branch | Focus | Key Deliverables |
|----------|--------|-------|------------------|
| `WorktreeManager-cli-scaffold` | feat/cli-scaffold | **Project setup + IPC** | Electron scaffolding, TypeScript config, IPC types, preload bridge |
| `WorktreeManager-worktree-commands` | feat/worktree-commands | **Backend services** | Git service, PTY manager, job scheduler, file watcher, SQLite |
| `WorktreeManager-session-tracking` | feat/session-tracking | **Frontend components** | React app, Sidebar, Terminal view, Diff view, Editor, Jobs view |
| `WorktreeManager-docs` | docs/readme | **Documentation** | README, setup instructions, architecture docs |

### Parallel Execution Order

**Wave 1** (can start immediately in parallel):
- `cli-scaffold`: Electron + React + TS scaffolding, IPC infrastructure
- `worktree-commands`: Git service (list worktrees, status, diff)
- `docs`: README with project overview

**Wave 2** (after Wave 1 merges):
- `worktree-commands`: PTY manager, job scheduler, SQLite
- `session-tracking`: All React components (Sidebar, Terminal, Diff, Editor, Jobs)

**Wave 3** (integration):
- Merge all branches, integration testing, polish
