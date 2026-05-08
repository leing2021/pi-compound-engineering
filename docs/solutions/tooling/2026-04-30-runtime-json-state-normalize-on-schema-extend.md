---
title: Normalize runtime JSON state after schema extension
category: tooling
severity: medium
tags:
  - runtime-state
  - json-normalize
  - backward-compatibility
  - schema-extension
  - type-filter
  - context-state
  - safe-defaults
applies_when:
  - Adding new required or optional fields to a persisted JSON state shape
  - Reading context-state.json or similar runtime state after a schema upgrade
  - Extending TypeScript tool interfaces with new array or primitive fields
  - Reviewing tools that read persisted state and return typed results
---

# Problem

When a TypeScript tool's state schema is extended with new fields (e.g. adding `currentTruth: string[]` to an existing `ContextStateEntry`), the runtime JSON file on disk still contains the **old shape**. Code that reads this file with `JSON.parse(...) as NewType` will get `undefined` for the new fields instead of safe defaults.

Similarly, when reading JSON arrays with `Array.isArray(x) ? x : []`, non-string entries (e.g. `[123, null, {nope: true}]`) pass through, violating the `string[]` return contract and potentially causing downstream errors.

# Context

This surfaced during the Super Pi context-handoff structured runtime-memory upgrade (plan `docs/plans/2026-04-30-context-handoff-structured-runtime-memory-plan.md`). Five new optional array fields were added to `context_handoff` and `workflow_state`. Both tools read persisted `context-state.json`, but:

1. **`context_handoff`** used `JSON.parse(raw) as ContextStateEntry` — old state files lacked the new fields, causing `load`/`status` to return `undefined` instead of `[]`.
2. **`workflow_state`** used `Array.isArray(x) ? x : []` — accepted `[42, null]` as valid `string[]`, violating the interface contract.

Both issues were caught in `/skill:04-review` by writing legacy-state and malformed-state regression tests before applying fixes.

# Solution

After extending a persisted state schema, add a **normalization layer** between `JSON.parse` and the typed consumer:

```typescript
// 1. Filter arrays to expected element type
function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

// 2. Normalize the full state with safe defaults for every field
function normalizeStateEntry(raw: unknown): StateEntry | null {
  if (!raw || typeof raw !== "object") return null
  const state = raw as Record<string, unknown>
  return {
    // ...existing fields with typeof guards...
    newField: toStringArray(state.newField),
    optionalString: typeof state.optionalString === "string" ? state.optionalString : undefined,
    optionalBoolean: typeof state.optionalBoolean === "boolean" ? state.optionalBoolean : undefined,
  }
}

// 3. Use in readState
const parsed = JSON.parse(content)
return normalizeStateEntry(parsed)  // instead of: parsed as StateEntry
```

Key principles:

- **Never cast `JSON.parse` output directly to the target type** when the shape may have evolved.
- **Filter arrays by element type**, not just `Array.isArray`.
- **Default optional arrays to `[]`**, not `undefined`, to keep consumers simple.
- **Default primitives with `typeof` guards** — `undefined` for missing optional primitives.

# Why this works

JSON persistence is inherently schemaless. TypeScript types only exist at compile time, not at runtime. When the compile-time schema evolves, the runtime data doesn't automatically follow. A normalization layer bridges this gap deterministically, without needing runtime schema validators like Zod for internal state files.

The approach is:

- **Backward compatible**: old state files produce valid new-shape objects.
- **Forward compatible**: extra unknown fields are silently ignored.
- **Deterministic**: same input always produces same output; no LLM/probe needed.
- **Zero-dependency**: pure TypeScript type guards, no external validation library.

# Prevention

For future `02-plan` and `04-review` runs:

1. **When planning schema extensions to persisted state**, add a normalization unit or step.
2. **When reviewing tools that read JSON from disk**, check that `JSON.parse` is followed by normalization, not a raw type assertion.
3. **Add regression tests** for:
   - Legacy state (missing new fields) → safe defaults.
   - Malformed state (wrong types in arrays) → filtered defaults.
   - Completely corrupted JSON → graceful fallback.
4. **Search tags**: `runtime-state`, `json-normalize`, `backward-compatibility`, `schema-extension`, `safe-defaults` before proposing similar schema changes.

# Related solutions

- `docs/solutions/tooling/tool-parameter-type-robustness.md` — handles **input** parameter type mismatch (string→Array); this doc handles **output/state** normalization after schema extension. Different angle, same domain.
- `docs/solutions/architecture/2026-04-24-runtime-context-path-portability.md` — repo-relative paths in runtime state; complementary portability concern.
- `docs/solutions/workflow/2026-04-24-evidence-first-handoff-lite-template.md` — the handoff template this schema extension supports.
