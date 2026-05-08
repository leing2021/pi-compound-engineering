# Plan

## Problem summary

`ce-work` has no structured dependency analysis for implementation units. Agent must manually decide parallel vs serial execution. Requirements in `docs/brainstorms/2026-04-18-phase3b-splitter-requirements.md`. Approach: new `task_splitter` tool + update `ce-work`.

## Relevant learnings

None directly related.

## Scope boundaries

**In scope:**
- `task_splitter` tool: file-based dependency analysis, parallel-safe grouping
- Update `ce-work` SKILL.md: use `task_splitter` output
- Tests for `task_splitter`

**Out of scope:**
- Automatic plan parsing
- Code-level dependency analysis
- Execution scheduling
- Changes to other skills

## Implementation units

### Unit 1: `task_splitter` tool

**Goal:** Create a tool that analyzes implementation units for file-level dependencies and outputs parallel-safe execution groups.

**Files:**
- Create: `extensions/ce-core/tools/task-splitter.ts`
- Modify: `extensions/ce-core/index.ts` (register + export)
- Modify: `tests/ce-core-extension.test.ts`

**Design:**

Input:
```
{
  units: [
    { name: "Unit 1: auth module", files: ["src/auth.ts", "src/types.ts"] },
    { name: "Unit 2: user API", files: ["src/user.ts", "src/types.ts"] },
    { name: "Unit 3: docs", files: ["README.md"] },
  ]
}
```

Output:
```
{
  groups: [
    { units: ["Unit 3: docs"], parallelSafe: true },
    { units: ["Unit 1: auth module", "Unit 2: user API"], parallelSafe: false, sharedFiles: ["src/types.ts"] },
  ],
  independentUnits: ["Unit 3: docs"],
  dependentUnits: ["Unit 1: auth module", "Unit 2: user API"],
}
```

Algorithm:
1. Build a file→units map
2. For each file shared by multiple units, merge those units into one group (union-find)
3. Units with no shared files are independent (parallel-safe)
4. Output groups with parallelSafe flag and shared file info

**Test scenarios:**
- All independent units → all parallel-safe
- Two units share a file → grouped as dependent
- Three units, one shares with two others → all three in one group
- Single unit → one parallel-safe group
- Empty input → empty output
- Unit with no files → treated as independent

**Verification:**
```bash
bun test tests/ce-core-extension.test.ts --filter "task_splitter"
```

**Dependencies:** None

---

### Unit 2: Update `ce-work` SKILL.md

**Goal:** Update skill to recommend `task_splitter` for dependency analysis.

**Files:**
- Modify: `skills/ce-work/SKILL.md`

**Test scenarios:**
- `ce-work` mentions `task_splitter`

**Verification:**
```bash
bun test tests/skill-contracts.test.ts --filter "ce-work"
```

**Dependencies:** Unit 1

---

### Unit 3: Bump version and update README

**Goal:** Bump to `0.7.0`, update Changelog.

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
