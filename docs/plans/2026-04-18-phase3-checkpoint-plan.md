# Plan

## Problem summary

`ce-work` has no checkpoint mechanism. Interrupted plan execution loses all progress. Requirements in `docs/brainstorms/2026-04-18-phase3-checkpoint-requirements.md`. Approach: new `session_checkpoint` tool + update `ce-work`.

## Relevant learnings

None directly related.

## Scope boundaries

**In scope:**
- `session_checkpoint` tool: save, load, list checkpoints
- Update `ce-work` SKILL.md: resume-from-checkpoint behavior
- Tests for `session_checkpoint`

**Out of scope:**
- Cross-session state beyond current plan
- History browsing or audit trail
- Checkpoint cleanup
- Changes to other skills

## Implementation units

### Unit 1: `session_checkpoint` tool

**Goal:** Create a tool that saves and loads plan execution checkpoints.

**Files:**
- Create: `extensions/ce-core/tools/session-checkpoint.ts`
- Modify: `extensions/ce-core/index.ts` (register + export)
- Modify: `tests/ce-core-extension.test.ts`

**Patterns to follow:**
- Same factory pattern, dependency injection for fs operations
- Operations: `save` (write checkpoint), `load` (read checkpoint), `list` (list all checkpoints)
- Checkpoint format: `{ planPath: string, completedUnits: string[], updatedAt: string }`
- Storage: `.context/compound-engineering/checkpoints/<plan-slug>.json`

**Test scenarios:**
- `save`: creates checkpoint file with completed units
- `load`: returns completed units for a given plan path
- `load`: returns empty array when no checkpoint exists
- `list`: returns all checkpoint entries
- Rejects unknown operations

**Verification:**
```bash
bun test tests/ce-core-extension.test.ts --filter "session_checkpoint"
```

**Dependencies:** None

---

### Unit 2: Update `ce-work` SKILL.md

**Goal:** Update skill to use `session_checkpoint` for resume behavior.

**Files:**
- Modify: `skills/ce-work/SKILL.md`

**Test scenarios:**
- `ce-work` mentions `session_checkpoint`
- `ce-work` mentions resume or checkpoint

**Verification:**
```bash
bun test tests/skill-contracts.test.ts --filter "ce-work"
```

**Dependencies:** Unit 1

---

### Unit 3: Bump version and update README

**Goal:** Bump to `0.6.0`, update Changelog.

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
