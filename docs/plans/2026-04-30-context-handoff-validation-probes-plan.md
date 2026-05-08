# Plan: Context Handoff Validation Probes

## Problem summary

Super Pi already has structured runtime-memory anchors through `context_handoff`, `.context/compound-engineering/context-state.json`, and `workflow_state.context`. However, the current system does not verify whether a saved handoff is sufficient for a new session or next-stage agent to continue safely.

The requested Route B-lite feature adds deterministic continuation-readiness validation through `context_handoff operation: "validate"`.

Confirmed requirements:

- Add deterministic `context_handoff validate`.
- No LLM judge, model scoring, network calls, or generic prompt compression.
- Do not modify Pi core compaction or skill-block handling.
- Practical `ok` rule:
  - Recall + Continuation probes are required.
  - Artifact + Decision omissions are warnings only.
- Missing, legacy, or malformed runtime state must not crash.
- Result should be suitable for future `workflow_state` / `/skill:06-next` consumption.

## Relevant learnings

### `docs/solutions/workflow/2026-04-24-evidence-first-handoff-lite-template.md` — score 5

Key takeaways:

- Continuation quality depends on preserving high-ROI facts: verified facts, blockers, active files, artifacts, and next minimal step.
- Runtime tools should enforce the shared handoff structure with tests, not rely only on agent discipline.
- Validation should align with existing handoff sections rather than introduce a parallel contract.

Application:

- `validate` should inspect the same sections already present in the evidence-first handoff-lite template.
- Required checks should focus on continuation value, especially `Current Task`, `Verification`, and `Next Minimal Step`.

### `docs/solutions/tooling/2026-04-30-runtime-json-state-normalize-on-schema-extend.md` — score 5

Key takeaways:

- Never trust `JSON.parse(...) as Type` for persisted runtime state.
- Normalize and type-filter all persisted JSON before exposing typed results.
- Add regression tests for legacy state, malformed state, and corrupted JSON.

Application:

- Reuse existing `readState()` / `normalizeStateEntry()` behavior in `context-handoff.ts`.
- `validate` must gracefully handle no state, legacy state, malformed state, and missing handoff markdown.

### `docs/solutions/architecture/2026-04-24-runtime-context-path-portability.md` — score 4

Key takeaways:

- Persisted/public runtime paths should be repo-relative.
- Filesystem operations may resolve paths internally, but tool outputs should avoid absolute machine-specific paths.

Application:

- `validate.path` should return repo-relative paths when derived from runtime state or repo-local handoff paths.
- `handoffPath` input should accept absolute or repo-relative paths for backward compatibility.

### `docs/solutions/tooling/tool-parameter-type-robustness.md` — score 3

Key takeaways:

- Tool schemas should be robust in strict harness environments.
- Complex parameters sometimes need careful schema design.

Application:

- `validate` adds only a literal operation and existing string path input, so no polymorphic schema is needed.
- Keep the ce-core wrapper pass-through explicit and typed.

## Scope boundaries

### In scope

- Extend `ContextHandoffInput.operation` to include `"validate"`.
- Add explicit validation result types to `ContextHandoffResult` or related interfaces.
- Implement deterministic probes:
  - Recall,
  - Continuation,
  - Artifact,
  - Decision.
- Implement practical `ok` rule:
  - `ok = recall && continuation`.
  - Artifact/Decision failures populate `warnings` only.
- Add direct tool tests and ce-core wrapper/schema regression tests.
- Preserve backward compatibility and safe defaults.

### Out of scope

- LLM judge or model-based semantic evaluation.
- Numeric score / weighted scoring.
- Network calls.
- Generic prompt compressors.
- Pi core compaction or skill block handling.
- Changing `/skill:06-next` logic in this first pass.
- Changing `workflow_state.context` shape unless needed by tests; future integration can consume `validate` later.

## Proposed validation behavior

### Result shape

Add fields to validation output:

```ts
interface ContextHandoffValidationProbes {
  recall: boolean
  continuation: boolean
  artifact: boolean
  decision: boolean
}

type ContextHandoffRecommendedAction = "continue" | "save_handoff" | "fill_required_context"
```

`ContextHandoffResult` should optionally include:

```ts
interface ContextHandoffValidationCheck {
  name: string
  passed: boolean
  reason: string
}

ok?: boolean
probes?: ContextHandoffValidationProbes
checks?: ContextHandoffValidationCheck[]
missing?: string[]
warnings?: string[]
recommendedAction?: ContextHandoffRecommendedAction
```

`probes` are the stable machine-readable categories used to derive `ok`. `checks` are finer-grained explanatory diagnostics for debugging and tests.

### Evidence sources

`validate` should read:

1. Normalized state from `readState(repoRoot)`.
2. Markdown from:
   - explicit `handoffPath`, if provided;
   - else `state.latestHandoffPath`, if available;
   - else `.context/compound-engineering/handoffs/latest.md`, if present.

### Probe heuristics

Keep checks deterministic and intentionally simple.

- Recall passes if at least one is true:
  - `currentTruth.length > 0`,
  - `currentStage` is meaningful and not `unknown`,
  - latest handoff has non-empty `## Current Task` content.

- Continuation passes only when there is actionable continuation evidence. At least one must be true:
  - latest handoff has meaningful `## Next Minimal Step` content,
  - `nextStage` exists and is meaningful.

  `verification` and `blocker` are diagnostic/enrichment evidence only. They must produce useful checks, but neither `verification` nor `blocker` can make Continuation pass by itself.

- Artifact passes if at least one is true:
  - `activeFiles.length > 0`,
  - `recentlyAccessedFiles.length > 0`,
  - `artifacts` has at least one non-empty value,
  - latest handoff has meaningful `## Active Files`, `## Recently Accessed Files`, or `## Artifacts` content.

- Decision passes if at least one is true:
  - `openDecisions.length > 0`,
  - `invalidatedAssumptions.length > 0`,
  - `currentTruth.length > 0`,
  - latest handoff has meaningful `## Open Decisions`, `## Invalidated Assumptions`, or `## Current Truth` content.

Meaningful markdown section content means content remains after trimming bullets and excluding placeholders such as `N/A`, `- N/A`, `Not run`, `- Not run`, and empty whitespace. Placeholder content must not count as evidence for Recall, Continuation, Artifact, Decision, or Verification checks.

### Missing/warnings/action rules

- `found` semantics:
  - `found = true` when either normalized state or handoff markdown exists.
  - `found = false` only when neither state nor handoff markdown exists.
  - `found = true` does not imply `ok = true`; it only means validation had some source material.

- If no state and no handoff are found:
  - `found = false`,
  - `ok = false`,
  - `missing` includes recall and continuation evidence,
  - `recommendedAction = "save_handoff"`.

- If Recall fails:
  - add missing item such as `recall: current task or goal evidence`.
  - add at least one failed `checks[]` entry explaining which evidence was missing.

- If Continuation fails:
  - add missing item such as `continuation: next minimal step or verification evidence`.
  - add at least one failed `checks[]` entry explaining which continuation field or section was missing.

- If Artifact fails:
  - add warning such as `artifact: active files or artifacts are missing`.
  - add a failed `checks[]` entry for artifact evidence, but do not make `ok=false` solely for this.

- If Decision fails:
  - add warning such as `decision: decisions or invalidated assumptions are missing`.
  - add a failed `checks[]` entry for decision evidence, but do not make `ok=false` solely for this.

- Recommended action:
  - `continue` when `ok === true`,
  - `save_handoff` when `found === false`,
  - `fill_required_context` when `found === true` but `ok === false`.

## Implementation units

### Unit 1 — Direct `context_handoff validate` behavior

#### Goal

Add validation operation to the core tool with explicit public types and deterministic probe logic.

#### Files

- Modify: `extensions/ce-core/tools/context-handoff.ts`
- Modify: `tests/context-handoff.test.ts`

#### Patterns to follow

- Existing `save/load/latest/status` switch in `createContextHandoffTool()`.
- Existing `readState()` normalization and safe-default behavior.
- Existing repo-relative path helpers: `toRepoRelative()` and `resolveRepoPath()`.

#### TDD steps

1. **RED** — add tests before implementation:
   - `validate returns missing required evidence when no state or handoff exists`.
   - `validate passes when recall and continuation evidence exist`.
   - `validate warns but stays ok when artifact and decision evidence are missing`.
   - `validate handles legacy state with safe defaults`.
   - `validate handles corrupted context-state.json without throwing`.
2. Run targeted test and confirm failure:
   - `bun test tests/context-handoff.test.ts`
3. **GREEN** — implement minimal validation operation and types.
4. Run targeted test and confirm pass:
   - `bun test tests/context-handoff.test.ts`
5. **REFACTOR** — extract small helpers only if they improve readability:
   - section extraction helper,
   - non-empty section helper,
   - non-empty record helper.
6. Re-run targeted test.

#### Test scenarios

- Happy path:
  - state has `currentTruth` and `nextStage`; `ok=true`.
- Practical warning path:
  - state has recall/continuation only; artifact/decision warnings are present but `ok=true`.
- Missing path:
  - no state and no handoff; `ok=false`, `found=false`, `recommendedAction="save_handoff"`.
- Error path:
  - malformed JSON; no throw, safe failure.
- Backward compatibility:
  - legacy state missing new arrays; no throw and deterministic output.
- Markdown path:
  - explicit `handoffPath` can provide evidence even if state is sparse.
- Regression path A:
  - state has only `verification: "bun test passed"`, no `nextStage`, and no `## Next Minimal Step`; Continuation must fail and `ok=false`.
- Regression path B:
  - markdown sections containing only placeholders such as `N/A`, `- N/A`, `Not run`, or `- Not run` must not count as evidence; Continuation must fail and Artifact/Decision warnings must be present.

#### Verification

- `bun test tests/context-handoff.test.ts`

#### Dependencies

- None.

### Unit 2 — ce-core schema and wrapper pass-through

#### Goal

Expose `operation: "validate"` through the runtime `context_handoff` tool schema and ensure wrapper returns validation details.

#### Files

- Modify: `extensions/ce-core/index.ts`
- Modify: `tests/ce-core-extension.test.ts`

#### Patterns to follow

- Existing `contextHandoffParams` TypeBox union.
- Existing wrapper pass-through around line where `contextHandoff.execute({...})` is called.
- Existing wrapper test `context_handoff wrapper passes structured runtime-memory fields through`.

#### TDD steps

1. **RED** — add wrapper/schema test first:
   - registered `context_handoff` supports `operation: "validate"` and returns `details.ok` / `details.probes`.
2. Run targeted test and confirm failure:
   - `bun test tests/ce-core-extension.test.ts`
3. **GREEN** — add `Type.Literal("validate")` to schema and update description if needed.
4. Run targeted test and confirm pass:
   - `bun test tests/ce-core-extension.test.ts`
5. **REFACTOR** — keep wrapper pass-through explicit; avoid broad `any` additions.
6. Re-run targeted test.

#### Test scenarios

- `validate` operation can be invoked through registered tool.
- Wrapper returns JSON content and `details` containing validation result.
- `details.probes` and `details.checks` are present for validation output.
- Existing operations still register and execute.

#### Verification

- `bun test tests/ce-core-extension.test.ts`

#### Dependencies

- Unit 1.

### Unit 3 — Integrated verification and handoff

#### Goal

Verify the feature in the full project and save a concise handoff for review.

#### Files

- No product code expected beyond Units 1–2.
- May update docs only if implementation reveals a necessary shared contract clarification.

#### TDD steps

1. Ensure all RED/GREEN evidence from Units 1–2 is recorded in progress notes or final report.
2. Run targeted tests:
   - `bun test tests/context-handoff.test.ts tests/ce-core-extension.test.ts`
3. Run full suite:
   - `bun test`
4. Run typecheck:
   - `bunx tsc --noEmit`
5. Run whitespace diff check:
   - `git diff --check`
6. Save handoff to `04-review` with `context_handoff` including validation-related context.

#### Verification

- `bun test tests/context-handoff.test.ts tests/ce-core-extension.test.ts`
- `bun test`
- `bunx tsc --noEmit`
- `git diff --check`

#### Dependencies

- Unit 1.
- Unit 2.

## Verification strategy

### Targeted verification

- `bun test tests/context-handoff.test.ts`
- `bun test tests/ce-core-extension.test.ts`

### Full verification

- `bun test`
- `bunx tsc --noEmit`
- `git diff --check`

### Review focus

Ask reviewers to specifically check:

- `ok` semantics match the practical rule.
- Missing vs warning separation is correct.
- Persisted JSON is normalized before use.
- No direct `JSON.parse(...) as ContextStateEntry` pattern is reintroduced.
- Public paths remain repo-relative.
- No LLM/network dependency is introduced.

## Risks and mitigations

### Risk: validation heuristics imply more semantic confidence than they provide

Mitigation:

- Use booleans and explicit warnings, not numeric scores.
- Name output as continuation-readiness validation, not compression quality scoring.

### Risk: markdown section parsing becomes brittle

Mitigation:

- Keep parser simple: detect markdown headings and meaningful content.
- Meaningful content excludes placeholders such as `N/A`, `- N/A`, `Not run`, and `- Not run`.
- Prefer state fields when available.
- Treat markdown as supplemental evidence, not the only source.

### Risk: missing artifact/decision evidence blocks useful continuation

Mitigation:

- Follow confirmed practical rule: Artifact and Decision failures are warnings only.

### Risk: old or corrupted runtime state crashes validation

Mitigation:

- Reuse normalization and safe fallback patterns.
- Add regression tests before implementation.

## CEO Review decisions

Review mode: CEO Review.

Confirmed premises:

1. The immediate problem is **handoff usability / continuity validation**, not compression algorithm benchmarking.
2. V1 should remain deterministic, local, testable, and easy to debug.
3. V1 should not introduce LLM judges, subjective scoring, network calls, or generic prompt compressors.
4. `ok=true` should require Recall + Continuation only. Artifact + Decision gaps should produce warnings, not block continuation.

Dream-state mapping:

```text
CURRENT STATE
Structured context-state and handoff-lite exist, but continuation quality is not machine-checkable.

THIS PLAN
Add deterministic validation that tells an agent whether the handoff is minimally safe to continue from, and why.

12-MONTH IDEAL
Super Pi can route next steps, recommend new sessions, and learn from handoff failures using stable runtime-memory diagnostics.
```

Alternatives considered:

### Approach A: Minimal viable `probes` only

- Effort: S
- Risk: Low
- Pros: smallest API, easiest implementation, enough for `ok`.
- Cons: less explainable failures, weaker debug ergonomics.
- Reuses: existing context state and handoff sections.

### Approach B: `probes` + explanatory `checks` — selected

- Effort: S/M
- Risk: Low
- Pros: stable machine categories plus debuggable reasons; better tests; future `06-next` can inspect both.
- Cons: slightly larger output shape.
- Reuses: existing state normalization, handoff section contract, and TypeScript explicit interfaces.

### Approach C: Ideal architecture with validator module and future workflow integration

- Effort: M/L
- Risk: Medium
- Pros: clean separation and easier future reuse by `workflow_state` / `06-next`.
- Cons: unnecessary abstraction before first consumer; more files and review surface.
- Reuses: could later extract Unit 1 helpers if they grow.

Decision: choose Approach B for V1. Keep validator helpers local to `context-handoff.ts` unless implementation becomes unwieldy.

Temporal interrogation:

- Hour 1 foundations: define result interfaces and RED tests before implementation.
- Hour 2-3 core logic: clarify markdown section extraction and state-vs-markdown evidence precedence.
- Hour 4-5 integration: ensure TypeBox schema includes `validate` and wrapper returns `checks`.
- Hour 6+ polish/tests: verify corrupted JSON, legacy state, and warning-only cases remain deterministic.

## Handoff to 03-work

Recommended next command:

```bash
/skill:03-work docs/plans/2026-04-30-context-handoff-validation-probes-plan.md
```
