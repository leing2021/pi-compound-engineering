# 极简化重构执行清单（文件级 + Implementation Units）

> 日期：2026-04-24  
> 关联计划：`docs/plans/2026-04-24-minimalism-refactor-plan.md`  
> 用途：供后续 AI 直接按 unit 顺序执行，避免偏航。

---

## 一、执行原则

1. **严格按顺序执行，不跳步**
2. **不新增功能，只做删除、合并、下沉、精简、校准**
3. **每个 unit 完成后都要更新计划状态与验证结果**
4. **若某 unit 触及 README / skill / tests，必须同步修正文档与断言**
5. **若某 unit 会改变默认暴露面，必须先改 README，再改实现，再改测试**

---

## 二、推荐执行顺序

1. Unit 01：边界决议文档落地
2. Unit 02：合并 `06-next` → `08-status`
3. Unit 03：下沉 `09-help`
4. Unit 04：弱化 `07-worktree` 主叙事
5. Unit 05：Tool 分层与主叙事瘦身
6. Unit 06：状态模型边界收口
7. Unit 07：压缩 tool schema descriptions
8. Unit 08：压缩高频 SKILL.md
9. Unit 09：README / README_CN 瘦身与拆分
10. Unit 10：测试减重与仓库清理
11. Unit 11：全量验证与结果报告

---

## 三、Implementation Units

## Unit 01：边界决议文档落地

### 目标
把“核心 / 可选 / 删除合并项”固化为项目内正式决议，作为后续所有改动的判断依据。

### 修改文件
- `docs/plans/2026-04-24-minimalism-refactor-plan.md`
- `docs/refactor/2026-04-24-minimalism-boundary-decision.md`（新建）

### 动作
- 新建边界决议文档
- 固化三类：Core / Optional / Remove-Merge
- 明确一句话定位
- 明确本轮禁止事项：不新增功能

### 完成标准
- 文档中明确写出：
  - 主 5 步 skill
  - 保留辅助 skill
  - 待合并/下沉 skill
  - Optional tools 列表

### 验证
- 检查文档存在且内容完整

---

## Unit 02：合并 `06-next` → `08-status`

### 目标
消除“状态”和“下一步推荐”的重复入口。

### 修改文件
- `skills/06-next/SKILL.md`
- `skills/08-status/SKILL.md`
- `skills/08-status/references/artifact-locations.md`
- `README.md`
- `README_CN.md`
- `tests/package-structure.test.ts`
- `tests/skill-contracts.test.ts`

### 动作
- 将 `06-next` 的“推荐下一步”职责并入 `08-status`
- 删除 README 中对 `06-next` 的主路径强调
- 如决定彻底下线 skill：
  - 删除 `skills/06-next/`
  - 修正相关测试
- 如先软下线：
  - 保留目录但标注 deprecated，并从 README 主叙事移除

### 完成标准
- 项目主入口只保留 `08-status` 作为状态 + 下一步入口

### 验证
- 测试通过
- README/README_CN 中不再把 `06-next` 作为主路径 skill

---

## Unit 03：下沉 `09-help`

### 目标
把“帮助解释型 skill”降为文档能力，不再作为默认暴露面。

### 修改文件
- `skills/09-help/SKILL.md`
- `skills/09-help/references/workflow-sequence.md`
- `README.md`
- `README_CN.md`
- `tests/package-structure.test.ts`
- `tests/skill-contracts.test.ts`

### 动作
- 将 `09-help` 内容迁移到 README / docs 中
- 从主叙事中移除 `09-help`
- 若彻底删除 skill：同步修复测试
- 若保留：标记为 deprecated / internal docs only

### 完成标准
- 新用户无需依赖 `09-help` 理解工作流

### 验证
- README 中已有足够工作流解释
- 测试不再强依赖 `09-help` 作为首页能力

---

## Unit 04：弱化 `07-worktree` 主叙事

### 目标
将高级 git/worktree 能力从默认心智中后移。

### 修改文件
- `skills/07-worktree/SKILL.md`
- `skills/07-worktree/references/worktree-lifecycle.md`
- `README.md`
- `README_CN.md`
- 可能涉及：`tests/package-structure.test.ts`

### 动作
- 在 README 中将 `07-worktree` 改为 advanced / optional workflow
- 删除首页对 worktree 的主推叙事
- 保留实现，但不再作为核心卖点

### 完成标准
- 首页主价值不再扩散到 git 工作区管理

### 验证
- README 首页只突出主 5 步循环

---

## Unit 05：Tool 分层与主叙事瘦身

### 目标
把 Core tools 与 Optional tools 明确分开，降低“全家桶感”。

### 修改文件
- `README.md`
- `README_CN.md`
- `extensions/ce-core/index.ts`
- 如有需要新增：`docs/architecture/minimal-tool-layering.md`

### 动作
- 在文档中明确 tool 分层
- 首页只介绍 Core tools 对主流程的支持
- Optional tools 下沉到架构文档或高级章节
- 在 `index.ts` 中补充最小必要注释，避免默认叙事过重

### 完成标准
- 首页不再呈现“十几种工具合集”的认知负担

### 验证
- README 工具说明更短、更聚焦

---

## Unit 06：状态模型边界收口

### 目标
收敛 `workflow_state` / `session_checkpoint` / `context_handoff` / `session_history` 的职责边界。

### 修改文件
- `extensions/ce-core/tools/workflow-state.ts`
- `extensions/ce-core/tools/session-checkpoint.ts`
- `extensions/ce-core/tools/context-handoff.ts`
- `extensions/ce-core/tools/session-history.ts`
- `extensions/ce-core/index.ts`
- `README.md`
- `README_CN.md`
- 新建建议：`docs/architecture/runtime-state-boundary.md`
- `tests/ce-core-extension.test.ts`

### 动作
- 明确三层语义：
  - runtime state
  - handoff summary
  - archive history
- 统一字段命名和描述口径
- 清理重复话术：`blocker` / `verification` / `currentStage` / `nextStage` / `latestHandoffPath`
- 本轮优先统一语义，不强求完全合并实现

### 完成标准
- 各状态工具职责清晰，不再互相侵占

### 验证
- 相关测试仍通过
- 文档中能用简洁语言解释四者边界

---

## Unit 07：压缩 tool schema descriptions

### 目标
减少固定 token 成本中的低价值冗长描述。

### 修改文件
- `extensions/ce-core/index.ts`
- `docs/token-cost-evaluation.md`（如需更新数据）

### 动作
- 扫描所有 `Type.String/Type.Array/Type.Object` 的 description
- 将长句压缩成短语
- 优先压缩高频/核心工具描述
- 不改变 schema 结构，只缩文案

### 完成标准
- 参数 description 明显缩短
- 可读性仍足够

### 验证
- 类型/测试通过
- 若有 token 估算，更新文档

---

## Unit 08：压缩高频 SKILL.md

### 目标
缩短高频 skill 的默认注入长度。

### 修改文件
- `skills/01-brainstorm/SKILL.md`
- `skills/02-plan/SKILL.md`
- `skills/03-work/SKILL.md`
- `skills/04-review/SKILL.md`
- `skills/10-rules/SKILL.md`
- 对应 `references/` 文件（必要时承接迁出内容）
- `tests/skill-contracts.test.ts`

### 动作
- 保留：步骤、硬约束、输入输出
- 删除：重复哲学解释、冗余背景说明
- 复杂模式迁到 references
- 保证 skill 仍能独立工作

### 完成标准
- 高频 skill 文档更短，但行为约束不丢

### 验证
- skill contract 测试通过

---

## Unit 09：README / README_CN 瘦身与拆分

### 目标
把首页从“总手册”改成“短入口”。

### 修改文件
- `README.md`
- `README_CN.md`
- 新建建议：`CHANGELOG.md`
- 新建建议：`docs/architecture/overview.md`
- 新建建议：`docs/token-cost.md`

### 动作
- README / README_CN 只保留：
  - 是什么
  - 为什么
  - 5 步主循环
  - 安装
  - 最短示例
  - 极简设计哲学
- 将长 changelog、架构细节、token 细节迁出
- 修正 tools/skills/rules/代码规模等数字漂移

### 完成标准
- README 明显缩短
- 首页价值密度提高

### 验证
- `tests/package-structure.test.ts` 如有 README 断言，需同步调整

---

## Unit 10：测试减重与仓库清理

### 目标
删除低价值噪音，减少文案耦合。

### 修改文件
- `tests/package-structure.test.ts`
- `tests/skill-contracts.test.ts`
- `.gitignore`
- 仓库中的 `.DS_Store` 文件

### 动作
- 删除所有 `.DS_Store`
- 检查 `.gitignore` 是否充分覆盖
- 放宽或删除过度依赖 README 文案的断言
- 保留：结构契约、行为契约、发布必要契约

### 完成标准
- 仓库更干净
- 测试不再被宣传文案轻易打断

### 验证
- `bun test` 通过

---

## Unit 11：全量验证与减法结果报告

### 目标
封板，确认本轮减法有效而且没有破坏主流程。

### 修改文件
- `docs/reports/2026-04-24-minimalism-refactor-results.md`
- 如有需要更新：
  - `README.md`
  - `README_CN.md`
  - `docs/token-cost-evaluation.md`

### 动作
- 跑全量测试
- 汇总本轮：
  - 删除了什么
  - 合并了什么
  - 下沉了什么
  - 缩短了什么
  - token 预计下降点
- 记录未完成但应进入第二阶段的事项

### 完成标准
- 有一份可审计的减法结果报告

### 验证
- `bun test`
- 关键结构检查
- README 与当前实现一致

---

## 四、并行/串行建议

### 必须串行
- Unit 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11

### 可局部并行（仅在边界稳定后）
- Unit 07（schema descriptions）与 Unit 08（SKILL.md 压缩）可并行
- Unit 09（README 瘦身）与 Unit 10（仓库清理/测试减重）可部分并行

> 但若由 AI 执行，仍建议以串行为主，避免文档与测试互相踩踏。

---

## 五、每个 Unit 完成后的标准回填模板

后续 AI 每完成一个 unit，都应在执行记录中补：

```md
### Unit XX 完成记录
- 完成时间：
- 修改文件：
- 删除项：
- 合并项：
- 下沉项：
- 风险点：
- 验证结果：
- 下一步前提：
```

---

## 六、执行时的硬约束

1. 不允许顺手新增功能
2. 不允许把“极简化”做成“重新包装后的扩张”
3. 不允许为了保留历史叙事而拒绝删旧描述
4. 不允许 README、技能文档、测试三者继续漂移
5. 若某项删减会破坏主流程，则优先下沉而不是硬删

---

## 七、本轮完成后的理想结果

1. 首页只突出 5 步主循环
2. `08-status` 成为唯一状态/下一步入口
3. `09-help` 不再是默认 skill
4. `07-worktree` 成为高级能力，不干扰主心智
5. Optional tools 不再占据首页主叙事
6. 状态工具边界更清晰
7. 固定 token 开销下降
8. README 更短，测试更稳，仓库更干净
