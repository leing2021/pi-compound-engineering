# Requirements

## Problem

Phase 3 is complete (parallel execution, checkpoint resume, task splitting). Five enhancement areas remain for Phase 4.

## Goals (in implementation order)

### 4a: `ce-brainstorm` multi-round dialog (v0.8.0)
- Brainstorm should support iterative refinement: agent presents initial analysis → user asks clarifying questions → agent refines
- Add `brainstorm_dialog` tool to manage conversation state within a brainstorm session
- Update `ce-brainstorm` SKILL.md with multi-round workflow

### 4b: `ce-plan` incremental updates (v0.9.0)
- When a plan already exists, support diff-based updates instead of full rewrite
- Add `plan_diff` tool to compare existing plan with new requirements and generate incremental changes
- Update `ce-plan` SKILL.md with incremental update workflow

### 4c: Cross-session state (v0.10.0)
- All CE skill executions leave persistent history in `.context/compound-engineering/history/`
- Add `session_history` tool to query past executions by skill, date, artifact path
- Update `ce-status` and `ce-next` to leverage history

### 4d: `ce-compound` enhancement (v0.11.0)
- Auto-extract reusable patterns from artifacts and session history
- Add `pattern_extractor` tool to identify common patterns across solutions
- Update `ce-compound` SKILL.md to use pattern extraction

### 4e: Error recovery (v0.12.0)
- `ce-work` execution failures trigger automatic retry/rollback strategies
- Extend `session_checkpoint` with failure state and rollback metadata
- Update `ce-work` SKILL.md with error recovery workflow

## Non-goals

- No external database dependencies
- No network-based state storage
- No UI/dashboard for history browsing

## Success criteria

- [ ] Each sub-phase follows TDD (RED → GREEN)
- [ ] All existing tests pass at each version bump
- [ ] Each version publishes to npm via CI/CD
- [ ] Test count grows monotonically
