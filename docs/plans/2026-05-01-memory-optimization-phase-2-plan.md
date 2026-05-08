# Plan: Memory Optimization Phase 2

> Date: 2026-05-01
> Brainstorm: `docs/brainstorms/2026-05-01-memory-optimization-phase-2.md`
> Handoff consumed: `.context/compound-engineering/handoffs/latest.md`

## Problem summary

Super Pi already has multiple runtime-memory mechanisms (`context_handoff`, `workflow_state`, handoff-lite, checkpoint/history/pattern tools), but the workflow still wastes tokens and can drift after context compression because three coordination gaps remain:

1. `02-plan` / `03-work` / `04-review` do not explicitly load handoff before broad repository reads.
2. `06-next` recommends primarily from artifact counts instead of runtime context signals such as health, blocker, requested next stage, and stage mismatch.
3. `context_handoff` lacks an `activeRules` field for preserving the 1-5 continuation-critical rules that must survive handoff or compaction.

The implementation should enhance existing mechanisms only, add no new tools, keep old handoff/state files compatible, and maintain zero regression across the existing Bun test suite.

## Relevant learnings

- `docs/solutions/workflow/2026-04-24-evidence-first-handoff-lite-template.md` - score 5, high severity, exact handoff-lite/context continuation match.
  - Keep handoff evidence-first and compact.
  - Store broad history as artifact paths, not expanded narrative.
  - Protect handoff contract in both docs and tests.
- `docs/solutions/architecture/2026-04-23-shared-pipeline-config-gated-autocontinue.md` - score 4, high severity, shared pipeline/skill drift match.
  - Put cross-stage behavior in `skills/references/pipeline-config.md` where possible.
  - Keep each SKILL.md lightweight but explicit enough to prevent drift.
- `/Users/jasonle/.pi/agent/docs/solutions/workflow/2026-04-26-skill-preflight-rules-must-include-language-detection.md` - score 4, workflow skill preflight match.
  - New workflow phase preflight rules must be reflected in consuming skill files.
  - Plan-stage work must include language-specific constraints, not common rules only.

## Rules and repository context

- Primary language: TypeScript (`tsconfig.json` present).
- Loaded rules:
  - `rules/common/development-workflow.md`
  - `rules/common/testing.md`
  - `rules/typescript/testing.md`
  - `rules/typescript/coding-style.md`
  - `rules/typescript/patterns.md`
- Key TypeScript constraints for implementation:
  - Use explicit types on public APIs/interfaces.
  - Avoid `any`; narrow external/parsed values through `unknown` and helper functions.
  - Preserve immutable state update style.
  - Tests must follow RED → GREEN → REFACTOR.

## Scope boundaries

### In scope

- A1: Add context-loading startup guidance to:
  - `skills/references/pipeline-config.md`
  - `skills/02-plan/SKILL.md`
  - `skills/03-work/SKILL.md`
  - `skills/04-review/SKILL.md`
- A3: Replace/extend `06-next` recommendation logic with strict context-first priority chain in:
  - `skills/06-next/SKILL.md`
  - `skills/06-next/references/recommendation-logic.md`
- B1: Add `activeRules` to `context_handoff` runtime state and handoff template in:
  - `extensions/ce-core/tools/context-handoff.ts`
  - `tests/context-handoff.test.ts`
- B1 registration note: if the registered tool schema/wrapper in `extensions/ce-core/index.ts` is the source of accepted tool parameters, update it minimally for `activeRules` passthrough and add/adjust the existing extension test. This is necessary for real Pi tool calls even though the primary B1 implementation target is `context-handoff.ts`.

### Out of scope

- No new tools.
- No Pi core changes.
- No automatic memory routing, vector search, scoring, or rule extraction.
- No copying full SKILL.md content into handoff.
- No hard failure when `activeRules` has more than 5 entries; 1-5 is a soft guidance constraint.
- No broad redesign of `workflow_state`; use already verified `workflow_state.context.recommendNewSession`.

## Implementation units

### Unit 1 - B1: Add `activeRules` to `context_handoff`

#### Goal

Make `context_handoff` accept, persist, return, and render `activeRules` while preserving backward compatibility with old state/handoff files.

#### Files

- Modify: `extensions/ce-core/tools/context-handoff.ts`
- Modify: `tests/context-handoff.test.ts`
- Conditional/minimal if needed for registered Pi tool calls:
  - `extensions/ce-core/index.ts`
  - existing extension wrapper test file

#### Patterns to follow

- Follow existing `currentTruth`, `invalidatedAssumptions`, `openDecisions`, `recentlyAccessedFiles`, and `compressionRisk` patterns.
- Add `activeRules?: string[]` to input/result types and `activeRules: string[]` to persisted state.
- Normalize old or malformed state with `toStringArray(state.activeRules)` so missing field returns `[]`.
- Keep persisted public paths repo-relative.
- Keep caller-provided `handoffMarkdown` unchanged; still persist `activeRules` in runtime state.
- Add default-template section after `## Active Files`:
  - `## Active Rules`
  - `- N/A` when empty.

#### Test scenarios

- Happy path: save with `activeRules` returns the same array and persists it in `context-state.json`.
- Read path: `load`, `latest`, and `status` return `activeRules`.
- Default template: generated handoff markdown contains `## Active Rules` and the provided rules.
- Backward compatibility: manually create old `context-state.json` without `activeRules`; `load` succeeds and returns `activeRules: []`.
- Soft constraint: saving more than five `activeRules` does not fail and round-trips exactly.
- Registered tool path, if schema wrapper is in scope: registered `context_handoff` accepts and forwards `activeRules`.

#### Verification

```bash
bun test tests/context-handoff.test.ts
# If index/schema wrapper is changed:
bun test tests/ce-core-extension.test.ts
```

#### Dependencies

None.

#### TDD steps

1. **RED**
   - Add failing tests for activeRules round-trip, load/latest/status, default template section, old-state compatibility, and >5 soft-constraint behavior.
   - Run `bun test tests/context-handoff.test.ts`.
   - Expected failure: `activeRules` missing from types/state/result/template.
2. **GREEN**
   - Extend interfaces and state normalization.
   - Add `activeRules` to `save` field extraction, `ContextStateEntry`, and all result objects.
   - Add `## Active Rules` section to `buildDefaultHandoffMarkdown`.
   - Update registered tool schema/wrapper only if required by current source structure.
   - Run targeted tests until passing.
3. **REFACTOR**
   - Keep helper naming consistent with existing array normalization.
   - Do not add hard validation for max length.
   - Re-run targeted tests.

---

### Unit 2 - A1: Add startup handoff loading to 02/03/04 skills

#### Goal

Make `02-plan`, `03-work`, and `04-review` start by consuming handoff context before broad repository reads, while allowing normal continuation when no handoff exists.

#### Files

- Modify: `skills/references/pipeline-config.md`
- Modify: `skills/02-plan/SKILL.md`
- Modify: `skills/03-work/SKILL.md`
- Modify: `skills/04-review/SKILL.md`

#### Patterns to follow

- Shared behavior belongs in `pipeline-config.md`; each consuming SKILL.md should explicitly mention the new workflow step to avoid drift.
- Use the existing tool names and fallback path:
  - Prefer `context_handoff latest` or `context_handoff load`.
  - Fallback to reading `.context/compound-engineering/handoffs/latest.md` if tool is unavailable.
- Non-blocking behavior: no handoff means "proceed normally".
- Core principle wording must be explicit: **consume handoff before broad project file reads**.
- If handoff provides a plan path, read only that plan first; do not rescan all docs.

#### Test scenarios

- Documentation contract check by grep/read:
  - `pipeline-config.md` contains "Start of skill: context loading" and non-blocking no-handoff behavior.
  - `skills/02-plan/SKILL.md`, `skills/03-work/SKILL.md`, and `skills/04-review/SKILL.md` each include "Load context" before broad reads.
  - The text mentions `context_handoff load` or `context_handoff latest` and `.context/compound-engineering/handoffs/latest.md` fallback.
- Manual review: ensure no wording implies handoff absence blocks a new project.

#### Verification

```bash
grep -R "Load context" skills/02-plan/SKILL.md skills/03-work/SKILL.md skills/04-review/SKILL.md
grep -n "Start of skill: context loading\|context_handoff\|handoffs/latest.md" skills/references/pipeline-config.md
```

#### Dependencies

None, but should be implemented after Unit 1 if the new `activeRules` field is referenced in context-loading guidance.

#### TDD steps

1. **RED**
   - Add or run grep checks showing the current docs lack the required context-loading text.
2. **GREEN**
   - Update `pipeline-config.md` with a reusable context-loading template.
   - Update the three SKILL.md files with workflow step 1: "Load context".
   - Ensure wording says no handoff is non-blocking.
3. **REFACTOR**
   - Remove duplicated long prose where the shared pipeline reference suffices.
   - Re-run grep checks.

---

### Unit 3 - A3: Implement context-first 06-next recommendation logic

#### Goal

Make `06-next` recommend from runtime context signals before falling back to artifact counts, using the strict priority chain from the confirmed requirements.

#### Files

- Modify: `skills/06-next/SKILL.md`
- Modify: `skills/06-next/references/recommendation-logic.md`

#### Patterns to follow

- `06-next` must call `workflow_state` first and inspect `workflow_state.context`.
- Keep recommendation singular: exactly one next action/skill.
- Do not execute the recommended skill.
- Strict priority chain:
  1. `context.health` / `context.contextHealth` is `critical` → recommend save handoff + new session.
  2. `context.blocker` exists and is meaningful → recommend resolving blocker in current stage.
  3. `context.recommendNewSession === true` → recommend new session with copyable prompt.
  4. `context.nextStage` exists and differs from current stage → recommend `/skill:<nextStage>`.
  5. Stage mismatch between runtime context and artifact state → recommend correcting/resuming the expected stage.
  6. Fallback → existing artifact-count logic.
- Because current `workflow_state` returns `context.contextHealth` (not `context.health`), docs should explicitly map both names or use the actual field name while noting the requirement alias.

#### Test scenarios

- Documentation contract check by grep/read:
  - Priority chain is present in `recommendation-logic.md` in the required order.
  - `SKILL.md` says to inspect `workflow_state.context` before artifact-count fallback.
  - Critical health branch includes save handoff + new session.
  - Blocker branch stays in current stage to resolve blocker.
  - `recommendNewSession` branch includes copyable prompt guidance.
  - Fallback artifact-count logic remains available.

#### Verification

```bash
grep -n "critical\|blocker\|recommendNewSession\|nextStage\|stage mismatch\|Fallback" skills/06-next/references/recommendation-logic.md
grep -n "workflow_state.context\|context-first\|artifact" skills/06-next/SKILL.md
```

#### Dependencies

Uses already verified `workflow_state.context.recommendNewSession`; no code changes required unless implementation reveals a mismatch.

#### TDD steps

1. **RED**
   - Run grep checks showing current `recommendation-logic.md` starts with artifact-count rules and lacks the context-first chain.
2. **GREEN**
   - Rewrite `recommendation-logic.md` so context priority is first and artifact counts are explicitly fallback.
   - Update `06-next/SKILL.md` default/verbose mode wording to require context inspection.
3. **REFACTOR**
   - Keep quick reference concise.
   - Ensure only one recommendation is produced.
   - Re-run grep checks.

---

### Unit 4 - Final integration verification and handoff

#### Goal

Prove all three optimizations work together and no regressions were introduced.

#### Files

- No feature files required unless fixes from verification are needed.
- May update `.context/compound-engineering/handoffs/latest.md` through `context_handoff save` for next-stage continuation.

#### Patterns to follow

- Run targeted tests before broad tests.
- Keep verification output concise; do not paste full successful test logs into docs.
- Save handoff with `activeRules` once Unit 1 is available.

#### Verification

```bash
bun test tests/context-handoff.test.ts
bun test
bunx tsc --noEmit

grep -R "Load context" skills/02-plan/SKILL.md skills/03-work/SKILL.md skills/04-review/SKILL.md
grep -n "critical\|blocker\|recommendNewSession\|nextStage\|stage mismatch\|Fallback" skills/06-next/references/recommendation-logic.md
```

#### Dependencies

Depends on Units 1-3.

#### TDD steps

1. **RED**
   - Capture any targeted or full-suite failures after the unit changes.
2. **GREEN**
   - Fix implementation or docs contract issues until targeted and full verification pass.
3. **REFACTOR**
   - Remove accidental debug output or over-broad wording.
   - Save final handoff with active files, verification summary, and active rules.

## Verification strategy

### Targeted

```bash
bun test tests/context-handoff.test.ts
# If registered tool schema/wrapper changes:
bun test tests/ce-core-extension.test.ts
```

### Documentation contract

```bash
grep -R "Load context" skills/02-plan/SKILL.md skills/03-work/SKILL.md skills/04-review/SKILL.md
grep -n "Start of skill: context loading\|context_handoff\|handoffs/latest.md" skills/references/pipeline-config.md
grep -n "critical\|blocker\|recommendNewSession\|nextStage\|stage mismatch\|Fallback" skills/06-next/references/recommendation-logic.md
```

### Full regression

```bash
bun test
bunx tsc --noEmit
```

## Risks and mitigations

- **Risk: docs-only A1/A3 drift later.** Mitigation: centralize shared wording in `pipeline-config.md` and keep explicit minimal hooks in each SKILL.md.
- **Risk: `contextHandoffParams` schema in index.ts does not accept `activeRules`.** Mitigation: Unit 1 explicitly updates the TypeBox schema and tool wrapper passthrough — this is mandatory, not conditional.
- **Risk: old context-state files fail to load.** Mitigation: use `toStringArray(state.activeRules)` defaulting to `[]` and add backward-compatibility test.
- **Risk: 06-next field naming mismatch (`health` vs `contextHealth`).** Mitigation: write docs against actual `workflow_state.context.contextHealth`, noting it corresponds to the requirement's `context.health`.
- **Risk: A1 handoff save is only guidance, not enforced.** Mitigation: added explicit end-of-skill save requirement to pipeline-config.md End of skill section; manual checklist validates behavior.

## Success criteria

1. `02-plan`, `03-work`, and `04-review` start with non-blocking handoff loading guidance.
2. `06-next` uses the strict context-first priority chain before artifact-count fallback.
3. `context_handoff` supports `activeRules` save → load/latest/status round-trip.
4. Old handoff/state without `activeRules` loads with `activeRules: []`.
5. More than five `activeRules` does not fail.
6. Targeted tests, full `bun test`, and `bunx tsc --noEmit` pass.

## Recommended execution order

1. Unit 1 — B1 `activeRules` runtime support (context-handoff.ts + index.ts schema + tests).
2. Unit 2 — A1 startup handoff loading + end-of-skill handoff save enforcement (docs).
3. Unit 3 — A3 `06-next` context-first recommendation (docs).
4. Unit 4 — final regression verification, manual behavior checklist, and handoff.
