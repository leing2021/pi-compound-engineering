# Requirements: Context Handoff Validation Probes

## Problem

Super Pi now has structured runtime-memory anchors through `context_handoff`, `context-state.json`, and `workflow_state.context`. This solves where continuation-critical facts are stored, but it does not yet answer whether the stored handoff is sufficient for a new session or next-stage agent to continue safely.

A handoff can look short and structured while still missing the original goal, next action, key files, or important decisions. That creates a false token optimization: the prompt is smaller, but the next agent must reread files, repeat verification, or rediscover decisions.

## Goals

- Add a deterministic Route B-lite validation mechanism for continuation readiness.
- Implement validation as `context_handoff` operation `"validate"`.
- Validate the current runtime-memory anchor using `.context/compound-engineering/context-state.json` and `.context/compound-engineering/handoffs/latest.md` when available.
- Report whether the handoff is good enough to continue without relying on LLM judgment.
- Surface missing required evidence and non-blocking warnings.
- Keep behavior backward compatible for missing, legacy, or malformed runtime state.
- Make the result usable later by `workflow_state` and `/skill:06-next` recommendations.

## Non-goals

- Do not add an LLM judge.
- Do not add model-based scoring.
- Do not call network services.
- Do not introduce generic prompt compression libraries such as LLMLingua.
- Do not change Pi core compaction or skill-block handling in this version.
- Do not attempt to prove compression optimality. The goal is continuation readiness, not algorithm benchmarking.

## Approach options

### Option 1: Documentation-only checklist

Add a checklist to handoff docs describing Recall, Artifact, Continuation, and Decision probes.

Pros:
- Very low implementation cost.
- No runtime behavior changes.

Cons:
- Easy for agents to skip.
- Cannot be consumed by `workflow_state` or `/skill:06-next`.
- Does not create a testable product behavior.

### Option 2: Deterministic `context_handoff validate` operation

Add `operation: "validate"` to `context_handoff`. The operation reads normalized context state and latest handoff markdown, then returns structured validation results.

Recommended probe groups:

1. **Recall probe**
   - Checks whether the current task / user goal is recoverable.
   - Evidence can come from `currentTruth`, `currentStage`, `nextStage`, or `## Current Task` in latest handoff.

2. **Continuation probe**
   - Checks whether the next minimal action and current status are recoverable.
   - Evidence can come from `nextStage`, `blocker`, `verification`, `recommendNewSession`, or `## Next Minimal Step` / `## Verification` in latest handoff.

3. **Artifact probe**
   - Checks whether relevant files/artifacts are recoverable.
   - Evidence can come from `activeFiles`, `recentlyAccessedFiles`, `artifacts`, or matching handoff sections.

4. **Decision probe**
   - Checks whether key decisions and invalidated assumptions are recoverable.
   - Evidence can come from `currentTruth`, `openDecisions`, `invalidatedAssumptions`, or matching handoff sections.

Practical `ok` rule:

- `ok === true` only requires Recall and Continuation probes to pass.
- Artifact and Decision probe failures should be returned as warnings, not hard failures.

Pros:
- Deterministic and testable.
- Lightweight and local-only.
- Builds on existing Route A runtime state.
- Can later feed `workflow_state` and `/skill:06-next`.

Cons:
- Heuristic checks can only detect obvious omissions.
- Does not judge semantic quality of content.

### Option 3: `validate` plus numeric score

Add deterministic checks plus a score such as 0-100.

Pros:
- Easier to display in dashboards or future recommendations.

Cons:
- Score may imply false precision.
- Requires more design debate about weights.
- Not needed for first version.

## Recommended direction

Choose **Option 2: deterministic `context_handoff validate`**.

First version should return booleans and lists rather than a numeric quality score. The goal is to answer:

> Is the current handoff minimally safe to continue from?

It should not answer:

> Is this the best possible compression?

## Expected API shape

Input:

```ts
{
  operation: "validate",
  repoRoot: string,
  handoffPath?: string
}
```

Output details should include:

```ts
{
  operation: "validate",
  found: boolean,
  ok: boolean,
  probes: {
    recall: boolean,
    continuation: boolean,
    artifact: boolean,
    decision: boolean
  },
  missing: string[],
  warnings: string[],
  recommendedAction: "continue" | "save_handoff" | "fill_required_context",
  path?: string,
  currentStage?: string,
  nextStage?: string,
  contextHealth?: "good" | "watch" | "heavy" | "critical",
  updatedAt?: string
}
```

Exact naming can be refined during planning, but the behavior should remain explicit and deterministic.

## Success criteria

- `context_handoff` supports `operation: "validate"` in tool implementation and ce-core wrapper schema.
- Missing state or missing handoff does not crash; result is `ok: false` with useful `missing` entries.
- Legacy `context-state.json` without new fields loads with safe defaults.
- Malformed JSON returns safe validation failure, not an exception.
- A handoff with Recall and Continuation evidence returns `ok: true` even if Artifact/Decision warnings exist.
- Artifact and Decision omissions appear in `warnings`, not hard `missing`, under the practical rule.
- Tests cover pass, fail, legacy, malformed, and warning cases.
- No LLM calls, network calls, or Pi core compaction changes are introduced.

## Likely file changes

- `extensions/ce-core/tools/context-handoff.ts`
  - extend operation union,
  - add validation result types,
  - implement deterministic probe checks,
  - reuse state normalization helpers.
- `extensions/ce-core/index.ts`
  - expose `operation: "validate"` in `context_handoff` tool schema,
  - pass through optional `handoffPath`.
- `tests/context-handoff.test.ts`
  - add direct tool tests for validation behavior.
- `tests/ce-core-extension.test.ts`
  - add wrapper/schema regression test if needed.
- Optional docs:
  - `skills/references/pipeline-config.md` may mention using validation before recommending new session or next phase, but avoid duplicating long checklist content.

## Premises confirmed

1. First version is strictly deterministic `context_handoff validate`.
2. No LLM judge, model scoring, network calls, or generic prompt compressor.
3. Practical `ok` rule: Recall + Continuation are required; Artifact + Decision omissions are warnings.
4. The goal is continuation readiness, not compression algorithm optimality.
