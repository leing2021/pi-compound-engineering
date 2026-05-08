---
name: 04-review
description: "Review code changes across five axes with evidence-first findings. Use after implementation is complete and before committing."
---

# Review

Use this skill after implementation to review changes against the diff, plan, and prior learnings.

See [shared pipeline instructions](../references/pipeline-config.md) for model routing and pipeline behavior.

## Core rules

1. Load project rules (4 steps):
   - Load `rules/common/code-review.md`
   - Detect language from changed files via [language detection](../references/language-detection.md)
   - Load matching language-specific rules (e.g., `rules/typescript/`)
   - If frontend/browser changes, also load `rules/web/` files
2. **Priority:** project-level `{repo-root}/rules/` overrides package defaults
3. Determine **diff scope** before selecting reviewers
4. Use **`review_router`** tool to select reviewer personas based on diff metadata
5. Read relevant **plan** artifact when exists
6. Run solution search (see `references/solution-search.md`):
   - Extract keywords → `grep -rl "tags:.*keyword" docs/solutions/ ~/.pi/agent/docs/solutions/`
   - Read **frontmatter** only (first 15 lines) of matches → score by severity + tag relevance
   - Fully read top 3 candidates
7. Produce structured findings using `references/findings-schema.md`
8. **Autofixable findings:** apply and re-review (max 3 iterations)

## Review discipline

Code review is **technical evaluation**, not social performance:
- **Verify before implementing** any suggestion
- **YAGNI check:** question features nothing uses
- **No performative agreement:** verify before concurring
- **Push back** with reasoning when findings are incorrect
- **Evidence before assertions:** cite specific code, not principles

## Handling findings

1. **Read** — complete all findings without reacting
2. **Verify** — check each against codebase reality
3. **Evaluate** — is it sound for THIS codebase?
4. **Act** — fix confirmed issues, push back on incorrect ones
5. **Test** — verify each fix individually, no regressions

## Workflow

1. **Load context**: consume latest handoff before any broad file reads — `context_handoff load` or read `.context/compound-engineering/handoffs/latest.md`. If found, use `activeFiles`, `artifacts.plan` as starting point. If not found, proceed normally.
2. Determine diff scope from branch or explicit target
3. Collect stats (files, insertions, deletions) → call `review_router`
4. Read matching plan artifact
5. Run solution search
6. Apply each reviewer persona from `review_router`
7. Merge into structured findings
8. Verify each finding against codebase
9. Apply autofixes, re-run tests, re-review if needed

## Optional: QA Test Mode

After code review complete, offer browser QA:

> Code review done. Run browser QA?
> - **A) Done** — stop here
> - **B) Browser QA** — find visual/functional bugs
> - **C) QA + regression tests** — find bugs, fix, add tests

If B or C: read `references/qa-test-mode.md` and execute workflow.
After QA: include findings in handoff, note fix commits/test files.

## Handoff

See `references/handoff.md` for format.

Before finishing this skill, apply the completion checklist in [shared pipeline instructions](../references/pipeline-config.md).
