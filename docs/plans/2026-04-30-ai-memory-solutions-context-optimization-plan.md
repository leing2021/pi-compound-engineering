---
date: 2026-04-30
topic: ai-memory-solutions-context-optimization
requirements: docs/brainstorms/2026-04-30-ai-memory-solutions-context-optimization-requirements.md
status: planned
---

# Plan: AI Memory Best Practices for Super Pi Agents

## Problem summary

Super Pi already has durable memory mechanisms: `05-learn` writes `docs/solutions/`, solution frontmatter supports grep-first retrieval, `context_handoff` / handoff-lite preserve current workflow state, and reports/plans/brainstorms preserve broader history.

The remaining problem is usage discipline. Future agents can still waste context by preloading too many historical artifacts, reading irrelevant solution files, repeating verification, or treating long chat history as memory.

This plan produces a research-informed report / principles checklist for future AI agents and skills. The report should be operational, not academic: concise source-name references, immediate rules for existing mechanisms, and a future blueprint appendix.

Target report:

`docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md`

## Relevant learnings

Solution search used grep-first/frontmatter-first and fully read only top relevant artifacts.

1. `docs/solutions/workflow/2026-04-24-evidence-first-handoff-lite-template.md`
   - Relevance: high. Establishes handoff-lite as low-token continuation memory with Hot Context, Verified Facts, Do Not Repeat, Next Minimal Step, and artifact paths.

2. `docs/solutions/tooling/2026-04-25-read-output-filter-markdown-truncation.md`
   - Relevance: medium. Shows that context reduction can become harmful if compression/filtering drops semantically important markdown lists or details; supports “optimize useful recall before aggressive compression.”

3. `~/.pi/agent/docs/solutions/tooling/pi-context-optimization-lazy-registration.md`
   - Relevance: high. Shows that context optimization must respect runtime constraints; safe wins include description compression and extracting large skill bodies to references, while lazy registration introduced race conditions.

Supporting reports already read:

- `docs/reports/2026-04-30-context-compression-research-report.md`
- `docs/reports/2026-04-24-session-memory-search-token-roi-analysis.md`
- `skills/05-learn/references/solution-search-strategy.md`

## Scope boundaries

### In scope

- Write one report under `docs/reports/`.
- Focus on agent-operational rules for current Super Pi mechanisms.
- Cover hot / warm / cold memory taxonomy.
- Cover `docs/solutions` retrieval protocol and context budget rules.
- Cover failure modes: poisoning, distraction, confusion, clash, over-compression, stale assumptions.
- Include rule candidates that can later become `02-plan`, `04-review`, and `05-learn` instructions.
- Include a short future blueprint appendix.

### Out of scope

- No code implementation.
- No changes to skill files in this plan.
- No vector database, embedding index, or automatic memory router implementation.
- No strict academic bibliography.
- No full preload of all `docs/solutions` or historical reports.

## Implementation units

### Unit 1: Add report skeleton with executive agent rules

#### Goal

Create the target report with the required structure and a strong executive-rule section so agents can quickly apply the guidance without reading the entire document.

#### Files

- Create: `docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md`

#### Patterns to follow

- Use concise report style from `docs/reports/2026-04-30-context-compression-research-report.md`.
- Use evidence-first continuation concepts from `docs/solutions/workflow/2026-04-24-evidence-first-handoff-lite-template.md`.
- Keep source references at “source name + key idea” granularity.

#### Test scenarios

- RED: Before writing the report, verify the target file does not exist or does not contain the required heading `# AI Memory Best Practices for Super Pi Agents`.
- GREEN: Write the report skeleton with these required headings:
  - `## Executive Rules`
  - `## Memory Taxonomy for Super Pi`
  - `## Research-backed Principles`
  - `## docs/solutions Retrieval Protocol`
  - `## Context Assembly Budget`
  - `## Failure Modes and Safeguards`
  - `## 05-learn Feedback Loop`
  - `## Skill-rule Candidates`
  - `## Future Blueprint Appendix`
- REFACTOR: Ensure the executive rules are concise and actionable rather than narrative.

#### Verification

```bash
test -f docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "# AI Memory Best Practices for Super Pi Agents" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "## Executive Rules" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "## Future Blueprint Appendix" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
```

#### Dependencies

None.

---

### Unit 2: Fill memory taxonomy and current Super Pi retrieval protocol

#### Goal

Define exactly how agents should use current Super Pi memory layers and `docs/solutions` without overloading context.

#### Files

- Modify: `docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md`

#### Patterns to follow

- Align with `skills/05-learn/references/solution-search-strategy.md`.
- Align with current handoff-lite sections in shared pipeline config.
- Use the brainstorm’s confirmed premises as the non-negotiable rules.

#### Test scenarios

- RED: Verify the report initially lacks at least one required operational phrase, e.g. `Full-read at most top 1-3 solution files`.
- GREEN: Add operational rules for:
  - hot memory: `handoff-lite`, `workflow_state.context`
  - warm memory: current requirements/plan/proof/checkpoint
  - cold memory: `docs/solutions`, reports, historical brainstorms/plans
  - frontmatter-first search
  - top-N full read limit
  - keeping conclusions and artifact paths instead of full historical text
- REFACTOR: Remove duplication between taxonomy and retrieval sections.

#### Verification

```bash
grep -q "Hot memory" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "Warm memory" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "Cold memory" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "frontmatter" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "top 1-3" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
```

#### Dependencies

Depends on Unit 1.

---

### Unit 3: Add research-backed principles and failure-mode safeguards

#### Goal

Map external AI memory / context engineering practices to Super Pi-specific rules without turning the report into an academic literature review.

#### Files

- Modify: `docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md`

#### Patterns to follow

- Use `docs/reports/2026-04-30-context-compression-research-report.md` as the source for external practice summaries.
- Include only source-name and key idea:
  - Anthropic / Claude Code style context engineering
  - Weaviate context failure modes
  - Mem0 componentized memory
  - Factory structured summaries and probes
  - ACON compression failure learning
  - LLMLingua / prompt compression surveys

#### Test scenarios

- RED: Verify the report initially lacks one or more required source names.
- GREEN: Add a compact research-backed principles section and failure-mode safeguards.
- REFACTOR: Ensure each external idea maps to a concrete Super Pi agent behavior.

#### Verification

```bash
grep -q "Anthropic" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "Weaviate" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "Mem0" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "Factory" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "ACON" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "LLMLingua" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "poisoning" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "distraction" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
```

#### Dependencies

Depends on Unit 1.

---

### Unit 4: Add `05-learn` feedback loop, skill-rule candidates, and future blueprint

#### Goal

Make the report directly reusable by future skills while clearly separating current operating discipline from future tooling ideas.

#### Files

- Modify: `docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md`

#### Patterns to follow

- Use `05-learn`’s purpose: solved problems become reusable solution artifacts.
- Keep future blueprint as appendix, not the main body.
- Make rule candidates copyable into skill files later.

#### Test scenarios

- RED: Verify the report lacks `02-plan`, `04-review`, or `05-learn` rule candidates.
- GREEN: Add:
  - memory failure capture loop for `05-learn`
  - candidate rules for `02-plan`
  - candidate rules for `04-review`
  - candidate rules for `05-learn`
  - future blueprint items: memory router, retrieval budget, scoring, context assembly policy, compression quality probes, auto indexes
- REFACTOR: Make clear which items are current rules vs future ideas.

#### Verification

```bash
grep -q "02-plan" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "04-review" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "05-learn" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "memory router" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "retrieval budget" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "compression quality" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
```

#### Dependencies

Depends on Units 2 and 3.

---

### Unit 5: Final report quality check and handoff

#### Goal

Verify that the report satisfies requirements, avoids over-academic drift, and does not encourage context-heavy behavior.

#### Files

- Modify if needed: `docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md`
- Update handoff: `.context/compound-engineering/handoffs/latest.md`

#### Patterns to follow

- Requirements from `docs/brainstorms/2026-04-30-ai-memory-solutions-context-optimization-requirements.md`.
- Shared pipeline handoff-lite template.

#### Test scenarios

- RED: Run checks and identify missing required content or unwanted guidance.
- GREEN: Patch the report until all checks pass.
- REFACTOR: Tighten wording; remove speculative future content from the main body.

#### Verification

```bash
grep -q "Do not read all of docs/solutions" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "handoff-lite" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "workflow_state.context" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "Future Blueprint Appendix" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
! grep -qi "always read all" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
```

#### Dependencies

Depends on Units 1-4.

## Verification strategy

Because this task creates a report rather than code, verification is contract-based rather than test-suite based.

Primary verification:

```bash
test -f docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "## Executive Rules" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "## Memory Taxonomy for Super Pi" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "## docs/solutions Retrieval Protocol" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "## Skill-rule Candidates" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "## Future Blueprint Appendix" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
```

Content safety verification:

```bash
grep -q "Do not read all of docs/solutions" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "top 1-3" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "frontmatter" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
grep -q "handoff-lite" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
! grep -qi "always read all" docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md
```

Optional repository verification after documentation-only changes:

```bash
bun test
bunx tsc --noEmit
```

## Execution order

Unit 1 → Unit 2 → Unit 3 → Unit 4 → Unit 5

## Notes for `03-work`

- This is documentation/report work. Keep TDD gates as contract checks with `test` / `grep` commands.
- Do not broaden into implementation unless the user explicitly changes scope.
- Keep future-tooling ideas in the appendix only.
- Preserve the central principle: long-term memory should be searchable and path-addressable, not preloaded into active context.
