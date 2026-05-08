---
name: 08-help
description: "Explain Phase 1 skills and their connections. Use when learning the workflow or deciding which skill applies."
---

# Help

Use this skill when the user asks how to use the package, which workflow step comes next, or which Compound Engineering skill fits the current task.

## Core principle

**Explain the smallest useful next step** — do not force the full sequence.

## Trigger conditions

| User asks | Use this skill |
|---|---|
| How to use the package | Help with skill selection |
| Which step comes next | Recommend via workflow state |
| Which skill fits | Match task to skill |

## Skill mapping

| Skill | When to use |
|---|---|
| `01-brainstorm` | Ambiguous request, new idea, requirements discovery |
| `02-plan` | Requirements clear, turn into implementation units |
| `03-work` | Plan ready, controlled execution |
| `04-review` | After code changes, structured findings |
| `05-learn` | After solving, capture reusable learning |
| `06-next` | Check status or get next step recommendation |
| `07-worktree` | Isolated feature development |

## Workflow sequence

See `references/workflow-sequence.md` for detailed flow, mode variants, and output formats.

**Quick reference:**
1. `01-brainstorm` → clarify problem
2. `02-plan` → break into units (optional CEO/Strict review)
3. `03-work` → execute
4. `04-review` → inspect (optional Browser QA)
5. `05-learn` → capture learnings
6. `06-next` → check status anytime

Before finishing this skill, apply the completion checklist in [shared pipeline instructions](../references/pipeline-config.md).
