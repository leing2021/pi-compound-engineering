# Super Pi Token 与上下文优化方案

> 日期：2026-04-24  
> 目标：为 Super Pi 插件、技能与工作流提供一套可落地的 token 降耗方案，降低长任务、多阶段工程任务中的上下文膨胀、日志噪声与重复历史成本。

## 1. 背景

在一次完整 PU 工程任务中，对话跨越了：文档评估、brainstorm、plan、Pi runtime PoC、P1/P2 实现、integration proof、main repo merge、core-api 测试稳定化、05-learn 与 git 收尾。

虽然每一步都合理，但整个窗口持续累积了大量历史摘要、文件清单、测试日志、决策记录和过程性说明，导致后期每轮交互携带大量“冷上下文”。

本方案的核心目标不是减少必要信息，而是把上下文分成：

- **热上下文**：当前任务必须立刻使用的信息
- **温上下文**：可能有用，但可通过 artifact / docs / git 查询恢复的信息
- **冷上下文**：已完成阶段的详细过程，不应继续进入主对话

一句话原则：

> 长期知识写入文档，当前执行只带最小热上下文。

---

## 2. 问题诊断

### 2.1 长历史摘要过重

长任务压缩后，摘要通常包含：

- 全阶段执行过程
- 已读文件清单
- 已修改文件清单
- 所有测试命令与输出
- worktree / commit / patch 细节
- 多轮决策和约束

这些对审计有价值，但对当前执行不一定有价值。

例如当前任务只是“提交一篇 learn 文档”时，Pi SDK PoC、LLM Gateway 配置、single_content contract、integration smoke 细节都已经属于冷上下文。

### 2.2 测试日志重复进入上下文

verbose 测试输出会列出大量 passed cases。失败定位时有用，但成功后不应继续保留完整日志。

更优格式：

```text
Command: pnpm --filter core-api test
Result: failed 4 files
Failures:
- directives.test.ts: 500 _parse
- directive-rubrics.test.ts: 500 _parse
- audit-replay.test.ts: 500 _parse
- governance-actions.test.ts: 500 _parse
```

### 2.3 文件列表未按当前任务裁剪

压缩摘要中经常保留几十个历史读过或改过的文件。对新阶段来说，通常只需要当前活跃文件。

### 2.4 阶段边界不清

一个窗口承载多个阶段时，后续阶段仍携带早期阶段细节，导致 token 线性甚至指数式膨胀。

### 2.5 过程性自然语言偏多

为了协作体验，助手会频繁解释“我判断 / 我先做 / 我怀疑”。这在短任务中有帮助，但长任务里会累积成噪声。

---

## 3. 优化目标

### 3.1 定量目标

在长工程任务中，目标降低：

- 每轮无关历史上下文：40%–70%
- 测试日志进入上下文体积：60%–90%
- 新窗口 handoff 体积：50%–80%
- 压缩摘要中冷文件路径数量：70%+

### 3.2 定性目标

- 让新窗口更快进入工作状态
- 减少模型误读旧状态的概率
- 保留审计和回放能力
- 不牺牲关键约束、测试结果和决策依据
- 让插件自动帮助用户维护“当前工作面”

---

## 4. 核心设计：Context Tiers

建议 Super Pi 在压缩、handoff、status、next、learn 等插件能力中引入三层上下文模型。

### 4.1 Hot Context

当前任务必须保留，默认进入下一轮 prompt。

字段建议：

```yaml
current_task: 当前一句话目标
repo: 当前仓库路径
branch: 当前分支
active_files: 当前正在修改或需要读取的文件
current_failure: 当前失败命令与错误摘要
constraints: 当前必须遵守的限制
verified: 最近一次通过的验证结果
next_actions: 下一步 1-3 项
```

### 4.2 Warm Context

可恢复信息，不默认展开，只保留引用。

示例：

```yaml
artifacts:
  brainstorm: docs/brainstorms/xxx.md
  plan: docs/plans/xxx.md
  solutions:
    - docs/solutions/testing/xxx.md
commits:
  - abc1234: add single_content contract
  - def5678: stabilize route tests
```

### 4.3 Cold Context

已完成阶段的详细日志、历史文件列表、长测试输出。默认从主上下文移除。

保留方式：

- 写入 docs / artifact
- 可通过 git log / test output file / solution doc 恢复
- 只在用户明确要求回顾时加载

---

## 5. 推荐插件能力

### 5.1 Handoff Lite 生成器

新增或增强一个命令/工具，用于阶段切换时生成低 token 交接摘要。

建议命令：

```text
/compact-lite
/handoff-lite
/status-lite
```

输出模板：

```md
## Current Task
一句话目标。

## Repo
路径 + 分支。

## Active Files
只列当前要看的文件。

## Done
最多 5 条，写结果，不写过程。

## Current Failure
命令：
错误摘要：

## Constraints
- test-only if possible
- do not change business logic
- preserve existing contract

## Next Actions
1.
2.
3.

## Verification
需要跑哪些命令。
```

规则：

- 不列完整 verbose 日志
- 不列所有历史文件
- 不展开已完成阶段细节
- artifact 只保留路径引用

### 5.2 Test Output Summarizer

增强 bash output filter，对测试命令输出做专门摘要。

识别命令：

- `vitest`
- `jest`
- `pnpm test`
- `npm test`
- `playwright test`
- `pytest`
- `go test`

摘要格式：

```yaml
command: 原命令
status: passed | failed
files:
  passed: 5
  failed: 2
  skipped: 0
tests:
  passed: 70
  failed: 3
failures:
  - file: src/routes/directives.test.ts
    test: POST /directives/draft returns 201
    error: expected 500 to be 201
    root_hint: Cannot read properties of undefined (reading '_parse')
warnings:
  - FastifyWarning: body schema missing
```

保留策略：

- 失败时保留失败堆栈的最小片段
- 成功时只保留总数
- verbose passed case 默认折叠
- 如果输出被截断，保留临时文件路径

### 5.3 Active File Window

在 workflow state 中维护当前活跃文件集合。

规则：

- 最近修改文件默认 hot
- 当前失败堆栈出现的文件默认 hot
- 最近明确读取但未使用的文件降为 warm
- 已完成阶段文件降为 cold

建议结构：

```yaml
active_files:
  hot:
    - apps/core-api/src/routes/tasks.test.ts
  warm:
    - apps/core-api/src/routes/tasks.ts
  cold:
    - apps/worker/src/adapters/pi-agent.adapter.ts
```

### 5.4 Phase Boundary Detector

插件自动识别阶段完成点，并建议用户瘦身上下文。

触发条件：

- plan 已完成，用户批准进入 work
- 所有实现单元测试通过
- worktree commits 已合并
- learn artifact 已创建
- 用户询问“是否开新窗口”
- 上下文长度超过阈值

建议提示：

```text
当前阶段已完成。建议生成 handoff-lite，只保留下一阶段所需上下文。
```

### 5.5 Context Budget Meter

在状态输出中增加上下文健康度。

建议分级：

```yaml
context_budget:
  health: good | watch | heavy | critical
  likely_waste:
    - old_test_logs
    - completed_phase_details
    - large_file_lists
  suggestion: generate_handoff_lite
```

判断依据：

- 历史摘要长度
- read-files 数量
- modified-files 数量
- 最近测试输出大小
- 当前任务和历史阶段是否匹配

### 5.6 Artifact First Memory

把长期知识从对话迁移到文档。

规则：

- 设计决策进入 `docs/plans/`
- 需求澄清进入 `docs/brainstorms/`
- 复用经验进入 `docs/solutions/`
- 当前进度进入 workflow state / handoff-lite

对话中只保留引用：

```text
参考 docs/solutions/testing/xxx.md
```

而不是展开整篇文档。

---

## 6. Skill 层优化建议

### 6.1 01-brainstorm

阶段结束时输出两份摘要：

1. 完整 artifact
2. handoff-lite 给 02-plan 使用

handoff-lite 只包含：

- 用户选择
- 明确约束
- 未解决问题
- 推荐下一步

### 6.2 02-plan

计划 artifact 完成后，给 03-work 的交接只保留：

- 实施单元
- 文件范围
- 验证命令
- 风险和回滚点

不重复 brainstorm 全文。

### 6.3 03-work

执行中每完成一个 unit，更新 compact state：

```yaml
completed_units:
  - P1-1
current_unit: P1-2
current_failure: null
active_files:
  - ...
verification:
  last_passed: pnpm --filter worker test
```

当测试输出很长时，只写摘要。

### 6.4 04-review

review 输入应优先使用：

- git diff summary
- changed files
- test summary
- plan unit reference

避免带入完整历史执行过程。

### 6.5 05-learn

learn 完成后输出：

- 新 solution 路径
- 适用场景
- 是否替代/补充已有 solution
- 下一步是否需要提交

不需要重复整个排障过程。

### 6.6 06-next / 08-status

建议新增低 token 模式：

```text
/status --lite
/next --lite
```

只输出：

- current
- blocker
- best next skill
- one-line reason

---

## 7. 默认沟通模式优化

建议增加一个用户可开关的“低 token 模式”。

### 7.1 用户指令

```text
低 token 模式：少解释，多操作；只总结当前状态和下一步；日志只保留失败摘要。
```

### 7.2 助手行为

- 不复述远期历史
- 不完整粘贴测试日志
- 每次工具执行后只总结关键变化
- 只在决策点解释原因
- 每阶段结束主动提供 handoff-lite

### 7.3 输出模板

```md
结论：...

改动：
- file A: ...
- file B: ...

验证：
- command → passed/failed

下一步：
- ...
```

---

## 8. 压缩摘要优化规则

当对话被压缩时，建议 compaction optimizer 采用以下规则。

### 8.1 保留

- 当前目标
- 当前 repo / branch
- 当前活跃文件
- 当前失败和错误摘要
- 未完成任务
- 用户明确偏好和硬约束
- 最近验证结果
- artifact 路径

### 8.2 降级为引用

- 已完成 plan 详情
- 已完成 brainstorm 详情
- learn 文档内容
- commit series 详情
- 历史测试命令完整输出

### 8.3 删除或折叠

- passed case 明细
- 大量 read-files 列表
- 大量 modified-files 列表中的冷文件
- 过程性判断话术
- 已验证不再相关的假设

---

## 9. 推荐实现优先级

### P0：立即可做

- 新增 handoff-lite 模板
- 在 status/next 中增加 lite 输出
- 测试日志摘要规则：passed case 折叠
- 压缩摘要只保留 active files

### P1：插件增强

- Test Output Summarizer
- Active File Window
- Phase Boundary Detector
- Context Budget Meter

### P2：深度集成

- workflow_state 增加 context tiers
- session_checkpoint 存储 hot/warm/cold
- pattern_extractor 支持 token waste pattern
- learn skill 自动 cross-link token 优化经验

---

## 10. 验收标准

### 10.1 功能验收

- 长任务切换窗口时，handoff-lite 不超过 1500 tokens
- 成功测试输出默认不超过 300 tokens
- 失败测试输出默认不超过 1200 tokens
- status-lite 不超过 500 tokens
- next-lite 不超过 300 tokens

### 10.2 质量验收

- 新窗口能直接继续任务
- 不丢失用户硬约束
- 不丢失当前 blocker
- 不丢失验证命令
- 不误导模型重复已完成工作

### 10.3 回归检查

用一个多阶段工程任务验证：

1. brainstorm → plan
2. plan → work
3. work → review
4. review → learn
5. learn → new window handoff

每个阶段检查上下文是否只保留当前所需信息。

---

## 11. 示例：低 token handoff

```md
## Current Task
稳定 core-api 剩余 route tests。

## Repo
/Users/jasonle/code/pu/pu-core

## Active Files
- apps/core-api/src/routes/directives.test.ts
- apps/core-api/src/routes/directive-rubrics.test.ts
- apps/core-api/src/routes/audit-replay.test.ts
- apps/core-api/src/routes/governance-actions.test.ts

## Done
- tasks/runtime-session/dashboard-stats 已改成 route-only app 并通过
- training-data/tenants/feedback/schedules/health 已改成 route-only app 并通过
- worker test 已通过

## Current Failure
Command:
`pnpm exec vitest run src/routes/directives.test.ts src/routes/directive-rubrics.test.ts src/routes/audit-replay.test.ts src/routes/governance-actions.test.ts --reporter=verbose`

Error:
`Cannot read properties of undefined (reading '_parse')`

## Constraints
- test-only 修法优先
- 不恢复 buildApp()
- 不做业务重构

## Next Actions
1. 检查 @pu/types schema 是否在 test 装配中为 undefined
2. 补最小 @pu/types / @pu/core mock
3. 跑 4 个文件，再跑 core-api 全量
```

---

## 12. 与现有文档关系

本方案补充而不是替代：

- `docs/token-cost-evaluation.md`：解释 Super Pi 当前 token 成本与 ROI
- `docs/token-context-optimization-plan.md`：定义后续插件和工作流如何进一步降低长任务上下文成本

建议后续实现时，把本方案作为产品需求和验收依据。
