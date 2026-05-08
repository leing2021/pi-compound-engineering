# Requirements

## Problem

The `subagent` tool only supports serial chain execution. Independent tasks must wait for each other even when they have no dependencies. This wastes time and prevents efficient execution of plans with parallelizable units.

## Goals

- A `parallel_subagent` extension tool that runs multiple independent tasks concurrently
- Each parallel task is a skill invocation with its own prompt
- The tool returns all outputs as a collection when all tasks complete
- Update `ce-work` SKILL.md to recommend parallel execution for independent implementation units
- Existing `subagent` tool remains unchanged for serial chains

## Non-goals

- No automatic dependency analysis (user/agent decides what can be parallelized)
- No task splitting logic in this phase
- No session history or checkpoint resumption
- No changes to other skills

## Approach options

### A: Extend existing subagent tool

Add `parallel` mode to the existing `subagent` tool alongside `single` and `chain`.

Pros: no new tool.
Cons: three modes in one tool, harder to test and maintain.

### B: New parallel_subagent tool (recommended)

Add a dedicated `parallel_subagent` tool for concurrent execution. Keep existing `subagent` for serial work.

Pros: clean separation, independent testing, existing tool unchanged.
Cons: one more tool.

### C: Unified task_runner tool

One tool with serial/parallel/auto modes.

Pros: single interface.
Cons: over-engineered for Phase 2d.

## Recommended direction

**Approach B**: New `parallel_subagent` tool. Clean separation from serial `subagent`. Both tools can coexist — `ce-work` decides which to use based on task dependencies.

## Success criteria

- [ ] `parallel_subagent` tool accepts an array of tasks and runs them concurrently
- [ ] Tool returns all outputs as a collection when all tasks complete
- [ ] Tool handles individual task failures gracefully (reports which failed, which succeeded)
- [ ] `ce-work` SKILL.md updated to recommend parallel execution for independent units
- [ ] Existing `subagent` tool and tests unchanged
- [ ] New tool has TDD tests
- [ ] All existing tests pass
