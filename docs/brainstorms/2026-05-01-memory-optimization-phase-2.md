---
date: 2026-05-01
topic: memory-optimization-phase-2
status: brainstormed
mode: CE Brainstorm
---

# Memory Optimization Phase 2 - Requirements

## Problem

Super Pi 已实现 10 项记忆/上下文机制（context_handoff、session_checkpoint、session_history、pattern_extractor、05-learn、workflow_state、compaction-optimizer、输出过滤器、handoff-lite 模板、结构化运行态状态）。然而这些机制之间存在协作空白：

1. **各 skill 不主动加载 handoff** — 02-plan/03-work/04-review 的 SKILL.md 未要求先读 handoff 再工作，导致恢复 session 时重复扫描项目文件
2. **06-next 不感知上下文健康度** — 只看工件 count，忽略 context health、blocker、stage mismatch 等关键信号
3. **handoff 缺少活跃规则字段** — 压缩/跨 session 后技能关键规则（TDD gates、constraints）可能丢失

## Goals

1. 让 02-plan/03-work/04-review 在启动时优先加载 handoff，有则消费，无则不阻塞
2. 让 06-next 基于 context 完整状态做智能推荐，优先级高于工件 count
3. 在 context_handoff 中增加 activeRules 字段，保存 1-5 条继续执行必须知道的关键规则
4. 所有改动零新工具，在现有机制上增强
5. 每个改动有明确的 Token ROI 论证

## Non-goals

- 不增加新工具
- 不改 Pi core
- 不加自动记忆路由/检索评分/向量搜索
- activeRules 不自动从 SKILL.md 提取（agent 手动填写）
- 不复制整份 SKILL.md 到 handoff

## Confirmed premises

1. Handoff 加载不应阻塞新项目（无 handoff 时正常继续）
2. A1 核心是「先 handoff → 再广泛读文件」，避免重复扫描
3. A3 推荐有明确优先级链
4. activeRules 只存必须知道的规则（<=5 条），避免 handoff 膨胀
5. 旧 handoff 无 activeRules 也能正常 load（向后兼容）

## Design

### A1：各 skill 启动时先读 handoff

**约束**：
- 无 handoff 不阻塞，有则用，无则继续
- 「先 handoff，再广泛读项目文件」

**改动文件**：
- `skills/references/pipeline-config.md` — 加 "Start of skill: context loading" 模板
- `skills/02-plan/SKILL.md` — workflow step 1 加 "Load context"
- `skills/03-work/SKILL.md` — workflow step 1 加 "Load context"
- `skills/04-review/SKILL.md` — workflow step 1 加 "Load context"

**Workflow step 模板**（以 03-work 为例）：
```
1. Load context (before reading any project files):
   - Try `context_handoff load` or read latest handoff from `.context/compound-engineering/handoffs/latest.md`
   - Validated? Use handoff's activeFiles, blocker, verification, currentTruth as starting point
   - Not found? Proceed normally — this is a new project or first run
   - DO NOT read project files broadly until handoff is consumed
   - If handoff provides plan path, read only the plan; do not re-scan all docs
```

**Token ROI**：一次 handoff read (~500 tokens) 替代 5-10 次项目文件扫描 (~5K-10K tokens)，~10x 收益。

### A3：06-next 智能推荐引擎

**约束**：严格按优先级链做推荐。

**改动文件**：
- `skills/06-next/SKILL.md` — 更新推荐逻辑
- `skills/06-next/references/recommendation-logic.md` — 更新推荐规则

**推荐优先级链**（从高到低）：
1. `context.health == "critical"` → 建议 save handoff + 开新 session，输出压缩风险和可复制 prompt
2. `context.blocker` 存在 → 建议停留在当前 stage 并解决 blocker，指出 blocker 描述
3. `context.recommendNewSession == true` → 建议开新 session，给出可复制 prompt
4. `context.nextStage` 存在且 != current → 推荐 `/skill:<nextStage>`
5. `context.currentStage` 与工件状态不匹配 → 检测 mismatch 并建议纠正
6. Fallback → 按工件 count 推荐（现有逻辑：brainstorms→plan, plans→work 等）

**Token ROI**：避免基于不完整 context 的错误推荐导致 agent 执行错误 stage，每次避免返工节省 5K-50K tokens。

### B1：context_handoff 加 activeRules 字段

**约束**：
- 只存 1-5 条继续执行必须知道的关键规则
- 不复制整份 SKILL.md
- 向后兼容（旧 handoff 无此字段正常 load）

**改动文件**：
- `extensions/ce-core/tools/context-handoff.ts` — 类型、save/load/status、handoff 模板
- `tests/context-handoff.test.ts` — 新测试 + 向后兼容测试

**类型变更**：
```typescript
// ContextHandoffInput 新增
activeRules?: string[]  // 1-5 must-know rules for continuation

// ContextStateEntry 新增
activeRules: string[]  // defaults to []

// ContextHandoffResult 新增
activeRules?: string[]
```

**Handoff 模板新增 section**（在 Active Files 之后）：
```md
## Active Rules
- 1-5 must-know rules (TDD gates, constraints, do-not-repeat items)
```

**测试要求**：
- activeRules round-trip: save → load 一致
- 无 activeRules 的旧 handoff 正常 load，activeRules 返回空数组
- status operation 也返回 activeRules
- 现有 205 个测试全部保持通过（0 回归）

**Token ROI**：防止 compaction/跨 session 后技能规则丢失导致 agent 行为偏离预期（如忘记 TDD gate），每次避免返工节省 5K-50K tokens。

## Approach alternatives considered

| 方案 | 决策 |
|------|------|
| A1 只在 pipeline-config 加规则 vs 每个 skill 显式 step | ✅ 选每个 skill 显式 step（更可靠） |
| A3 只加 critical health check vs 完整优先链 | ✅ 选完整优先链（利用全部 context 字段） |
| B1 agent 手动填写 vs 自动从 skill 提取 | ✅ 选手动填写（简单可控，避免复杂度） |
| 6 项全做 vs 3 项最高 ROI | ✅ 选 3 项（A1+A3+B1） |

## What we're NOT doing

- 不增加新工具（全部增强现有工具）
- 不改 Pi core compaction behavior
- 不加自动记忆路由/检索评分
- activeRules 不自动提取（agent 手动填写）
- 不复制整份 SKILL.md 到 handoff
- A1 无 handoff 不阻塞

## Likely implementation units (for 02-plan)

1. **Unit 1 (B1)**: context_handoff 加 activeRules 字段 → TS tool + test
2. **Unit 2 (A1)**: 02-plan/03-work/04-review 加 handoff loading step → 4 SKILL.md + pipeline-config
3. **Unit 3 (A3)**: 06-next 智能推荐引擎 → SKILL.md + recommendation-logic.md
4. **Unit 4**: 最终验证 → bun test + tsc --noEmit + handoff round-trip 测试

## Success criteria

1. 02-plan/03-work/04-review 启动时优先加载 handoff（有则消费，无则继续）
2. 06-next 按优先级链做推荐，非盲目按 count
3. activeRules save→load round-trip 正确
4. 旧 handoff（无 activeRules）正常 load
5. bun test 全部通过，0 回归
6. bunx tsc --noEmit 通过

## Verification approach

```bash
# Unit 1 验证
bun test tests/context-handoff.test.ts  # 扩展现有测试

# Unit 4 验证
bun test  # 全量测试，确认 0 回归
bunx tsc --noEmit  # 类型检查

# Handoff round-trip 验证（manual simulation）
# 1. context_handoff save with activeRules=["TDD gate: RED→GREEN→REFACTOR", "No business logic changes"]
# 2. context_handoff load → verify activeRules matches
# 3. context_handoff load with old state (no activeRules) → verify returns empty array, no error
```
