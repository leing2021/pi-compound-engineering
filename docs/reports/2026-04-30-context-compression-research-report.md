# Context Compression and Context Engineering Research Report

> Date: 2026-04-30  
> Project: Super Pi  
> Scope: external context-compression/context-engineering practices and their implications for Super Pi workflow memory, handoff, and compaction strategy.

## Executive Summary

The most actionable conclusion is that Super Pi should treat context optimization as **context engineering**, not just prompt compression. The biggest near-term ROI is not a generic token compressor, but a structured runtime-memory layer that preserves continuation-critical facts while keeping broad history outside the active prompt.

Recommended priority:

1. **Route A — Enhance `handoff / context_handoff`**: low risk, Super Pi-controlled, immediate ROI.
2. **Route B — Add lightweight compression-quality probes**: validate that compressed/handoff context still supports continuation.
3. **Route C — Improve Pi core compaction / skill block handling**: important but higher-risk and likely upstream-facing.

This report informed the first implementation pass that upgraded `context_handoff` and `workflow_state.context` into structured runtime-memory anchors.

## External Best Practices

### 1. Anthropic: Context Engineering for Agents

Key ideas:

- More context is not always better; models have an effective **attention budget**.
- Long-running agents benefit from three mechanisms:
  1. **Compaction** — when approaching context limits, compress history into a high-fidelity summary.
  2. **Structured note-taking** — maintain external notes, TODOs, and structured state outside the active prompt.
  3. **Subagents** — isolate deep investigation in separate contexts and return only distilled findings, often around 1,000–2,000 tokens.
- One Claude Code-style practice is preserving a summary plus the **5 most recently accessed files** after compaction.
- Start by maximizing recall so critical facts are not lost; then improve precision by removing redundant tool output.

Implications for Super Pi:

- Super Pi already has aligned primitives: handoff-lite, checkpoints, and subagents.
- The next improvements should preserve:
  - architecture decisions,
  - unresolved bugs,
  - implementation details,
  - recently active files.
- Tool output, especially `bash` and `read`, can be folded more aggressively.
- Subagents should be used for isolated deep dives; the main context should keep only conclusions and evidence.

## 2. Weaviate: Context Failure Modes

Weaviate frames large-context failures as context hygiene problems, not just capacity problems.

Failure modes:

1. **Context Poisoning** — incorrect or hallucinated information enters context and continues to bias later reasoning.
2. **Context Distraction** — too much old history or tool output distracts the model from the current task.
3. **Context Confusion** — irrelevant tools, docs, or rules crowd the prompt and cause the model to use the wrong rule/tool.
4. **Context Clash** — contradictory assumptions coexist and the model cannot reliably resolve them.

Implications for Super Pi:

- Super Pi should optimize for **context hygiene**, not only smaller prompts.
- Handoff/runtime state should explicitly track:
  - `Do Not Repeat`,
  - `Invalidated Assumptions`,
  - `Current Truth`,
  - `Current Blocker`.
- These sections reduce repeated exploration, repeated verification, and stale assumptions after compaction or session handoff.

## 3. Mem0: Componentized Context Engineering

Mem0 decomposes context engineering into distinct components:

- **Selection/filtering** — choose information by relevance, recency, and importance.
- **Compression/distillation** — extractive summaries, generative summaries, and key-value/fact distillation.
- **Temporal management** — short-term vs. long-term memory, session vs. cross-session memory, forgetting policy.
- **Context assembly/ordering** — decide what order context appears in the prompt.
- **Feedback/adaptation loop** — update strategy based on failures.

Implications for Super Pi:

- Super Pi's hot/warm/cold tiering is directionally correct.
- `.context/compound-engineering/` should be treated as runtime memory:
  - **Hot**: must-know current-task information.
  - **Warm**: artifact paths and recoverable state.
  - **Cold**: historical process details only read when auditing or debugging.
- Recommended context assembly order:
  1. system / skill instructions,
  2. current task,
  3. blocker and verification,
  4. active files,
  5. artifact references,
  6. historical summaries last, or omitted unless needed.

## 4. Factory.ai: Structured Summaries and Compression Quality Evaluation

Factory's key insight is that the goal is not the smallest prompt; it is the lowest **total tokens per successful task**.

Key ideas:

- Over-compression can make the agent forget files changed, attempted strategies, and decisions, causing repeated exploration and higher total token cost.
- Probe-based evaluation can test compressed-context quality:
  - **Recall probe** — does the agent remember the original problem/error/user goal?
  - **Artifact probe** — does it know which files were read/modified and why?
  - **Continuation probe** — does it know the next minimal step?
  - **Decision probe** — does it remember key decisions and rejected options?
- Factory favors **anchored iterative summarization**:
  - keep a persistent structured summary anchor,
  - summarize only newly truncated ranges,
  - merge increments into the existing anchor,
  - avoid regenerating full summaries every time.
- Structured sections force the model not to silently drop file paths, decisions, and next steps.

Implications for Super Pi:

- Super Pi's handoff-lite is already close to a structured summary.
- It can evolve into an anchored runtime summary:
  - `.context/compound-engineering/context-state.json` acts as the anchor,
  - each phase/unit merges only incremental state,
  - probes/checklists validate that critical facts survive.
- First version should use deterministic checklist/tests before adding any LLM judge.

## 5. ACON: Learning From Compression Failures

ACON optimizes compression guidelines from failure trajectories:

- Find cases where full context succeeds but compressed context fails.
- Ask a stronger model why the compressed context was insufficient.
- Update natural-language compression guidelines.
- Reported result: peak tokens reduced by 26%–54% while mostly preserving task performance.

Implications for Super Pi:

- Compression failures should become `05-learn` inputs.
- If a new session has to reread many files because handoff was insufficient, record:
  - which field was missing,
  - which fact should have been preserved,
  - which handoff/template rule should be updated.
- This fits Super Pi's `05-learn` and `pattern_extractor` direction.

## 6. LLMLingua / Prompt Compression Survey

LLMLingua-style methods focus on generic prompt compression:

- sentence/word-level compression,
- dedicated compression models or algorithms,
- high compression ratios for long RAG passages.

Implications for Super Pi:

- These are not the best first move for Super Pi.
- Super Pi's main context problems are:
  - large tool output,
  - historical stages remaining in the main conversation,
  - skill blocks being treated as normal messages during Pi compaction,
  - lack of structured anchors for files, decisions, blockers, and verification.
- Generic prompt compressors should be deferred until Super Pi-controlled runtime memory is stronger.

## Recommended Optimization Routes

### Route A — Enhance existing `handoff / context_handoff`

Status: **highest priority; low risk; high ROI**.

Borrowed ideas:

- Anthropic: preserve recently active files.
- Factory: structured summary sections.
- Weaviate: context hygiene fields.
- Mem0: hot/warm/cold runtime memory.

Concrete changes:

- Strengthen `.context/compound-engineering/handoffs/latest.md`.
- Add fields:
  - `Current Truth`,
  - `Invalidated Assumptions`,
  - `Do Not Repeat`,
  - `Open Decisions`,
  - `Recently Accessed Files`,
  - `Compression Risk`.
- Make `context_handoff` generate an evidence-first default template.
- Make `workflow_state` expose context health, latest handoff, blocker, verification, and structured state.
- Ensure each phase writes handoff-lite at the boundary.

Advantages:

- Does not touch Pi core.
- Aligns with existing Super Pi docs and workflow artifacts.
- Easy to test and release incrementally.

Limitations:

- Depends on agents/tools following the template.
- Does not solve Pi core compaction damaging skill blocks.

### Route B — Add compression quality probes

Status: **second priority; validates that context optimization is real**.

Candidate probes:

1. **Recall probe** — What is the original problem/error/user goal?
2. **Artifact probe** — What files are active and why?
3. **Continuation probe** — What is the next minimal action?
4. **Decision probe** — What key decisions were made and what options were rejected?

Possible implementations:

- Documentation checklist.
- `context_handoff validate` operation.
- Tests in `context-handoff.test.ts` checking required sections.
- Later: optional LLM judge.

Advantages:

- Prevents fake wins where context is shorter but no longer useful.
- Builds a Super Pi differentiator around **token ROI**, not token minimization.

Limitations:

- Requires defining good evaluation criteria.
- Automated scoring may add complexity; first version should remain checklist-based.

### Route C — Improve Pi core compaction / skill block handling

Status: **important but higher-risk; likely later/upstream-facing**.

Problem from `docs/pi-compaction-proposal.md`:

- `/skill:xxx` injects full `SKILL.md` as a message.
- Pi compaction treats that skill block as ordinary user content.
- Repeated compaction can degrade or lose active skill rules.
- Summaries do not include an active skill inventory.

Possible improvements:

- Detect `<skill name="..." location="...">...</skill>` blocks before compaction.
- Replace large skill body with a compact reloadable marker:

```xml
<skill name="01-brainstorm" location="...">[compressed; reload with /skill:01-brainstorm]</skill>
```

- Add compaction summary sections:
  - `Active Skills Used`,
  - `Reload Instructions`,
  - `Current Stage`.
- Clear or summarize large tool results more aggressively.

Advantages:

- Addresses skill instruction loss at the root.
- Reduces repeated compaction of large skill bodies.

Limitations:

- Requires Pi core or upstream changes.
- Higher release and maintenance cost.
- Less directly controllable by Super Pi.

## Premise Challenge

The recommended priority assumes:

1. Super Pi's current largest issue is not raw context-window size, but failure to move cold context out of the main conversation at phase boundaries.
2. For Super Pi, structured handoff plus artifact paths has higher ROI than a generic text compressor.
3. Pi core skill-block compaction is important but should not block Super Pi-controlled runtime-memory improvements.

These premises should be revisited after collecting evidence from future failures.

## First Implementation Outcome

The first pass followed Route A and implemented structured runtime-memory anchors:

- `context_handoff` now supports:
  - `currentTruth`,
  - `invalidatedAssumptions`,
  - `openDecisions`,
  - `recentlyAccessedFiles`,
  - `compressionRisk`.
- These fields persist in `.context/compound-engineering/context-state.json`.
- `workflow_state.context` reads and exposes runtime context state.
- Default handoff-lite template includes the new sections.
- Review added safety fixes:
  - legacy runtime state normalization,
  - string-array filtering for persisted JSON arrays.

Verification at implementation time:

- `bun test` passed with 191 tests after Route A.
- Later thinkingStrategy fix raised the suite to 192 passing tests.
- `bunx tsc --noEmit` passes after fixing the `thinkingStrategy` API target.

## Future Work

Recommended next steps:

1. Add Route B as a lightweight checklist or `context_handoff validate` operation.
2. Teach `/skill:06-next` to use `workflow_state.context` for recommendations.
3. Track compression/handoff failures as `05-learn` artifacts.
4. Revisit Pi core compaction/skill-block handling after Super Pi-controlled memory proves useful.
5. Continue reducing large tool output in `read` and `bash` filters while preserving evidence.
