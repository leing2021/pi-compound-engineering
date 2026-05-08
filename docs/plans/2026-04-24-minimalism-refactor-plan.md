# 极简化重构计划

> 日期：2026-04-24  
> 目标：围绕“极简主义，非必要，不增溢”对 super-pi 做一轮减法重构，减少概念数、默认暴露面、固定 token 开销以及文档/状态重复。

---

## 一、重构目标

本轮只做 4 件事：

1. 减少概念数
2. 减少默认暴露面
3. 减少 token 固定开销
4. 减少文档和代码的自我重复

---

## 二、重构原则

1. **不新增功能**
   - 只允许：删除、合并、下沉、改名、拆文档、精简描述
   - 不新增 tool / skill / 状态字段

2. **先动叙事，再动结构**
   - 先定义核心、可选、多余
   - 再改代码

3. **默认路径必须最短**
   - 默认只保留：5 步主循环 + 少量必要工具 + 极少状态概念

4. **重复概念优先合并**
   - 任何“新名字但旧能力”的抽象都优先并掉

5. **token 优化优先于说明完整**
   - 文案宁短不长，按需展开

6. **每天都要净减少**
   - 每天结束都要能明确说明：少了什么

---

## 三、目标结构

### 1. 主技能只突出 5 个

- `01-brainstorm`
- `02-plan`
- `03-work`
- `04-review`
- `05-learn`

### 2. 辅助技能收缩

保留：
- `08-status`：状态 + 下一步建议
- `10-rules`：规则加载

调整：
- `06-next` → 合并进 `08-status`
- `09-help` → 下沉为 README / docs，不再作为独立 skill
- `07-worktree` → 标记为 advanced / optional，不放主叙事

### 3. 工具分层

#### Core
- `artifact_helper`
- `subagent`
- `parallel_subagent`
- `task_splitter`
- `plan_diff`
- `workflow_state` / `session_checkpoint` / `context_handoff`（本轮先收口语义）
- `bash-output-filter`
- `read-output-filter`

#### Optional
- `ask_user_question`
- `review_router`
- `worktree_manager`
- `session_history`
- `pattern_extractor`

### 4. 状态概念收口

目标心智只保留两类：
- **runtime state**
- **handoff summary**

其中：
- `workflow_state`：状态汇总查询
- `session_checkpoint`：runtime persistence
- `context_handoff`：人/模型续接摘要
- `session_history`：仅归档，不参与主路径决策

---

## 四、一周执行清单

## Day 1：定边界，完成删减决议

### 目标
明确核心、可选、删除/合并项，防止边改边扩。

### 任务
- [ ] 新建极简重构决议文档
- [ ] 列出 Core / Optional / Remove-Merge 三类
- [ ] 统一项目一句话定位
- [ ] 明确重复点：
  - `06-next` vs `08-status`
  - workflow/checkpoint/handoff/history 交叉
  - README/README_CN/docs 的重复叙事

### 交付物
- 重构决议文档

### 验收标准
- 团队能一致回答：主路径是什么、可选是什么、这一轮删什么/并什么

---

## Day 2：收缩 skill 层

### 目标
让 skill 主线只保留必要心智。

### 任务
- [ ] 合并 `06-next` 到 `08-status`
- [ ] 删除或下沉 `09-help` skill 暴露
- [ ] 将 `07-worktree` 从 README 主叙事中移除，改为 advanced / optional
- [ ] 更新 README / README_CN 中的相关提法

### 交付物
- 更精简的 skill 暴露面

### 验收标准
- 新用户不需要理解 `06-next` / `09-help` / `07-worktree` 也能完整理解主流程

---

## Day 3：收缩 tool 暴露面

### 目标
把核心能力与附加能力彻底分层。

### 任务
- [ ] 在文档和代码注释中标明 Core tools / Optional tools
- [ ] README 不再主推 optional tools
- [ ] 评估 optional tools 是否支持后续延迟注册 / 独立扩展
- [ ] 记录后续可拆分候选：
  - `ask_user_question`
  - `review_router`
  - `worktree_manager`
  - `session_history`
  - `pattern_extractor`

### 交付物
- 工具分层清单

### 验收标准
- 首页叙事不再像“十几种工具合集”

---

## Day 4：状态模型收口

### 目标
减少状态抽象重叠，先统一边界和语义。

### 任务
- [ ] 画出当前状态边界图
- [ ] 明确定义：
  - runtime state
  - handoff summary
  - archive history
- [ ] 给 `workflow_state` / `session_checkpoint` / `context_handoff` / `session_history` 重新定义职责
- [ ] 找出并清理重复字段与重复话术：
  - `blocker`
  - `verification`
  - `currentStage`
  - `nextStage`
  - `latestHandoffPath`

### 交付物
- 状态收口说明文档

### 验收标准
- 团队能明确说出每个状态工具该存什么、不该存什么

---

## Day 5：token 固定成本优化

### 目标
直接削减固定注入成本。

### 任务
- [ ] 压缩 `extensions/ce-core/index.ts` 中 tool schema descriptions
- [ ] 压缩高频 SKILL.md：
  - `skills/01-brainstorm/SKILL.md`
  - `skills/02-plan/SKILL.md`
  - `skills/03-work/SKILL.md`
  - `skills/04-review/SKILL.md`
  - `skills/10-rules/SKILL.md`
- [ ] 删除重复解释性文字，把复杂说明下沉到 references
- [ ] 记录 token 下降点

### 交付物
- 精简后的 schema 描述与 skill 文档

### 验收标准
- 固定 prompt 成本下降，且行为不受影响

---

## Day 6：瘦身 README 和长文档

### 目标
把 README 从“总册”收成“短入口”。

### 任务
- [ ] README / README_CN 只保留：
  1. 是什么
  2. 为什么
  3. 5 步主循环
  4. 安装
  5. 最短示例
  6. 极简设计哲学
- [ ] 将以下内容迁出：
  - 长 Changelog
  - 深度技术架构
  - token 评估细节
  - 复杂规则说明
- [ ] 修正文档漂移：
  - tools 数量
  - skills 数量
  - rules 结构描述
  - 代码规模描述

### 交付物
- 精简版 README / README_CN
- 拆出的专题文档

### 验收标准
- README 明显变短，首页更聚焦，数字与现实一致

---

## Day 7：清理、验证、封板

### 目标
结束这一轮，确保仓库和叙事都收干净。

### 任务
- [ ] 删除仓库中所有 `.DS_Store`
- [ ] 检查 `.gitignore`
- [ ] 清理不必要的空目录占位
- [ ] 评估测试中的文案耦合：
  - 保留契约测试 / 行为测试 / 发布必要测试
  - 减少过度依赖 README 文案的断言
- [ ] 跑完整验证：
  - `bun test`
  - package structure 检查
  - skill contracts 检查
- [ ] 输出一份减法结果报告

### 交付物
- 干净仓库
- 全量验证通过
- 减法结果报告

### 验收标准
- 默认心智更简单，仓库噪音更少，无新增功能混入

---

## 五、优先级排序

### P0：必须做
1. [ ] 合并 `06-next` → `08-status`
2. [ ] 下沉/删除 `09-help`
3. [ ] README 精简
4. [ ] 修正文档与代码现实不一致
5. [ ] 清理 `.DS_Store`

### P1：高价值
6. [ ] tool 分层：core / optional
7. [ ] 缩 schema descriptions
8. [ ] 缩高频 SKILL.md
9. [ ] 状态边界收口

### P2：后续继续推进
10. [ ] optional tools 默认不暴露/弱化
11. [ ] 测试减重
12. [ ] 审计过滤器复杂度收益比
13. [ ] 第二阶段考虑真正合并状态实现

---

## 六、成功标准

本轮不看“写了多少代码”，只看 5 个结果：

1. 默认 skill 心智减少
2. 默认 tool 心智减少
3. README 明显缩短
4. 状态抽象更清楚
5. 固定 token 成本下降

---

## 七、建议后续执行方式

后续 AI 执行时，建议严格按以下顺序推进，不跳步：

1. 先完成 Day 1 的边界决议
2. 再做 Day 2 的 skill 收缩
3. 再做 Day 3 的 tool 分层
4. 再做 Day 4 的状态收口
5. 再做 Day 5 的 token 优化
6. 再做 Day 6 的 README / docs 瘦身
7. 最后做 Day 7 的清理与验证

每完成一天，都需要补充：
- 已删除/合并/下沉项
- 风险点
- 下一天执行前提

这样后续 AI 可以直接按文档逐步执行，不容易偏航。