# Token Context Workflow Optimization Plan

> Date: 2026-04-24
> Brainstorm: `docs/brainstorms/2026-04-24-token-context-workflow-optimization-requirements.md`

## Problem summary

Super Pi long-running engineering workflows carry too much completed-phase context into later stages. This wastes tokens, lowers Token ROI, and increases the risk that old state misleads the agent. The requirements call for a phase-boundary workflow that keeps only hot context in the active conversation, stores durable knowledge in `docs/`, stores runtime continuation state in `.context/compound-engineering/`, and recommends a new session only when crossing phases with heavy/critical context.

## Relevant learnings

- `docs/token-context-optimization-plan.md`: defines hot/warm/cold context tiers, handoff-lite, context health, test output summarization, active file window, and phase boundary detection.
- `docs/token-cost-evaluation.md`: new session fixed cost is small enough that a single avoided verbose output or cold-history carryover can repay it; filters and progressive loading produce high ROI.
- Existing tools already available:
  - `extensions/ce-core/tools/compaction-optimizer.ts`
  - `extensions/ce-core/tools/bash-output-filter.ts`
  - `extensions/ce-core/tools/workflow-state.ts`
  - `extensions/ce-core/tools/session-checkpoint.ts`
  - `skills/references/pipeline-config.md`

## Scope boundaries

### In scope

- Add a phase-end Context Status workflow to Phase 1 skills.
- Add handoff-lite artifact format and new-session prompt rules.
- Persist runtime handoff/context state under `.context/compound-engineering/`.
- Extend workflow state to expose latest handoff, context health, current stage, blocker, and suggested next action.
- Extend checkpoint state to preserve hot/warm/cold context, active files, blocker, and verification summaries.
- Improve compaction instructions to explicitly retain hot context, downgrade warm context to references, and fold cold context.
- Improve test output filtering enough to support concise pass/fail summaries without losing failure details.
- Add tests for new/changed tool behavior.

### Out of scope

- Pi core changes.
- Fully automatic token counting across the entire session.
- Forcing a new session after every phase.
- Replacing existing docs artifacts.
- Deep UI/TUI changes.

## Implementation units

### Unit 1 — Runtime context state and handoff-lite persistence

#### Goal

Introduce a runtime context/handoff data model and persistence helpers under `.context/compound-engineering/`, enabling Super Pi to save and reload phase handoff-lite state without relying on the active conversation.

#### Files

- Create: `extensions/ce-core/tools/context-handoff.ts`
- Modify: `extensions/ce-core/index.ts`
- Test: `extensions/ce-core/tools/context-handoff.test.ts`

#### Patterns to follow

- Follow tool factory pattern from `session-checkpoint.ts` and `workflow-state.ts`.
- Use JSON/Markdown files under `.context/compound-engineering/`.
- Keep tool output structured and concise.

#### Required behavior

Add a new tool, tentatively `context_handoff`, with operations:

- `save`: persist handoff-lite markdown and structured metadata.
- `load`: read latest or named handoff.
- `latest`: return latest handoff metadata and path.
- `status`: return context health, stage, next action, and new-session recommendation.

Suggested storage:

- `.context/compound-engineering/handoffs/latest.md`
- `.context/compound-engineering/handoffs/<timestamp>-<from>-to-<to>.md`
- `.context/compound-engineering/context-state.json`

Suggested schema:

```ts
interface ContextState {
  currentStage: string
  nextStage?: string
  contextHealth: "good" | "watch" | "heavy" | "critical"
  latestHandoffPath?: string
  activeFiles: string[]
  blocker?: string
  verification?: string
  artifacts: Record<string, string | undefined>
  recommendNewSession: boolean
  updatedAt: string
}
```

#### Test scenarios

- RED: `load/latest/status` returns empty safe state when no handoff exists.
- RED: `save` writes both `latest.md` and a dated handoff file.
- RED: `status` recommends new session when phase changes and health is `heavy` or `critical`.
- RED: `status` does not recommend new session for `good`/`watch`.
- Error path: invalid operation or missing required fields fails clearly.

#### Verification

```bash
bun test extensions/ce-core/tools/context-handoff.test.ts
bun test
```

#### Dependencies

None.

---

### Unit 2 — Extend workflow_state and session_checkpoint for context tiers

#### Goal

Make existing workflow status and checkpoint tools aware of context-health state, latest handoff, active files, blocker, verification summary, and hot/warm/cold tiers.

#### Files

- Modify: `extensions/ce-core/tools/workflow-state.ts`
- Modify: `extensions/ce-core/tools/session-checkpoint.ts`
- Modify: `extensions/ce-core/index.ts` if tool schemas change
- Test: `extensions/ce-core/tools/workflow-state.test.ts`
- Test: `extensions/ce-core/tools/session-checkpoint.test.ts`

#### Patterns to follow

- Preserve backward compatibility with current `workflow_state` and `session_checkpoint` fields.
- Add fields rather than replacing existing outputs.
- Treat missing runtime files as normal, not fatal.

#### Required behavior

`workflow_state` should include:

- latest brainstorm/plan/solution/run counts as today.
- `context.currentStage`
- `context.contextHealth`
- `context.latestHandoffPath`
- `context.blocker`
- `context.recommendNewSession`
- `context.suggestedNextAction`

`session_checkpoint` should support optional fields:

- `activeFiles`
- `currentUnit`
- `blocker`
- `verification`
- `contextTiers: { hot: string[]; warm: string[]; cold: string[] }`
- `handoffPath`

#### Test scenarios

- RED: old checkpoint save/load behavior remains unchanged.
- RED: new optional fields round-trip correctly.
- RED: workflow_state reports context when `.context/compound-engineering/context-state.json` exists.
- RED: workflow_state returns safe defaults when context state is missing or malformed.

#### Verification

```bash
bun test extensions/ce-core/tools/workflow-state.test.ts extensions/ce-core/tools/session-checkpoint.test.ts
bun test
```

#### Dependencies

Depends on Unit 1 if reusing shared context-state helpers; otherwise can be done in parallel with careful schema alignment.

---

### Unit 3 — Phase-end workflow and handoff-lite skill documentation

#### Goal

Update Phase 1 skill instructions so every stage ends with durable artifact output, handoff-lite guidance, Context Status, and a copyable new-session prompt when appropriate.

#### Files

- Modify: `skills/references/pipeline-config.md`
- Modify: `skills/01-brainstorm/references/handoff.md`
- Modify: `skills/02-plan/references/handoff.md`
- Modify: `skills/03-work/references/handoff.md`
- Modify: `skills/03-work/references/progress-update-format.md`
- Modify: `skills/04-review/references/handoff.md`
- Modify: `skills/05-learn/SKILL.md` or add `skills/05-learn/references/handoff.md`
- Optionally modify: `skills/06-next/SKILL.md`, `skills/08-status/SKILL.md` for lite output guidance

#### Patterns to follow

- Keep skill instructions concise.
- Do not duplicate full brainstorm/plan content across handoffs.
- Use the new-session prompt format approved in brainstorm.

#### Required behavior

Add mandatory final Context Status block after Pipeline Status or adjacent to it:

```md
---
🧠 Context Status
- Health: good | watch | heavy | critical
- Handoff: <path or N/A>
- Active: <1-5 active files or N/A>
- New session: recommended | not needed
---
```

When new session is recommended, output:

```md
## 建议新开 Session

原因：当前 `<current stage>` 已完成，下一步将进入 `<next stage>`。当前窗口已经包含较多已完成阶段上下文，继续执行会降低 Token ROI，并增加旧上下文干扰后续判断的风险。

建议：新开一个窗口，把下面这段 Prompt 复制进去即可继续。

```text
继续这个 Super Pi workflow，不要重新开始。

Repo: <repo path>

请先读取：
<handoff-lite path>

然后继续：
<next skill command>

上下文策略：
- 低 token 模式：少解释，多操作。
- 只使用 handoff-lite 中的 hot context。
- artifact 默认只引用路径，只有需要时才读取。
- 不要展开旧窗口历史、完整测试日志、完整 brainstorm/plan 内容。
- 不要重复已完成阶段。
- 如果信息不足，先读取 handoff-lite 引用的 artifact，再提问。

核心原则：
1. 在保障质量和效率的前提下，优化上下文控制。
2. 在保障质量和效率的前提下，优化 Token ROI。
3. 不丢失当前 blocker、硬约束、active files、verification commands。
```
```

#### Test scenarios

Documentation-only unit; verify by inspection:

- Each Phase 1 stage has clear handoff-lite expectations.
- The final status contract is consistent across skills.
- New-session prompt is user-facing and copyable.

#### Verification

```bash
rg "Context Status|handoff-lite|建议新开 Session" skills
```

#### Dependencies

Can be implemented after Unit 1 or in parallel. If Unit 1 is not complete, docs may specify manual fallback paths.

---

### Unit 4 — Compaction and test-output summarization improvements

#### Goal

Improve existing token-saving hooks so compaction summaries and bash test output follow the hot/warm/cold and concise test-summary rules.

#### Files

- Modify: `extensions/ce-core/tools/compaction-optimizer.ts`
- Modify: `extensions/ce-core/tools/bash-output-filter.ts`
- Test: `extensions/ce-core/tools/bash-output-filter.test.ts`
- Optional test: `extensions/ce-core/tools/compaction-optimizer.test.ts`

#### Patterns to follow

- Keep failure details; never hide exact error messages needed to debug.
- Successful test output should collapse aggressively.
- Error output should still be preserved or summarized with enough failure context.

#### Required behavior

`compaction-optimizer.ts` should instruct summaries to:

- preserve hot context fields explicitly.
- downgrade warm context to path references.
- fold cold context.
- avoid carrying verbose passed test cases and completed-phase details.
- preserve exact blockers, constraints, active files, and verification commands.

`bash-output-filter.ts` should improve test command summaries:

- successful tests: total files/tests/duration and filter notice, target <= 300 tokens.
- failed tests: failed files/tests, exact assertion/error snippets, command, target <= 1200 tokens.
- avoid keeping verbose passed-case lists.
- keep full output path if available.

#### Test scenarios

- RED: verbose Vitest pass output collapses to summary and omits individual passed cases.
- RED: failed test output keeps failing file, test name, expected/received, and stack hint.
- RED: non-test purpose commands remain unfiltered within threshold.
- RED: compaction instructions contain hot/warm/cold retention language.

#### Verification

```bash
bun test extensions/ce-core/tools/bash-output-filter.test.ts
bun test
```

#### Dependencies

Independent, but should align wording with Unit 3.

---

### Unit 5 — Status/next lite behavior and end-to-end workflow proof

#### Goal

Expose low-token status/next behavior and prove the complete phase-boundary flow works from brainstorm to plan to work handoff.

#### Files

- Modify: `skills/06-next/SKILL.md`
- Modify: `skills/06-next/references/recommendation-logic.md`
- Modify: `skills/08-status/SKILL.md`
- Modify: `skills/08-status/references/artifact-locations.md`
- Optional create: `docs/reports/2026-04-24-token-context-workflow-proof.md`

#### Patterns to follow

- Status-lite <= 500 tokens.
- Next-lite <= 300 tokens.
- Prefer paths and one-line reasons over expanded history.

#### Required behavior

- `08-status` can describe current artifact state plus context state without expanding artifacts.
- `06-next` can recommend the single next skill using latest handoff/context state.
- Both skills should mention new-session recommendation when context state says so.
- Produce a short proof report showing an example handoff-lite and new-session prompt.

#### Test scenarios

- Status shows latest brainstorm/plan plus latest handoff path.
- Next recommends `/skill:03-work` after a plan handoff.
- Outputs stay concise and do not include full artifact contents.

#### Verification

```bash
rg "lite|Context Status|handoff" skills/06-next skills/08-status
bun test
```

#### Dependencies

Depends on Units 1-3 for actual runtime context state; docs can be updated before full code is complete.

## Verification strategy

### Per-unit verification

Each implementation unit includes targeted `bun test ...` or `rg ...` checks. Because this repo currently has no visible test files, Unit 1 should establish the test style for tool-level behavior.

### Full regression verification

```bash
bun test
rg "Context Status|handoff-lite|建议新开 Session" skills
```

### Manual workflow proof

Run or simulate this sequence:

1. `01-brainstorm` creates requirements artifact and handoff-lite.
2. `02-plan` creates plan artifact and handoff-lite.
3. Context Status reports health and latest handoff path.
4. For heavy/critical cross-phase state, output copyable new-session prompt.
5. New session can continue by reading only the handoff-lite and referenced artifacts on demand.

## Parallelization notes

- Unit 1 and Unit 4 can run in parallel.
- Unit 3 can start in parallel as docs-only, but should align final tool names with Unit 1.
- Unit 2 depends on Unit 1 if sharing context-state helpers.
- Unit 5 should come last as integration/proof.

## Open risks and assumptions

- Tool schema additions must remain compatible with Pi extension parameter validation.
- New-session prompt is a process contract; Pi cannot force the user to open a window.
- Context health is initially heuristic/manual; exact token-aware measurement is out of scope for this pass.
- If no handoff tool is available during a phase, skills must fall back to writing handoff-lite manually under `.context/compound-engineering/handoffs/`.
