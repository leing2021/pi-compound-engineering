---
title: Separate tool input and output types, filter placeholder evidence in validation probes
category: tooling
severity: medium
tags:
  - context-handoff
  - validate
  - input-output-separation
  - placeholder-filtering
  - evidence-probe
  - repo-relative-path
  - public-path
  - interface-design
applies_when:
  - Adding a validation or read-only operation to an existing tool with save/load operations
  - Implementing probe-based evidence checking against persisted state and markdown
  - Returning validation results (ok, probes, checks, missing, warnings) from a tool
  - Filtering placeholder values from structured state arrays before treating them as evidence
  - Ensuring public tool output paths remain repo-relative regardless of input path format
---

# Problem

When adding a `validate` operation to `context_handoff`, four issues surfaced during `04-review`:

1. **Input/output type conflation**: Validation output fields (`ok`, `probes`, `checks`, `missing`, `warnings`, `recommendedAction`) were added to `ContextHandoffInput` as well as `ContextHandoffResult`. These fields are output-only and have no meaning as input parameters, polluting the public API.

2. **Placeholder evidence in structured state**: `hasMeaningfulArray()` only checked `arr.length > 0`, so structured state arrays like `currentTruth: ["N/A"]`, `activeFiles: ["N/A"]`, or `openDecisions: ["Not run"]` counted as valid evidence. This made probes pass when they should fail.

3. **Absolute path leak in explicit handoffPath**: When the caller passed an absolute `handoffPath` to `validate`, the result's `path` field returned the absolute path verbatim, violating the repo-relative public path convention.

4. **Absolute path leak in legacy state**: Legacy `context-state.json` files could contain an absolute `latestHandoffPath`. The validate function returned it as-is, also violating the repo-relative convention.

# Context

This surfaced during the Route B-lite implementation (`context_handoff validate` operation) for Super Pi. The tool already had `save`, `load`, `latest`, and `status` operations, and `validate` was being added as a fifth.

The four issues were caught by `04-review` through targeted regression tests written before fixes:

- `validate returns repo-relative path for explicit absolute repo handoff path`
- `validate ignores placeholder structured state values`
- `validate normalizes absolute state handoff path in public result`

Related prior solutions:

- `docs/solutions/tooling/2026-04-30-runtime-json-state-normalize-on-schema-extend.md` — schema extension normalization (moderate overlap, different angle).
- `docs/solutions/architecture/2026-04-24-runtime-context-path-portability.md` — repo-relative path convention (this solution extends it with `toPublicHandoffPath`).

# Solution

### 1. Separate input and output types

Validation output fields must only exist in the result interface:

```typescript
// WRONG — output fields in input API
interface ContextHandoffInput {
  operation: "save" | "load" | "validate"
  ok?: boolean
  probes?: ValidationProbes
  // ...
}

// CORRECT — output fields only in result
interface ContextHandoffInput {
  operation: "save" | "load" | "validate"
  repoRoot: string
  handoffPath?: string
  // ... only caller-provided parameters
}

interface ContextHandoffResult {
  ok?: boolean
  probes?: ValidationProbes
  checks?: ValidationCheck[]
  missing?: string[]
  warnings?: string[]
  recommendedAction?: RecommendedAction
  // ...
}
```

### 2. Filter placeholder values in evidence checks

Evidence-checking helpers must treat placeholder values as absent:

```typescript
const PLACEHOLDER_VALUES = new Set(["n/a", "na", "not run", "none", "", "-"])

function isPlaceholder(text: string): boolean {
  const trimmed = text.trim().toLowerCase()
  return PLACEHOLDER_VALUES.has(trimmed)
}

function isMeaningfulText(value?: string): boolean {
  return Boolean(value && !isPlaceholder(value))
}

function hasMeaningfulArray(arr: string[]): boolean {
  return arr.some(item => isMeaningfulText(item))
}
```

This applies to both:
- **Structured state fields** (`currentTruth`, `activeFiles`, `openDecisions`, etc.)
- **Markdown section content** parsed from handoff files

### 3. Normalize all public paths to repo-relative

Add a helper that converts any path to repo-relative for output:

```typescript
function toPublicHandoffPath(repoRoot: string, filePath: string): string {
  return path.isAbsolute(filePath)
    ? toRepoRelative(repoRoot, filePath)
    : filePath
}
```

Apply it to:
- `input.handoffPath` when used as public output
- `state.latestHandoffPath` from persisted state (may be absolute in legacy files)
- Any computed absolute path that becomes public output

### 4. Regression tests

Add regression tests for each scenario:

- Validation output fields not accepted as input parameters
- Placeholder structured state arrays do not pass evidence probes
- Explicit absolute handoffPath produces repo-relative output path
- Legacy absolute latestHandoffPath in state produces repo-relative output path

# Why this works

1. **Input/output separation** keeps the tool's public API clean. Callers cannot accidentally pass validation results as input. TypeScript enforces this at compile time.

2. **Placeholder filtering** ensures probes reflect actual information content, not template boilerplate. A `currentTruth: ["N/A"]` from a default template is not evidence — it's a placeholder that should trigger `missing` or `warnings`.

3. **Repo-relative path normalization** ensures the same convention applies regardless of how paths enter the system. Legacy state, explicit input, or computed paths all go through `toPublicHandoffPath()` before appearing in output.

4. **Regression tests** lock the behavior. Future changes that accidentally regress any of these will fail immediately.

# Prevention

For future tool implementations that add validation or inspection operations:

- Keep input and output interfaces strictly separate. Output-only fields must never appear in the input type.
- When checking whether structured data "has evidence", filter placeholder values — never assume non-empty array or non-empty string equals meaningful content.
- When returning file paths in tool output, always normalize through a `toPublic*` helper. Never trust that input paths or persisted paths are already in the desired format.
- Write regression tests for: placeholder evidence, absolute path input, legacy state with absolute paths, and input/output type separation.
