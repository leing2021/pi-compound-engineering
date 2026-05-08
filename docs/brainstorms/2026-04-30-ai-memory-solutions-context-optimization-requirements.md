---
date: 2026-04-30
topic: ai-memory-solutions-context-optimization
status: brainstormed
mode: CE Brainstorm
---

# AI Memory Best Practices for Super Pi Agents - Requirements

## Problem

Super Pi already has several memory-like mechanisms:

- `05-learn` writes reusable learnings into `docs/solutions/`
- solution artifacts include YAML frontmatter for grep-first retrieval
- `02-plan` and `04-review` reference `05-learn/references/solution-search-strategy.md`
- `context_handoff` and handoff-lite preserve continuation-critical facts
- reports and brainstorms preserve broader design history

The remaining problem is not lack of memory volume. The risk is that future agents may use memory inefficiently by reading too many historical documents, loading irrelevant solutions, repeating verification, or allowing stale context to distract from the current task.

The desired output is a research-informed principles report that teaches future Super Pi agents how to use memory with high token ROI.

## Goals

1. Produce a research report / principles checklist for future AI agents and skills.
2. Prioritize immediately usable operating discipline over new system implementation.
3. Explain how to use `docs/solutions` efficiently as long-term searchable memory.
4. Explain how `handoff-lite` / `context_handoff` should act as hot memory for continuation.
5. Define low-context retrieval and context assembly rules that reduce active prompt size.
6. Make the rules easy to later convert into `02-plan`, `04-review`, and `05-learn` skill instructions.
7. Include a short future blueprint appendix for possible memory-router / scoring / probe enhancements.

## Non-goals

- Do not design or implement a full memory system in this step.
- Do not require vector databases, embeddings, or automatic indexing as a near-term dependency.
- Do not write a strict academic literature review with DOI-level references.
- Do not replace existing `solution-search-strategy.md` or handoff mechanisms yet.
- Do not encourage all historical artifacts to enter the active prompt.

## Audience

Primary audience: future AI agents / skills operating inside Super Pi.

Secondary audience: human maintainers who may later convert the principles into concrete skill rules or tooling.

The report should therefore be written as an operational guide:

```text
principle -> why it matters -> how Super Pi agents should apply it -> what not to do
```

## Confirmed premises

1. Super Pi memory optimization should prioritize restoring sufficient decision capability with less active context, not remembering more.
2. `docs/solutions` is long-term searchable memory. It should not be loaded by default; only top-N relevant artifacts should be read in full after frontmatter-based filtering.
3. `handoff-lite` / `context_handoff` should be the hot memory entry point for continuation and phase transitions, preferred over historical chat transcript.
4. The report should focus on current operating discipline. Future memory-system ideas belong in an appendix.

## External practice coverage

The report should mention source names and key ideas only, not strict citations:

- Anthropic / Claude Code style context engineering: attention budget, structured notes, subagents, compaction.
- Weaviate context failure modes: poisoning, distraction, confusion, clash.
- Mem0 componentized memory: selection, compression, temporal management, context assembly, feedback loop.
- Factory-style structured summaries and compression-quality probes: optimize total tokens per successful task, not shortest prompt.
- ACON-style compression failure learning: learn from cases where compressed context misses critical facts.
- LLMLingua / prompt-compression surveys: generic prompt compression is useful but not Super Pi's highest near-term ROI.

## Approach options

### Option A: Conservative operating rules only

Write a compact guide that only covers current mechanisms:

- `handoff-lite`
- `workflow_state.context`
- `docs/solutions`
- `solution-search-strategy.md`
- hot/warm/cold artifact tiering

Pros:
- Immediate usefulness.
- Low risk.
- Easy for agents to follow.

Cons:
- Less inspiring as a long-term direction.
- May not capture future automation ideas.

### Option B: Full memory-system blueprint

Write a broader design for:

- memory router
- retrieval scoring
- automatic indexing
- compression probes
- memory budgets
- adaptive feedback loop

Pros:
- Provides a strong future architecture.
- Could guide multiple implementation phases.

Cons:
- More speculative.
- Higher risk of overengineering.
- Less immediately actionable for current agents.

### Option C: Conservative rules plus future blueprint appendix

Make the main report a practical agent rulebook, then add a short appendix for future evolution.

Pros:
- Preserves immediate value.
- Still captures future direction.
- Best fit for later conversion into skill rules.

Cons:
- Requires clear separation between current rules and future ideas.

## Recommended direction

Choose Option C.

The main body should be an operational guide for current Super Pi agents. The appendix should outline future enhancements without making them prerequisites.

Suggested report path:

`docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md`

## Suggested report outline

1. Executive rules
2. Memory taxonomy for Super Pi
   - hot memory: `handoff-lite`, `workflow_state.context`
   - warm memory: current requirements, plan, proof, checkpoint
   - cold memory: `docs/solutions`, reports, historical brainstorms/plans
3. Research-backed principles
4. `docs/solutions` retrieval protocol
   - extract keywords
   - grep frontmatter first
   - read candidate frontmatter only
   - rank candidates
   - full-read top 1-3 only
   - keep conclusions and paths, not full historical text
5. Context assembly budget
6. What should enter active context
7. What should stay as paths only
8. Failure modes and safeguards
9. `05-learn` feedback loop for memory failures
10. Skill-rule candidates for `02-plan`, `04-review`, and `05-learn`
11. Future blueprint appendix

## Concrete agent rules to include

- Do not read all of `docs/solutions`.
- Do not load historical reports unless the current task requires them.
- Prefer `workflow_state.context` and latest handoff for continuation.
- Treat solution artifacts as searchable long-term memory, not prompt preload.
- Search frontmatter before reading full files.
- If more than 10 candidates appear, narrow the query before reading.
- If fewer than 3 candidates appear, broaden search once, then stop if still irrelevant.
- Full-read at most top 1-3 solution files.
- After reading a memory artifact, keep only the actionable rule, evidence path, and relevance summary in active context.
- If memory retrieval prevents a mistake, mention the solution path.
- If insufficient memory causes rereading/rework, capture that failure through `05-learn`.
- Distinguish verified facts from assumptions.
- Put invalidated assumptions and do-not-repeat items into handoff.

## Success criteria

1. Future agents can use the report to reduce unnecessary file reads.
2. Future agents can use `docs/solutions` without loading the whole knowledge base.
3. The report clearly separates hot, warm, and cold memory.
4. The report produces rules that can be copied or adapted into `02-plan`, `04-review`, and `05-learn`.
5. The report explains how to avoid context poisoning, distraction, confusion, and clash.
6. The report includes a future blueprint but does not make future tooling a prerequisite.
7. The report remains concise enough to be read selectively by agents.

## Likely files/modules for future work

If the user later approves implementation planning, likely affected areas include:

- `docs/reports/2026-04-30-ai-memory-best-practices-for-super-pi-agents.md`
- `skills/05-learn/references/solution-search-strategy.md`
- `skills/02-plan/SKILL.md`
- `skills/04-review/SKILL.md`
- `skills/05-learn/SKILL.md`
- `skills/references/pipeline-config.md`
- possible future tooling under `extensions/ce-core/tools/`

## Verification approach

For the report itself:

- Check that it includes practical rules, not only theory.
- Check that every rule maps to an existing Super Pi mechanism or is clearly marked future work.
- Check that `docs/solutions` retrieval is top-N and frontmatter-first.
- Check that handoff-lite is described as hot memory.
- Check that success criteria are actionable.

For later implementation:

- Add or update skill-contract tests if rules move into skills.
- Verify `02-plan` / `04-review` still reference solution-search strategy.
- Verify no instruction encourages full knowledge-base preload.
