---
name: 01-brainstorm
description: "Discover requirements through structured multi-round dialog. Use when the request is ambiguous, needs discovery, or describes a new idea/product."
---

# Brainstorm

Use this skill when the request is ambiguous, needs requirements discovery, or the user describes a new idea/product.

See [shared pipeline instructions](../references/pipeline-config.md) for model routing and pipeline behavior.

## Core rules

- Use **`brainstorm_dialog`** to manage multi-round conversations (`start` → `refine` → `summarize`).
- Ask **one question at a time**.
- Compare **2-3 approaches** when multiple directions are plausible.
- Keep focused on **what** to build, not implementation details.
- **Explicit user approval required** before handoff to `02-plan`.
- Write result to `docs/brainstorms/` as durable requirements document.

## Mode selection

After initial context, determine mode via `ask_user_question`:

> What's your goal?
> - **Building a startup** → Startup Diagnostic
> - **Intrapreneurship** → Startup Diagnostic
> - **Side project / hackathon** → Builder Mode
> - **Adding a feature** → CE Brainstorm

Skip question if mode is obvious from request.

**Mode mapping:**
- Startup / intrapreneurship → **Startup Diagnostic** (see `references/startup-diagnostic.md`)
- Side project / hackathon → **Builder Mode** (see `references/builder-mode.md`)
- Feature addition → **CE Brainstorm** (see `references/ce-brainstorm-mode.md`)

## Mode summaries

| Mode | Key principle | End goal |
|---|---|---|
| Startup Diagnostic | Specificity is currency, narrow beats wide | One concrete next action |
| Builder Mode | Delight is currency, ship something showable | Concrete build steps |
| CE Brainstorm | Requirements clarity | Implementation-ready spec |

See reference files for full question sets and patterns.

## Premise Challenge

After mode-specific questions, run Premise Challenge. See `references/premise-challenge.md`.

## Design checklist

Before summarizing, ensure the design answers:
- What are we building?
- Why does it exist?
- What files/modules will change?
- What are the responsibility boundaries?
- What can fail, and how?
- How will we verify success?

## Stop conditions

Stop and ask instead of guessing when: requirements conflict, success criteria unclear, task spans multiple systems, or user hasn't approved design.

## Approval gate

**Required:** Explicit user approval before handoff to `02-plan`.

## Workflow

1. Scan repository for nearby context
2. Determine mode (Startup / Builder / CE)
3. Run mode-specific questions (use reference files)
4. Run Premise Challenge
5. Generate 2-3 alternatives (minimal viable + ideal architecture)
6. Validate against design checklist
7. Use `brainstorm_dialog` `summarize` to finalize
8. Capture requirements in `docs/brainstorms/`
9. Get explicit user approval
10. Handoff to `02-plan` using `references/handoff.md`

## Artifact contract

Use `references/requirements-template.md` to structure the document. Keep implementation details out unless specifically about architecture.

Before finishing this skill, apply the completion checklist in [shared pipeline instructions](../references/pipeline-config.md).
