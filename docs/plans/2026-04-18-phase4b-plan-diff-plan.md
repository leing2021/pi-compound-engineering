# Plan

## Problem summary

`ce-plan` cannot do incremental updates when requirements change. Requirements in `docs/brainstorms/2026-04-18-phase4b-plan-diff-requirements.md`.

## Implementation units

### Unit 1: `plan_diff` tool

**Goal:** Compare existing plan units with new requirements, output changeset.

**Files:**
- Create: `extensions/ce-core/tools/plan-diff.ts`
- Modify: `extensions/ce-core/index.ts`
- Modify: `tests/ce-core-extension.test.ts`

**Design:**

Input:
```
{
  operation: "compare" | "patch",
  existingUnits: PlanUnit[],     // current plan units
  newRequirements: PlanUnit[],   // updated requirements
  changes?: PlanChange[],        // for patch operation
}
```

Output (compare):
```
{
  added: PlanUnit[],      // units in new but not in existing
  removed: PlanUnit[],    // units in existing but not in new
  modified: PlanUnit[],   // units that exist in both but differ
  unchanged: PlanUnit[],  // identical units
}
```

Output (patch):
```
{
  units: PlanUnit[],      // merged result
  appliedChanges: number,
}
```

**Test scenarios:**
- `compare` detects added, removed, modified, unchanged units
- `patch` applies changes and returns merged result
- `compare` with identical inputs returns all unchanged
- Rejects unknown operations

**Verification:**
```bash
bun test tests/ce-core-extension.test.ts --filter "plan_diff"
```

### Unit 2: Update `ce-plan` SKILL.md

**Files:**
- Modify: `skills/ce-plan/SKILL.md`

**Verification:**
```bash
bun test tests/skill-contracts.test.ts --filter "ce-plan"
```

### Unit 3: Bump to 0.9.0

**Verification:**
```bash
bun test && npm publish --dry-run
```
