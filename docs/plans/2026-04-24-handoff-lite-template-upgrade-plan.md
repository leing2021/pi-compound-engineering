# Plan: Handoff-lite Template Upgrade

## Problem summary

Super Pi already persists handoff-lite state through `context_handoff`, `.context/compound-engineering/handoffs/latest.md`, Context Status, and new-session prompts. The remaining gap is content quality: current handoffs are mostly phase summaries and do not consistently preserve the highest-ROI continuation facts such as verified evidence, do-not-repeat guidance, current blocker, and next minimal step.

This plan upgrades the handoff-lite contract to an evidence-first, debug-friendly template while preserving the existing runtime storage model and repo-relative path behavior.

## Relevant learnings

- `docs/solutions/architecture/2026-04-24-runtime-context-path-portability.md`
  - Persist and return repo-relative artifact paths while using absolute paths only for filesystem operations.
  - Any examples, docs, and tests for handoff-lite should continue to use `.context/...` repo-relative paths.
- `/Users/jasonle/.pi/agent/docs/solutions/tooling/pi-context-optimization-lazy-registration.md`
  - Prefer safe context reductions such as concise descriptions and on-demand reference docs over timing-sensitive runtime tricks.
  - This supports a small template/test upgrade rather than dynamic memory registration or a new search engine.
- `/Users/jasonle/.pi/agent/docs/solutions/architecture/pi-context-optimization-tool-result-filter.md`
  - Reduce context before it enters future turns. A concise handoff-lite template follows the same principle: preserve compact, actionable evidence instead of long narrative history.

No additional highly relevant project solution was found for exact `handoff-lite template` behavior.

## Scope boundaries

### In scope

- Define an evidence-first handoff-lite template in shared pipeline docs.
- Make phase handoff docs require or reference the upgraded template.
- Add a reusable default/example template helper near `context_handoff` so tool-level examples and tests share one intended shape.
- Add tests proving saved handoff markdown can follow the upgraded section contract and still persists/loads correctly.
- Keep paths repo-relative in state/results.

### Out of scope

- Full memory search engine.
- Precise token ROI accounting.
- Dashboard/UI.
- Redesign of `.context/compound-engineering/` storage.
- Migration of all existing historical handoffs.
- Automatic artifact retrieval, embedding, or reranking.

## Implementation units

### Unit 1 — Protect evidence-first handoff-lite template in `context_handoff`

#### Purpose

Add a tool-adjacent default/example handoff-lite markdown structure and tests that protect the expected evidence-first sections without changing existing persistence semantics.

#### Files

- Modify: `extensions/ce-core/tools/context-handoff.ts`
- Modify: `tests/context-handoff.test.ts`
- Optional modify if schema description should mention the template: `extensions/ce-core/index.ts`

#### Patterns to follow

- Follow existing `context_handoff` test style in `tests/context-handoff.test.ts`.
- Preserve repo-relative path handling from `docs/solutions/architecture/2026-04-24-runtime-context-path-portability.md`.
- Keep `context_handoff` responsible for persistence/metadata, not artifact search.

#### Steps

- [ ] **RED — write/update failing test first**
  - Add a test in `tests/context-handoff.test.ts` such as `save can persist evidence-first handoff-lite template`.
  - The test should call `context_handoff.save` without a custom `handoffMarkdown` if a default helper is added, or import/use the new template helper if the implementation exposes one.
  - Assert the saved `latest.md` contains these exact section headings:
    - `## Current Task`
    - `## Hot Context`
    - `## Verified Facts`
    - `## Active Files`
    - `## Artifacts`
    - `## Current Blocker`
    - `## Verification`
    - `## Do Not Repeat`
    - `## Next Minimal Step`
  - Assert `result.latestPath` remains `.context/compound-engineering/handoffs/latest.md` or contains that repo-relative suffix, not an absolute `/Users/...` path.
- [ ] **Run RED command and confirm expected failure**
  - Run: `bun test tests/context-handoff.test.ts`
  - Expected RED result: test fails because no default/example evidence-first template helper exists yet, or saved markdown does not contain the new required headings.
- [ ] **GREEN — implement minimal code**
  - Add an exported helper such as `buildHandoffLiteTemplate(input)` or `EVIDENCE_FIRST_HANDOFF_SECTIONS` in `extensions/ce-core/tools/context-handoff.ts`.
  - If `handoffMarkdown` is omitted on `save`, generate a concise default markdown using available input fields:
    - `currentStage` / `nextStage` for Current Task.
    - `activeFiles` for Active Files.
    - `artifacts` for Artifacts.
    - `blocker ?? "N/A"` for Current Blocker.
    - `verification ?? "Not run"` for Verification.
    - `Do Not Repeat` defaulting to `N/A`.
    - `Next Minimal Step` defaulting to next stage or `N/A`.
  - Do not overwrite caller-provided `handoffMarkdown`; preserve backward compatibility.
- [ ] **Run GREEN command and confirm pass**
  - Run: `bun test tests/context-handoff.test.ts`
  - Expected GREEN result: all context handoff tests pass.
- [ ] **REFACTOR**
  - Keep helper small and deterministic.
  - Avoid adding token counting, search, or unrelated fields.
- [ ] **Unit-level verification**
  - Run: `bun test tests/context-handoff.test.ts tests/ce-core-extension.test.ts`

#### Verification commands

```bash
bun test tests/context-handoff.test.ts
bun test tests/context-handoff.test.ts tests/ce-core-extension.test.ts
```

#### Expected results

- The new test fails before implementation for the expected missing-template reason.
- After implementation, `latest.md` can be generated with the upgraded evidence-first section set.
- Existing save/load/latest/status behavior remains compatible.
- Returned/stored handoff paths remain repo-relative.

---

### Unit 2 — Update shared and phase handoff docs to require the upgraded template

#### Purpose

Make the evidence-first handoff-lite structure the standard contract across Phase 1 skills, while keeping stage-specific handoff guidance concise.

#### Files

- Modify: `skills/references/pipeline-config.md`
- Modify: `skills/01-brainstorm/references/handoff.md`
- Modify: `skills/02-plan/references/handoff.md`
- Modify: `skills/03-work/references/handoff.md`
- Modify: `skills/04-review/references/handoff.md`
- Modify: `skills/05-learn/SKILL.md`
- Optional modify: `docs/reports/2026-04-24-token-context-workflow-proof.md` if example handoff should show the new sections.

#### Patterns to follow

- Keep skill instructions concise; avoid duplicating the full template in every phase file if a shared reference is enough.
- Continue the existing Context Status format:
  - Health
  - Handoff
  - Active
  - New session
- Preserve the rule that new sessions are recommended only for cross-phase + heavy/critical context.

#### Steps

- [ ] **RED — write a failing documentation contract check**
  - Add or update a test in `tests/context-handoff.test.ts` or `tests/ce-core-extension.test.ts` that reads `skills/references/pipeline-config.md` and asserts it contains all upgraded handoff-lite section names.
  - Add assertions that phase handoff docs mention `handoff-lite` and either reference the shared template or include evidence-first wording.
- [ ] **Run RED command and confirm expected failure**
  - Run: `bun test tests/context-handoff.test.ts tests/ce-core-extension.test.ts`
  - Expected RED result: docs contract assertions fail until the shared/phase docs are updated.
- [ ] **GREEN — update docs minimally**
  - In `skills/references/pipeline-config.md`, add a section such as `### Handoff-lite template` containing the canonical markdown structure:
    - `## Current Task`
    - `## Hot Context`
    - `## Verified Facts`
    - `## Active Files`
    - `## Artifacts`
    - `## Current Blocker`
    - `## Verification`
    - `## Do Not Repeat`
    - `## Next Minimal Step`
  - Add guidance:
    - Target <= 1500 tokens.
    - Use `N/A` rather than inventing facts.
    - List only 1-5 active files.
    - Put broad history in artifact paths, not expanded prose.
    - If `context_handoff` is unavailable, manually write the same shape to `.context/compound-engineering/handoffs/latest.md`.
  - Update phase handoff docs to say they must save/mention a handoff-lite using the shared template.
  - For `05-learn`, add the same closure guidance if not already explicit.
- [ ] **Run GREEN command and confirm pass**
  - Run: `bun test tests/context-handoff.test.ts tests/ce-core-extension.test.ts`
- [ ] **REFACTOR**
  - Remove redundant wording if phase docs duplicate the shared template too much.
  - Keep docs compact to avoid increasing skill-load context unnecessarily.
- [ ] **Unit-level verification**
  - Run targeted grep checks:
    - `rg "Handoff-lite template|Verified Facts|Do Not Repeat|Next Minimal Step" skills/references/pipeline-config.md skills`
    - `rg "Context Status|handoff-lite|建议新开 Session" skills`

#### Verification commands

```bash
bun test tests/context-handoff.test.ts tests/ce-core-extension.test.ts
rg "Handoff-lite template|Verified Facts|Do Not Repeat|Next Minimal Step" skills/references/pipeline-config.md skills
rg "Context Status|handoff-lite|建议新开 Session" skills
```

#### Expected results

- Shared pipeline docs define the canonical evidence-first handoff-lite template.
- Phase handoff docs require using the shared template without bloating every file.
- Context Status and new-session recommendation rules remain intact.

---

### Unit 3 — Refresh proof/example artifact and run full verification

#### Purpose

Update the proof/example documentation so future readers see the upgraded template in action, then run broad verification to ensure no regressions.

#### Files

- Modify: `docs/reports/2026-04-24-token-context-workflow-proof.md`
- Optional modify: `.context/compound-engineering/handoffs/latest.md` only if a live regenerated handoff is desired after implementation.
- Test: existing test suite.

#### Patterns to follow

- Keep proof report short and example-focused.
- Use repo-relative paths in examples.
- Do not turn the proof report into a long ROI analysis.

#### Steps

- [ ] **RED — add/extend a test or grep expectation for example docs**
  - Add a docs contract assertion or decide to use a manual grep check recorded in this plan.
  - Minimum expected failing check before docs update:
    - `rg "Verified Facts|Do Not Repeat|Next Minimal Step" docs/reports/2026-04-24-token-context-workflow-proof.md`
- [ ] **Run RED command and confirm expected failure**
  - Run: `rg "Verified Facts|Do Not Repeat|Next Minimal Step" docs/reports/2026-04-24-token-context-workflow-proof.md`
  - Expected RED result: one or more new section names are missing from the proof example before update.
- [ ] **GREEN — update example proof**
  - Replace or extend the `Example handoff-lite` block with the upgraded section structure.
  - Keep the example concise and repo-relative.
- [ ] **Run GREEN command and confirm pass**
  - Run: `rg "Verified Facts|Do Not Repeat|Next Minimal Step" docs/reports/2026-04-24-token-context-workflow-proof.md`
- [ ] **REFACTOR**
  - Remove outdated example wording if it conflicts with the upgraded template.
- [ ] **Broad verification**
  - Run full tests.
  - Run targeted grep checks.

#### Verification commands

```bash
rg "Verified Facts|Do Not Repeat|Next Minimal Step" docs/reports/2026-04-24-token-context-workflow-proof.md
bun test tests/context-handoff.test.ts tests/ce-core-extension.test.ts
bun test
rg "Handoff-lite template|Verified Facts|Do Not Repeat|Next Minimal Step" skills/references/pipeline-config.md skills docs/reports/2026-04-24-token-context-workflow-proof.md
```

#### Expected results

- Proof/example artifact reflects the upgraded handoff-lite shape.
- Targeted tests pass.
- Full test suite passes.
- Grep checks show the core evidence-first headings are present in shared docs and example docs.

## Verification strategy

1. Unit-level verification per implementation unit.
2. Targeted test suite:

```bash
bun test tests/context-handoff.test.ts tests/ce-core-extension.test.ts
```

3. Full regression suite:

```bash
bun test
```

4. Documentation contract checks:

```bash
rg "Handoff-lite template|Verified Facts|Do Not Repeat|Next Minimal Step" skills/references/pipeline-config.md skills docs/reports/2026-04-24-token-context-workflow-proof.md
rg "Context Status|handoff-lite|建议新开 Session" skills
```

## TDD gate review

- Unit 1 has an explicit RED test before changing `context_handoff` behavior.
- Unit 2 has an explicit RED docs contract test before updating docs.
- Unit 3 has an explicit RED grep/docs expectation before refreshing the proof example.
- Every unit includes GREEN and verification commands.
- No production implementation step appears before a failing test/check step.
