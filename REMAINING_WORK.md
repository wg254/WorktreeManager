# WorktreeManager - Remaining Work Plan

## Overview

The MVP is ~85-90% complete. This plan covers the remaining work to reach a fully functional, polished MVP.

**Estimated effort**: 6 discrete tasks, can be parallelized across 2-3 streams.

---

## Task 1: Delete Worktree UI

**Priority**: High (MVP blocker)
**Effort**: Small

### Current State
- `GitService.deleteWorktree()` exists and works
- `api.git.deleteWorktree()` IPC is wired up
- No UI to trigger deletion

### Implementation

1. Add delete button to each worktree item in Sidebar
2. Show confirmation dialog before deletion
3. Handle edge cases:
   - Worktree has uncommitted changes (warn user)
   - Worktree has running terminals (close them first)
   - Worktree has running jobs (warn user)
4. Refresh worktree list after deletion
5. If deleted worktree was selected, clear selection

### Files to Modify
- `src/renderer/components/Sidebar/index.tsx`

### Acceptance Criteria
- [ ] Delete button visible on hover for non-main worktrees
- [ ] Confirmation dialog shows worktree name
- [ ] Dirty worktree shows warning
- [ ] Successful deletion removes from list
- [ ] Error shows user-friendly message

---

## Task 2: Keyboard Shortcuts

**Priority**: Medium (UX improvement)
**Effort**: Medium

### Implementation

1. Create keyboard shortcut system in renderer
2. Implement shortcuts:

| Shortcut | Action |
|----------|--------|
| `Cmd+1` | Switch to Terminal view |
| `Cmd+2` | Switch to Diff view |
| `Cmd+3` | Switch to Editor view |
| `Cmd+4` | Switch to Jobs view |
| `Cmd+T` | New terminal in current worktree |
| `Cmd+W` | Close current terminal |
| `Cmd+S` | Save file (in editor) |
| `Cmd+R` | Refresh diff / worktree status |
| `Cmd+N` | New worktree dialog |
| `Up/Down` | Navigate worktree list (when sidebar focused) |
| `Enter` | Select worktree (when sidebar focused) |

3. Add visual hints for shortcuts in UI (tooltips or menu)

### Files to Create/Modify
- `src/renderer/hooks/useKeyboardShortcuts.ts` (new)
- `src/renderer/App.tsx`
- `src/renderer/components/Sidebar/index.tsx`
- `src/renderer/components/Terminal/index.tsx`
- `src/renderer/components/Editor/index.tsx`

### Acceptance Criteria
- [ ] All listed shortcuts work
- [ ] Shortcuts don't interfere with terminal input
- [ ] Shortcuts don't interfere with editor input
- [ ] Visual hints show shortcuts

---

## Task 3: Window State Persistence

**Priority**: Medium (UX improvement)
**Effort**: Small

### Implementation

1. Save window state on close:
   - Window position (x, y)
   - Window size (width, height)
   - Maximized state
2. Restore window state on open
3. Store in electron-store or simple JSON file

### Files to Modify
- `src/main/index.ts`
- Add `electron-store` dependency (or use fs with JSON)

### Storage Location
`~/.config/worktree-manager/window-state.json` or use `app.getPath('userData')`

### Acceptance Criteria
- [ ] Window opens at last position/size
- [ ] Works correctly with multiple displays
- [ ] Handles edge case: saved position is off-screen

---

## Task 4: Error Handling Hardening

**Priority**: High (reliability)
**Effort**: Medium

### Current Issues
- Some async operations don't have try/catch
- Error messages are raw (not user-friendly)
- No global error boundary in React

### Implementation

1. **Main Process**
   - Wrap all IPC handlers in try/catch
   - Return structured errors `{ error: true, message: string, code: string }`
   - Log errors to file for debugging

2. **Renderer**
   - Add React Error Boundary component
   - Create toast/notification system for errors
   - Handle IPC errors gracefully in all components

3. **Specific Error Cases**
   - Git not installed → show helpful message
   - Not a git repo → show helpful message
   - Worktree path doesn't exist → refresh list
   - PTY spawn fails → show error, don't crash
   - SQLite error → show error, continue working

### Files to Create/Modify
- `src/main/ipc/*.ts` (all handlers)
- `src/renderer/components/ErrorBoundary.tsx` (new)
- `src/renderer/components/Toast.tsx` (new)
- `src/renderer/App.tsx`

### Acceptance Criteria
- [ ] No unhandled promise rejections
- [ ] User sees friendly error messages
- [ ] App doesn't crash on errors
- [ ] Errors are logged for debugging

---

## Task 5: Tests

**Priority**: Medium (quality)
**Effort**: Large

### Test Strategy

1. **Unit Tests** (vitest)
   - Git service: diff parsing, worktree listing
   - Job scheduler: cron scheduling, job lifecycle
   - Store: state transitions

2. **Integration Tests**
   - IPC round-trips
   - File watcher events

3. **E2E Tests** (playwright or spectron)
   - Full user flows
   - Terminal functionality
   - Diff accuracy validation

### Priority Order
1. Diff parsing (critical for trust)
2. Git service methods
3. Job scheduler
4. React components

### Files to Create
```
tests/
├── unit/
│   ├── git.service.test.ts
│   ├── diff-parser.test.ts
│   ├── job-scheduler.test.ts
│   └── store.test.ts
├── integration/
│   └── ipc.test.ts
└── e2e/
    └── app.test.ts
```

### Acceptance Criteria
- [ ] Diff parser has 100% test coverage
- [ ] Git service has >80% coverage
- [ ] CI runs tests on every commit
- [ ] E2E covers happy path

---

## Task 6: Claude Code Validation

**Priority**: High (core use case)
**Effort**: Small (manual testing)

### Test Plan

1. Open WorktreeManager pointed at a real project
2. Select a worktree
3. Open terminal
4. Run `claude` command
5. Have Claude make file edits
6. Verify:
   - Terminal input/output works correctly
   - Colors render properly
   - Ctrl+C works
   - Claude's file edits appear in diff view
   - Can edit Claude's changes in editor
   - Changes save correctly

### Known Potential Issues
- Terminal resize during Claude session
- Long-running Claude sessions
- Large file outputs
- Unicode/emoji handling

### Acceptance Criteria
- [ ] Can complete full Claude Code session
- [ ] Terminal behaves identically to native terminal
- [ ] No visual glitches
- [ ] File changes visible in real-time

---

## Implementation Order

### Recommended Sequence

```
Week 1:
├── Task 1: Delete Worktree UI (2 hours)
├── Task 4: Error Handling (4 hours)
└── Task 6: Claude Code Validation (1 hour manual testing)

Week 2:
├── Task 2: Keyboard Shortcuts (3 hours)
├── Task 3: Window State Persistence (1 hour)
└── Task 5: Tests - Unit tests (4 hours)

Week 3:
└── Task 5: Tests - Integration & E2E (4 hours)
```

### Parallelization

Can run in parallel:
- Task 1 + Task 3 (independent UI changes)
- Task 4 + Task 5 (different focus areas)

Must be sequential:
- Task 4 before Task 5 (error handling enables better testing)
- Task 6 after Task 1 (need full functionality)

---

## Definition of Done (MVP Complete)

- [ ] All 8 MVP success criteria pass
- [ ] Delete worktree works from UI
- [ ] Keyboard shortcuts implemented
- [ ] Window state persists
- [ ] No crashes on common errors
- [ ] Unit tests for critical paths
- [ ] Claude Code session validated manually
- [ ] README updated with final instructions

---

## Files Summary

### New Files
```
src/renderer/hooks/useKeyboardShortcuts.ts
src/renderer/components/ErrorBoundary.tsx
src/renderer/components/Toast.tsx
tests/unit/*.test.ts
tests/integration/*.test.ts
tests/e2e/*.test.ts
```

### Modified Files
```
src/main/index.ts (window state)
src/main/ipc/*.ts (error handling)
src/renderer/App.tsx (error boundary, shortcuts)
src/renderer/components/Sidebar/index.tsx (delete button)
src/renderer/components/Terminal/index.tsx (shortcuts)
src/renderer/components/Editor/index.tsx (shortcuts)
package.json (test scripts, dependencies)
```
