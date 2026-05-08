# Changelog

### 0.23.5 — Agent-skills micro-patterns: embedded behavioral gates, skill routing, repo hygiene
- **Skill descriptions** — all 8 skills now include "Use when" trigger conditions for accurate automatic skill routing.
- **Source-driven gate** — embedded in 3 locations: `rules/common/development-workflow.md` (rule) + `02-plan` workflow step + `03-work` workflow step. When implementation depends on a framework/library API or version-specific behavior, verify against official docs before implementing.
- **Stop-the-line rule (Hard gate)** — embedded in `03-work` Hard gates section. On unexpected failure: STOP → PRESERVE evidence → DIAGNOSE root cause → FIX → GUARD with regression test → RESUME.
- **Anti-rationalization** — when a gate fails or evidence is missing: do not rationalize, downgrade, or explain away the failure. Stop and report with evidence.
- **Review five-axis baseline** — added to `04-review` reviewer-selection: all reviewers evaluate across correctness, readability, architecture, security, performance.
- **Typo fix** — `performan04-reviewer` → `performance-reviewer`.
- **Repo hygiene** — `docs/` no longer tracked; `bun.lock` untracked.
- Approach B: all changes are edits to existing files, no new skills/tools/commands. ~410 tokens added.
- 209 tests passing, 0 regressions.

### 0.23.4 — Memory Optimization Phase 2: activeRules, context-first skills, handoff lifecycle
- Added `activeRules?: string[]` field to `context_handoff` for preserving 1-5 continuation-critical rules across sessions.
- `activeRules` persisted in state, returned by load/latest/status, rendered in default handoff template.
- Backward compatible: old state files without `activeRules` normalize to `[]`.
- Soft constraint: >5 rules allowed without failure.
- Updated `pipeline-config.md` with "Start of skill: context loading" guidance (handoff-first before broad reads) and "End of skill: save handoff" lifecycle.
- Updated `02-plan`, `03-work`, `04-review` SKILL.md to load handoff as workflow step 1.
- Rewrote `06-next` recommendation logic with context-first priority chain: health → blocker → recommendNewSession → nextStage → mismatch → artifact-count fallback.
- 6 new tests for activeRules (round-trip, template, default, soft constraint, backward compat, custom markdown).
- 209 tests passing, 0 regressions.

### 0.23.3 — Context handoff deterministic validation probes (Route B-lite)
- Added `context_handoff` `operation: "validate"` for deterministic continuation-readiness validation.
- 4 probes: `recall`, `continuation`, `artifact`, `decision`.
- `ok` requires `recall` + `continuation` only; `artifact` / `decision` gaps are warnings.
- Explanatory `checks` array for each probe with name, passed, reason.
- Placeholder filtering: `N/A`, `- N/A`, `Not run` do not count as evidence in markdown or structured state.
- All public output paths normalized to repo-relative.
- Tightened continuation: `verification` / `blocker` alone cannot pass continuation.
- 203 tests passing, 0 regressions.

### 0.23.2 — Context handoff structured runtime-memory anchor
- Added 5 new optional structured fields to `context_handoff`: `currentTruth`, `invalidatedAssumptions`, `openDecisions`, `recentlyAccessedFiles`, `compressionRisk`.
- Persisted new fields in `.context/compound-engineering/context-state.json` for machine-readable runtime state.
- Extended default handoff-lite markdown template with matching sections.
- Added `workflow_state.context` that reads structured state from `context-state.json` with safe defaults.
- Added state normalization layer (`normalizeStateEntry`, `toStringArray`) for backward compatibility with legacy state files.
- Fixed `workflow_state` to filter non-string array entries from context state.
- Updated `pipeline-config.md` handoff-lite template with 5 new sections.
- 191 tests passing, 0 regressions.

### 0.23.1 — SKILL.md size minimization + thinkingStrategy support
- Minimized 8 SKILL.md files from 28KB to 18KB (-35% reduction) by moving detailed rules, templates, and examples to `references/` for on-demand loading.
- Created new reference files:
  - `ce-brainstorm-mode.md` (01-brainstorm): standard CE mode workflow
  - `solution-search.md` (02-plan, 04-review): grep-first strategy for solutions
  - `completion-report.md` (03-work): completion report template
- Expanded existing references:
  - `workflow-sequence.md` (08-help): detailed CE pipeline guide
  - `recommendation-logic.md` (06-next): merged skill-registry
- Added `thinkingStrategy` support for per-skill thinking level control.
- Extended settings loading to support global `~/.pi/agent/settings.json` as fallback when project-level `.pi/settings.json` lacks `modelStrategy`/`thinkingStrategy`.
- Simplified README.md and README_CN.md to essential content.
- Updated `.gitignore` to exclude all `docs/` content except `token-cost-evaluation.md`.

### 0.23.0 — CE extension tool namespace isolation for third-party compatibility
- Renamed `ce-core` subagent tools from `subagent`/`parallel_subagent` to `ce_subagent`/`ce_parallel_subagent` to avoid runtime tool-name conflicts with third-party extensions like `pi-subagents`.
- Updated `03-work` skill documentation and `README.md`/`README_CN.md` to reference the new `ce_`-prefixed tool names.
- Added TDD tests confirming tool names and runtime registration guard (no bare `subagent`/`parallel_subagent`).
- Added README compatibility section documenting coexistence of `ce_subagent`/`ce_parallel_subagent` with generic `pi-subagents`.
- Added `05-learn` solution artifact documenting the three approaches to extension tool overlap: delegation, source integration, and namespace isolation.
- Fixed user-facing error message in `ce_parallel_subagent` to use the correct tool name.

### Unreleased — Workflow simplification and rule loading cleanup
- Merged `08-status` into `06-next`; `06-next` now supports both next-step recommendations and verbose full status reports.
- Removed standalone `10-rules`; `02-plan`, `03-work`, and `04-review` now load project rules directly and share `skills/references/language-detection.md`.
- Renamed `09-help` to `08-help` so skill numbering remains continuous after removing `08-status`.
- Added `rules/common/naming.md` for simple, everyday, low-ambiguity naming conventions.
- Registered `context_handoff` as an official ce-core tool and export.
- Clarified `07-worktree` as an optional isolation utility that requires user confirmation before create/merge/cleanup actions.
- Clarified `subagent` as a low-level utility for valuable dependent serial chains; small work should stay inline and independent work should use `parallel_subagent`.
- Split changelog history from README into `CHANGELOG.md` and `CHANGELOG_CN.md`.

### 0.19.5 — Plan/Work/Review skill rules loading alignment
- Fixed `02-plan` not loading language-specific rules (e.g. `rules/typescript/`) during the planning phase — only `common/` rules were loaded.
- Fixed `03-work` Core rules missing explicit `common/` loading and `web/` conditional loading (10-rules defined them but the skill's own instructions didn't).
- Fixed `04-review` Core rules missing explicit language detection method and `web/` conditional loading.
- Updated all three skills to use a consistent 4-step progressive loading strategy (common → language detect → language rules → web rules).
- Updated `10-rules` SKILL.md Pre-flight to include complete language detection mapping for all three phases.
- Synced `README.md` and `README_CN.md` skill tables to reflect the unified loading strategy.

### 0.19.4 — Read output filter markdown truncation fix
- Fixed `read-output-filter` over-truncating markdown files: raised markdown threshold from 2KB → 8KB.
- Improved `filterMarkdown()` to fully preserve list items (`-`, `*`, numbered) and keep first 3 lines of paragraphs (was 1).
- Filter notice now includes actual file path in actionable guidance (`bash cat <path>`).
- Added 5 new tests covering list preservation, markdown threshold gate, and path-in-notice.
- 175 tests passing.

### 0.19.3 — Terminate fix + runtime model routing + autoContinue removal
- Fixed 6 ce-core tools (`brainstorm_dialog`, `workflow_state`, `review_router`, `session_checkpoint`, `session_history`, `pattern_extractor`) incorrectly returning `terminate: true`, which caused agent turns to end prematurely (brainstorm questions not shown, "type continue to proceed" interruptions).
- Implemented runtime stage model routing via ce-core extension `input` hook: reads `.pi/settings.json` `modelStrategy`, auto-switches model before skill execution. Supports full reference (`anthropic/claude-opus-4-1`) and bare model id (`claude-opus-4-1`).
- Removed `pipeline.autoContinue` configuration (never had runtime implementation; Pi lacks `skill_end` event for auto-continue).
- Updated `skills/references/pipeline-config.md`, `README.md`, `README_CN.md` to reflect runtime model routing behavior.
- Added 4 new tests covering terminate regression, input hook model routing, and bare model id parsing.

### 0.19.2 — Evidence-first handoff-lite + docs tracking rule
- Added `context_handoff` with evidence-first default handoff-lite generation when markdown is omitted.
- Standardized the shared handoff-lite template across 01-05 workflow handoffs via `skills/references/pipeline-config.md`.
- Added tests protecting default handoff generation and the shared handoff docs contract.
- Updated docs tracking so Git only uploads `docs/token-cost-evaluation.md` while other `docs/` artifacts stay local.

### 0.19.1 — Pipeline config + typecheck baseline fix
- Added shared pipeline config (`skills/references/pipeline-config.md`) for stage model routing via `.pi/settings.json`.
- Added runtime stage model routing via ce-core extension `input` hook (reads `modelStrategy` from `.pi/settings.json`, auto-switches model before skill execution).
- Fixed TypeScript baseline issues so `bunx tsc --noEmit` passes.

### 0.19.0 — 0.69.0 alignment + learn rename
- TypeBox migration: `@sinclair/typebox` → `typebox` (zero old-path imports)
- Peer/dev dependency upgrade: pi-coding-agent `0.67.6` → `0.69.0`
- Tool termination: 6 pure-query tools now return `terminate: true` to reduce unnecessary LLM rounds
- Skill rename: `05-compound` → `05-learn` for clarity

### 0.18.0 — Progressive rules
- Built-in `rules/` directory with 13 language layers + common + web (78 Markdown files)
- New `10-rules` skill: progressive on-demand loading, zero waste
- `02-plan`, `03-work`, `04-review` auto-trigger rule loading at entry points
- Users can add/remove languages and edit rules freely — plain Markdown, no config
- 10 skills, 15 tools, 162 tests passing

### 0.17.0 — Subagent safety
- Recursion depth guard (`PI_SUBAGENT_DEPTH` / `PI_SUBAGENT_MAX_DEPTH`) prevents runaway nesting
- Async mutex for `process.env` concurrency safety during parallel subagent execution
- Context slimming: `inheritSkills` parameter, parallel workers default to slim context (`--no-skills`)
- Shared `createSubagentRunner` factory (deduped runner closures)
- 162 tests passing

### 0.16.0 — Context optimization
- Read output filter: structural compression for large code files, lock files, markdown
- Compaction optimizer: focused summary instructions for session compaction
- Bash output filter improvements

### 0.15.0 — Output filtering
- Bash output filter: smart truncation by command type (install, test, build)
- Read output filter: preserves structure while cutting verbosity

### 0.14.0 — Structured solution retrieval
- YAML frontmatter tagging + grep-first two-level search
- 95 tests passing

### 0.13.0 — Superpowers engineering discipline
- Strict TDD gates, design checklists, YAGNI checks

### 0.12.0 — Error recovery
- session_checkpoint fail/retry operations

### 0.11.0 — Pattern extraction
- New pattern_extractor tool

### 0.10.0 — Continuous learning
- New session_history tool

### 0.9.0 — Incremental planning
- New plan_diff tool

### 0.8.0 — Multi-round dialog
- New brainstorm_dialog tool

### 0.7.0 — Parallel grouping
- Union-Find based task_splitter

### 0.6.0 — Checkpoint resume
- New session_checkpoint tool

### 0.5.0 — Parallel execution
- New parallel_subagent tool

### 0.4.0 — Smart review
- New review_router tool

### 0.3.0 — Isolated development
- New worktree_manager + 07-worktree

### 0.2.0 — State awareness
- New workflow_state + 06-next

### 0.1.0 — Initial release
- 7 skills, 3 tools
