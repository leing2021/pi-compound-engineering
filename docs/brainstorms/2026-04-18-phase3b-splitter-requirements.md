# Requirements

## Problem

`ce-work` relies on the agent to manually determine which implementation units can run in parallel. There is no structured dependency analysis. This leads to either missing parallelization opportunities or incorrectly running dependent tasks concurrently.

## Goals

- A `task_splitter` extension tool that analyzes implementation units and their file dependencies
- Tool outputs: dependency groups (which units share files) and parallel-safe groups (which units are independent)
- Tool accepts an array of units, each with a list of files it touches
- Update `ce-work` SKILL.md to use `task_splitter` output for execution strategy decisions
- Agent makes final decision — tool provides analysis, not mandates

## Non-goals

- No automatic plan parsing (agent extracts units and files from plan artifact)
- No code-level dependency analysis (only file-path based)
- No execution scheduling (tool only analyzes, does not run)
- No changes to other skills

## Approach options

### A: Pure SKILL.md

Only add guidance in ce-work for manual dependency analysis.

Pros: zero code.
Cons: not testable, relies entirely on agent.

### B: Pure tool

`task_splitter` outputs a full execution schedule.

Pros: fully testable.
Cons: too rigid, agent can't adapt.

### C: task_splitter tool + SKILL.md guidance (recommended)

Tool analyzes file-level dependencies and outputs parallel-safe groupings. Agent uses output for final decision.

Pros: testable analysis + flexible execution.
Cons: slightly more complex.

## Recommended direction

**Approach C**: `task_splitter` tool for file-based dependency analysis. Agent uses the output to decide execution strategy in `ce-work`.

## Success criteria

- [ ] `task_splitter` accepts an array of units with file lists
- [ ] `task_splitter` detects file overlaps between units (shared dependencies)
- [ ] `task_splitter` groups independent units as parallel-safe
- [ ] `task_splitter` groups dependent units into sequential chains
- [ ] `ce-work` SKILL.md updated to use `task_splitter`
- [ ] All existing tests pass
- [ ] New tool has TDD tests
