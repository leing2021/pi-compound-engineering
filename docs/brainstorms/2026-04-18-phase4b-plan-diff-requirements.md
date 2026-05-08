# Requirements

## Problem

When a plan already exists and requirements change, `ce-plan` must rewrite the entire plan. There is no way to do incremental diff-based updates.

## Goals

- A `plan_diff` tool that compares an existing plan with new requirements and generates an incremental change set
- Operations: `compare` (diff existing plan vs new requirements), `patch` (apply changes to existing plan)
- Update `ce-plan` SKILL.md with incremental update workflow
- Plans stored as structured data so diffs are meaningful

## Non-goals

- No automatic merge conflict resolution
- No git-level diffing (operates on plan structure, not text)
- No changes to other skills

## Success criteria

- [ ] `plan_diff` tool can compare existing plan units with new requirements
- [ ] `plan_diff` tool can patch an existing plan with incremental changes
- [ ] `ce-plan` SKILL.md mentions `plan_diff` and incremental updates
- [ ] All existing tests pass
