# Requirements

## Problem

When `ce-work` executes a multi-unit plan and is interrupted (failure, timeout, user cancel), all progress is lost. The next run must start from the beginning. Completed tasks are repeated, wasting time and potentially creating duplicate artifacts.

## Goals

- A `session_checkpoint` extension tool that records plan execution progress
- After each implementation unit completes, a checkpoint is written with the plan path and completed unit list
- On next `ce-work` invocation with the same plan, the tool reads the checkpoint and returns which units are already done
- Checkpoints are stored in `.context/compound-engineering/checkpoints/` as lightweight JSON files
- Update `ce-work` SKILL.md to use `session_checkpoint` for resume-from-checkpoint behavior

## Non-goals

- No cross-session state beyond the current plan execution
- No history browsing or audit trail
- No checkpoint cleanup (manual or TTL-based)
- No changes to other skills

## Approach options

### A: Pure SKILL.md guidance

Agent manually checks existing files to infer what's done.

Pros: zero code.
Cons: imprecise, agent may misjudge progress.

### B: session_checkpoint tool (recommended)

Dedicated tool writes/reads checkpoint files tracking completed plan units.

Pros: precise, testable, reusable, explicit.
Cons: one more tool + checkpoint files in repo.

### C: Extend workflow_state

Add execution tracking to existing workflow_state tool.

Pros: no new tool.
Cons: conflates artifact scanning with execution tracking.

## Recommended direction

**Approach B**: `session_checkpoint` tool. Precise progress tracking stored in repo-local checkpoint files. `ce-work` reads checkpoint on start, skips completed units, writes checkpoint after each unit.

## Success criteria

- [ ] `session_checkpoint` tool can save a checkpoint (plan path + completed unit names)
- [ ] `session_checkpoint` tool can load a checkpoint and return completed units
- [ ] `session_checkpoint` tool can list all checkpoints
- [ ] Checkpoints stored in `.context/compound-engineering/checkpoints/`
- [ ] `ce-work` SKILL.md updated to use `session_checkpoint` for resume behavior
- [ ] All existing tests pass
- [ ] New tool has TDD tests
