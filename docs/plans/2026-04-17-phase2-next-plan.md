# Plan

## Problem summary

Phase 1 skills are independent entry points with no navigation. Users must manually decide what to run next. Requirements are in `docs/brainstorms/2026-04-17-phase2-next-requirements.md`. The chosen approach is a `workflow_state` extension tool + `ce-next` skill.

## Relevant learnings

- `docs/solutions/integration/2026-04-17-npm-publish-github-actions.md` — not directly related

## Scope boundaries

**In scope:**
- `workflow_state` tool: scans 4 artifact dirs, returns structured JSON with file counts and most recent artifact per category
- `ce-next` skill: uses `workflow_state` output to recommend next skill
- `ce-status` skill update: reference `workflow_state` tool
- Register `workflow_state` in extension entrypoint
- Export `createWorkflowStateTool` from `index.ts`
- Tests for all new code

**Out of scope:**
- Auto-execution of recommended skill
- `ce-iterate` orchestrator
- Session history
- Git worktree (Phase 2b)

## Implementation units

### Unit 1: `workflow_state` tool

**Goal:** Create a tool that scans `docs/brainstorms/`, `docs/plans/`, `docs/solutions/`, `.context/compound-engineering/` and returns structured state.

**Files:**
- Create: `extensions/ce-core/tools/workflow-state.ts`
- Modify: `extensions/ce-core/index.ts` (register + export)
- Modify: `tests/ce-core-extension.test.ts`

**Patterns to follow:**
- Same factory pattern as other tools (`createXxxTool()`)
- Use `node:fs` `readdirSync` / `statSync` for scanning
- Return structured object, not formatted text

**Test scenarios:**
- Empty repo: all categories report 0 artifacts
- Repo with brainstorm but no plan: brainstorm reports 1, plan reports 0
- Repo with multiple artifacts: reports count and most recent per category
- Repo with solution subcategories: scans recursively
- Non-existent repo root: throws or returns empty state

**Verification:**
```bash
bun test tests/ce-core-extension.test.ts --filter "workflow_state"
```

**Dependencies:** None

---

### Unit 2: `ce-next` skill

**Goal:** Create a skill that uses `workflow_state` output to recommend the single best next skill.

**Files:**
- Create: `skills/ce-next/SKILL.md`
- Create: `skills/ce-next/references/recommendation-logic.md`

**Patterns to follow:**
- Same frontmatter format as other skills
- Reference `workflow_state` tool
- Explain recommendation logic explicitly

**Test scenarios:**
- SKILL.md has valid frontmatter with name `ce-next`
- SKILL.md references `workflow_state`
- SKILL.md mentions all Phase 1 skills
- `references/` directory exists

**Verification:**
```bash
bun test tests/skill-contracts.test.ts
```

**Dependencies:** Unit 1

---

### Unit 3: Update `ce-status` to reference `workflow_state`

**Goal:** Update `ce-status` SKILL.md to instruct agents to use `workflow_state` tool for scanning.

**Files:**
- Modify: `skills/ce-status/SKILL.md`

**Patterns to follow:**
- Keep existing content
- Add note about `workflow_state` tool

**Test scenarios:**
- `ce-status` SKILL.md mentions `workflow_state`

**Verification:**
```bash
bun test tests/skill-contracts.test.ts --filter "ce-status"
```

**Dependencies:** Unit 1

---

### Unit 4: Update skill contracts test for `ce-next`

**Goal:** Add `ce-next` to the skill name list and verify its contracts.

**Files:**
- Modify: `tests/skill-contracts.test.ts`

**Test scenarios:**
- `ce-next` in skill list
- `ce-next` has valid frontmatter
- `ce-next` has references directory
- `ce-next` references `workflow_state`

**Verification:**
```bash
bun test tests/skill-contracts.test.ts
```

**Dependencies:** Unit 2

---

### Unit 5: Bump version and update README

**Goal:** Bump to `0.2.0`, update Changelog, add `ce-next` to command list.

**Files:**
- Modify: `package.json`
- Modify: `README.md`

**Test scenarios:**
- README mentions `ce-next`
- package.json version is `0.2.0`

**Verification:**
```bash
bun test
npm publish --dry-run
```

**Dependencies:** Unit 1, 2, 3, 4

## Verification strategy

### Targeted
- Each unit verified individually during implementation

### Broader
- `bun test` — all tests pass (41+ existing + new)
- `npm publish --dry-run` — still passes
- `npm view @leing2021/super-pi` — verify after publish
