# Plan

## Problem summary

`ce-work` has no branch isolation. A `worktree_manager` tool will handle git worktree lifecycle, and `ce-work` will use it for automatic isolation. Requirements in `docs/brainstorms/2026-04-17-phase2b-worktree-requirements.md`.

## Relevant learnings

None directly related.

## Scope boundaries

**In scope:**
- `worktree_manager` tool: create, detect, merge, cleanup
- `ce-work` SKILL.md update: automatic worktree isolation
- Tests for all new code

**Out of scope:**
- Parallel worktrees
- Worktree listing / management UI
- Cross-worktree artifact sharing
- Changes to other skills

## Implementation units

### Unit 1: `worktree_manager` tool

**Goal:** Create a tool that manages git worktree lifecycle: create a worktree with a feature branch, detect if already in a worktree, merge back, and cleanup.

**Files:**
- Create: `extensions/ce-core/tools/worktree-manager.ts`
- Modify: `extensions/ce-core/index.ts` (register + export)
- Modify: `tests/ce-core-extension.test.ts`

**Patterns to follow:**
- Same factory pattern as other tools
- Use dependency injection for git operations (exec function) so tests can mock
- Tool operations: `create`, `detect`, `merge`, `cleanup`

**Test scenarios:**
- `create`: generates correct git commands for worktree + branch creation
- `detect`: returns true when inside a worktree, false when not
- `merge`: generates correct merge commands
- `cleanup`: generates correct worktree removal commands
- Rejects unknown operations
- Injection allows testing without real git

**Verification:**
```bash
bun test tests/ce-core-extension.test.ts --filter "worktree"
```

**Dependencies:** None

---

### Unit 2: Update `ce-work` SKILL.md

**Goal:** Update `ce-work` to instruct automatic worktree isolation using `worktree_manager`.

**Files:**
- Modify: `skills/ce-work/SKILL.md`

**Patterns to follow:**
- Keep existing content
- Add worktree lifecycle steps around the execution flow

**Test scenarios:**
- `ce-work` SKILL.md mentions `worktree_manager`
- `ce-work` mentions branch isolation

**Verification:**
```bash
bun test tests/skill-contracts.test.ts --filter "ce-work"
```

**Dependencies:** Unit 1

---

### Unit 3: Bump version and update README

**Goal:** Bump to `0.3.0`, update Changelog.

**Files:**
- Modify: `package.json`
- Modify: `README.md`

**Verification:**
```bash
bun test
npm publish --dry-run
```

**Dependencies:** Unit 1, 2

## Verification strategy

### Targeted
- Each unit verified individually

### Broader
- `bun test` — all tests pass
- `npm publish --dry-run` — still passes
