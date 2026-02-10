# WorktreeManager

**A local-first desktop app that acts as a control plane for git worktrees.**

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Platform](https://img.shields.io/badge/platform-macOS-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## The Problem

Developers using git worktrees for parallel development lack a single, reliable interface to **see, manage, and intervene** across those worktrees.

Existing solutions either:
- Fragment the workflow across terminals, editors, and scripts
- Abstract git and filesystem state in ways that reduce trust and visibility

As a result, developers lose situational awareness and spend time managing tooling rather than making progress.

## Who This Is For

WorktreeManager is built for **power developers** who:
- Use AI coding tools (Claude Code, Cursor) via terminal
- Are comfortable with git, CLI, and worktrees
- Run multiple parallel tasks simultaneously
- Value speed, visibility, and control over polish

This is a pro tool, not a beginner-friendly abstraction layer.

---

## Features

### Sidebar: Worktree Management
The sidebar is the product. See all your active worktrees at a glance:
- Name, branch, and filesystem path
- Clean/dirty status
- Running jobs indicator
- Create and delete worktrees without leaving the app

### Terminal: One-Click Access
Open a fully functional terminal scoped to any worktree:
- Spawns in the correct worktree directory
- Full environment variable passthrough
- Compatible with Claude Code and any CLI tool
- Behaves exactly like your native terminal

### Diff View: Reliable and Trustworthy
View git diffs that match `git diff` exactly:
- Working tree and staged changes
- Branch comparison (vs merge-base)
- Graphite stack support
- No missing or incorrect hunks

### File Editor: Quick Interventions
Make targeted edits without context switching:
- Open files directly from the diff view
- Basic text editing (insert, delete, save)
- Changes immediately reflected in git diff
- No virtual file layer or sync steps

### Jobs: Background and Scheduled Tasks
Run and monitor long-lived work per worktree:
- One-off and recurring (cron) jobs
- View last run time, status, stdout/stderr
- Jobs survive app restarts
- SQLite-backed persistence

---

## Getting Started

### Prerequisites

- **macOS** (Windows/Linux support planned for future releases)
- **Node.js** 18+
- **Git** 2.20+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/WorktreeManager.git
cd WorktreeManager

# Install dependencies
npm install

# Build the app
npm run build

# Start the app
npm start /path/to/your/git/repo
```

### Development Mode

```bash
# Start in development mode with hot reload
npm run dev

# In another terminal, start Electron
npm start /path/to/your/git/repo
```

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Desktop Framework | **Electron** | Cross-platform desktop app with native terminal support |
| Frontend | **React + TypeScript** | Component-based UI with type safety |
| State Management | **Zustand** | Lightweight, minimal boilerplate |
| Terminal | **xterm.js + node-pty** | VS Code's proven terminal stack |
| Git Operations | **simple-git + raw commands** | Reliability, matches CLI behavior exactly |
| Editor | **CodeMirror 6** | Lightweight (~300KB), modular |
| File Watching | **chokidar** | Battle-tested, cross-platform |
| Job Persistence | **better-sqlite3** | Synchronous, durable, survives restarts |
| Job Scheduling | **node-cron** | Standard cron expressions |

---

## Architecture

```
+-------------------------------------------------------------+
|                   Electron Main Process                      |
|  +-------------+  +-------------+  +-----------------------+ |
|  | Git Service |  | PTY Manager |  | Job Scheduler (SQLite)| |
|  | - worktree  |  | - spawn PTY |  | - persist jobs        | |
|  |   CRUD      |  | - resize    |  | - cron scheduling     | |
|  | - diff      |  | - I/O       |  | - output capture      | |
|  +-------------+  +-------------+  +-----------------------+ |
|  +----------------------------------------------------------+|
|  | File Watcher (chokidar) - watches .git dirs + worktrees  ||
|  +----------------------------------------------------------+|
+-------------------------------------------------------------+
                          | IPC (typed channels)
                          v
+-------------------------------------------------------------+
|                  Electron Renderer Process                   |
|  +-----------+  +---------------------------------------+    |
|  |  Sidebar  |  |            Main Panel                 |    |
|  | Worktree  |  |  - Terminal View (xterm.js)          |    |
|  | List      |  |  - Diff View (file tree + hunks)     |    |
|  |           |  |  - Editor View (CodeMirror 6)        |    |
|  |           |  |  - Jobs View (list + logs)           |    |
|  +-----------+  +---------------------------------------+    |
|  +----------------------------------------------------------+|
|  | State Store (Zustand)                                    ||
|  +----------------------------------------------------------+|
+-------------------------------------------------------------+
```

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

## Design Philosophy

WorktreeManager is guided by clear principles:

1. **Worktrees are the unit of work** - Everything is organized around git worktrees
2. **Visibility before automation** - See what's happening before automating it
3. **Real git, no theater** - Git behavior matches CLI exactly
4. **Local-first** - Works offline, no cloud dependency required
5. **Trust through reliability** - A broken diff destroys trust

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
