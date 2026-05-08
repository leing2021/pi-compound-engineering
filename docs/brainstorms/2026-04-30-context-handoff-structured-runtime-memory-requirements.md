# Requirements: Context Handoff as Structured Runtime Memory

> Date: 2026-04-30
> Source: external context-compression best-practice review + Super Pi CE brainstorm
> Mode: CE Brainstorm

## Problem

Super Pi already has `context_handoff`, handoff-lite markdown, `.context/compound-engineering/context-state.json`, and `workflow_state`. However, the current handoff state is still mostly a phase handoff plus a few operational fields. It does not yet preserve enough structured continuation facts to reliably prevent context poisoning, context distraction, repeated exploration, or stale assumptions after compression or a new session.

External best practices point to the same direction:

- Anthropic: compaction should preserve architectural decisions, unresolved bugs, implementation details, and recently accessed files while discarding redundant tool outputs.
- Factory.ai: structured summaries preserve useful continuation information better than opaque or purely freeform compression; fields should explicitly preserve files, decisions, current state, and next steps.
- Weaviate: large contexts fail through context poisoning, distraction, confusion, and clash; summaries should record current truth and invalidated assumptions.
- Mem0/context-engineering patterns: useful context should be selected, compressed, temporally managed, and assembled intentionally.

The local issue is not primarily the context window size. The issue is that high-value runtime memory is not yet structured enough for new-session continuation and future `/skill:06-next` decisions.

## Goals

1. Upgrade `context_handoff` from markdown handoff generator to structured runtime-memory anchor.
2. Persist high-value continuation facts in `context-state.json` as machine-readable fields.
3. Add these fields to default handoff-lite markdown so humans and agents see the same facts.
4. Extend `workflow_state` so it can read and return current context state.
5. Keep the first version lightweight and backward compatible.
6. Improve new-session continuation and future `06-next` recommendation quality without changing Pi core compaction.

## Non-goals

- Do not change Pi core compaction in this first version.
- Do not integrate generic prompt-compression systems such as LLMLingua.
- Do not add automatic LLM judge or probe-based scoring yet.
- Do not build a full memory search engine.
- Do not record complete historical detail; preserve only high-ROI continuation facts.
- Do not force all fields to be verbose; empty fields should render as `N/A`.

## Confirmed Premises

1. Prioritize Super Pi-controlled `handoff / context-state / workflow_state`, not Pi core compaction or generic prompt compression.
2. New structured fields should serve new-session continuation and next-step recommendation, not exhaustive history capture.
3. First version stays lightweight: type/schema support, default template, state persistence, status returns, and unit tests; no automatic LLM judge/probe scoring.

## Approach options

### Option A — Template-only enhancement

Add new sections to the handoff-lite markdown template but do not change TypeScript schemas or `context-state.json`.

Pros:
- Lowest risk.
- Fastest implementation.
- No API surface changes.

Cons:
- Not machine-readable.
- `workflow_state` and `06-next` cannot use the new information directly.
- Agents must pass custom markdown to express these facts.

### Option B — Structured handoff + workflow_state context field

Extend `context_handoff` inputs/results/state with structured fields, update the markdown template, persist those fields in `context-state.json`, and have `workflow_state` return a `context` object from that state.

Pros:
- Good balance of power and scope.
- Backward compatible if fields are optional.
- Enables future `06-next` improvements.
- Aligns markdown, runtime state, and tests.

Cons:
- Requires tool schema updates and tests.
- Slightly larger implementation surface.

### Option C — Deep compaction/runtime integration

Modify Pi core compaction, detect skill blocks, implement automatic probes, and optimize summaries based on failure trajectories.

Pros:
- Addresses deeper compaction failure modes.
- Could improve all long sessions, not only Super Pi workflows.

Cons:
- Larger scope and higher maintenance risk.
- Depends on Pi core/upstream behavior.
- Not necessary for the first Super Pi-controlled improvement.

## Recommended direction

Choose **Option B — Structured handoff + workflow_state context field**.

This creates a structured, durable, low-token continuation anchor while keeping the implementation inside Super Pi. It directly improves the current workflow and leaves room for later compaction/probe work.

## Required behavior

### `context_handoff` structured fields

Add optional fields to `ContextHandoffInput`, `ContextStateEntry`, and `ContextHandoffResult`:

```ts
currentTruth?: string[]
invalidatedAssumptions?: string[]
openDecisions?: string[]
recentlyAccessedFiles?: string[]
compressionRisk?: string[]
```

Field purposes:

- `currentTruth`: confirmed current-state facts that should override stale context.
- `invalidatedAssumptions`: known-wrong or obsolete assumptions that should not guide future work.
- `openDecisions`: unresolved decisions that should be continued, not rediscovered.
- `recentlyAccessedFiles`: recently read/modified files, distinct from the smaller `activeFiles` hot set.
- `compressionRisk`: known risks or missing context caused by summarization/compaction.

### Defaults and compatibility

When callers omit new fields:

- `currentTruth` should default to at least current/next stage facts or an empty array if not appropriate.
- `invalidatedAssumptions` defaults to `[]`.
- `openDecisions` defaults to `[]`.
- `recentlyAccessedFiles` defaults to `activeFiles.slice(0, 5)`.
- `compressionRisk` defaults to `[]` for `good/watch`, and may include a concise caution for `heavy/critical` contexts.
- Empty arrays render as `- N/A` in markdown.
- Existing callers and tests that pass only existing fields must continue to work.

### Handoff-lite markdown template

Default generated markdown should include:

```md
## Current Task
## Hot Context
## Current Truth
## Verified Facts
## Invalidated Assumptions
## Open Decisions
## Active Files
## Recently Accessed Files
## Artifacts
## Current Blocker
## Verification
## Compression Risk
## Do Not Repeat
## Next Minimal Step
```

Guidance:

- Keep handoff-lite concise, target <= 1500 tokens.
- Prefer facts, files, blockers, decisions, and next action over process narrative.
- Use `N/A` instead of inventing missing information.

### `workflow_state.context`

Extend `workflow_state` result with a `context` field populated from `.context/compound-engineering/context-state.json` when present.

Suggested shape:

```ts
context: {
  found: boolean
  currentStage?: string
  nextStage?: string
  contextHealth?: "good" | "watch" | "heavy" | "critical"
  latestHandoffPath?: string
  latestDatedHandoffPath?: string
  activeFiles: string[]
  recentlyAccessedFiles: string[]
  blocker?: string
  verification?: string
  currentTruth: string[]
  invalidatedAssumptions: string[]
  openDecisions: string[]
  compressionRisk: string[]
  recommendNewSession: boolean
  updatedAt?: string
}
```

If no context state exists, return a safe empty context object:

```ts
context: {
  found: false,
  activeFiles: [],
  recentlyAccessedFiles: [],
  currentTruth: [],
  invalidatedAssumptions: [],
  openDecisions: [],
  compressionRisk: [],
  recommendNewSession: false
}
```

## Likely file / module changes

- `extensions/ce-core/tools/context-handoff.ts`
  - Extend input/state/result types.
  - Normalize new optional arrays.
  - Persist new fields in `context-state.json`.
  - Return new fields from `save`, `load`, `latest`, and `status`.
  - Add new default markdown sections.

- `extensions/ce-core/tools/workflow-state.ts`
  - Read `.context/compound-engineering/context-state.json`.
  - Add `context` field to result.
  - Return safe empty context when missing/malformed.

- `extensions/ce-core/index.ts`
  - Add new `context_handoff` parameter schema fields.
  - Update any workflow_state schema expectations if present.

- `tests/context-handoff.test.ts`
  - Assert default markdown includes new sections.
  - Assert new fields persist and return from `status/load/latest`.
  - Assert backward compatibility when fields are omitted.

- `tests/ce-core-extension.test.ts`
  - Update tool schema tests.
  - Add or update `workflow_state` context tests.

- `skills/references/pipeline-config.md`
  - Update shared handoff-lite template.

- Phase handoff docs:
  - `skills/01-brainstorm/references/handoff.md`
  - `skills/02-plan/references/handoff.md`
  - `skills/03-work/references/handoff.md`
  - `skills/04-review/references/handoff.md`
  - `skills/05-learn/SKILL.md`

## Responsibility boundaries

- `context_handoff` owns structured runtime handoff state and markdown persistence.
- `workflow_state` owns read-only workflow/context discovery.
- `docs/brainstorms` and `docs/plans` own durable product/implementation decisions.
- `.context/compound-engineering` owns runtime continuation state.
- `06-next` may consume `workflow_state.context` later, but this requirement only needs to expose the data.

## Failure handling

- If `context-state.json` is missing, `workflow_state.context.found` should be false with safe defaults.
- If `context-state.json` is malformed, treat it as missing rather than throwing.
- If new arrays contain more than useful hot-context size, markdown should still remain concise; callers should keep high-value bullets only.
- If custom `handoffMarkdown` is supplied, persist it as-is, but still save structured fields in state.

## Success criteria

Functional:

- `context_handoff save` accepts the five new structured fields.
- `context_handoff save` persists them to `context-state.json`.
- `context_handoff load/latest/status` return them.
- Default handoff markdown includes the new sections.
- Old callers that omit new fields still work.
- `workflow_state` returns a `context` object from runtime state.
- `workflow_state` returns safe empty context when no state exists.

Quality:

- Handoff remains short and continuation-oriented.
- New fields reduce stale-context risk by making current truth, invalidated assumptions, open decisions, recent files, and compression risks explicit.
- New-session continuation can read `latest.md` and `workflow_state.context` without full history.

Verification:

- Relevant tests pass, at minimum:
  - `bun test tests/context-handoff.test.ts`
  - workflow/tool schema tests that cover `workflow_state` and `context_handoff`

## Approval gate

This requirements artifact is ready for user approval. After approval, proceed to `/skill:02-plan` to turn it into implementation units.
