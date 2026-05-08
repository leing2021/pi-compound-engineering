# Requirements

## Problem

Phase 1 skills are independent entry points. After running one skill, the user must manually decide what to run next. There is no automatic navigation that inspects the current repo state and recommends the next skill.

This creates friction:
- Users must remember the CE flow order
- `ce-status` can report state but cannot be programmatically called by other skills
- No structured machine-readable workflow state for extensions to consume

## Goals

- A `ce-next` skill that inspects repo artifacts and recommends the single best next skill
- A `workflow_state` extension tool that scans artifact directories and returns structured state
- `ce-next` uses `workflow_state` tool output for its recommendation
- Other skills (e.g., `ce-work`, `ce-review`) can reference `workflow_state` for context
- `ce-status` updated to leverage the same tool

## Non-goals

- No automatic execution of the next skill (recommendation only)
- No unified orchestrator (`ce-iterate` is deferred)
- No session history or cross-session state
- No git worktree integration (that's Phase 2b)

## Approach options

### A: Pure skill — `ce-next`

Add only a `ce-next` SKILL.md. It instructs the agent to scan directories and recommend next steps.

Pros: simplest, no new extension code.
Cons: can't be called programmatically, no structured output for other tools.

### B: Skill + tool — `ce-next` + `workflow_state` (recommended)

Add `ce-next` skill AND a `workflow_state` extension tool. The tool scans `docs/brainstorms/`, `docs/plans/`, `docs/solutions/`, and `.context/compound-engineering/` and returns structured JSON with what exists and what's missing. `ce-next` uses the tool output.

Pros: reusable tool, structured data, other skills can call it.
Cons: more code to maintain.

### C: Orchestrator — `ce-iterate`

A single skill that runs the full loop automatically.

Pros: one command to rule them all.
Cons: most complex, contradicts Phase 1 "explicit commands first" decision, deferred.

## Recommended direction

**Approach B**: `ce-next` skill + `workflow_state` tool. This gives us a structured, reusable workflow state scanner that `ce-next`, `ce-status`, and future skills can all leverage. The skill itself remains a recommendation-only entry point (no auto-execution).

## Success criteria

- [ ] `workflow_state` tool scans all 4 artifact directories and returns structured JSON
- [ ] `workflow_state` identifies the most recent artifact in each category
- [ ] `ce-next` skill uses `workflow_state` output to recommend the single best next skill
- [ ] `ce-next` explains why the recommended skill is next
- [ ] `ce-status` updated to reference `workflow_state` tool
- [ ] TDD: tests for `workflow_state` tool pass before implementation
- [ ] All existing tests still pass
