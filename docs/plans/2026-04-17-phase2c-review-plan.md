# Plan

## Problem summary

`ce-review` lacks structured diff analysis for reviewer routing and has no autofix capability. Requirements in `docs/brainstorms/2026-04-17-phase2c-review-requirements.md`. Approach: `review_router` tool + SKILL.md autofix guidance.

## Relevant learnings

None directly related.

## Scope boundaries

**In scope:**
- `review_router` tool: analyze diff metadata, return recommended reviewer personas
- Update `ce-review` SKILL.md: use `review_router` + autofix loop
- Update `findings-schema.md`: autofix tracking fields
- Update `reviewer-selection.md`: richer persona definitions with trigger patterns
- Update `handoff.md`: autofix loop support
- Tests for `review_router`

**Out of scope:**
- Actual code patch generation by tool
- Parallel subagent reviewer execution
- CI/CD review integration

## Implementation units

### Unit 1: `review_router` tool

**Goal:** Analyze diff metadata (file types, change stats, affected paths) and return a recommended list of reviewer personas.

**Files:**
- Create: `extensions/ce-core/tools/review-router.ts`
- Modify: `extensions/ce-core/index.ts` (register + export)
- Modify: `tests/ce-core-extension.test.ts`

**Patterns to follow:**
- Same factory pattern, dependency injection for diff provider
- Input: diff stats (files changed, insertions, deletions, file paths)
- Output: recommended reviewer list with reasons

**Test scenarios:**
- Always-on reviewers: correctness, testing, maintainability
- Security reviewer triggered by auth/permission related file paths
- Performance reviewer triggered by data/query related paths
- Large diffs trigger additional reviewers
- Empty diff returns minimal reviewer set
- Unknown file types still get base reviewers

**Verification:**
```bash
bun test tests/ce-core-extension.test.ts --filter "review_router"
```

**Dependencies:** None

---

### Unit 2: Update review references

**Goal:** Update `findings-schema.md`, `reviewer-selection.md`, `handoff.md` with autofix and routing content.

**Files:**
- Modify: `skills/ce-review/references/findings-schema.md`
- Modify: `skills/ce-review/references/reviewer-selection.md`
- Modify: `skills/ce-review/references/handoff.md`

**Test scenarios:**
- findings-schema contains autofix fields
- reviewer-selection references `review_router`
- handoff mentions autofix loop

**Verification:**
```bash
bun test tests/skill-contracts.test.ts --filter "ce-review"
```

**Dependencies:** None

---

### Unit 3: Update `ce-review` SKILL.md

**Goal:** Update skill to use `review_router` and include autofix loop guidance.

**Files:**
- Modify: `skills/ce-review/SKILL.md`

**Test scenarios:**
- SKILL.md mentions `review_router`
- SKILL.md mentions autofix

**Verification:**
```bash
bun test tests/skill-contracts.test.ts --filter "ce-review"
```

**Dependencies:** Unit 1, Unit 2

---

### Unit 4: Bump version and update README

**Goal:** Bump to `0.4.0`, update Changelog.

**Files:**
- Modify: `package.json`
- Modify: `README.md`

**Verification:**
```bash
bun test
npm publish --dry-run
```

**Dependencies:** Unit 1, 2, 3

## Verification strategy

### Targeted
- Each unit verified individually

### Broader
- `bun test` — all tests pass
- `npm publish --dry-run` — still passes
