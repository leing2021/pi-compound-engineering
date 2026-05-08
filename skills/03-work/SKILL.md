---
name: 03-work
description: "Execute plan units with parallel subagents, TDD enforcement, and checkpoint resume. Use when a plan path is ready for implementation."
---

# Work

Use this skill when there is a plan path or tightly scoped bare prompt ready for execution.

See [shared pipeline instructions](../references/pipeline-config.md) for model routing and pipeline behavior.

## Core rules

1. Load project rules (4 steps):
   - Load `rules/common/development-workflow.md` and `rules/common/testing.md`
   - Detect project language via [language detection](../references/language-detection.md)
   - Load matching language-specific rules
   - If frontend/browser concerns, also load `rules/web/` files
2. **Priority:** project-level `{repo-root}/rules/` overrides package defaults
3. **Distinguish input:** plan path vs bare prompt
4. Derive tasks from plan **implementation units**
5. **Execution mode:**
   - **Inline mode** for small/scoped units
   - **`ce_parallel_subagent`** for independent CE skill units
   - **`ce_subagent`** only for dependent serial chains
6. Use **`session_checkpoint`** to track progress and enable resume
7. Use **`task_splitter`** to analyze dependencies before execution
8. If in **worktree** (via `07-worktree`), execute inside it
9. End by recommending `04-review`

## Hard gates — TDD enforcement

Every step follows **RED → GREEN → REFACTOR**:

**Blocking violations** — stop and ask if:
- Code written before RED test
- RED fails for wrong reason
- Missing evidence test failed before implementation
- Missing evidence test passed after implementation
- Tests added only after code

## Stop-the-line rule (Hard gate)

When any unexpected failure occurs during execution:

1. **STOP** adding features or making changes
2. **PRESERVE** evidence (error output, repro steps)
3. **DIAGNOSE** root cause — reproduce, localize, reduce
4. **FIX** the root cause, not the symptom
5. **GUARD** with a regression test
6. **RESUME** only after verification passes

Anti-rationalization — when a gate fails or evidence is missing:
- Do not rationalize, downgrade, or explain away the failure.
- Stop, report the blocker with evidence, and either fix the root cause or ask for direction.
- Do not continue unrelated implementation after failed verification.

This is a hard gate — do not push past a failing test or broken build to continue implementation. Errors compound.

## Workflow

1. **Load context**: consume latest handoff before any broad file reads — `context_handoff load` or read `.context/compound-engineering/handoffs/latest.md`. If found, use `activeFiles`, `blocker`, `verification`, `activeRules` as starting point. If not found, proceed normally.
2. Detect input type (plan path vs bare prompt)
3. Read implementation units if plan path
4. Load `session_checkpoint` to skip completed units
5. Use `task_splitter` for dependency analysis
6. Execute: **inline mode** by default, `ce_parallel_subagent` for independent units
7. Follow TDD per unit: RED → minimal code → GREEN → refactor → unit-level **verification**
8. **Source-driven gate:** Before implementing framework/library-specific code, verify the API or pattern against official documentation. Flag unverified patterns as UNVERIFIED in output.
9. Record progress via `references/progress-update-format.md`
9. Save `session_checkpoint` after each unit
10. On failure: `session_checkpoint` `fail` → `retry` → follow strategy
11. Provide completion report (see `references/completion-report.md`)
12. **Save handoff**: `context_handoff save` with current stage, next stage, activeFiles, blocker, verification, activeRules
13. Handoff to `04-review` using `references/handoff.md`

Before finishing this skill, apply the completion checklist in [shared pipeline instructions](../references/pipeline-config.md).
