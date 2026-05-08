# Plan - Parallel Subagent Type Robustness

Refine `parallel_subagent` tool to handle strict type validation in Pi harness and provide better ergonomics for reasoning models.

## User Requirements
- Ensure `parallel_subagent` handles stringified JSON arrays for the `tasks` parameter.
- Use Union types in Schema to avoid Harness pre-validation rejection.
- Improve JSON parsing robustness (handle Markdown blocks and potential whitespace).
- Update tool description to guide Agent behavior.

## Proposed Changes

### `ce-core` Extension
#### [DONE] `/extensions/ce-core/index.ts`
- Modify `parallelSubagentParams` to use `Type.Union([Type.Array(...), Type.String(...)])`.
- Enhance `execute` logic to safely strip Markdown and parse JSON string inputs.
- Update `parallel_subagent` tool description with clear instructions.

## Implementation Units

### Unit 1: Schema and Parsing Refinement
- **Description**: Update the Schema to allow both Array and String, and implement robust parsing in the execute handler.
- **Files**:
  - `/extensions/ce-core/index.ts`
- **TDD (Red/Green/Refactor)**:
  - **Red**: Create a test case (or manual verification script) that invokes the tool with a Markdown-wrapped JSON string.
  - **Green**: Update Schema and execute logic to pass the test.
  - **Refactor**: Clean up the parsing logic into a helper if necessary.

### Unit 2: Documentation and Description Update
- **Description**: Update the tool description in `index.ts` and ensure the bug report is finalized.
- **Files**:
  - `/extensions/ce-core/index.ts`
  - `/Users/jasonle/code/super-pi/docs/BUG-parallel-subagent-type-mismatch.md`
- **TDD**:
  - **Red**: Verify description is vague.
  - **Green**: Add explicit JSON format instructions to the description.
  - **Refactor**: Ensure consistency with other tool descriptions.

## Verification Plan

### Automated Tests
- Run `npm test` (if available) to ensure no regressions in extension loading.

### Manual Verification
1. Simulated tool call with `tasks` as a plain array.
2. Simulated tool call with `tasks` as a JSON string.
3. Simulated tool call with `tasks` as a Markdown-wrapped JSON string (e.g., "```json\n[...]\n```").
