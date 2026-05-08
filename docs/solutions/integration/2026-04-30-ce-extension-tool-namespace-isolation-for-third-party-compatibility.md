---
title: "CE Extension Tool Namespace Isolation for Third-Party Compatibility"
category: integration
severity: high
tags: [extension, tool, namespace, prefix, ce_, pi-subagents, subagent, parallel-subagent, name-conflict, tool-collision, compatibility, breaking-change, pi-extension]
applies_when:
  - two pi extensions register the same tool name and both must coexist
  - a specialized extension provides a subset of a third-party extension's capabilities
  - renaming a tool's namespace is preferred over delegation or source fusion
  - avoiding a breaking change while eliminating runtime tool registration collisions
---

# Problem

`super-pi`'s `ce-core` extension and the third-party `pi-subagents` extension both register a tool named `subagent`. When installed simultaneously, Pi throws a startup error and refuses to load both extensions. The previous approaches tried:

- **Delegation** (v0.21.0): ce-core removes its `subagent` tool, declares `pi-subagents` as peerDependency. Result: multi-step install required, user experience degraded.
- **Source integration** (attempted later): absorb `pi-subagents` source into `super-pi`. Result: single package achieved, but the merged package becomes a superset of both, maintaining the `subagent` name conflict problem internally.

Neither approach satisfied the constraint: both packages must be installable independently and simultaneously without tool name collision.

# Context

`super-pi`'s CE pipeline (`01-brainstorm` → `05-learn`) uses a dedicated skill-based subagent router. `pi-subagents` provides a general-purpose multi-agent execution tool with a richer feature set (TUI, agent CRUD, async, etc.). Both independently implemented a tool named `subagent`.

The long-term goal: `pi-subagents` retains the generic `subagent` name for its richer capabilities; `super-pi` CE pipeline uses an explicitly namespaced variant.

# Solution

**Namespace isolation via `ce_` prefix.** Rename the CE-specific tools to `ce_subagent` and `ce_parallel_subagent`. Reserve the unprefixed names for the third-party extension.

## Implementation

### 1. Rename tool exports (not file names)

```typescript
// extensions/ce-core/tools/subagent.ts
export function createSubagentTool() {
  return {
-   name: "subagent",
+   name: "ce_subagent",
    async execute(input, runner) { /* unchanged */ }
  }
}

// extensions/ce-core/tools/parallel-subagent.ts
export function createParallelSubagentTool() {
  return {
-   name: "parallel_subagent",
+   name: "ce_parallel_subagent",
    async execute(input, runner) { /* unchanged */ }
  }
}
```

**Keep file names unchanged** (`subagent.ts`, `parallel-subagent.ts`) — changing file names causes unnecessary import churn across the codebase. Only the exported `name` field changes.

### 2. Update tool labels and descriptions

```typescript
// extensions/ce-core/index.ts — during registration
pi.registerTool({
  name: subagent.name,          // now "ce_subagent"
  label: "CE Subagent",
  description: "Run a single CE skill-based subagent or a serial chain in an isolated Pi process.",
  parameters: subagentParams,
  // ...
})
```

### 3. Update user-facing error messages

If any error messages reference the old tool name, rename them to match:

```typescript
throw new Error("ce_parallel_subagent requires at least one task")
```

### 4. Sync skill documentation

Update all skill files and README that reference the tools:

```markdown
# 03-work/SKILL.md
- Use **`ce_parallel_subagent`** for independent CE skill-based units that can run concurrently.
- Use **`ce_subagent`** only for dependent serial chains that benefit from isolated context or specialized CE skill execution.
- Note: the generic `subagent` / `parallel_subagent` tool names are reserved for third-party agent extensions (e.g. `pi-subagents`); CE skill-router uses the `ce_`-prefixed names to avoid tool-name conflicts.
```

### 5. Add TDD tests for the new names

```typescript
// tests/ce-core-extension.test.ts
test("tool is named ce_subagent", () => {
  const tool = createSubagentTool()
  expect(tool.name).toBe("ce_subagent")
})

test("tool is named ce_parallel_subagent", () => {
  const tool = createParallelSubagentTool()
  expect(tool.name).toBe("ce_parallel_subagent")
})

test("registers no bare subagent or parallel_subagent", () => {
  const registeredNames: string[] = []
  ceCoreExtension({
    registerTool(definition) { registeredNames.push(definition.name) },
    on() {},
    registerCommand() {},
  })
  expect(registeredNames).not.toContain("subagent")
  expect(registeredNames).not.toContain("parallel_subagent")
})
```

### 6. Document the coexistence contract in README

```markdown
### Compatibility with pi-subagents

super-pi's CE skill-router tools use a dedicated namespace to avoid runtime tool-name conflicts:

- **CE tools**: `ce_subagent` and `ce_parallel_subagent` — for CE pipeline skill execution
- **Generic `subagent`**: reserved for third-party agent extensions like pi-subagents

Both extensions can be installed simultaneously without tool collision. No configuration needed.
```

## Why this works

1. **No collision**: `ce-core` registers `ce_subagent`, `pi-subagents` registers `subagent`. Different strings → no conflict.
2. **Single package**: users install `super-pi` once, no peer dependency on `pi-subagents` required.
3. **Clear ownership**: `subagent` belongs to `pi-subagents` (general agent execution); `ce_subagent` belongs to `super-pi` (CE pipeline skill routing).
4. **Minimal disruption**: file names, import paths, and internal logic remain unchanged. Only the tool's public name changes.
5. **Preserves existing behavior**: the underlying recursion guard (`PI_SUBAGENT_DEPTH`), env isolation (`AsyncMutex`), and `--no-skills` context slimming are all retained unchanged.

## Scope boundaries

This approach is appropriate when:
- Both packages must remain independently installable
- The CE tool is a specialized subset with different semantics (CE skill routing vs. general agent execution)
- Source fusion is not desired (too much churn, divergent goals)
- Delegation is not desired (both packages need their own tool for standalone use)

This approach is NOT appropriate when:
- One package is a strict superset of the other → use delegation instead
- Both packages need the same tool name for the same use case → pick one owner, delegate
- Users must have a single tool that works identically in both contexts → source integration

## Prevention

When designing a pi extension that provides a tool:

1. **Check for existing tools first** — search `~/.pi/agent/extensions/` and npm for tools with the same name before registering.
2. **If a third-party tool overlaps, choose a strategy**:
   - **Delegation** (peerDependency): when your tool is a strict subset, let the superset own it.
   - **Namespace isolation** (`ce_` prefix): when both packages need their own tool for different use cases.
   - **Source integration**: when you want a single package and control the full feature set.
3. **Always add TDD tests for tool names** — `expect(tool.name).toBe("expected_name")` prevents accidental rename regressions.
4. **Static guard tests** — add a test that reads the extension's registration and asserts the exact tool names, so future refactors cannot accidentally re-introduce the old names.
5. **Update docs holistically** — grep for the old tool name across all `.md` and `.ts` files before considering the rename complete.

## Cross-reference

- **Predecessor** (delegation): `~/.pi/agent/docs/solutions/integration/resolve-extension-tool-name-conflicts-by-delegation.md` — same problem, different solution (peerDependency delegation).
- **Alternative** (source integration): `docs/solutions/integration/2026-04-28-from-peer-dependency-to-source-integration.md` — absorbs pi-subagents source, different goal (single package), same conflict if both names persisted.
- **Related tooling**: `~/.pi/agent/docs/solutions/tooling/subagent-recursion-guard-and-env-concurrency.md` — CE subagent recursion guard and env isolation patterns that should be preserved when renaming tools.
