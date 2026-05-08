# super-pi × pi-subagents 冲突与协同深度评估

> **评估日期**: 2026-04-19  
> **评估版本**: super-pi v0.16.0 / pi-subagents v0.17.0  
> **Pi 核心版本**: v0.67.6+

---

## 执行摘要

两个扩展同时安装时存在 **1 个严重冲突**（工具名碰撞）和 **2 个中等风险问题**（LLM 认知混淆、worktree 路径冲突），但也存在 **显著协同潜力**。下表总结：

| 严重程度 | 问题 | 影响 |
|----------|------|------|
| 🔴 严重 | `subagent` 工具名冲突 | **后者覆盖前者**，一个扩展的 subagent 工具会完全失效 |
| 🟡 中等 | LLM 对两套 subagent 系统的认知混淆 | 模型可能调用错误的工具/参数格式 |
| 🟡 中等 | Worktree 路径管理不一致 | super-pi 的长期 worktree vs pi-subagents 的临时 worktree |
| 🟢 低 | `tool_result` 事件处理叠加 | super-pi 的 bash/read 过滤不影响 pi-subagents |
| ✅ 无风险 | 斜杠命令 (`/run`, `/chain` 等) | 无命名冲突 |
| ✅ 无风险 | Skills 系统 | 各自独立，不互相干扰 |
| ✅ 无风险 | 事件总线 | 事件命名空间不同 |

---

## 1. 🔴 严重：`subagent` 工具名冲突

### 发现

两个扩展都注册了名为 `subagent` 的工具：

```
super-pi/extensions/ce-core/tools/subagent.ts → name: "subagent"
pi-subagents/index.ts                          → name: "subagent"
```

### Pi 核心行为

Pi 的扩展加载器 (`loader.js`) 使用 `Map<name, definition>` 存储工具：

```javascript
// loader.js:138-142
registerTool(tool) {
    extension.tools.set(tool.name, {  // Map.set() — 后写覆盖
        definition: tool,
        sourceInfo: extension.sourceInfo,
    });
    runtime.refreshTools();
}
```

`Map.set()` 对同一 key 会 **直接覆盖**，不抛异常、不警告。

### 加载顺序

Pi 的加载顺序（`discoverAndLoadExtensions`）：
1. 项目本地扩展: `cwd/.pi/extensions/`
2. 全局扩展: `~/.pi/agent/extensions/`
3. packages 配置路径: `settings.json` → `packages` 数组

在您当前的 `settings.json` 中：
```json
{
  "packages": ["npm:@leing2021/super-pi", "npm:pi-mono-status-line", "npm:pi-answer"]
}
```

`pi-subagents` **未在 packages 列表中**。如果未来安装，两者都会被加载，**加载顺序取决于它们在文件系统中的排列顺序和 packages 数组顺序**。

### 后果

假设 super-pi 先加载，pi-subagents 后加载：

| 行为 | super-pi 的 `subagent` | pi-subagents 的 `subagent` |
|------|:---:|:---:|
| LLM 可见 | ❌ 被覆盖 | ✅ 生效 |
| Schema 生效 | ❌ | ✅ |
| execute 函数 | ❌ | ✅ |

**super-pi 的 `subagent` 工具完全失效。** 这意味着：
- super-pi 的 `03-work` skill 中使用 `subagent` 工具的 chain 模式会调用到 pi-subagents 的实现
- pi-subagents 不理解 super-pi 的 `chain` 参数格式（它期望的是 agent 文件名，不是 skill 名称）
- **调用会直接报错或产生意外行为**

### 反向加载（pi-subagents 先）

如果 pi-subagents 先加载，super-pi 覆盖：
- pi-subagents 丰富的 `subagent` 工具（700+ 行 schema）被替换为一个极简的 skill 路由器
- `/run`、`/chain`、`/parallel` 斜杠命令仍然注册，但底层工具被替换
- **所有 pi-subagents 的 chain、parallel、TUI、async、worktree 功能全部失效**

---

## 2. 🟡 中等：LLM 认知混淆

### 问题描述

即使解决了工具名冲突，两个扩展都声称提供"subagent"能力，但语义完全不同：

| 维度 | super-pi `subagent` | pi-subagents `subagent` |
|------|---------------------|-------------------------|
| **目标** | Pi skill 调用 (`/skill:xxx`) | 独立 Pi 进程执行 |
| **Agent 概念** | Skill 名称 (如 `01-brainstorm`) | Agent markdown 文件 (如 `scout.md`) |
| **chain 语义** | 简单串行 `{previous}` 模板 | 完整 chain 引擎（parallel、TUI、artifacts） |
| **进程模型** | `pi --no-session -p <prompt>` | 完整 Pi 子进程（session、model、tools） |
| **参数** | `{agent, task, chain}` | 20+ 参数（context, worktree, clarify, async...） |
| **输出** | 纯文本 | 结构化 Details + artifacts + session logs |

### 混淆场景

```
用户: "帮我分析下代码然后写个计划"

LLM 看到的工具列表：
  - subagent (来自 ??? — 取决于谁后加载)
  - parallel_subagent (来自 super-pi — 不冲突)
  - subagent_status (来自 pi-subagents — 不冲突)

如果 LLM 根据 available_skills 中的 03-work skill 决定调用 subagent：
  - 03-work 期望 agent 参数是一个 skill 名称
  - 但实际执行的是 pi-subagents 的工具，它期望 agent 是一个 .md 文件名
  - 结果：Agent "03-work" not found
```

---

## 3. 🟡 中等：Worktree 管理冲突

两个扩展都提供 worktree 能力，但设计目标不同：

| 维度 | super-pi `worktree_manager` | pi-subagents `worktree.ts` |
|------|---------------------------|---------------------------|
| **工具名** | `worktree_manager` (无冲突) | 内嵌在 `subagent` 工具中 |
| **生命周期** | 长期（create→工作→merge→cleanup） | 临时（自动创建→运行→diff→清理） |
| **路径策略** | `<repo>-<branch-slug>` | `<tmpdir>/pi-worktree-*` |
| **用途** | 手动 feature 分支隔离 | 自动并行执行隔离 |
| **触发方式** | LLM 显式调用 skill 07-worktree | `worktree: true` 参数 |

### 风险

- 如果用户先通过 super-pi 创建了 worktree，然后在 worktree 内部触发 pi-subagents 的 `worktree: true`，会创建 **worktree of worktree**
- pi-subagents 的临时 worktree 清理可能在 super-pi 还需要它时删除目录

---

## 4. 🟢 低风险：tool_result 事件处理

两个扩展都监听 `tool_result` 事件：

**super-pi**:
```javascript
// 过滤 bash 输出
if (event.toolName !== "bash") return undefined
// 过滤 read 输出
if (event.toolName !== "read") return undefined
```

**pi-subagents**:
```javascript
// 只关心自己的工具
if (event.toolName !== "subagent") return;
```

### 分析

- 事件监听器是 **叠加式** 的，多个扩展可以同时监听
- super-pi 只处理 `bash` 和 `read`，pi-subagents 只处理 `subagent`
- **无冲突**，两者互补
- 但如果 super-pi 的 bash 过滤修改了 `pi exec` 命令的输出，可能间接影响 pi-subagents 的子进程输出读取

---

## 5. 无冲突区域

### 斜杠命令

| super-pi | pi-subagents | 冲突？ |
|----------|-------------|--------|
| *(无斜杠命令)* | `/run` | ✅ 无冲突 |
| *(无斜杠命令)* | `/chain` | ✅ 无冲突 |
| *(无斜杠命令)* | `/parallel` | ✅ 无冲突 |
| *(无斜杠命令)* | `/agents` | ✅ 无冲突 |
| *(无斜杠命令)* | `/subagents-status` | ✅ 无冲突 |

### 事件总线

| super-pi | pi-subagents | 冲突？ |
|----------|-------------|--------|
| *(无自定义事件)* | `subagent:started` | ✅ 无冲突 |
| *(无自定义事件)* | `subagent:complete` | ✅ 无冲突 |
| *(无自定义事件)* | `subagent:slash:*` | ✅ 无冲突 |
| *(无自定义事件)* | `subagent:pt:*` | ✅ 无冲突 |

### 独有工具（无命名冲突）

| super-pi 独有 | pi-subagents 独有 |
|--------------|-------------------|
| `artifact_helper` | `subagent_status` |
| `ask_user_question` | *(subagent 工具内嵌)* |
| `workflow_state` | |
| `review_router` | |
| `session_checkpoint` | |
| `task_splitter` | |
| `brainstorm_dialog` | |
| `plan_diff` | |
| `session_history` | |
| `pattern_extractor` | |
| `worktree_manager` | |
| `parallel_subagent` | |

**注意**: `parallel_subagent`（super-pi）与 pi-subagents 的 `tasks` 模式功能重叠，但工具名不同，不冲突。

---

## 6. 协同潜力分析

如果解决了工具名冲突，两个扩展实际上可以 **强力互补**：

### 天然协同点

```
用户工作流:
  1. super-pi 03-work skill 规划任务
     ↓ 使用 session_checkpoint 跟踪进度
     ↓ 使用 task_splitter 分析依赖
  2. 对于独立任务 → pi-subagents 的并行执行
     ↓ worktree 隔离，artifacts 追踪
  3. super-pi 04-review skill 审查结果
     ↓ 使用 review_router 分配审查角色
  4. super-pi 05-learn 捕获经验
```

| super-pi 提供 | pi-subagents 提供 | 协同方式 |
|--------------|-------------------|----------|
| 结构化工作流 (brainstorm→plan→work→review) | 强大的多 agent 执行引擎 | super-pi 编排，pi-subagents 执行 |
| `task_splitter` 分析依赖 | `tasks` + `worktree` 并行执行 | 拆分→并行 |
| `session_checkpoint` 进度追踪 | chain artifacts + session logs | 双重可观测性 |
| `review_router` 审查路由 | builtin `reviewer` agent | 路由→执行 |
| `brainstorm_dialog` 需求探索 | `researcher` agent 深度研究 | 探索→研究 |
| `pattern_extractor` 模式提取 | `scout` agent 代码侦察 | 提取→侦察 |

### 理想架构

```
super-pi (编排层)
  ├── Skills: 工作流编排（brainstorm → plan → work → review → compound）
  ├── artifact_helper: 制品路径管理
  ├── session_checkpoint: 执行进度
  ├── task_splitter: 依赖分析
  └── review_router: 审查分配

pi-subagents (执行层)
  ├── subagent: 多模式执行（single/chain/parallel/management）
  ├── 7 builtin agents: scout, planner, worker, reviewer, ...
  ├── /run, /chain, /parallel: 用户交互
  ├── worktree isolation: 并行隔离
  └── async execution: 后台任务
```

---

## 7. 解决方案建议

### 方案 A：重命名 super-pi 的工具（推荐 ⭐）

将 super-pi 的 `subagent` 重命名为 `ce_subagent`，`parallel_subagent` 保持不变：

```typescript
// super-pi/tools/subagent.ts
export function createSubagentTool() {
  return {
    name: "ce_subagent",  // ← 加前缀
    // ...rest unchanged
  }
}
```

**优点**: 零侵入 pi-subagents，两者完全共存  
**缺点**: super-pi 的 skills 需要更新工具名引用

### 方案 B：将 super-pi 的 subagent 适配为 pi-subagents 的前端

让 super-pi 的 `subagent` 工具在检测到 pi-subagents 存在时，将调用转发到 pi-subagents 的工具：

```typescript
// 伪代码
if (isPiSubagentsAvailable()) {
  // 使用 pi-subagents 的 chain/parallel/worktree 能力
  return piSubagentsExecute(adaptedParams)
} else {
  // 降级到 skill-based 执行
  return skillBasedExecute(params)
}
```

**优点**: 自动适配，用户无感知  
**缺点**: 实现复杂，两套参数系统的映射不完美

### 方案 C：super-pi 直接依赖 pi-subagents

将 pi-subagents 作为 super-pi 的依赖，super-pi 不再提供自己的 subagent 工具：

```json
{
  "peerDependencies": {
    "pi-subagents": ">=0.17.0"
  }
}
```

**优点**: 架构最干净  
**缺点**: super-pi 失去独立工作能力

### 方案 D：用户侧工作配置（临时方案）

在 `settings.json` 中只启用一个：

```json
{
  "packages": [
    "npm:@leing2021/super-pi"
  ],
  "extensions": {
    "exclude": ["pi-subagents"]
  }
}
```

或者在不同项目中使用不同的配置。

---

## 8. 当前状态下的风险评估

根据您当前的 `settings.json`：
```json
{
  "packages": ["npm:@leing2021/super-pi", "npm:pi-mono-status-line", "npm:pi-answer"]
}
```

**当前**: `pi-subagents` **未安装**，不存在冲突。  
**如果安装 pi-subagents**: 上述 🔴 严重冲突将立即触发。

### 风险等级

| 安装方式 | 冲突等级 | 说明 |
|---------|---------|------|
| 只安装 super-pi | ✅ 无风险 | 当前状态 |
| 只安装 pi-subagents | ✅ 无风险 | 无 super-pi 工具 |
| **同时安装** | 🔴 **严重** | `subagent` 工具被覆盖 |

---

## 9. 总结

| 维度 | 评分 | 说明 |
|------|------|------|
| **冲突严重度** | 🔴 高 | 工具名碰撞导致一个扩展完全失效 |
| **协同潜力** | 🟢 优秀 | 编排层 + 执行层的天然互补 |
| **解决难度** | 🟡 中等 | 重命名工具即可解决核心冲突 |
| **推荐行动** | 方案 A | super-pi 的 subagent 改名为 `ce_subagent` |

**一句话总结**: 两个扩展的设计哲学互补（super-pi 是 **编排层**，pi-subagents 是 **执行层**），但 `subagent` 工具名碰撞是需要解决的前置条件。推荐 super-pi 将工具重命名为 `ce_subagent`，之后两者可以形成强大的 **brainstorm→plan→execute→review→compound** 全链路。

---

## 10. ✅ 解决方案实施状态（2026-04-30 更新）

**方案 A 已实施完成。** 具体变更：

| 变更项 | 旧名称 | 新名称 |
|--------|--------|--------|
| CE skill-router (串行) | `subagent` | `ce_subagent` |
| CE skill-router (并行) | `parallel_subagent` | `ce_parallel_subagent` |

**当前状态**:

- ✅ 🔴 严重冲突已解决 — `ce-core` 不再注册裸 `subagent` 或 `parallel_subagent`
- ✅ `03-work` skill 已更新为新工具名引用
- ✅ README / README_CN 文档了共存说明
- ✅ 静态 guard test 确保不会误注册裸名
- 🟡 中等风险（LLM 认知混淆、worktree 路径冲突）仍存在但影响有限

用户可以同时安装 `@leing2021/super-pi` 和 `pi-subagents`，各工具名独立，不会发生运行时覆盖。
