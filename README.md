# Super Pi

**Turn your AI coding agent from "a tool that writes code" into "a reliable engineer."**

Install it, tell Pi what you want to build, then keep saying "continue" — it walks through the full loop: **think → plan → build → review → compound learnings.**

```bash
pi install npm:@leing2021/super-pi
```

---

## The Five-Step Loop

```
01-brainstorm → 02-plan → 03-work → 04-review → 05-learn
    think          plan      build      review      learn
```

| Skill | Does | Core Tool |
|-------|------|-----------|
| **01-brainstorm** | YC-style interrogation, three modes (Startup/Builder/CE) | `brainstorm_dialog` |
| **02-plan** | RED→GREEN→REFACTOR, incremental updates, optional CEO Review | `plan_diff` |
| **03-work** | Parallel execution, checkpoint resume, strict TDD | `ce_subagent`, `ce_parallel_subagent` |
| **04-review** | Auto-assigned reviewers, structured findings, browser QA | `review_router` |
| **05-learn** | Pattern extraction → searchable knowledge cards | `pattern_extractor` |
| **06-next** | Next-step recommendation + full status report | `workflow_state` |
| **07-worktree** | Isolated git worktree development | `worktree_manager` |
| **08-help** | Phase 1 skill explainer and usage guide | — |

### Model & Thinking Routing

Configure in `.pi/settings.json`:

```json
{
  "modelStrategy": {
    "01-brainstorm": "anthropic/claude-sonnet-4-20250514",
    "02-plan": "anthropic/claude-opus-4-20250115"
  },
  "thinkingStrategy": {
    "01-brainstorm": "high",
    "02-plan": "high",
    "03-work": "medium"
  }
}
```

Model and thinking level switch automatically — no manual `/model` needed.

### pi-subagents Compatibility

CE skill tools use a dedicated namespace (`ce_subagent`, `ce_parallel_subagent`) to avoid conflicts with third-party extensions like [pi-subagents](https://www.npmjs.com/package/pi-subagents). Both can coexist without configuration.

---

## Quick Start

```
You: I want to build a tool that helps indie devs find users

→ 01-brainstorm: YC-style interrogation → docs/brainstorms/requirements.md
→ 02-plan: RED→GREEN→REFACTOR units → docs/plans/plan.md
→ 03-work: parallel execution, checkpoint resume
→ 04-review: structured findings, optional browser QA
→ 05-learn: knowledge compounding

You: continue
→ Next skill recommended automatically via /skill:06-next
```

**After interruption:**
```
You: /skill:03-work docs/plans/plan.md
→ Auto-loads checkpoint, skips completed units, resumes from breakpoint
```

---

## Token Cost

New conversation overhead: **~2,600 tokens** (1.3% of 200K context).

| Component | Tokens |
|-----------|--------|
| 8 skill registrations | ~490 |
| System prompt (skills) | ~1,400 |
| Skill inlining (per invocation) | ~500-800 |

Progressive loading: only needed skills loaded on-demand.

Full evaluation → see Token Cost section above.

---

## Generated Structure

```
your-project/
├── docs/
│   ├── brainstorms/      # Requirements
│   ├── plans/             # Execution plans
│   └── solutions/          # Knowledge cards
└── .context/
    └── compound-engineering/
        ├── checkpoints/   # Breakpoint files
        ├── dialogs/       # Dialog state
        └── history/       # Execution history
```

**Commit everything to git** — these files are the project's traceable memory.

---

## Architecture

- **8 skills** with dedicated tools
- **14 tools** + 2 helpers
- **~2800 lines** TypeScript, **175 tests**
- **Progressive rule loading** — only what each task needs

Rules in `rules/` (11 common + language-specific). Project-level overrides take priority.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

## Repository

- **GitHub**: https://github.com/leing2021/super-pi
- **npm**: https://www.npmjs.com/package/@leing2021/super-pi

## Development

```bash
bun test
npm publish --dry-run
```