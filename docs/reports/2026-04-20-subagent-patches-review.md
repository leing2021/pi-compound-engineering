# Code Review: Subagent Recursion Guard + Context Slimming

> Date: 2026-04-20
> Scope: 5 files (+432 / -27), new module `subagent-depth-guard.ts`
> Reviewers: correctness, testing, maintainability, thoroughness

---

## Diff Summary

| File | Change |
|---|---|
| `extensions/ce-core/tools/subagent-depth-guard.ts` | **NEW** — 75 lines, env-based depth tracking |
| `extensions/ce-core/tools/subagent.ts` | +depth guard, +`inheritSkills`, +`SubagentExecOptions` |
| `extensions/ce-core/tools/parallel-subagent.ts` | +depth guard, +`inheritSkills` (default: false) |
| `extensions/ce-core/index.ts` | +schema fields, +env save/restore in runner closures |
| `tests/ce-core-extension.test.ts` | +16 tests, +3 export assertions |

---

## Findings

### F-1: `process.env` save/restore is NOT concurrency-safe for parallel subagents

**Severity: HIGH**
**Reviewer: correctness-reviewer**
**Autofixable: YES**

**Evidence:**

`extensions/ce-core/index.ts` lines ~273-297 and ~395-417 use a save-modify-restore pattern:

```typescript
const savedEnv: Record<string, string | undefined> = {}
for (const [key, value] of Object.entries(extraEnv)) {
  savedEnv[key] = process.env[key]   // save
  process.env[key] = value            // modify
}
try {
  await pi.exec("pi", args, ...)      // child inherits process.env
} finally {
  // restore
}
```

`parallel-subagent.ts` runs all tasks via `Promise.allSettled`, meaning **multiple runner closures execute concurrently**. They all write to the same global `process.env.PI_SUBAGENT_DEPTH` key.

**Race scenario** (3 parallel tasks, original env has no `PI_SUBAGENT_DEPTH`):

1. Runner A saves `undefined`, sets `"1"`
2. Runner B saves `"1"` (set by A!), sets `"1"`
3. Runner C saves `"1"`, sets `"1"`
4. All execs see DEPTH=1 ✅ (correct)
5. Runner A finishes first → restores `undefined`
6. Runner B finishes → restores `"1"` ← **LEAK**
7. Runner C finishes → restores `"1"`
8. **Final: `PI_SUBAGENT_DEPTH = "1"` instead of `undefined`**

This means after a `parallel_subagent` call completes, the depth env variable is **leaked** into the parent process. Subsequent calls within the same process will see an incorrectly inflated depth.

**Verified** by running a simulated race:

```
A: saved=undefined, setting=1
B: saved=1, setting=1
C: saved=1, setting=1
A: restoring to=undefined   ← first to finish
C: restoring to=1           ← restores wrong value
B: restoring to=1           ← restores wrong value
Final: TEST_VAR=1           ← LEAKED (should be undefined)
```

**Recommended action:** Use a mutex/lock around the env mutation, or avoid the global env entirely by writing the env vars to a temp file that the child reads, or use a reference counter. Simplest fix: use an async mutex to serialize the env mutation + exec + restore block.

**Autofix applied:** ✅
- Added `AsyncMutex` class in `extensions/ce-core/tools/async-mutex.ts`
- Extracted shared `createSubagentRunner()` factory in `index.ts` (also fixes F-2)
- Both `subagent` and `parallel_subagent` use the factory with mutex protection
- Added 4 new tests: mutex serialization, mutex error release, parallel env isolation, serial env isolation

---

### F-2: `index.ts` has two identical runner closures (code duplication)

**Severity: MODERATE**
**Reviewer: maintainability-reviewer**
**Autofixable: YES**

**Evidence:**

The runner closures for `subagent` (lines ~270-299) and `parallel_subagent` (lines ~390-420) in `index.ts` are **byte-for-byte identical** — same save/restore logic, same args construction, same error handling.

```typescript
// Appears TWICE in index.ts:
async (prompt: string, options?: import("./tools/subagent").SubagentExecOptions) => {
  const args = ["--no-session", ...(options?.extraFlags ?? []), "-p", prompt]
  const savedEnv: Record<string, string | undefined> = {}
  const extraEnv = options?.extraEnv ?? {}
  for (const [key, value] of Object.entries(extraEnv)) {
    savedEnv[key] = process.env[key]
    process.env[key] = value
  }
  try { ... } finally { ... }
}
```

**Autofix applied:** ✅
- Extracted into `createSubagentRunner(pi, signal)` factory function
- Both tools now call the same factory
- Mutex protection is in the single shared location

---

### F-3: `subagent-depth-guard.ts` — `getMaxDepth` accepts negative max depths through the back door

**Severity: LOW**
**Reviewer: correctness-reviewer**
**Autofixable: YES**

**Evidence:**

```typescript
export function getMaxDepth(): number {
  const raw = process.env.PI_SUBAGENT_MAX_DEPTH
  if (!raw) return DEFAULT_MAX_SUBAGENT_DEPTH
  const max = parseInt(raw, 10)
  return Number.isNaN(max) || max < 0 ? DEFAULT_MAX_SUBAGENT_DEPTH : max
}
```

This correctly rejects negative values. However, `getChildDepthEnv` passes `overrides?.maxDepth` directly without the same validation:

```typescript
export function getChildDepthEnv(overrides?: {
  maxDepth?: number
}): Record<string, string> {
  const maxDepth = overrides?.maxDepth ?? getMaxDepth()
  return { PI_SUBAGENT_MAX_DEPTH: String(maxDepth) }
}
```

If someone calls `getChildDepthEnv({ maxDepth: -1 })`, the child process will receive `PI_SUBAGENT_MAX_DEPTH="-1"`, which `getMaxDepth` will then correct to the default. The guard holds, but it's a defense-in-depth gap.

**Recommended action:** Add validation in `getChildDepthEnv`:

```typescript
const maxDepth = overrides?.maxDepth
  ?? getMaxDepth()
if (maxDepth < 0) maxDepth = DEFAULT_MAX_SUBAGENT_DEPTH
```

**Autofix applied:** ✅ Added negative check in `getChildDepthEnv`.

---

### F-4: No test for the concurrency env leak

**Severity: MODERATE**
**Reviewer: testing-reviewer**
**Autofix applied:** ✅

Added 2 tests:
- `env is clean after parallel execution` — verifies `process.env.PI_SUBAGENT_DEPTH` is `undefined` after 3 parallel tasks
- `env is clean after serial chain execution` — verifies env is clean after serial chain

Plus 2 supporting tests for `AsyncMutex` itself.

---

### F-5: `parallel-subagent.ts` imports `SubagentRunner` from `subagent.ts` — coupling

**Severity: LOW**
**Reviewer: maintainability-reviewer**
**Autofixable: NO**

**Evidence:**

```typescript
import type { SubagentExecOptions, SubagentRunner } from "./subagent"
```

`parallel-subagent.ts` now depends on `subagent.ts` for its type definitions. This is acceptable given the relationship, but worth noting: if `subagent.ts` ever changes `SubagentRunner`'s signature, `parallel-subagent.ts` must be updated too.

**Recommended action:** Acceptable as-is. Consider moving `SubagentRunner` and `SubagentExecOptions` to a shared types file if more tools adopt this pattern.

---

### F-6: `buildExecOptions` and `buildParallelExecOptions` are nearly identical

**Severity: LOW**
**Reviewer: maintainability-reviewer**
**Autofixable: YES**

**Evidence:**

`subagent.ts`:
```typescript
function buildExecOptions(inheritSkills?: boolean): SubagentExecOptions {
  const flags: string[] = []
  const env: Record<string, string> = {}
  if (inheritSkills === false) { flags.push("--no-skills") }
  Object.assign(env, getChildDepthEnv())
  return { extraFlags: flags.length > 0 ? flags : undefined, extraEnv: env }
}
```

`parallel-subagent.ts`:
```typescript
function buildParallelExecOptions(inheritSkills: boolean): SubagentExecOptions {
  const flags: string[] = []
  const env: Record<string, string> = {}
  if (!inheritSkills) { flags.push("--no-skills") }
  Object.assign(env, getChildDepthEnv())
  return { extraFlags: flags.length > 0 ? flags : undefined, extraEnv: env }
}
```

The only difference is the default behavior (`undefined` vs `false`), which is handled at the call site. The functions themselves are identical.

**Recommended action:** Extract to a single shared `buildExecOptions(inheritSkills: boolean)` in `subagent-depth-guard.ts` or a shared util, or keep if you prefer explicit per-tool functions.

---

## What's Good

1. **`subagent-depth-guard.ts` is clean and self-contained** — no dependencies beyond `process.env`, easy to test, easy to reason about.
2. **Backward compatibility is solid** — all new params are optional, defaults preserve existing behavior.
3. **`inheritSkills` default differs between serial and parallel** — good design choice. Serial tasks are usually workflow chains that need context; parallel workers are execution units that benefit from slim context.
4. **Test coverage is thorough** — 16 new tests cover guard logic, integration, and flag propagation. Edge cases (NaN, negative, zero) are all tested.
5. **Error messages are actionable** — "Set PI_SUBAGENT_MAX_DEPTH to increase the limit" tells the user exactly what to do.

---

## Verdict (Updated after autofix)

| Status | Count |
|---|---|
| **HIGH fixed** | 1 (F-1: concurrency race → AsyncMutex + shared factory) |
| **MODERATE fixed** | 2 (F-2: deduped, F-4: isolation tests added) |
| **LOW fixed** | 1 (F-3: negative maxDepth validation) |
| **LOW accepted** | 2 (F-5: coupling acceptable, F-6: minor duplication acceptable) |

**All must-fix items resolved. Tests: 162 pass, 0 fail.**
