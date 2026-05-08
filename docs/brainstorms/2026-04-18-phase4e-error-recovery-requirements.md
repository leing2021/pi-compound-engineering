# Requirements

## Problem

`ce-work` has no automatic error recovery. When execution fails, there is no retry strategy, no rollback metadata, and no failure state tracking.

## Goals

- Extend `session_checkpoint` with failure state and rollback metadata
- New operations: `fail` (record a failure with context), `retry` (get retry strategy for a failed checkpoint)
- Update `ce-work` SKILL.md with error recovery workflow

## Non-goals

- No automatic rollback execution (agent decides)
- No partial file rollback
- No changes to other skills

## Success criteria

- [ ] `session_checkpoint` supports `fail` operation with error context
- [ ] `session_checkpoint` supports `retry` operation with retry strategy
- [ ] `ce-work` mentions error recovery or retry
- [ ] All existing tests pass
