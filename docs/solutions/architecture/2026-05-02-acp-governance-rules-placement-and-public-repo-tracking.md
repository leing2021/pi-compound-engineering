---
title: "ACP skill: governance rules placement and public repo file tracking"
category: architecture
severity: high
tags:
  - ACP
  - agent-context-protocol
  - rules
  - governance
  - gitignore
  - case-insensitive
  - macOS
  - public-repo
  - skill-design
  - file-placement
applies_when:
  - "Running ACP INIT on a project that already has a rules/ directory"
  - "Deciding which ACP-generated files to track in git for a public repo"
  - "ACP governance rules collide with coding rules on case-insensitive filesystems"
  - "ACP skill design: adding coding-practice rule templates without duplicating global rules"
---

# Problem

Three interrelated issues surfaced when running the Agent Context Protocol (ACP) skill's INIT mode on the super-pi project:

1. **Case-insensitive collision:** macOS treats `RULES/` and `rules/` as the same directory. ACP's governance files (INVARIANTS.md, NAMING_RULES.md, TROUBLESHOOTING.md) silently mixed into super-pi's existing `rules/` coding standards directory.

2. **Content duplication with global rules:** ACP added coding-practice templates (CODE_REVIEW, TESTING, SECURITY) that duplicated content already provided by super-pi's `rules/common/`. The agent would see the same checklist twice.

3. **Public repo tracking:** ACP generates docs/, handoffs/, and governance files, but not all belong in a public GitHub repository. No clear policy existed for which to git-track.

# Context

Super-pi (`@leing2021/super-pi`) is an npm package that ships its own `rules/common/` directory with 11 coding standard files (code-review.md, testing.md, security.md, etc.). These are loaded automatically by pi when the package is installed.

ACP (`~/.pi/agent/skills/agent-context-protocol/`) is a project governance skill that generates AGENT.md, CODEMAPS, CLOSE_CHECKLIST, and optional RULES/ templates. It originally placed all governance files in a `RULES/` directory at the project root.

The collision happened because:
- super-pi has `rules/` (lowercase) with coding standards
- ACP generated `RULES/` (uppercase) for governance
- macOS APFS (default, case-insensitive) merges them into one directory

# Solution

## 1. Two-tier file placement

Governance files (project-specific) and coding standards (global) live in different directories:

```
rules/              ← Coding standards (super-pi or equivalent)
  common/           ← Global: code-review, testing, security, etc.
  typescript/       ← Language-specific overrides
.agent/rules/       ← Project governance (ACP-generated)
  INVARIANTS.md     ← Hard constraints
  NAMING_RULES.md   ← Naming conventions
  TROUBLESHOOTING.md← Symptom routing
```

Rule: **If the project already has a `rules/` directory, ACP governance goes to `.agent/rules/`** to avoid case collision on macOS.

## 2. Coding-practice templates as "addition-only"

ACP's CODE_REVIEW, TESTING, SECURITY templates should NOT duplicate global standards. Instead, they contain only **project-specific overrides**:

- Template header says: "This file adds project-specific rules on top of global standards your agent already loads."
- Each template has a "How to Use" section: "If using super-pi, keep this minimal. If NOT using super-pi, replace with full content."
- INIT mode skips these templates when super-pi's `rules/common/` is detected.

## 3. Git tracking policy for public repos

| Track | Ignore | Project-decides |
|-------|--------|----------------|
| `AGENT.md` | `.agent/handoffs/` | — |
| `CLOSE_CHECKLIST.md` | | — |
| `.agent/CODEMAPS/` | | — |
| `.agent/rules/` | | — |
| | `docs/` (all) | — |

Rationale:
- **AGENT.md + CODEMAPS + rules** = the map (helps agents/contributors)
- **handoffs** = session runtime context (local paths, debug info)
- **docs/** = process artifacts (brainstorms, plans, reports) — internal history, not current state

## 4. INIT step for .gitignore

ACP INIT now includes step 10: automatically add `.agent/handoffs/` and optionally `docs/` to `.gitignore`.

# Why this works

- **`.agent/` namespace is ACP-owned.** No other tool claims it, so placing governance under `.agent/rules/` is safe.
- **Addition-only templates** follow the open-closed principle: global rules are closed (shipped with super-pi), project rules are open (user fills only what's different).
- **Git policy separates map from diary.** Public repos need the map (AGENT.md), not the diary (docs/brainstorms).

# Prevention

When adding new ACP rule templates or modifying INIT behavior:

1. Check if the project has an existing `rules/` (or `RULES/`) directory — if yes, use `.agent/rules/`.
2. Check if global coding standards are already loaded (super-pi `rules/common/`) — if yes, skip coding-practice templates.
3. Always add `.agent/handoffs/` to `.gitignore` during INIT.
4. For public repos, default to ignoring `docs/` entirely — AGENT.md is the SSOT.
