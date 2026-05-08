---
title: Handling Tool Parameter Type Mismatch in Strict Harness Environments
category: tooling
severity: medium
tags: [pi-extension, typebox, validation, json-parsing, reasoning-models, parameter-mismatch, robust-parsing, markdown-stripping]
applies_when: [implementing pi extensions with complex parameters, encountering "must be array" validation errors, reasoning models stringifying tool inputs, environment-enforced parameter serialization]
---

# Problem

In some Pi environments or when using specific reasoning models, tool parameters intended to be native JavaScript objects (like `Array` or `Object`) are received by the extension's `execute` function as **stringified JSON**.

If the tool's parameter schema is strictly defined (e.g., using `Type.Array` in `@sinclair/typebox`), the Pi Harness pre-validation will reject the string input before it even reaches the extension logic, leading to errors like:
`Validation failed for tool "example_tool": - tasks: must be array`

# Solution

To ensure robustness, extensions should use **Polymorphic Schemas** and **Defensive Parsing** in their tool definitions.

## 1. Polymorphic Schema with `Type.Union`

Instead of requiring a strict Array, allow the parameter to be either an Array or a String. This prevents the Harness from blocking the request.

```typescript
const myToolParams = Type.Object({
  tasks: Type.Union([
    Type.Array(taskSchema),
    Type.String({ description: "JSON stringified array of tasks" })
  ], { description: "Array of tasks or its JSON string representation" }),
})
```

## 2. Defensive Parsing with Markdown Stripping

Reasoning models often wrap JSON strings in Markdown code blocks. The `execute` handler should robustly parse the input:

```typescript
async execute(_toolCallId, params) {
  let data: any[];
  if (typeof params.tasks === "string") {
    try {
      // Robustly strip Markdown and trim
      const cleaned = params.tasks.replace(/^```json\s*|```$/g, "").trim();
      data = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`Failed to parse tasks: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    data = params.tasks;
  }
  // Proceed with data...
}
```

# Benefits

- **Harness Compatibility**: Avoids pre-validation failures in strict environments.
- **Model Ergonomics**: Gracefully handles the tendency of reasoning models to stringify or wrap outputs in Markdown.
- **Robustness**: Provides clear error messages if parsing fails, rather than generic validation errors.

# Related Solutions
- [pi-context-optimization-lazy-registration.md](./pi-context-optimization-lazy-registration.md) - Focuses on extension loading performance.
