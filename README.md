# Super Pi

[简体中文](README.zh-CN.md)

**Turn your AI coding agent into a reliable engineer.**

Install, describe what you want to build, then keep saying "continue." Super Pi drives the full loop: **think → plan → build → review → compound learnings.**

```bash
pi install npm:@leing2021/super-pi
```

---

## Highlights

- **Five-step loop** — brainstorm → plan → work → review → learn, with automatic skill routing
- **Checkpoint resume** — interrupted? Resume from the exact unit you left off
- **TDD enforcement** — every unit follows RED → GREEN → REFACTOR with hard gates
- **Parallel execution** — independent units run concurrently via `ce_parallel_subagent`
- **Evidence-first review** — auto-assigned reviewers across five axes, autofix loop
- **Knowledge compounding** — solved problems become searchable solution artifacts
- **Token-efficient** — ~2,600 tokens new-conversation overhead; progressive loading

---

## Quickstart

```bash
pi install npm:@leing2021/super-pi
```

Then in Pi:

```
You: I want to build a CLI tool that helps indie devs find early users

→ 01-brainstorm: structured discovery → requirements artifact
→ 02-plan: TDD-gated implementation units → plan artifact
→ 03-work: parallel execution, checkpoint resume
→ 04-review: five-axis findings, autofix loop
→ 05-learn: knowledge compounding

You: continue
→ Next skill recommended via /skill:06-next
```

**Resume after interruption:**

```
You: /skill:03-work docs/plans/plan.md
→ Loads checkpoint, skips completed units, resumes from breakpoint
```

---

## The Five-Step Loop

```
01-brainstorm → 02-plan → 03-work → 04-review → 05-learn
    think         plan      build      review      learn
```

| Skill | What it does | Core tool |
|-------|-------------|-----------|
| **01-brainstorm** | Structured multi-round discovery | `brainstorm_dialog` |
| **02-plan** | TDD-gated implementation units, optional CEO Review | `plan_diff` |
| **03-work** | Parallel execution, checkpoint resume, strict TDD, stop-the-line | `ce_subagent`, `ce_parallel_subagent` |
| **04-review** | Auto-assigned reviewers, five-axis findings, autofix loop | `review_router` |
| **05-learn** | Pattern extraction → searchable solution artifacts | `pattern_extractor` |
| **06-next** | Next-step recommendation + workflow status | `workflow_state` |
| **07-worktree** | Isolated git worktree development | `worktree_manager` |
| **08-help** | Phase 1 skill explainer | — |

### Subagent tool namespace

Super Pi ships CE-specific tools named `ce_subagent` and `ce_parallel_subagent`. They are intentionally namespaced so they can coexist with the compatible third-party `pi-subagents` extension without tool-name collisions.

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

## Design Philosophy & Acknowledgements

**80% planning and review, 20% execution.**

The goal is not to make AI write code faster. The goal is to make AI think before writing, review after writing, and compound what it learns.

Super Pi is not a fork or wrapper. It extracts useful methods from the projects below and rebuilds them with Pi-native skills, tools, artifacts, checkpoints, and handoffs.

| Project | What Super Pi adopted |
|---------|------------------------|
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | "Use when" skill trigger conditions, source-driven verification, stop-the-line hard gate, anti-rationalization, and the five-axis review baseline. Adopted as embedded micro-patterns only — no new skills, tools, commands, or agents. |
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) | Parallel subagent orchestration, checkpoint resume, continuous learning loops, and token-conscious agent workflow design. |
| [superpowers](https://github.com/obra/superpowers) | Strict TDD gates, design checklists, review discipline, and the idea that agents need hard gates instead of gentle suggestions. |
| [compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) | The five-step think → plan → build → review → learn loop and the knowledge-compounding backbone. |
| [gstack](https://github.com/garrytan/gstack) | YC-style forcing questions, CEO Review cognitive frameworks, browser QA patterns, failure maps, and evidence-first validation. |

---

## Behavioral Gates

### Stop-the-line (Hard gate)

When an unexpected failure occurs during `03-work`:

1. **STOP** adding features
2. **PRESERVE** evidence
3. **DIAGNOSE** root cause
4. **FIX** the root cause
5. **GUARD** with a regression test
6. **RESUME** only after verification passes

Anti-rationalization: do not rationalize, downgrade, or explain away failures. Stop and report with evidence.

### Source-driven verification

When implementation depends on a framework/library API, version-specific behavior, or a recommended pattern: verify against official documentation before implementing. Pure logic, renaming, or in-project pattern reuse does not require external citation.

### Review five axes

All reviewers evaluate changes across: **correctness, readability, architecture, security, performance.**

---

## Token Cost

New conversation overhead: **~2,600 tokens** (1.3% of 200K context).

| Component | Tokens |
|-----------|--------|
| 8 skill registrations | ~490 |
| System prompt | ~1,400 |
| Skill inlining (per invocation) | ~500-800 |

Progressive loading: only needed skills loaded on-demand.

---

## Generated Structure

```
your-project/
├── docs/
│   ├── brainstorms/      # Requirements
│   ├── plans/             # Execution plans
│   └── solutions/         # Knowledge cards
└── .context/
    └── compound-engineering/
        ├── checkpoints/   # Breakpoint files
        ├── handoffs/      # Cross-stage context
        └── history/       # Execution history
```

Commit everything to git — these files are the project's traceable memory.

---

## Architecture

| Component | Count |
|-----------|------:|
| Skills | 8 |
| Tools | 19 |
| Rules | 79 |
| TypeScript lines | ~4,400 |
| Tests | 209 (786 assertions) |

Rules in `rules/` cover 11 common topics + language-specific sets (TypeScript, Rust, Go, Python, Java, Kotlin, C++, C#, Dart, Swift, Perl, PHP). Project-level overrides take priority.

---

## Commands

| Command | Description |
|---------|-------------|
| `bun test` | Run all tests |
| `npm publish --dry-run` | Preview package contents |

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

## Links

- **npm**: https://www.npmjs.com/package/@leing2021/super-pi
- **GitHub**: https://github.com/leing2021/super-pi
- **License**: MIT
