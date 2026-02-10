# Product Principles

## 1. Worktrees Are the Unit of Work

Everything in the product is organized around **git worktrees**, not:

- agents
- tasks
- branches
- PRs
- VMs

A worktree represents:

- a concrete filesystem
- a branch or stack
- a running environment
- a set of changes over time

**Implication**

- The sidebar lists worktrees, not “jobs” or “sessions”
- Diffing, editing, terminals, and automations are always scoped to a worktree
- Nothing happens “outside” a worktree

If it doesn’t map cleanly to a worktree, it’s probably out of scope.

---

## 2. Visibility Before Automation

Automation is useless if the developer can’t *see* what’s happening.

The product must always prioritize:

- current state over future promises
- inspectability over cleverness
- clarity over abstraction

**Implication**

- You can always see:
  - which worktrees exist
  - what branch/stack they’re on
  - what’s running
  - what’s changed
- No “magic apply changes”
- No hidden agent steps

Automation should feel like **delegation**, not **loss of control**.

---

## 3. One Place to Stay Oriented

The core value is **situational awareness**.

The product exists to answer, at a glance:

- What am I working on?
- What else is running?
- What’s stalled?
- What’s ready for review?
- What did this agent change?

**Implication**

- The UI should reward glancing, not digging
- Sidebars > modals
- Persistent state beats transient logs
- Stale or broken worktrees should be obvious

If the user still needs to mentally track state, the product failed.

---

## 4. Intervene Without Context Switching

Developers shouldn’t have to:

- open another editor
- switch windows
- re-run commands
- rehydrate context

…just to make a small fix or review a change.

**Implication**

- File editing is built-in (even if minimal)
- Diff views are reliable and first-class
- Terminal access is always one click away
- Edits don’t require “importing” changes elsewhere

Intervention should feel *light*, not like abandoning the flow.

---

## 5. Real Git, No Theater

Git is not abstracted away or reimagined.

This tool assumes:

- users understand git
- users want predictable behavior
- users care about correctness

**Implication**

- Branches, stacks, and diffs behave exactly as git does
- No proprietary diff formats
- No hidden rebases or merges
- PRs are created from worktrees, not synthesized

The product should feel like **git with visibility**, not “AI git”.

---

## 6. Local-First, Cloud-Optional

The default assumption is:

- your repo is local
- your tools are local
- your environment matters

Cloud or VM-based execution is optional—not mandatory.

**Implication**

- Works with existing local repos
- Uses local filesystem semantics
- Doesn’t require migrating to a hosted environment
- Can integrate with cloud runners later, but doesn’t depend on them

If the tool breaks because you’re offline, something is wrong.

---

## 7. Long-Lived Work Is First-Class

Not all tasks are:

- short
- synchronous
- interactive

Some things run for hours or days.

**Implication**

- Cron jobs and background tasks are visible objects
- You can see:
  - when they ran
  - what they did
  - whether they failed
- Jobs belong to worktrees, not global state

The product should handle “slow boring work” gracefully.

---

## 8. Opinionated, Not Configurable to Death

This is not a framework or plugin platform (at least initially).

**Implication**

- Strong defaults
- Limited knobs
- Clear “this is how it works”

If advanced users want to script around it, they can—but the core UX should not be diluted by infinite options.

---

## 9. Trust Is Earned Through Reliability

A single broken diff, lost file, or undeletable workspace destroys trust.

**Implication**

- Diff correctness > fancy UI
- File editing must be safe and reversible
- Destructive actions are explicit
- The sidebar never lies

This tool must feel **boringly dependable**.

---

## 10. This Is a Control Plane, Not a Replacement Brain

The product does not try to:

- decide what to merge
- judge code quality
- override developer intent

It exists to:

- coordinate
- expose
- organize

**Implication**

- No “AI knows best” UX
- Suggestions are optional
- Decisions remain human

The developer stays in charge.

---

## Principle Summary (One-Liner Version)

> A local-first control plane for managing parallel git worktrees, giving developers constant visibility and lightweight control over code, agents, and long-running work—without abstraction, magic, or loss of trust.
