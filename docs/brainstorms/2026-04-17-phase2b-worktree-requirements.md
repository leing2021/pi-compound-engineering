# Requirements

## Problem

`ce-work` executes directly on the current branch. Code changes appear immediately in the working directory with no isolation. Failed attempts cannot be easily discarded, and there is no safety net between implementation and main.

## Goals

- `ce-work` automatically creates a git worktree before executing implementation units
- Implementation happens in an isolated branch within the worktree
- On success, changes are merged back to the original branch and the worktree is cleaned up
- On failure, the worktree can be inspected or discarded without affecting main
- A `worktree_manager` extension tool handles git operations (create, status, merge, cleanup)
- The flow is automatic — users do not need to manage worktrees manually

## Non-goals

- No parallel worktrees in this phase (one task at a time)
- No worktree listing or management UI
- No cross-worktree artifact sharing (artifacts stay in the main repo)
- No changes to `ce-brainstorm`, `ce-plan`, `ce-review`, or `ce-compound`

## Approach options

### A: Embed in ce-work SKILL.md only

Modify `ce-work` SKILL.md to instruct the agent to use `bash` for git worktree operations.

Pros: no new code.
Cons: logic is in SKILL.md only, not reusable, error-prone.

### B: Embed in ce-work + worktree_manager tool (recommended)

Modify `ce-work` SKILL.md AND add a `worktree_manager` extension tool. The tool handles: create worktree from a branch, detect if already in a worktree, merge branch back, cleanup worktree. `ce-work` calls this tool automatically.

Pros: reusable tool, structured error handling, testable.
Cons: more code.

### C: New ce-worktree skill + tool + ce-work integration

Add a separate `ce-worktree` skill for lifecycle management.

Pros: full separation.
Cons: contradicts "automatic isolation" choice — adds a manual step.

## Recommended direction

**Approach B**: Modify `ce-work` to automatically use a `worktree_manager` tool. The tool handles all git worktree operations. Users experience seamless isolation without manual steps.

## Success criteria

- [ ] `worktree_manager` tool can create a worktree from the current branch with a feature branch name
- [ ] `worktree_manager` tool can detect if already inside a worktree
- [ ] `worktree_manager` tool can merge the feature branch back to the original branch
- [ ] `worktree_manager` tool can clean up a worktree
- [ ] `ce-work` SKILL.md updated to use `worktree_manager` for automatic isolation
- [ ] All existing tests pass
- [ ] New tool has TDD tests
