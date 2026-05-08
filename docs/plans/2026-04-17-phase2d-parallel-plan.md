# Plan

## Problem summary

`subagent` tool only supports serial execution. Independent tasks must wait unnecessarily. Requirements in `docs/brainstorms/2026-04-17-phase2d-parallel-requirements.md`. Approach: new `parallel_subagent` tool + update `ce-work`.

## Relevant learnings

None directly related.

## Scope boundaries

**In scope:**
- `parallel_subagent` tool: run multiple tasks concurrently, return all outputs
- Update `ce-work` SKILL.md: recommend parallel for independent units
- Tests for `parallel_subagent`

**Out of scope:**
- Automatic dependency analysis
- Task splitting logic
- Session history
- Changes to other skills

## Implementation units

### Unit 1: `parallel_subagent` tool

**Goal:** Create a tool that runs multiple skill-based tasks concurrently and returns all outputs.

**Files:**
- Create: `extensions/ce-core/tools/parallel-subagent.ts`
- Modify: `extensions/ce-core/index.ts` (register + export)
- Modify: `tests/ce-core-extension.test.ts`

**Patterns to follow:**
- Same factory pattern, dependency injection for runner
- Use `Promise.allSettled` for concurrent execution with graceful failure handling
- Input: array of `{agent, task}` items
- Output: array of results with success/failure status per task

**Test scenarios:**
- Runs multiple tasks concurrently, returns all outputs
- Handles individual task failures gracefully (reports which failed)
- Rejects empty task array
- Returns results in same order as input tasks

**Verification:**
```bash
bun test tests/ce-core-extension.test.ts --filter "parallel_subagent"
```

**Dependencies:** None

---

### Unit 2: Update `ce-work` SKILL.md

**Goal:** Update skill to recommend parallel execution for independent units.

**Files:**
- Modify: `skills/ce-work/SKILL.md`

**Test scenarios:**
- `ce-work` mentions `parallel_subagent`
- `ce-work` mentions parallel execution

**Verification:**
```bash
bun test tests/skill-contracts.test.ts --filter "ce-work"
```

**Dependencies:** Unit 1

---

### Unit 3: Bump version and update README

**Goal:** Bump to `0.5.0`, update Changelog.

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
