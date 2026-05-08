---
title: "Progressive rules integration into Pi skill package"
category: architecture
severity: high
tags:
  - rules
  - progressive-loading
  - token-optimization
  - skill-design
  - layer-override
applies_when:
  - "Adding coding rules or conventions to a Pi skill package"
  - "Designing progressive on-demand loading for large rule sets"
  - "Avoiding full-context injection of rule files"
---

# Problem

A standalone `project-rules` skill at `~/.pi/agent/skills/` pointed to `~/.pi/agent/rules/` with hardcoded absolute paths. This created three issues:

1. **Not portable** — paths like `/Users/jasonle/.pi/agent/rules/` only work on one machine
2. **Not versioned** — rules lived outside the package, could diverge from skill logic
3. **Token waste risk** — no structured integration with CE workflow skills, agent might load everything or nothing

# Context

Super Pi is a Pi-native Compound Engineering package with 10 skills and 15 tools. The `project-rules` skill existed as a separate global skill with 78 Markdown rule files covering 13 languages + common + web layers. These rules needed to be available to `02-plan`, `03-work`, and `04-review` but only when relevant, never all at once.

# Solution

**Three-part integration:**

1. **Move rules into the package** — `rules/` directory ships with `@leing2021/super-pi`, versioned and distributed via npm. One `pi update` syncs everything.

2. **Create `10-rules` bridge skill** — a thin SKILL.md (~2.3KB) that defines:
   - What to load by phase (plan → workflow+testing, work → +language, review → +code-review)
   - Progressive loading order (workflow → testing → scenario → language → additional)
   - Override precedence: `language-specific > web > common`

3. **Inject one-line references in existing skills** — `02-plan`, `03-work`, `04-review` each get a single Core rule line pointing to `10-rules` with their minimum required reads.

4. **Project-level override** — users create `{repo-root}/rules/` for custom rules. `10-rules` checks project-level first, falls back to package defaults. Project rules survive `pi update`.

**Token math:**
- Fixed cost per conversation: ~30 tokens (skill description in system prompt)
- Skill trigger: ~200 tokens (SKILL.md)
- Rules loaded on-demand: 900–2,600 tokens (2–7 files out of 78)
- Total package overhead: ~2,500 tokens / conversation (1.26% of 200K context)

# Why this works

- **Pi's skill system already does progressive disclosure**: only descriptions are in system prompt, full SKILL.md loads on `read`, rule files load on further `read` calls. Three levels of indirection = zero waste.
- **Bridge skill pattern**: `10-rules` doesn't duplicate rule content — it's purely a loading decision tree. This means rules can change without touching skill logic.
- **Project-level priority**: follows the same override pattern as the rules themselves (specific > general). Users don't fork the package to customize.

# Prevention

- Never inline rule content into SKILL.md — always use `read` tool for lazy loading.
- Never hardcode absolute paths — use relative paths from skill directory or detect `{repo-root}/rules/` dynamically.
- When adding new rule-consuming skills, add a one-line Core rule reference to `10-rules` rather than duplicating the loading logic.
- Run `grep -rn "/Users/" skills/ rules/` before commits to catch hardcoded paths.
