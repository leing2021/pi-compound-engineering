# Token Context Workflow Proof (Phase Boundary)

Date: 2026-04-24
Plan: `docs/plans/2026-04-24-token-context-workflow-optimization-plan.md`

## Objective

Prove that Super Pi can:

1. Persist handoff-lite and runtime context state.
2. Recommend new session only for cross-phase + heavy/critical context.
3. Keep status/next responses lite while retaining actionable continuation paths.

## Implemented components

- `extensions/ce-core/tools/context-handoff.ts`
  - operations: `save | load | latest | status`
  - storage:
    - `.context/compound-engineering/handoffs/latest.md`
    - `.context/compound-engineering/handoffs/<dated>.md`
    - `.context/compound-engineering/context-state.json`
- `extensions/ce-core/tools/workflow-state.ts`
  - adds `context` block: stage, health, handoff path, blocker, new-session recommendation.
- `extensions/ce-core/tools/session-checkpoint.ts`
  - extended metadata: `activeFiles`, `currentUnit`, `blocker`, `verification`, `contextTiers`, `handoffPath`.
- Skill contracts/docs
  - `skills/references/pipeline-config.md`
  - phase handoff references (`01`~`04`) and `03-work` progress format
  - lite behavior for `06-next` and `08-status`

## Example handoff-lite

Path:

- `.context/compound-engineering/handoffs/latest.md`

Example content:

```md
## Current Task
Move from 02-plan to 03-work using approved implementation units.

## Hot Context
- Current stage output is approved and ready for execution.
- Continue from plan units instead of re-reading full history.

## Verified Facts
- `context_handoff` persisted handoff and context state successfully.
- Paths in context state are repo-relative.

## Active Files
- extensions/ce-core/tools/context-handoff.ts
- tests/context-handoff.test.ts
- docs/plans/2026-04-24-token-context-workflow-optimization-plan.md

## Artifacts
- requirements: docs/brainstorms/2026-04-24-token-context-workflow-optimization-requirements.md
- plan: docs/plans/2026-04-24-token-context-workflow-optimization-plan.md

## Current Blocker
- N/A

## Verification
- bun test tests/context-handoff.test.ts tests/ce-core-extension.test.ts ✅

## Do Not Repeat
- Do not reload full brainstorm/plan narrative unless the plan path is missing.

## Next Minimal Step
- 执行 /skill:03-work
```

## New-session prompt example (cross-phase + heavy)

```text
继续这个 Super Pi workflow，不要重新开始。

Repo: /Users/jasonle/code/super-pi

请先读取：
- docs/plans/2026-04-24-token-context-workflow-optimization-plan.md
- .context/compound-engineering/handoffs/latest.md
- .context/compound-engineering/checkpoints/docs__plans__2026-04-24-token-context-workflow-optimization-plan-md.json

然后继续：
- 执行 /skill:03-work

上下文策略：
- hot: 当前 unit 相关 1-5 个文件
- warm: requirements/plan/report artifact paths 按需读取
- cold: 历史讨论不主动加载
```

## Verification evidence

- `bun test tests/context-handoff.test.ts` ✅
- `bun test tests/bash-output-filter.test.ts` ✅
- `bun test` ✅ (all tests passing)
- `rg "Context Status|handoff-lite|建议新开 Session" ...` ✅

## Conclusion

The phase-boundary context workflow is now executable:
- durable handoff-lite + runtime state persisted under `.context/compound-engineering/`
- conservative new-session policy implemented (cross-phase + heavy/critical only)
- status/next and handoff docs aligned to low-token continuation behavior
