---
title: Evidence-first handoff-lite template for low-token workflow continuation
category: workflow
severity: high
tags:
  - handoff-lite
  - evidence-first
  - verified-facts
  - context-status
  - low-token
  - continuation
  - super-pi
applies_when:
  - Standardizing handoff output across 01-05 workflow stages
  - Continuing work in a later session without replaying full history
  - Preserving verified evidence, blockers, and the next exact step in a compact artifact
  - Adding default handoff generation to workflow tooling such as context_handoff
---

# Problem

Phase-oriented handoffs were preserving stage summaries, but they were not reliably preserving the highest-ROI continuation facts for the next session. In practice, that caused low-token continuation to miss items like already-verified facts, what not to re-run, current blocker state, and the exact next minimal action.

# Context

This surfaced during the Super Pi token/context workflow upgrade. The repo already had `context_handoff`, `.context/compound-engineering/handoffs/latest.md`, and Context Status support, but the handoff content contract was still too loose. That made continuation quality depend on the current writer instead of a stable template.

There was also a secondary alignment problem: even if tool output improved, future phases could drift unless the shared pipeline docs, stage handoff references, proof/example docs, and tests all enforced the same structure.

Related artifacts:
- `docs/solutions/architecture/2026-04-23-shared-pipeline-config-gated-autocontinue.md`
- `docs/solutions/architecture/2026-04-24-runtime-context-path-portability.md`

# Solution

Use a single shared **evidence-first handoff-lite template** and make both tooling and docs converge on it.

Canonical sections:

```md
## Current Task
## Hot Context
## Verified Facts
## Active Files
## Artifacts
## Current Blocker
## Verification
## Do Not Repeat
## Next Minimal Step
```

Implementation rules:

1. Keep the template in shared pipeline docs so every phase references one contract.
2. Keep the handoff concise (target <= 1500 tokens).
3. Use `N/A` instead of inventing missing facts.
4. Store broad history as artifact paths, not long narrative.
5. When `context_handoff.save` is called without explicit markdown, generate this template by default.
6. If explicit `handoffMarkdown` is provided, preserve backward compatibility and do not overwrite caller content.
7. Add tests that protect both:
   - tool behavior (default template generation)
   - docs contract (shared template + phase references)
8. Keep saved handoff paths repo-relative so the artifact remains portable across sessions and worktrees.

# Why this works

This works because continuation quality depends less on remembering the whole past and more on carrying forward the smallest set of facts with the highest decision value.

The sections each serve a specific ROI role:
- `Hot Context` keeps only the must-know facts.
- `Verified Facts` prevents re-proving completed work.
- `Do Not Repeat` reduces wasteful rereads and reruns.
- `Next Minimal Step` removes ambiguity about what to do next.
- `Artifacts` preserves recoverability without expanding the active prompt.

Putting the template in shared pipeline docs reduces drift. Protecting it in `context_handoff` ensures the structure still appears even when the caller forgets to handcraft markdown.

# Prevention

For future `02-plan` and `04-review` runs:

- Search for `handoff-lite`, `verified-facts`, `next minimal step`, and `context-status` before proposing new continuation patterns.
- Prefer updating the shared template rather than adding per-phase custom variants.
- If a new workflow tool emits handoff-like state, make it either reuse this structure or explicitly justify deviation.
- Add a failing test before changing the contract again, so docs and runtime behavior do not drift apart.
