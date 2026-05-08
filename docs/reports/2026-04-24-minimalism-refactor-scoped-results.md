# 极简化重构结果（缩范围版）

> 日期：2026-04-24  
> 关联计划：`docs/plans/2026-04-24-minimalism-refactor-plan-scoped.md`  
> 关联执行清单：`docs/plans/2026-04-24-minimalism-refactor-plan-scoped-execution-units.md`

---

## 一、本轮目标

本轮只处理用户可见面的复杂度，聚焦 3 类问题：

1. 默认用户心智过重
2. 状态/下一步入口重复
3. README / README_CN 过长

本轮**不处理**：

- 状态模型统一重构
- 全量 tool schema description 压缩
- Core / Optional tools 的正式架构治理
- 历史文档全面同步清洗

---

## 二、实际完成内容

### 1. `06-next` → `08-status` 收口

已修改：
- `skills/06-next/SKILL.md`
- `skills/08-status/SKILL.md`
- `README.md`
- `README_CN.md`

结果：
- `08-status` 明确成为默认的“状态 + 下一步”统一入口
- `06-next` 降级为兼容别名入口
- README / README_CN 中不再把 `06-next` 作为独立主路径 skill 强调

### 2. `07-worktree` 弱化

已修改：
- `skills/07-worktree/SKILL.md`
- `README.md`
- `README_CN.md`

结果：
- `07-worktree` 明确标记为 advanced / optional
- 从默认主流程心智中后移
- README / README_CN 不再以“主推能力”口吻强调 worktree

### 3. `09-help` 下沉

已修改：
- `skills/09-help/SKILL.md`
- `README.md`
- `README_CN.md`

结果：
- `09-help` 明确成为辅助型文档/说明入口
- 不再作为默认 workflow skill 竞争主入口
- 用户如果想知道“当前状态/下一步”，被引导到 `08-status`

### 4. README / README_CN 瘦身

已修改：
- `README.md`
- `README_CN.md`

结果：
- 两份 README 均收缩为 **144 行**
- 首页聚焦于：
  - super-pi 解决什么问题
  - 默认 5 个主 skill
  - `08-status` 统一入口
  - 最短使用路径
  - 辅助/高级入口说明
  - 文件落点与更多文档链接
- 以下内容已从首页移除或后移：
  - 每一步长篇解释
  - 技术架构大表
  - tools 总表
  - token 成本细节
  - 代码规模说明
  - rules 长说明
  - changelog
  - 最佳实践长表

---

## 三、改动结果概览

### 用户心智上的变化

从：
- 需要同时理解多个主入口与辅助入口
- `06-next` / `08-status` 容易职责重叠
- `07-worktree` 过早进入默认心智
- `09-help` 也在技能表中像主路径入口
- README 首页信息量过大

变成：
- 默认只需理解 5 个主 skill
- `08-status` 成为唯一默认状态/下一步入口
- `07-worktree` 成为高级可选能力
- `09-help` 成为辅助说明入口
- README 首页变成短入口，而不是总册

### 代码与文档变更规模

本轮核心 diff（统计范围：README + 4 个 skill 文档）：

- 6 files changed
- 193 insertions
- 838 deletions

说明：
- 这轮是一次明确的“减法重构”
- 删除量显著高于新增量

---

## 四、仍保留的历史痕迹

以下内容仍在 README / README_CN 的历史记录中出现，但不影响本轮目标达成：

- `README.md:462` 左右的 changelog 中仍有 `workflow_state + 06-next`
- `README.md:462` 左右的 changelog 中仍有 `worktree_manager + 07-worktree`
- 中文 README 对应 changelog 位置亦然

由于 README 已整体瘦身重写，这些历史痕迹已不再位于首页主叙事中。
若后续需要，可在单独文档治理轮次中继续处理历史叙事统一问题。

---

## 五、本轮明确没有做的事

以下事项被**明确延后**：

1. 状态模型边界收口
   - `workflow_state`
   - `session_checkpoint`
   - `context_handoff`
   - `session_history`

2. 全量 tool schema descriptions 压缩
   - `extensions/ce-core/index.ts` 未纳入本轮治理

3. 正式 Core tools / Optional tools 架构文档化
   - 本轮只做了 README 叙事层面的弱化

4. 历史报告 / 旧文档的全面同步清洗
   - 旧分析、旧报告保持原样

---

## 六、验收结论

本轮缩范围目标已达成：

- [x] 默认主心智收缩到 5 个主 skill
- [x] `08-status` 成为默认状态/下一步入口
- [x] `07-worktree` 成为高级可选能力
- [x] `09-help` 不再作为默认入口竞争者
- [x] README / README_CN 首页显著变短，且主路径更清楚

---

## 七、建议下一步

在这轮用户可见面减法完成后，再单独复评以下问题是否值得继续：

1. 是否要做状态模型边界收口
2. 是否要单独立项做 token 固定成本优化
3. 是否要正式整理 Core / Optional tools 分层文档
4. 是否要清理历史文档中的重复叙事

当前更推荐先观察：
- 新用户是否更容易理解默认流程
- `08-status` 是否成功承担统一入口角色
- 是否仍有明显的入口竞争或说明冗余
