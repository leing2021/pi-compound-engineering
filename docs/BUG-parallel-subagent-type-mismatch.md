# Bug Report: `parallel_subagent` Input Type Validation Failure

- **Status**: Fixed
- **Type**: Bug / Regressive Failure
- **Severity**: High (Blocks parallel execution for reasoning models)
- **Component**: `super-pi` extension (`ce-core` extension)
- **Found in Version**: 0.18.1
- **Fixed in Version**: 0.18.2

## Fix Summary
1.  **Schema Robustness**: Updated `parallel_subagent` tool schema to use `Type.Union`, allowing both `Array` and `String` for the `tasks` parameter. This prevents Harness-level rejection when models or environments stringify the input.
2.  **Parsing Robustness**: Enhanced the `execute` handler to handle JSON strings, including stripping Markdown code blocks and providing clear error messages on parse failure.
3.  **Prompt Guidance**: Updated the tool description to explicitly guide Agents on providing clean JSON arrays.

## Description
The `parallel_subagent` tool fails to execute when invoked by reasoning models because the `tasks` parameter is received as a stringified JSON array instead of a native JavaScript array object. The underlying validation logic (likely `@sinclair/typebox` validation in `pi.registerTool`) rejects the input because it expects a `Type.Array`, but receives a `string`.

## Root Cause Analysis
In `/extensions/ce-core/index.ts`, the parameter schema for `parallel_subagent` is defined as:

```typescript
const parallelSubagentParams = Type.Object({
  tasks: Type.Array(parallelSubagentTaskSchema, { description: "Array of independent tasks to run concurrently" }),
  inheritSkills: Type.Optional(Type.Boolean({ description: "Whether subagents should inherit skills. Default: false" })),
})
```

When the Agent runtime (e.g., Claude, Gemini) formats the tool call, the `tasks` array may be passed through a serialization layer that results in the tool's `execute` function receiving a string. The `ce-core` implementation lacks a defensive check or an explicit `JSON.parse` step to handle stringified inputs.

## Observed Error
```json
{
  "error": "Validation failed for tool \"parallel_subagent\": - tasks: must be array",
  "received_arguments": {
    "tasks": "[{\"agent\": \"...\", \"task\": \"...\"}]"
  }
}
```

## Reproduction Steps
1. Invoke the `parallel_subagent` tool from an LLM.
2. Provide a valid array of tasks.
3. Observe the `must be array` error despite the JSON payload visually appearing correct.

## Proposed Fix
Modify the `execute` wrapper in `/extensions/ce-core/index.ts` or the tool logic in `/extensions/ce-core/tools/parallel-subagent.ts` to ensure `tasks` is an object:

```typescript
// Proposed defensive logic
const tasks = typeof params.tasks === 'string' ? JSON.parse(params.tasks) : params.tasks;
```

Additionally, check if the `pi` harness `registerTool` can be configured to automatically deserialize arguments for extensions.

## Metadata
- **Date Reported**: 2026-04-21
- **Reporter**: Antigravity (Agent)
