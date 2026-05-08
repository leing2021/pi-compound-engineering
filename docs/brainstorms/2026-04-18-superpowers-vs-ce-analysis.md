# 分析：Superpowers Skills vs CE Skills

## 一、对应关系

| Superpowers | CE | 重叠度 |
|-------------|-----|--------|
| `01-brainstorm` | `ce-brainstorm` | **高** |
| `02-write-plan` | `ce-plan` | **高** |
| `03-execute-plan` | `ce-work` | **高** |
| `requesting-code-review` | `ce-review` | **中** |
| `receiving-code-review` | `ce-review` | **中** |
| `test-driven-development` | `ce-work` (隐含) | **中** |
| `00-project-rules` | 无对应 | — |
| `verification-before-completion` | `ce-work` (隐含) | **低** |
| `systematic-debugging` | 无对应 | — |
| `finishing-a-development-branch` | 无对应 | — |

## 二、Superpowers 的精华（CE 缺失的）

### 1. 严格 TDD 红线（`02-write-plan` + `03-execute-plan`）

**Superpowers 做法：**
- 硬性门控：没有 production code 可以在没有 failing test 之前出现
- 每个任务必须包含 RED → GREEN → REFACTOR 完整步骤
- 明确的 TDD 违规拒绝标准
- 测试验证命令必须可执行

**CE 当前状态：**
- `ce-work` 只说"keep verification explicit"，没有强制 TDD
- `ce-plan` 没有要求每个 task 必须有 RED/GREEN 验证命令
- 没有 TDD 违规拒绝机制

**精华：** TDD 不是建议，是不可违反的铁律。这个纪律性是 Superpowers 最强的部分。

### 2. 规则分层加载（`00-project-rules`）

**Superpowers 做法：**
- `~/.pi/agent/rules/` 下有完整的项目规则体系
- 规则按优先级分层：用户指令 > 语言特定 > Web 场景 > 通用
- 规划和执行时明确记录加载了哪些规则
- 规则覆盖关系必须显式声明

**CE 当前状态：**
- 完全没有规则加载机制
- 没有 project rules 的概念

**精华：** 规则分层系统确保 agent 在不同语言/场景下遵循正确的编码规范。但这依赖 `~/.pi/agent/rules/` 私有目录，不适合作为通用 package 的一部分。

### 3. 设计检查清单（`01-brainstorm`）

**Superpowers 做法：**
- 明确的设计检查清单：what/why/files/boundaries/failure/verification/rules
- 强制要求用户审批设计后才能进入规划
- 明确的停止条件（需求冲突、标准不清、跨多系统）

**CE 当前状态：**
- `ce-brainstorm` 有多轮对话但缺少设计检查清单
- 缺少明确的用户审批门控

**精华：** 设计检查清单 + 用户审批门控防止"边想边做"的问题。

### 4. 完成报告（`03-execute-plan`）

**Superpowers 做法：**
- 完成后必须提供：完成的任务、修改的文件、加载的规则、执行的命令、验证结果、后续风险
- "证据先于断言"原则

**CE 当前状态：**
- `ce-work` 用 `progress-update-format` 但不够结构化
- 没有强制完成报告格式

**精华：** 结构化完成报告确保工作可审计。

### 5. 代码审查纪律（`receiving-code-review`）

**Superpowers 做法：**
- 禁止表演性同意（"You're absolutely right!"）
- 要求技术验证后再实施
- YAGNI 检查
- 明确的 pushback 指导

**CE 当前状态：**
- `ce-review` 有 `review_router` + autofix 但没有审查纪律指导

**精华：** 审查是技术评估，不是社交表演。这个纪律性对 AI agent 特别重要。

## 三、CE 的精华（Superpowers 缺失的）

| CE 优势 | Superpowers 缺失 |
|---------|-----------------|
| `brainstorm_dialog` 多轮对话管理 | brainstorm 是线性的，没有状态管理 |
| `plan_diff` 增量更新 | plan 改了就重写 |
| `session_checkpoint` 断点续传 | 执行中断从零开始 |
| `task_splitter` 依赖分析 | 没有依赖分析，全部串行 |
| `parallel_subagent` 并行执行 | 没有并行能力 |
| `review_router` 角色 routing | review 没有角色路由 |
| `session_history` 跨 session 历史 | 没有 session 历史 |
| `pattern_extractor` 模式提取 | 没有知识提取 |
| `worktree_manager` 隔离开发 | 没有隔离能力 |
| Durable artifacts (docs/) | specs 在 docs/superpowers/ 但没有结构化 |
| 可安装的 npm package | skills 在 ~/.pi/agent/skills/ 不能安装分发 |

## 四、评估结论

**Superpowers 的精华可以归类为 3 个层次：**

### A. 可以直接合并的（Skill 内容增强）

1. **TDD 红线** → 合入 `ce-plan` 和 `ce-work`
2. **设计检查清单** → 合入 `ce-brainstorm`
3. **完成报告格式** → 合入 `ce-work`
4. **审查纪律指导** → 合入 `ce-review`

### B. 值得借鉴但不能直接合并的

1. **规则分层加载** → 依赖 `~/.pi/agent/rules/` 私有目录，不适合通用 package。但可以在 skill 中指导 agent 加载项目本地的规则（如 `.pi/rules/` 或项目 README 中的规范）。
2. **Subagent 模板** → CE 已有更好的 subagent 工具，不需要 Superpowers 的模板方式。

### C. 不需要合并的

1. **`systematic-debugging`** → 独立 skill，不属于 CE 核心工作流
2. **`finishing-a-development-branch`** → 独立 skill，不属于 CE 核心工作流
3. **`00-project-rules`** → 依赖私有目录，不适合通用 package
4. **`verification-before-completion`** → CE 已在 `ce-work` 中隐含

## 五、建议方案

### 一次性合并 Superpowers 精华到 CE

将 A 类的 4 个精华合入对应的 CE skill，发布为 `0.13.0`：

| 精华 | 目标 Skill | 具体改动 |
|------|-----------|---------|
| TDD 红线 | `ce-plan` + `ce-work` | 加入硬性 TDD 门控和违规拒绝标准 |
| 设计检查清单 | `ce-brainstorm` | 加入 design checklist + 用户审批门控 |
| 完成报告 | `ce-work` | 加入结构化完成报告格式 |
| 审查纪律 | `ce-review` | 加入技术评估纪律 + YAGNI 检查 |

合并后，**只保留 `super-pi` 一个工作流**，卸载 Superpowers 的 `01-brainstorm`、`02-write-plan`、`03-execute-plan`、`requesting-code-review`、`receiving-code-review`、`test-driven-development`。

保留不合并的 Superpowers skills：
- `systematic-debugging` — 独立有用
- `finishing-a-development-branch` — 独立有用
- `00-project-rules` — 规则基础设施
- `verification-before-completion` — 独立有用
- `using-superpowers` — 入口 skill

### 版本号：0.13.0

不需要新 tool，只需要更新 4 个 SKILL.md 的内容。
