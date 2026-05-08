# Plan

## Problem summary

`ce-brainstorm` currently produces a single-shot requirements artifact. Real brainstorming is iterative — the agent presents initial analysis, the user asks clarifying questions, and the agent refines. Requirements in `docs/brainstorms/2026-04-18-phase4-overview-requirements.md` (section 4a).

## Relevant learnings

- `ask_user_question` tool already supports structured Q&A — can be used within brainstorm flow
- `artifact_helper` already manages artifact paths — brainstorm dialog state can be stored alongside artifacts

## Scope boundaries

**In scope:**
- `brainstorm_dialog` tool: manage multi-round brainstorm conversation state
- Update `ce-brainstorm` SKILL.md: multi-round refinement workflow
- Update `ce-brainstorm/references/requirements-template.md`: add iteration fields

**Out of scope:**
- No changes to other skills
- No cross-session history (that's 4c)
- No automatic question generation

## Implementation units

### Unit 1: `brainstorm_dialog` tool

**Goal:** Create a tool that manages brainstorm conversation rounds and tracks iteration state.

**Files:**
- Create: `extensions/ce-core/tools/brainstorm-dialog.ts`
- Modify: `extensions/ce-core/index.ts` (register + export)
- Modify: `tests/ce-core-extension.test.ts`

**Design:**

Input:
```
{
  operation: "start" | "refine" | "summarize",
  artifactPath: string,
  round?: number,
  analysis?: string,      // agent's current analysis
  questions?: string[],    // open questions for the user
  userResponses?: string[], // user's answers from previous round
  repoRoot: string,
}
```

Operations:
- `start`: Initialize a brainstorm dialog with round 1 analysis and open questions
- `refine`: Incorporate user responses, increment round, produce refined analysis + new questions
- `summarize`: Finalize the brainstorm into a requirements-ready summary

Output:
```
{
  artifactPath: string,
  round: number,
  status: "in_progress" | "complete",
  analysis: string,
  openQuestions: string[],
}
```

Storage: `.context/compound-engineering/dialogs/<slug>.json`

**Test scenarios:**
- `start` creates a dialog with round 1
- `refine` increments round and incorporates responses
- `summarize` marks dialog as complete
- `start` on existing dialog returns current state
- Rejects unknown operations

**Verification:**
```bash
bun test tests/ce-core-extension.test.ts --filter "brainstorm_dialog"
```

**Dependencies:** None

---

### Unit 2: Update `ce-brainstorm` SKILL.md + references

**Goal:** Update skill to describe multi-round brainstorm workflow.

**Files:**
- Modify: `skills/ce-brainstorm/SKILL.md`
- Modify: `skills/ce-brainstorm/references/requirements-template.md`

**Test scenarios:**
- `ce-brainstorm` mentions `brainstorm_dialog`
- `ce-brainstorm` mentions round or iteration

**Verification:**
```bash
bun test tests/skill-contracts.test.ts --filter "ce-brainstorm"
```

**Dependencies:** Unit 1

---

### Unit 3: Bump version and update README

**Goal:** Bump to `0.8.0`, update Changelog.

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
