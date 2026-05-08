# Pi Context Optimization: When Lazy Registration Fails

## Problem

Pi coding agent loads all registered tool schemas and skill descriptions into every conversation's system prompt. With 13 CE custom tools (~9,476 bytes / ~2,369 tokens) and 17 skill registrations (~6,320 bytes / ~1,580 tokens), the fixed startup overhead consumed ~6,700 tokens (20.9% of a 32K context window).

The attempted solution was lazy/dynamic tool registration: defer registering CE tools until a trigger keyword is detected in user input, cutting startup cost in half.

**This failed at runtime.**

## Root Cause

Pi's `registerTool()` API has a critical timing constraint documented in `agent-session.js`:

> "Changes take effect on the next agent turn."

The event flow is:
1. User sends input → `input` event fires → extension registers tools
2. Same turn: AI reads skill content → skill references tool names → AI attempts tool call
3. Tool is **not yet available** because changes don't take effect until the next turn

This creates a race condition: the AI can discover a tool name from skill content and attempt to call it in the same turn where registration happened, before the tool is actually available.

### Specific failure scenario

```
User: "帮我写个 plan"
  → input event: "plan" matches LAYER1_TRIGGERS → registerLayer1()
  → same turn: AI loads 02-plan SKILL.md → sees "use plan_diff"
  → AI tries to call plan_diff → TOOL NOT FOUND
```

## What Actually Works

### Safe: Description compression (fixed startup context)

Skill descriptions are injected into system prompt as XML at startup. Compressing them reduces fixed overhead without changing registration timing.

**Rule:** Description should only contain triggering conditions ("Use when..."), not workflow summaries. This follows pi's official best practices and the `writing-skills` CSO guidelines.

Example savings on local global skills:

| Before | After | Saved |
|--------|-------|-------|
| agent-browser: 502B | 143B | −359B |
| agentcore: 419B | 104B | −315B |
| find-skills: 317B | 120B | −197B |
| 6 skills total: 2,112B | 870B | −1,242B (~310 tokens) |

### Safe: SKILL.md body extraction (on-demand context)

Moving large sections from SKILL.md into `references/` files reduces per-skill-load context cost. This doesn't affect startup because pi only loads full SKILL.md content when the agent decides to use a skill.

Example: `agent-browser/SKILL.md` went from 34,042B → 21,349B (−37%) by extracting Essential Commands and Common Patterns into reference files.

### Unsafe: Lazy tool registration

Unless pi adds a synchronous `registerTool` variant or a pre-turn hook that guarantees tools are available before the AI sees tool names in skill content, deferring registration introduces a race condition.

**Key verification step:** Before deploying any dynamic registration, test the full flow: user input → skill load → tool call in the same turn.

## Decision Framework

| Optimization | Affects | Risk | ROI |
|---|---|---|---|
| Description compression | Fixed startup | None | ~310 tokens |
| Body extraction to references/ | Per-skill-load | None | ~3,000-4,000 tokens per skill |
| Lazy tool registration | Fixed startup | **Race condition** | ~2,369 tokens |

## Lessons

1. **Verify timing before deploying dynamic registration.** "Changes take effect on the next agent turn" means same-turn tool calls will fail.
2. **Distinguish fixed vs. on-demand context.** Only description compression and tool schema removal affect what's always loaded. Body extraction only helps when a skill is actually used.
3. **Rollback is expensive.** Three npm versions and four git commits had to be reverted. Test first, publish second.
4. **Different locations are independent.** `~/.pi/agent/skills/` (local global) and `~/code/super-pi/skills/` (npm package) are completely separate. Changes to one don't affect the other.

## Future Direction

Lazy registration could work if pi added one of:
- Synchronous `registerTool()` that takes effect immediately
- A `pre_agent_turn` hook that fires after tool registration but before the AI processes
- A tool availability callback that lets the agent retry after registration

Until then, eager registration is the safe default.
