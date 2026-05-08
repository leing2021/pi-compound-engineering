# Plan: Context Handoff as Structured Runtime Memory

> Date: 2026-04-30
> Brainstorm: `docs/brainstorms/2026-04-30-context-handoff-structured-runtime-memory-requirements.md`

## Problem summary

Super Pi already has `context_handoff`, handoff-lite markdown, `.context/compound-engineering/context-state.json`, and `workflow_state`, but the runtime state does not yet preserve enough structured continuation facts for reliable low-token continuation. The approved requirements call for upgrading handoff-lite into a machine-readable runtime-memory anchor by adding current truth, invalidated assumptions, open decisions, recently accessed files, and compression risk to `context_handoff`, persisting those fields in `context-state.json`, and exposing them through `workflow_state.context`.

The first version must remain lightweight and Super Pi-controlled: no Pi core compaction changes, no generic prompt compressor, and no automatic LLM judge/probe scoring.

## Relevant learnings

- `docs/solutions/workflow/2026-04-24-evidence-first-handoff-lite-template.md` — high relevance, severity high.
  - Preserve continuation facts in a shared evidence-first template.
  - Keep broad history in artifact paths, not expanded narrative.
  - Protect the contract in both docs and tests.
- `docs/solutions/architecture/2026-04-24-runtime-context-path-portability.md` — high relevance for state persistence.
  - Filesystem operations may use absolute paths, but persisted state and public tool results should stay repo-relative.
  - `context_handoff` load should accept relative or absolute paths for compatibility.
- `/Users/jasonle/.pi/agent/docs/solutions/tooling/pi-context-optimization-lazy-registration.md` — medium relevance for scope control.
  - Prefer safe, deterministic context optimizations over timing-sensitive runtime tricks.
  - Avoid dynamic/lazy registration changes in this work.

No more specific solution was found for `workflow_state.context` structured runtime memory. Existing implementation examples are `extensions/ce-core/tools/context-handoff.ts`, `extensions/ce-core/tools/workflow-state.ts`, and their tests.

## Scope boundaries

### In scope

- Add optional structured fields to `context_handoff` input/state/result:
  - `currentTruth?: string[]`
  - `invalidatedAssumptions?: string[]`
  - `openDecisions?: string[]`
  - `recentlyAccessedFiles?: string[]`
  - `compressionRisk?: string[]`
- Persist and return these fields from `save`, `load`, `latest`, and `status`.
- Extend default generated handoff markdown with matching sections.
- Extend ce-core tool parameter schema and wrapper passthrough.
- Extend `workflow_state` result with safe `context` state from `.context/compound-engineering/context-state.json`.
- Update tests for RED/GREEN coverage and backward compatibility.
- Update shared and phase handoff docs to reflect the expanded template.

### Out of scope

- Pi core compaction changes.
- Skill block compaction handling.
- Generic prompt compression libraries.
- Automatic LLM judge/probe scoring.
- Full memory search, embeddings, or reranking.
- Major `06-next` behavior changes beyond making `workflow_state.context` available.
- Exhaustive historical logging in runtime state.

## Implementation units

### Unit 1 — Extend `context_handoff` structured state and default template

#### Goal

Make `context_handoff` accept, persist, return, and render the five new structured runtime-memory fields while preserving all existing save/load/latest/status behavior.

#### Files

- Modify: `extensions/ce-core/tools/context-handoff.ts`
- Modify: `tests/context-handoff.test.ts`

#### Patterns to follow

- Follow the existing `ContextHandoffInput`, `ContextStateEntry`, and `ContextHandoffResult` interfaces.
- Preserve repo-relative path behavior from `docs/solutions/architecture/2026-04-24-runtime-context-path-portability.md`.
- Preserve caller-provided `handoffMarkdown` exactly; structured fields should still be persisted in state.
- Use `- N/A` rendering for empty arrays, matching current handoff-lite style.

#### Test scenarios

- Happy path: `save` with all five new fields persists them in `context-state.json` and returns them.
- Read path: `load`, `latest`, and `status` return all five new fields.
- Default template: `save` without `handoffMarkdown` renders new markdown sections:
  - `## Current Truth`
  - `## Invalidated Assumptions`
  - `## Open Decisions`
  - `## Recently Accessed Files`
  - `## Compression Risk`
- Backward compatibility: callers omitting new fields still save/load successfully.
- Defaults:
  - `recentlyAccessedFiles` defaults to `activeFiles.slice(0, 5)`.
  - `invalidatedAssumptions`, `openDecisions`, and normal `compressionRisk` default to empty arrays.
  - heavy/critical contexts may get a concise compression caution if omitted.
- Custom markdown: when `handoffMarkdown` is supplied, saved markdown is not rewritten, but structured fields are still present in state/result.

#### Verification

```bash
bun test tests/context-handoff.test.ts
```

#### Dependencies

None.

#### TDD steps

1. **RED**
   - Add failing tests in `tests/context-handoff.test.ts` for new field round-trip, default-template sections, defaults, and custom-markdown state persistence.
   - Run `bun test tests/context-handoff.test.ts`.
   - Expected failure: new fields or sections are missing.
2. **GREEN**
   - Update `context-handoff.ts` minimally:
     - extend interfaces,
     - add array normalization helper,
     - compute defaults,
     - update `buildDefaultHandoffMarkdown`,
     - persist fields in `ContextStateEntry`,
     - return fields from `save/load/latest/status`.
   - Run `bun test tests/context-handoff.test.ts` until it passes.
3. **REFACTOR**
   - Keep helpers deterministic and local.
   - Avoid overengineering a generic memory model.
   - Re-run `bun test tests/context-handoff.test.ts`.

---

### Unit 2 — Expose structured fields through ce-core tool schema and wrapper

#### Goal

Make the registered `context_handoff` tool schema and wrapper accept the new fields when called through Pi, not only through direct unit tests.

#### Files

- Modify: `extensions/ce-core/index.ts`
- Modify: `tests/ce-core-extension.test.ts`

#### Patterns to follow

- Follow existing `contextHandoffParams` typebox schema style.
- Keep all new fields optional arrays of strings.
- Keep eager tool registration; do not introduce dynamic/lazy registration.

#### Test scenarios

- Tool schema exposes optional arrays for:
  - `currentTruth`
  - `invalidatedAssumptions`
  - `openDecisions`
  - `recentlyAccessedFiles`
  - `compressionRisk`
- Registered wrapper passes these fields through to `createContextHandoffTool().execute`.
- Existing registered tool names and exports remain unchanged.
- Conversation-state tools still do not terminate the agent turn.

#### Verification

```bash
bun test tests/ce-core-extension.test.ts
```

#### Dependencies

Depends on Unit 1 types/behavior.

#### TDD steps

1. **RED**
   - Add or extend `tests/ce-core-extension.test.ts` to call the registered `context_handoff` tool with the five new fields and assert they appear in `details`.
   - If practical, assert `contextHandoffParams` exposes the new property names via registered definition metadata.
   - Run `bun test tests/ce-core-extension.test.ts`.
   - Expected failure: wrapper/schema does not accept or forward new fields.
2. **GREEN**
   - Add the five optional array fields to `contextHandoffParams`.
   - Pass the five fields through in the registered tool wrapper.
   - Run `bun test tests/ce-core-extension.test.ts` until it passes.
3. **REFACTOR**
   - Keep field descriptions concise to avoid unnecessary fixed prompt overhead.
   - Re-run `bun test tests/ce-core-extension.test.ts`.

---

### Unit 3 — Add `workflow_state.context` runtime-state discovery

#### Goal

Extend `workflow_state` so it returns a safe `context` object populated from `.context/compound-engineering/context-state.json` when available, while preserving existing artifact category outputs.

#### Files

- Modify: `extensions/ce-core/tools/workflow-state.ts`
- Modify: `tests/ce-core-extension.test.ts`

#### Patterns to follow

- Follow current `workflow_state` safe-missing-directory behavior.
- Treat missing or malformed context state as normal and return safe defaults.
- Public paths in context state should remain repo-relative.
- Add fields rather than replacing current `brainstorms`, `plans`, `solutions`, and `runs` output.

#### Test scenarios

- Missing state: `workflow_state` returns `context.found === false` and safe empty arrays.
- Malformed state: same safe empty context, no throw.
- Existing state: returns:
  - `found`
  - `currentStage`
  - `nextStage`
  - `contextHealth`
  - `latestHandoffPath`
  - `latestDatedHandoffPath`
  - `activeFiles`
  - `recentlyAccessedFiles`
  - `blocker`
  - `verification`
  - `currentTruth`
  - `invalidatedAssumptions`
  - `openDecisions`
  - `compressionRisk`
  - `recommendNewSession`
  - `updatedAt`
- Existing artifact category tests still pass unchanged.

#### Verification

```bash
bun test tests/ce-core-extension.test.ts
```

#### Dependencies

Depends on the final `ContextStateEntry` shape from Unit 1, but can be implemented with a local compatible interface to avoid circular imports if desired.

#### TDD steps

1. **RED**
   - Extend the existing `describe("workflow_state")` tests in `tests/ce-core-extension.test.ts`:
     - assert empty context on no state,
     - write a valid `.context/compound-engineering/context-state.json` and assert context fields,
     - write malformed JSON and assert safe fallback.
   - Run `bun test tests/ce-core-extension.test.ts`.
   - Expected failure: `context` field is missing.
2. **GREEN**
   - Add context-state path/read helpers in `workflow-state.ts`.
   - Add `WorkflowContextState` and `WorkflowStateResult.context` types.
   - Normalize optional arrays with `[]` defaults.
   - Catch read/parse errors and return empty context.
   - Run `bun test tests/ce-core-extension.test.ts` until it passes.
3. **REFACTOR**
   - Keep context reading read-only and independent of handoff writing.
   - Avoid importing private helpers from `context-handoff.ts` unless a shared utility is clearly warranted.
   - Re-run `bun test tests/ce-core-extension.test.ts`.

---

### Unit 4 — Update shared and phase handoff documentation

#### Goal

Align the documented handoff-lite contract with the new structured runtime-memory fields so future stages and agents use the same template that tools generate.

#### Files

- Modify: `skills/references/pipeline-config.md`
- Modify: `skills/01-brainstorm/references/handoff.md`
- Modify: `skills/02-plan/references/handoff.md`
- Modify: `skills/03-work/references/handoff.md`
- Modify: `skills/04-review/references/handoff.md`
- Modify: `skills/05-learn/SKILL.md`
- Modify: `tests/context-handoff.test.ts` or `tests/skill-contracts.test.ts`

#### Patterns to follow

- Prefer one canonical template in `skills/references/pipeline-config.md`.
- Phase docs should reference the shared template instead of duplicating long blocks.
- Keep template concise; target <= 1500 tokens.
- Preserve Context Status and new-session recommendation rules.

#### Test scenarios

- Shared pipeline docs contain the new sections:
  - `## Current Truth`
  - `## Invalidated Assumptions`
  - `## Open Decisions`
  - `## Recently Accessed Files`
  - `## Compression Risk`
- Phase handoff docs still reference `handoff-lite` and `Handoff-lite template`.
- Existing skill contract tests continue to pass.

#### Verification

```bash
bun test tests/context-handoff.test.ts tests/skill-contracts.test.ts
rg "Current Truth|Invalidated Assumptions|Open Decisions|Recently Accessed Files|Compression Risk" skills/references/pipeline-config.md
```

#### Dependencies

Can run after Unit 1 or in parallel if section names are fixed.

#### TDD steps

1. **RED**
   - Add failing docs-contract assertions for the five new section headings.
   - Run `bun test tests/context-handoff.test.ts tests/skill-contracts.test.ts`.
   - Expected failure: docs do not yet include new section names.
2. **GREEN**
   - Update `skills/references/pipeline-config.md` template with the new sections.
   - Update phase handoff docs and `05-learn` only as needed to reference the shared template and structured runtime-memory fields.
   - Run targeted tests until they pass.
3. **REFACTOR**
   - Remove redundant duplicated explanations.
   - Keep skill-load context small.
   - Re-run targeted tests and grep verification.

---

### Unit 5 — Integrated verification and handoff

#### Goal

Run targeted and full verification, then save an updated handoff-lite for `03-work`.

#### Files

- Read/verify: all modified files from Units 1-4.
- Save runtime artifact: `.context/compound-engineering/handoffs/latest.md` via `context_handoff`.

#### Patterns to follow

- Use exact verification commands.
- Keep final handoff concise and evidence-first.
- Do not start implementation in this planning stage.

#### Test scenarios

- Targeted tests pass:
  - context handoff tests,
  - ce-core extension tests,
  - skill contract tests.
- Full suite passes.
- `workflow_state` can report context after a saved handoff.

#### Verification

```bash
bun test tests/context-handoff.test.ts
bun test tests/ce-core-extension.test.ts
bun test tests/skill-contracts.test.ts
bun test
```

#### Dependencies

Depends on Units 1-4.

#### TDD steps

1. **RED**
   - Not applicable as a coding RED unit; this unit verifies completed RED/GREEN units.
   - If any integration test fails, treat it as RED and return to the responsible unit.
2. **GREEN**
   - Fix only the responsible unit's code/docs/tests.
   - Re-run the failing targeted command.
3. **REFACTOR**
   - Run full `bun test`.
   - Save handoff-lite for `/skill:03-work`.

## Verification strategy

### Targeted verification

```bash
bun test tests/context-handoff.test.ts
bun test tests/ce-core-extension.test.ts
bun test tests/skill-contracts.test.ts
```

### Broad verification

```bash
bun test
```

### Manual/doc verification

```bash
rg "Current Truth|Invalidated Assumptions|Open Decisions|Recently Accessed Files|Compression Risk" skills/references/pipeline-config.md tests extensions/ce-core
rg "workflow_state|context_handoff" tests/ce-core-extension.test.ts tests/context-handoff.test.ts
```

## Dependencies and execution order

1. Unit 1 first: establishes `context_handoff` data model and behavior.
2. Unit 2 next: exposes new fields through the registered Pi tool.
3. Unit 3 next: reads the persisted context state through `workflow_state`.
4. Unit 4 can run after Unit 1 or in parallel after section names are fixed.
5. Unit 5 last: full verification and handoff.

## Risks and mitigations

- **Risk: schema drift between markdown and state.**
  - Mitigation: tests assert both markdown sections and state/result fields.
- **Risk: breaking old callers.**
  - Mitigation: all new fields optional; backward-compatibility test required.
- **Risk: absolute paths leak into state.**
  - Mitigation: preserve existing repo-relative path tests and behavior.
- **Risk: template grows too verbose.**
  - Mitigation: empty arrays render as `N/A`; phase docs reference shared template instead of duplicating it.
- **Risk: `workflow_state` throws on malformed runtime JSON.**
  - Mitigation: malformed state test and safe fallback.

## Out-of-plan follow-ups

- Update `/skill:06-next` to use `workflow_state.context.openDecisions`, `compressionRisk`, and `recommendNewSession` for smarter recommendations.
- Add probe-based handoff quality checks in a later iteration.
- Revisit Pi core compaction/skill block handling separately if Super Pi-controlled runtime memory is insufficient.
