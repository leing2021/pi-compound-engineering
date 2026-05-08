# Requirements: Handoff-lite Template Upgrade

## Problem

Super Pi already has handoff-lite infrastructure (`context_handoff`, `.context/compound-engineering/handoffs/latest.md`, Context Status, and new-session prompts), but the current handoff content is primarily phase-oriented. It does not yet consistently encode the highest-ROI continuation facts: verified evidence, do-not-repeat guidance, current blocker/failure, and next minimal step.

Without a stronger template, long workflows may still waste tokens by re-reading broad context, re-proving already verified facts, or carrying too much historical narrative into a new session.

## Goals

- Upgrade handoff-lite from a generic phase handoff into an evidence-first continuation artifact.
- Standardize a concise markdown shape that includes:
  - Current Task
  - Hot Context
  - Verified Facts
  - Active Files
  - Artifacts
  - Current Blocker
  - Verification
  - Do Not Repeat
  - Next Minimal Step
- Keep handoff-lite short and suitable for low-token new-session continuation, targeting <= 1500 tokens.
- Update Phase 1 skill documentation so agents know what to save and mention at handoff boundaries.
- Add context_handoff example/test protection so the intended structure does not regress.
- Preserve compatibility with existing runtime context state fields and paths.

## Non-goals

- Do not build a full memory search engine.
- Do not add precise token ROI accounting.
- Do not add a dashboard or UI.
- Do not redesign `.context/compound-engineering/` storage.
- Do not require all historical artifacts to be migrated.
- Do not force every handoff section to be verbose; empty/irrelevant sections should be concise.

## Approach options

### Option A — Documentation-only template update

Update skill and pipeline docs with the improved handoff-lite template.

Pros:
- Fastest and lowest risk.
- No runtime code changes.

Cons:
- Relies on agent compliance.
- Tests do not protect the new format.

### Option B — Template docs plus context_handoff example/test protection

Update shared skill docs and add a default/example handoff-lite markdown shape near `context_handoff`, with tests asserting the evidence-first sections are preserved in saved handoffs.

Pros:
- Still small and low risk.
- Aligns docs, tool behavior, and tests.
- Makes the intended shape harder to accidentally regress.

Cons:
- Slightly more implementation work than docs-only.

### Option C — Full memory governance system

Add budgets, artifact tiering automation, search/rerank logic, and token ROI metrics.

Pros:
- More comprehensive long-term system.

Cons:
- Too broad for this change.
- Risks overengineering before the template contract is stable.

## Recommended direction

Use **Option B**.

This is the smallest complete upgrade: improve the template contract in docs and ensure `context_handoff` examples/tests reflect the new evidence-first shape. It directly captures the high-ROI lessons from the session memory ROI report while avoiding a large memory engine or detailed token accounting.

## Boundaries and responsibilities

- `skills/references/pipeline-config.md` owns the shared handoff-lite template and new-session continuation rules.
- Phase handoff docs (`skills/01-brainstorm` through `skills/04-review`, plus `05-learn`) reference the shared template and clarify stage-specific expectations.
- `extensions/ce-core/tools/context-handoff.ts` continues to own persistence and metadata, not artifact search.
- Tests protect that saved handoff markdown can use the upgraded structure and that repo-relative paths remain intact.

## Failure handling

- If `context_handoff` is unavailable, the agent should manually write the same markdown shape under `.context/compound-engineering/handoffs/latest.md` and mention the path.
- If a section is not applicable, use `N/A` rather than inventing facts.
- If verification is missing, say `Not run` and explain why.
- If active files exceed the hot context window, list only the top 1-5 and reference broader artifacts by path.

## Success criteria

- Shared pipeline docs define the evidence-first handoff-lite template.
- Phase handoff docs point to or require the upgraded structure.
- `context_handoff` tests include the upgraded section set.
- Existing context handoff behavior remains backward compatible.
- Verification passes for affected tests.
- Future new-session prompts can continue by reading handoff-lite first, then referenced artifacts on demand.
