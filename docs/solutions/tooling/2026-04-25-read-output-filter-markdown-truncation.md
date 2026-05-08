---
title: "Read Output Filter Over-Truncation in Markdown Files"
category: tooling
severity: medium
tags: [read-output-filter, markdown, truncation, context-waste, tool-result-hook, pi-extension, filter-threshold, list-preservation]
applies_when: [reading markdown docs in brainstorm or plan phases, noticing missing key definitions after read, seeing "Read output filtered" with strategy markdown, architecture docs losing subsystem details, list items disappearing from filtered output]
---

# Problem

The `read-output-filter` extension (ce-core) applied aggressive truncation to markdown files ≥ 2KB via the `tool_result` hook. The `filterMarkdown()` function only kept headings and the first line of each paragraph, discarding:

- **List items** (`-`, `*`, `1.`) — which often contain key definitions (subsystems, components, steps)
- **Paragraph body** after the first line — where detailed descriptions live
- Files between 2KB–8KB were filtered even though they're small enough to pass through

**Concrete symptom:** When reading three tri_brain architecture docs, the Builder role and its five subsystems (Schema OS, Prompt OS, Pipeline OS, QA OS, Versioning OS) were completely omitted from filtered output, leading to incorrect analysis.

# Context

The filter sits in the `tool_result` hook pipeline:

```
read tool executes (pi-coding-agent)
  → full output returned
  → tool_result hook fires (ce-core extension)
  → filterReadOutput() applies type-based strategy
  → markdown strategy: filterMarkdown()
  → LLM receives truncated content, unaware of what was lost
```

The irony: the bug report itself was also truncated when read with the `read` tool, demonstrating this is a systemic issue, not a one-off.

# Solution

Three changes applied to `extensions/ce-core/tools/read-output-filter.ts`:

### 1. Raised markdown threshold from 2KB to 8KB

```typescript
const MARKDOWN_FILTER_THRESHOLD = 8192 // 8KB — markdown docs are dense, don't filter small ones
```

Files 2KB–8KB now pass through unfiltered. Most architecture docs in this range contain concentrated information that shouldn't be lossy-compressed.

### 2. Improved `filterMarkdown()` to preserve key content

| Before | After |
|--------|-------|
| Paragraph: 1 line kept | Paragraph: **3 lines** kept |
| List items: treated as paragraph, truncated | List items: **fully preserved** |
| Omit marker: repeated per skipped line | Omit marker: **once per paragraph** |

The list preservation regex: `/^[-*+]\s/` and `/^\d+\.\s/` (applied to trimmed lines).

### 3. Actionable filter notice with actual file path

```
Before: [Read output filtered: 8.0KB → 5.3KB (1.8KB saved, strategy: markdown (headings + first paragraph))]
After:  [Read output filtered: 8.0KB → 5.3KB (1.8KB saved, strategy: markdown (...)). If you need the full content, use: bash cat docs/architecture.md]
```

The actual path is passed through `appendFilterNotice(path)` so LLMs can act on it immediately.

# Why this works

The root cause was a **mismatch between filter strategy and content semantics**. The `headings + first paragraph` heuristic works for blogs and articles where the first paragraph summarizes the section. It fails catastrophically for architecture docs where:

- The first paragraph is a vague intro ("The system has these components:")
- The **actual information** is in the list items and subsequent paragraphs
- Each list item is a self-contained definition that can't be partially kept

The fix respects markdown semantics: lists are definition-like structures, code blocks are verbatim content, and paragraphs need more than one line to capture substance.

# Prevention

When designing output filters:

1. **Different content types need different thresholds.** Code at 8KB is massive; markdown at 8KB is a medium doc. Use per-type thresholds.
2. **List items are not paragraph filler.** They're structured data within prose. Always preserve them.
3. **Filter notices should be actionable.** Tell the LLM exactly how to get the full content, not just that filtering happened.
4. **Test with real-world documents**, not synthetic fixtures. The original bug only surfaced because real architecture docs have dense lists after vague intros.
5. **When `filterX()` logic changes, verify the 20% reduction gate still works.** More preservation means less compression — the gate correctly skips filtering when it doesn't help enough.
