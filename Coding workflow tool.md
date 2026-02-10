## 1. The Core Problem (What’s actually broken)

**Modern agent / worktree workflows are powerful but fragmented.**\
Developers who use agents + git worktrees + CLI tooling end up stitching together:

- git worktrees
- terminals
- diff tools
- file editors
- cron / background jobs
- ad-hoc scripts and window managers

…across *multiple apps and windows*, with **no single place that shows “what’s going on”**.

This leads to:

- loss of situational awareness
- brittle setups
- duplicated effort
- mental overhead managing the *tooling*, not the work

The tweet isn’t really asking for “yet another agent IDE.”\
It’s asking for **a control plane for parallel code work**.

---

## 2. The User’s Real Goal (Jobs to Be Done)

When stripped down, the user wants to:

> **Run many parallel code experiments safely and visibly, without losing control of state.**

More concretely:

- Spin up isolated work contexts (worktrees)
- Let agents/code/tools operate freely inside them
- Observe, compare, edit, and schedule work
- Decide *when* and *how* changes graduate to mainline code
- Do all of this **without context switching across 5 tools**

This is about **coordination**, not raw code generation.

---

## 3. Who This Is For (Primary Persona)

**Power developers / early adopters** who:

- Use Claude Code / Cursor / agents heavily
- Are comfortable in terminal-first workflows
- Use git worktrees, not just branches
- Run multiple tasks in parallel
- Value speed, visibility, and control over polish

Not beginners.\
Not “AI coding for everyone.”\
This is a **pro tool**.

---

## 4. What Existing Tools Get Wrong

From the thread, there’s a consistent pattern:

### 4.1 Agent Orchestration Tools

Examples: Conductor, Superset, Ona

**Problems:**

- Feel abstracted away from *real repos*
- Weak or buggy diffing
- Limited or no file editing
- Sidebar/workspace management feels flaky
- Often VM-first instead of repo-first

They optimize for **agents**, not **developers managing agents**.

---

### 4.2 IDE-Based Solutions (Cursor, etc.)

**Problems:**

- Assume a single primary working directory
- “Apply changes” is a leaky abstraction
- Poor at managing many concurrent worktrees
- Don’t expose background jobs or automation well

They optimize for **editing**, not **parallel execution**.

---

### 4.3 DIY CLI Setups

Like Owen’s `wt <name>` command.

**What works:**

- Fast
- Flexible
- Tailored

**What breaks down:**

- No global visibility
- Hard to manage lifecycle (what’s active? stale?)
- Hard to diff/review across worktrees
- Hard to schedule or monitor background jobs
- Feels fragile and bespoke

The pain point isn’t *capability*—it’s **coherence**.

---

## 5. The Central Insight

> **Worktrees are the real unit of work—not agents, not branches, not VMs.**

Everything in the tweet orbits this idea:

- Sidebar = worktree awareness
- Diff view = worktree comparison
- File editor = quick intervention inside a worktree
- Terminal = execution inside a worktree
- Cron jobs = ongoing work *per worktree*

Existing tools treat worktrees as:

- an implementation detail, or
- something to hide behind abstractions

This product treats worktrees as **first-class citizens**.

---

## 6. What We Are Not Trying to Do

To keep the spec clean, it helps to be explicit:

- ❌ Not building a full IDE replacement
- ❌ Not abstracting git away
- ❌ Not forcing a VM / cloud-first workflow
- ❌ Not auto-merging or “magic applying” code
- ❌ Not optimizing for non-technical users

This is a **developer-side dashboard**, not an AI babysitter.

---

## 7. Refined Problem Statement (Spec-Ready)

> Developers running multiple parallel code tasks lack a single, reliable place to **see, manage, compare, and intervene** in their active git worktrees.
>
> Current tools either:
>
> - fragment this workflow across terminals and scripts, or
> - abstract it away in ways that reduce trust and control.
>
> As a result, developers spend too much time managing context and tooling instead of making progress.

---

## 8. What Success Looks Like (North Star)

A developer can:

- Glance at one sidebar and immediately understand:
  - how many worktrees exist
  - what they’re doing
  - which are active, idle, or stale
- Drop into any worktree instantly:
  - run commands
  - inspect diffs
  - edit files
- Schedule or monitor long-running tasks
- Decide *when and how* changes move forward
- Never wonder: *“where did that change come from?”*
