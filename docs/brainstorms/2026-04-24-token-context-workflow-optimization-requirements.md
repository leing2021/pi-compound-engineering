# Token Context Workflow Optimization Requirements

> Date: 2026-04-24
> Source: `docs/token-context-optimization-plan.md`
> Goal: Turn the token/context optimization proposal into executable Super Pi requirements.

## Problem

Super Pi long-running engineering sessions accumulate too much cold context: completed phase details, verbose test logs, large file lists, historical decisions, and process narration. The context window itself is not the primary limitation; the problem is that completed-phase context is not consistently moved out of the main conversation at phase boundaries.

This reduces Token ROI and increases the chance that old state misleads later work.

## Goals

1. Optimize context control while preserving quality and execution efficiency.
2. Optimize Token ROI by keeping only high-value hot context in the active conversation.
3. Standardize what happens at the end of each Phase 1 skill.
4. Make new-window continuation reliable when it is more efficient than continuing in the current window.
5. Preserve session durability through artifacts, handoff-lite files, checkpoint state, and workflow state.
6. Reuse Super Pi skills and extension tools first; avoid changing Pi core unless necessary later.

## Non-goals

- Do not blindly minimize all output at the cost of losing blockers, constraints, or verification state.
- Do not force a new window after every small step.
- Do not replace existing brainstorm/plan/solution artifacts.
- Do not require Pi core changes for the first implementation pass.
- Do not store long-running operational state only in `docs/` artifacts.

## Confirmed Decisions

- Output level: executable requirements, ready for `02-plan`.
- New-window strategy: suggest a new window only when crossing phases and the context is heavy or critical.
- Persistence strategy:
  - `docs/` stores durable knowledge: brainstorms, plans, solutions, reports.
  - `.context/compound-engineering/` stores runtime state: handoff-lite, checkpoint, active files, context health, current blocker, verification summary.
- Premise 1: the real issue is cold context not being moved out of the main conversation at phase boundaries.
- Premise 2: handoff-lite plus artifact path references are enough to continue in a new window.
- Premise 3: prioritize Super Pi skill and extension-tool enhancements before changing Pi core.

## Core Concepts

### Hot Context

Default content allowed to remain in the active conversation:

- current task
- repo path and branch
- current phase and next phase
- active files
- current blocker or failure summary
- hard constraints
- latest verification result
- next 1-3 actions

### Warm Context

Recoverable information referenced by path, not expanded by default:

- brainstorm artifact path
- plan artifact path
- solution artifact path
- latest handoff-lite path
- checkpoint path
- relevant commit hashes, if needed

### Cold Context

Completed-phase details that should not be carried into the next active prompt:

- verbose passed test logs
- old file-read lists
- completed implementation details beyond summary
- historical reasoning process
- old hypotheses that are no longer active
- full brainstorm/plan text unless specifically needed

## Required End-of-Step Flow

At the end of each Phase 1 skill or major implementation unit, Super Pi should follow this sequence:

1. Write or update the durable artifact.
2. Generate a handoff-lite summary.
3. Save handoff-lite under `.context/compound-engineering/handoffs/`.
4. Update runtime context state or checkpoint.
5. Output Pipeline Status.
6. Output Context Status.
7. If crossing phase and context health is `heavy` or `critical`, recommend opening a new window and provide a copyable startup prompt.

## Handoff-Lite Contract

A handoff-lite should be short enough for new-window continuation, target <= 1500 tokens, and include only:

```md
## Current Task
One-sentence current goal.

## Repo
Path and branch.

## Phase
Current phase -> next phase.

## Active Files
Only files likely needed next.

## Artifacts
- Brainstorm: path or N/A
- Plan: path or N/A
- Solution: path or N/A

## Done
Max 5 result-focused bullets. No process history.

## Current Failure / Blocker
Command and minimal error summary, or N/A.

## Constraints
Hard constraints only.

## Next Actions
1. ...
2. ...
3. ...

## Verification
Commands to run or latest result summary.
```

## Context Health

Super Pi should classify context health as:

- `good`: continue current window.
- `watch`: generate handoff-lite, no strong new-window suggestion.
- `heavy`: suggest new window if crossing phase.
- `critical`: strongly suggest new window or compact before continuing.

Signals:

- phase boundary reached
- large test logs entered the conversation
- many files read or modified in completed phases
- current task differs from the dominant historical context
- verified artifact exists and can restore state
- user asks whether to open a new window

## New Window Strategy

Do not force new windows for every step. Recommend a new window when:

1. The next action is a new phase, such as `01-brainstorm -> 02-plan`, `02-plan -> 03-work`, or `03-work -> 04-review`; and
2. Context health is `heavy` or `critical`.

When recommending a new window, provide a prompt like:

```text
Continue this Super Pi workflow from the saved handoff-lite.
Repo: /Users/jasonle/code/super-pi
Read: .context/compound-engineering/handoffs/latest.md
Then continue with: /skill:02-plan
Only load referenced artifacts if needed.
```

## Approach Options

### Option A: Minimal Skill-Only Workflow

Change skill docs and shared pipeline instructions to require handoff-lite and context status.

Pros:
- Fastest implementation.
- Low risk.
- Immediate process improvement.

Cons:
- Mostly manual.
- Context health is subjective.
- Less reliable across windows.

### Option B: Plugin Enhancement + Skill Workflow Constraints

Extend existing Super Pi tools and skill instructions:

- `skills/references/pipeline-config.md`: add Context Status and phase-end context rules.
- `session-checkpoint.ts`: support runtime context state, verification summary, active files, handoff-lite metadata.
- `workflow-state.ts`: expose current stage, latest handoff, blocker, context health.
- `compaction-optimizer.ts`: add hot/warm/cold compaction rules.
- `bash-output-filter.ts`: improve structured test output summary.
- Phase skills: produce stage-specific handoff-lite.

Pros:
- Best balance of ROI, quality, and implementation risk.
- Makes new-window continuation durable.
- Avoids Pi core changes.

Cons:
- More work than documentation-only.
- Requires careful schema design.

### Option C: Deep Runtime Integration

Add fully automatic context budgeting and phase boundary detection across hooks, state, filters, and possibly Pi core.

Pros:
- Strongest automation.
- Lowest manual burden.

Cons:
- Larger implementation surface.
- Higher regression risk.
- Not necessary for first pass.

## Recommended Direction

Choose Option B: Plugin Enhancement + Skill Workflow Constraints.

This best satisfies the two core principles:

1. Context control optimization: active conversation keeps hot context only; warm/cold context moves to artifacts and runtime state.
2. Token ROI optimization: new windows are recommended only when the saved context value exceeds the fixed startup cost.

## Likely File / Module Changes

- `skills/references/pipeline-config.md`
  - Add mandatory Context Status block.
  - Add handoff-lite generation rules.
  - Add new-window recommendation criteria.

- `skills/01-brainstorm/SKILL.md` and/or `skills/01-brainstorm/references/handoff.md`
  - Output requirements artifact plus handoff-lite to `02-plan`.

- `skills/02-plan/SKILL.md` and/or `skills/02-plan/references/handoff.md`
  - Output implementation-unit summary, verification commands, risks, active files only.

- `skills/03-work/SKILL.md` and/or `skills/03-work/references/progress-update-format.md`
  - Save compact progress after each unit.
  - Track completed units, current unit, failures, and verification.

- `skills/04-review/SKILL.md`
  - Consume diff summary, changed files, test summary, and plan reference, not full history.

- `skills/05-learn/SKILL.md`
  - Output solution path, applicability, replacement/supplement status, and next step only.

- `extensions/ce-core/tools/session-checkpoint.ts`
  - Extend schema for context tiers, handoff-lite metadata, active files, verification, current blocker.

- `extensions/ce-core/tools/workflow-state.ts`
  - Add latest handoff, current stage, context health, blocker, and suggested next action.

- `extensions/ce-core/tools/compaction-optimizer.ts`
  - Add explicit hot/warm/cold retention instructions.

- `extensions/ce-core/tools/bash-output-filter.ts`
  - Improve test output summarization for passed and failed cases.

## Responsibility Boundaries

- `docs/` artifacts own long-lived knowledge and decisions.
- `.context/compound-engineering/` owns runtime continuation state.
- `handoff-lite` owns cross-window minimal continuation context.
- `workflow_state` owns discoverability of current workflow status.
- `session_checkpoint` owns resumable execution progress and failure state.
- `compaction-optimizer` owns summary focus during compaction.
- `bash-output-filter` owns command-output token reduction.

## Failure Handling

- If handoff-lite generation fails, still output Pipeline Status and warn that new-window continuation may need artifact paths manually.
- If runtime state is missing, fall back to latest docs artifact and ask before proceeding.
- If context health cannot be determined, default to `watch`, not `good`.
- If a new window is recommended, include exact handoff path and next skill command.
- If tests fail, preserve only minimal failure summary and exact command.

## Success Criteria

Functional:

- Each Phase 1 skill can end with Pipeline Status plus Context Status.
- A handoff-lite file is created or updated at phase boundaries.
- New-window prompt references handoff-lite path instead of expanding full history.
- `workflow_state` or equivalent status can report latest handoff and context health.
- Checkpoint/runtime state can preserve active files, blocker, and verification summary.

Token/quality:

- handoff-lite <= 1500 tokens.
- status-lite <= 500 tokens.
- next-lite <= 300 tokens.
- successful test output summaries <= 300 tokens.
- failed test output summaries <= 1200 tokens.
- new window can continue without reading full historical conversation.
- no hard constraints, blockers, or verification commands are lost.

## Approval Gate

This requirements artifact is ready for user approval. After approval, proceed to `02-plan` to turn it into implementation units.
