---

# MVP Definition (Read This First)

## What the MVP Is

A **local-first desktop app** that acts as a **control plane for git worktrees**, giving developers a single place to:

1. See and manage all active worktrees (sidebar)
2. Open a terminal per worktree (for Claude Code or any CLI tool)
3. Reliably view diffs and make small, targeted file edits
4. Run and monitor scheduled or background jobs scoped to a worktree

Nothing more.

---

## What the MVP Is Not

The MVP is explicitly **not**:

- a full IDE
- an agent orchestration platform
- a cloud VM product
- a PR management tool
- a code review system
- a replacement for Cursor / VS Code
- a workflow engine
- a plugin ecosystem

If a feature doesn’t directly support one of the four items in the tweet, it’s out.

---

# MVP Product Requirements Document

## 1. Problem Statement

Developers using git worktrees for parallel development lack a single, reliable interface to **see, manage, and intervene** across those worktrees.

Existing solutions either:

- fragment the workflow across terminals, editors, and scripts, or
- abstract git and filesystem state in ways that reduce trust and visibility.

As a result, developers lose situational awareness and spend time managing tooling rather than making progress.

---

## 2. Target User

**Primary user**

- Advanced developer
- Comfortable with git, CLI, and worktrees
- Uses AI coding tools (e.g. Claude Code) via terminal
- Runs multiple parallel tasks simultaneously

**Key assumption**

- User understands git and does not need guardrails or simplifications.

---

## 3. Goals and Non-Goals

### Goals

- Provide immediate visibility into all active worktrees
- Enable fast switching and light intervention per worktree
- Make diffs reliable and trustworthy
- Support long-running and scheduled work

### Non-Goals

- Teaching git
- Automating merge decisions
- Abstracting away branches or stacks
- Supporting non-technical users
- Competing with IDEs on editing depth

---

## 4. Core Concepts (MVP Object Model)

### Worktree

Represents:

- a git worktree on disk
- its associated branch or stack
- its local filesystem

### Session

- A running terminal process scoped to a worktree

### Job

- A background or scheduled command scoped to a worktree

No other first-class objects in MVP.

---

## 5. MVP Features (Hard Requirements)

### 5.1 Sidebar: Worktree Management (Critical)

**The sidebar is the product.**

### Must-haves

- Lists all active worktrees for a repo
- Shows for each worktree:
  - name
  - branch (or stack base)
  - filesystem path
  - status:
    - clean / dirty
    - jobs running
- Worktrees can be:
  - created
  - selected
  - deleted cleanly (no “undeletable workspace” bugs)

### Absolutely must be true

- Sidebar state always reflects real git state
- No phantom or stale worktrees
- Deleting a worktree is explicit and safe

### Nice-to-have (only if trivial)

- Sorting by last activity

---

### 5.2 Terminal per Worktree (Critical)

### Must-haves

- One-click open terminal scoped to the selected worktree
- Terminal runs in the actual worktree directory
- Fully compatible with:
  - Claude Code
  - any CLI tool

### Absolutely must be true

- Terminal is not a fake console
- Commands behave exactly as if run manually
- Environment variables and local tooling are respected

No terminal multiplexing, session recording, or fancy overlays in MVP.

---

### 5.3 Diff View (Critical)

Diff reliability is non-negotiable.

### Must-haves

- Show git diff for the selected worktree
- Diff works correctly for:
  - non-default branches
  - stacked branches (e.g. Graphite)
- Clear separation between:
  - working tree changes
  - staged changes (optional but preferred)

### Absolutely must be true

- Diff output matches `git diff`
- No missing or incorrect hunks
- No silent failures

If diff correctness is questionable, the MVP fails.

---

### 5.4 File Editor (Critical, Minimal)

This is not an IDE—this is for intervention.

### Must-haves

- Open and edit files from the diff view
- Basic text editing:
  - insert
  - delete
  - save
- Save writes directly to the worktree filesystem

### Absolutely must be true

- Edits are immediately reflected in git diff
- No sync or “apply” step
- No virtual file layer

Syntax highlighting, refactors, and LSP are out of scope.

---

### 5.5 Jobs & Cron (Critical)

### Must-haves

- Run background commands scoped to a worktree
- Support:
  - one-off jobs
  - recurring jobs (cron-style)
- View:
  - last run time
  - status (success / failure)
  - stdout/stderr logs

### Absolutely must be true

- Jobs survive app restarts
- Jobs are clearly associated with a worktree
- Failed jobs are visible

No distributed execution, retries, or dependency graphs in MVP.

---

## 6. UX Requirements

### Layout

- Persistent sidebar on the left
- Main panel switches between:
  - terminal
  - diff view
  - file editor
  - jobs view

### Interaction principles

- One click to switch worktrees
- No modal-heavy flows
- State is always visible

---

## 7. Technical Constraints (Implied by MVP)

- Local filesystem access is required
- Git is the source of truth
- No cloud dependency required
- App must be resilient to:
  - git commands run outside the app
  - terminals modifying state

---

## 8. MVP Success Criteria

The MVP is successful if a user can:

1. Create multiple worktrees
2. See them all in one sidebar
3. Run Claude Code in each worktree
4. Watch changes accumulate
5. Inspect diffs reliably
6. Make small edits without leaving the app
7. Schedule background tasks
8. Delete worktrees without fear

If any of these feel fragile or confusing, the MVP is not done.

---

## 9. Explicit Out-of-Scope (Do Not Build)

- PR creation
- Merge buttons
- Agent dashboards
- Cloud VMs
- Collaboration / sharing
- Plugins
- Settings explosion

---

<br>
