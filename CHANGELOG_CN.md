# 更新日志

### 0.23.5 — Agent-skills 微模式吸收：嵌入式行为门禁、技能路由、仓库整理
- **Skill 描述强化** — 8 个技能的 frontmatter description 均加入 "Use when" 触发条件，提升自动技能路由准确性。
- **Source-driven 门禁** — 嵌入 3 处：`rules/common/development-workflow.md`（规则）+ `02-plan` workflow step + `03-work` workflow step。当实现依赖框架/库 API 或版本特定行为时，先查官方文档再实现。
- **Stop-the-line 规则（Hard gate）** — 嵌入 `03-work` Hard gates。遇到意外失败：STOP → 保留证据 → 诊断根因 → 修复 → 加回归测试 → 恢复。
- **Anti-rationalization** — 当 gate 失败或证据缺失时：不要合理化、降级或解释失败。停下来，带着证据报告阻塞点。
- **Review 五轴基准** — 加入 `04-review` reviewer-selection：所有 reviewer 按 correctness、readability、architecture、security、performance 五轴评估。
- **Typo 修复** — `performan04-reviewer` → `performance-reviewer`。
- **仓库整理** — `docs/` 不再追踪；`bun.lock` 不再追踪。
- 采用 Approach B：所有改动为现有文件编辑，不新增技能/工具/命令。新增约 410 tokens。
- 209 个测试通过，0 回归。

### 0.23.4 — 记忆优化 Phase 2：activeRules、context-first 技能、handoff 生命周期
- `context_handoff` 新增 `activeRules?: string[]` 字段，用于跨 session 保存 1-5 条续接关键规则。
- `activeRules` 持久化到 state，通过 load/latest/status 返回，在默认 handoff 模板中渲染。
- 向后兼容：旧 state 文件缺少 `activeRules` 时归一化为 `[]`。
- 软约束：>5 条规则不会导致失败。
- 更新 `pipeline-config.md`，增加「启动时加载 context」指引（handoff 优先于广泛读取）和「结束时保存 handoff」生命周期。
- 更新 `02-plan`、`03-work`、`04-review` SKILL.md，将加载 handoff 作为工作流第一步。
- 重写 `06-next` 推荐逻辑，采用 context-first 优先级链：health → blocker → recommendNewSession → nextStage → mismatch → artifact-count 回退。
- 6 个新测试覆盖 activeRules（round-trip、模板、默认值、软约束、向后兼容、自定义 markdown）。
- 209 测试通过，0 回归。

### 0.23.3 — Context handoff 确定性验证探针（Route B-lite）
- `context_handoff` 新增 `operation: "validate"`，用于确定性续接就绪性验证。
- 4 个探针：`recall`、`continuation`、`artifact`、`decision`。
- `ok` 仅要求 `recall` + `continuation` 通过；`artifact` / `decision` 缺失为 warnings。
- 可解释 `checks` 数组，每个探针包含 name、passed、reason。
- 占位符过滤：`N/A`、`- N/A`、`Not run` 不计入 markdown 或结构化状态中的证据。
- 所有公开输出路径归一化为仓库相对路径。
- 收紧续接判定：`verification` / `blocker` 单独不能让 continuation 通过。
- 203 测试通过，0 回归。

### 0.23.2 — Context handoff 结构化运行态内存锚点
- `context_handoff` 新增 5 个可选结构化字段：`currentTruth`、`invalidatedAssumptions`、`openDecisions`、`recentlyAccessedFiles`、`compressionRisk`。
- 新字段持久化到 `.context/compound-engineering/context-state.json`，支持机器可读的运行态状态。
- 扩展默认 handoff-lite markdown 模板，增加对应 sections。
- 新增 `workflow_state.context`，从 `context-state.json` 读取结构化状态并返回安全默认值。
- 增加状态归一化层（`normalizeStateEntry`、`toStringArray`），确保与旧版状态文件向后兼容。
- 修复 `workflow_state` 对 context state 中非字符串数组元素的过滤。
- 更新 `pipeline-config.md` handoff-lite 模板，增加 5 个新 sections。
- 191 测试通过，0 回归。

### 0.23.1 — SKILL.md 精简 + thinkingStrategy 支持
- 8 个 SKILL.md 文件从 28KB 精简到 18KB（-35%），将详细规则、模板、示例移至 `references/` 按需加载。
- 新建 reference 文件：
  - `ce-brainstorm-mode.md`（01-brainstorm）：标准 CE 模式工作流
  - `solution-search.md`（02-plan, 04-review）：grep 优先的 solution 搜索策略
  - `completion-report.md`（03-work）：完成报告模板
- 扩展已有 references：
  - `workflow-sequence.md`（08-help）：详细 CE pipeline 指南
  - `recommendation-logic.md`（06-next）：合并 skill-registry
- 新增 `thinkingStrategy` 支持，按 skill 控制思考深度。
- 扩展配置加载，支持全局 `~/.pi/agent/settings.json` 作为项目级 `.pi/settings.json` 的 fallback。
- 简化 README.md 和 README_CN.md 为核心内容。
- 更新 `.gitignore`，排除所有 `docs/` 内容，仅保留 `token-cost-evaluation.md`。

### 0.23.0 — CE 扩展工具命名空间隔离，兼容第三方扩展
- 将 `ce-core` 的 subagent 工具从 `subagent`/`parallel_subagent` 重命名为 `ce_subagent`/`ce_parallel_subagent`，避免与第三方扩展（如 `pi-subagents`）发生运行时工具名冲突。
- 同步更新 `03-work` skill 文档和 `README.md`/`README_CN.md` 中的工具名称引用。
- 新增 TDD 测试，验证工具名正确且 runtime registration guard 有效（不注册裸 `subagent`/`parallel_subagent`）。
- README 新增兼容性说明，明确 `ce_subagent`/`ce_parallel_subagent` 与通用 `pi-subagents` 可共存。
- 新增 `05-learn` solution artifact，记录三种扩展工具重叠处理方案： delegation、source integration、namespace isolation。
- 修复 `ce_parallel_subagent` 用户可见错误消息中的工具名。

### Unreleased — 工作流简化与规则加载清理
- 将 `08-status` 合并进 `06-next`；`06-next` 现在同时支持下一步推荐和 verbose 完整状态报告。
- 移除独立的 `10-rules`；`02-plan`、`03-work`、`04-review` 现在直接加载项目规则，并共享 `skills/references/language-detection.md`。
- 将 `09-help` 重命名为 `08-help`，删除 `08-status` 后仍保持 skill 编号连续。
- 新增 `rules/common/naming.md`，提供简单、日常、低歧义的命名规范。
- 将 `context_handoff` 注册为正式 ce-core tool 并导出。
- 明确 `07-worktree` 是可选隔离工具，create/merge/cleanup 前需要用户确认。
- 明确 `subagent` 是用于有价值依赖串行链的低层工具；小任务默认 inline，独立任务使用 `parallel_subagent`。
- 将 changelog 历史从 README 拆分到 `CHANGELOG.md` 和 `CHANGELOG_CN.md`。

### 0.19.5 — Plan/Work/Review 规则加载一致性修复
- 修复 `02-plan` 在计划阶段不加载语言特定规则（如 `rules/typescript/`）的问题——仅加载了 `common/` 规则。
- 修复 `03-work` Core rules 缺少显式 `common/` 加载和 `web/` 条件加载（10-rules 定义了但 skill 自身指令未包含）。
- 修复 `04-review` Core rules 缺少显式语言检测方法和 `web/` 条件加载。
- 统一三个 skill 为相同的 4 步渐进式加载策略（common → 语言检测 → 语言规则 → web 规则）。
- 更新 `10-rules` SKILL.md Pre-flight 为三个阶段都包含完整的语言检测映射。
- 同步 `README.md` 和 `README_CN.md` 的 skill 表格描述。

### 0.19.4 — Read output filter markdown 截断修复
- 修复 `read-output-filter` 对 markdown 文件过度截断：markdown 过滤阈值从 2KB 提升至 8KB。
- 改进 `filterMarkdown()`：完整保留列表项（`-`、`*`、编号列表），段落保留前 3 行（原来只保留 1 行）。
- 过滤提示现包含实际文件路径的可行动指引（`bash cat <path>`）。
- 新增 5 个测试，覆盖列表保留、markdown 阈值门控和路径提示。
- 175 个测试全部通过。

### 0.19.3 — terminate 修复 + 运行时模型路由 + autoContinue 移除
- 修复 6 个 ce-core 工具（`brainstorm_dialog`、`workflow_state`、`review_router`、`session_checkpoint`、`session_history`、`pattern_extractor`）错误返回 `terminate: true`，导致 agent turn 提前结束（brainstorm 问题不显示、"输入继续才能继续"中断）。
- 实现运行时分阶段模型路由：通过 ce-core 扩展 `input` hook，读取 `.pi/settings.json` 的 `modelStrategy`，在 skill 执行前自动切换模型。支持完整格式（`anthropic/claude-opus-4-1`）和简写格式（`claude-opus-4-1`）。
- 移除 `pipeline.autoContinue` 配置（从未有运行时实现；Pi 缺少 `skill_end` 事件，无法自动续跑）。
- 更新 `skills/references/pipeline-config.md`、`README.md`、`README_CN.md` 以反映运行时模型路由行为。
- 新增 4 个测试，覆盖 terminate 回归、input hook 模型路由和裸模型 id 解析。

### 0.19.2 — evidence-first handoff-lite + docs 追踪规则
- 新增 `context_handoff`，在未传 markdown 时自动生成 evidence-first 默认 handoff-lite。
- 通过 `skills/references/pipeline-config.md` 把 01-05 阶段的共享 handoff-lite 模板统一起来。
- 新增测试，保护默认 handoff 生成行为以及共享 handoff 文档契约。
- 更新 docs 追踪规则：Git 只上传 `docs/token-cost-evaluation.md`，其余 `docs/` 工件保留本地。

### 0.19.1 — 流水线配置 + 类型检查基线修复
- 新增共享流水线配置（`skills/references/pipeline-config.md`），支持通过 `.pi/settings.json` 做分阶段模型路由。
- 新增运行时分阶段模型路由（通过 ce-core 扩展的 `input` hook 实现，读取 `.pi/settings.json` 的 `modelStrategy`，在 skill 执行前自动切换模型）。
- 修复 TypeScript 基线问题，`bunx tsc --noEmit` 可通过。

### 0.19.0 — 0.69.0 对齐 + 沉淀重命名
- TypeBox 迁移：`@sinclair/typebox` → `typebox`（零旧路径残留）
- Peer/dev 依赖升级：pi-coding-agent `0.67.6` → `0.69.0`
- 工具终结优化：6 个纯查询工具添加 `terminate: true`，减少多余 LLM 轮次
- Skill 重命名：`05-compound` → `05-learn`，更易理解

### 0.18.0 — 渐进式规则
- 内置 `rules/` 目录，含 13 个语言层 + common + web（78 个 Markdown 文件）
- 新增 `10-rules` skill：渐进式按需加载，零浪费
- `02-plan`、`03-work`、`04-review` 在入口处自动触发规则加载
- 用户可自由增减语言、编辑规则——纯 Markdown，零配置
- 10 个 skills、15 个 tools、162 个测试全部通过

### 0.17.0 — Subagent 安全
- 递归深度守卫（`PI_SUBAGENT_DEPTH` / `PI_SUBAGENT_MAX_DEPTH`）防止失控嵌套
- Async mutex 保障并行 subagent 执行时 `process.env` 的并发安全
- 上下文裁剪：`inheritSkills` 参数，并行 worker 默认窄上下文（`--no-skills`）
- 共享 `createSubagentRunner` 工厂函数（消除重复闭包）
- 162 个测试全部通过

### 0.16.0 — 上下文优化
- Read 输出过滤器：大代码文件结构化压缩、lock 文件摘要、markdown 压缩
- Compaction 优化器：session 压缩时的聚焦摘要指令
- Bash 输出过滤器改进

### 0.15.0 — 输出过滤
- Bash 输出过滤器：按命令类型智能截断（install、test、build）
- Read 输出过滤器：保留结构的同时降低冗余

### 0.14.0 — 结构化 solution 检索
- YAML frontmatter 标签体系 + grep-first 两级搜索
- 95 个测试全部通过

### 0.13.0 — Superpowers 工程纪律
- 严格 TDD 红线、设计检查清单、YAGNI 检查

### 0.12.0 — 错误恢复
- session_checkpoint 支持 fail/retry 操作

### 0.11.0 — 模式提取
- 新增 pattern_extractor tool

### 0.10.0 — 持续学习
- 新增 session_history tool

### 0.9.0 — 增量计划
- 新增 plan_diff tool

### 0.8.0 — 多轮对话
- 新增 brainstorm_dialog tool

### 0.7.0 — 并行分组
- Union-Find 算法的 task_splitter

### 0.6.0 — 断点续传
- 新增 session_checkpoint tool

### 0.5.0 — 并行执行
- 新增 parallel_subagent tool

### 0.4.0 — 智能审查
- 新增 review_router tool

### 0.3.0 — 隔离开发
- 新增 worktree_manager + 07-worktree

### 0.2.0 — 状态感知
- 新增 workflow_state + 06-next

### 0.1.0 — 初始发布
- 7 个 skills、3 个 tools
