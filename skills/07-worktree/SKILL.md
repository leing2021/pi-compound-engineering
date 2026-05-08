---
name: 07-worktree
description: "Create and manage git worktrees for isolated feature development. Use when starting a feature that needs branch isolation."
---

# Worktree

Use this skill for optional isolated git worktree development for large, risky, or parallel feature work.

## Core rules

- Use **`worktree_manager`** tool for all operations
- Only create when user explicitly asks or task is large/risky enough (with confirmation)
- Derive branch name from plan or task
- Report worktree path after creation so `03-work` can execute inside it
- **Never force operations** — if worktree exists, report status instead of duplicating
- On completion: offer merge → cleanup (with user confirmation)

## Workflow

See `references/worktree-lifecycle.md` for detailed flow, branch naming, and error handling.

**Quick reference:**
1. `detect` — check if already in worktree
2. `create` — spin up new worktree with feature branch
3. Execute `03-work` inside worktree directory
4. `merge` — merge feature branch back (with confirmation)
5. `cleanup` — remove worktree and delete branch (with confirmation)

## Branch naming

- `feat/<slug>` — feature work
- `fix/<slug>` — bug fixes
- `chore/<slug>` — maintenance tasks

Before finishing this skill, apply the completion checklist in [shared pipeline instructions](../references/pipeline-config.md).
