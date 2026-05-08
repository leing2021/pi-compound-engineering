# pi-subagents 源码融合需求

> 日期: 2026-04-28
> 状态: **已废弃** — 2026-04-30 选择 namespace compatibility 方案而非源码融合
> 废弃原因: 优先与外部 pi-subagents 共存而非合并源码；通过重命名 CE 工具为 `ce_subagent`/`ce_parallel_subagent` 避免冲突，无需融合。

## 背景

super-pi v0.21.0 通过 `peerDependencies` 依赖 pi-subagents，但存在以下问题：

1. **误报警告**：`super-pi-extension/index.ts` 的 `isPiSubagentsInstalled()` 检查 `~/.pi/agent/extensions/subagent/`（git clone 安装路径），而 `pi install npm:pi-subagents` 安装到全局 node_modules，导致检测永远失败
2. **安装体验差**：用户需要安装两个包（`pi install npm:@leing2021/super-pi` + `pi install npm:pi-subagents`），且第一个包安装后就有红色警告
3. **功能重叠**：两套 agent（pi-subagents 的 scout/worker vs super-pi 的 ce-scout/ce-worker）功能重叠，增加认知负担

## 目标

- **一个安装命令**：`pi install npm:@leing2021/super-pi` 获得完整 CE + subagent 功能
- **消除警告**：不再有 "pi-subagents not found" 误报
- **统一 Agent**：合并为单一 agent 体系，CE 版继承通用版能力

## 设计决策

| 决策项 | 选择 | 原因 |
|--------|------|------|
| 融合方式 | 源码级融合 | 最彻底，完全消除外部依赖 |
| Agent 处理 | CE agent 继承通用 agent + CE 特性 | 避免重复，保持通用性 |
| Slash commands | 不保留 /run, /run-chain 等 | super-pi 通过 skill 和工具调用 subagent |

## 融合架构

### 目录结构

```
super-pi/
  extensions/
    ce-core/                    # 已有 - CE 专用工具（不变）
    subagent/                   # 新增 - 从 pi-subagents 搬入的全部核心代码
      index.ts                  # 主入口（注册 subagent 工具）
      *.ts                      # 所有 pi-subagents 的 TypeScript 文件
      agents/                   # 8 个通用 agent 定义
        scout.md
        worker.md
        planner.md
        reviewer.md
        oracle.md
        researcher.md
        delegate.md
        context-builder.md
      prompts/                  # 内置 prompts
        parallel-cleanup.md
        parallel-research.md
        parallel-review.md
        gather-context-and-clarify.md
    super-pi-extension/         # 已有 - 精简改造
      index.ts                  # 只保留 model strategy sync
      agents/                   # CE 版 agent（继承通用版 + CE 特性）
        ce-scout.md
        ce-worker.md
        ce-planner.md
        ce-reviewer.md
        ce-oracle.md
      chains/                   # 已有（不变）
      model-sync.ts             # 已有
  skills/
    ... (已有 10 个 CE skills)
    pi-subagents/               # 新增
      SKILL.md
```

### 改动清单

#### 1. package.json

- 移除 `peerDependencies.pi-subagents`
- 添加 `dependencies.typebox: "^1.1.24"`（pi-subagents 唯一的非 peer 依赖）
- `pi.extensions` 加入 `"./extensions/subagent"`
- `pi.agents` 加入 `"./extensions/subagent/agents"`
- `pi.prompts` 加入 `"./extensions/subagent/prompts"`

#### 2. super-pi-extension/index.ts 精简

- 删除 `isPiSubagentsInstalled()` 函数
- 删除 `tryAutoInstallPiSubagents()` 函数
- 删除安装提示信息（formatInstallInstructions）
- 保留 `autoSyncSettings()` 和 `syncStrategiesToAgentOverrides()`

#### 3. extensions/subagent/ — 从 pi-subagents 搬入

- 复制所有 .ts 文件（保持相对 import 路径不变）
- 复制 agents/ 和 prompts/ 目录
- **不搬入**：`install.mjs`、`package.json`（不需要独立安装）
- 每个文件头部添加原始 MIT 版权声明
- 精简 `slash-commands.ts`：移除 `/run`、`/run-chain`、`/run-parallel` 等用户命令

#### 4. Agent 合并策略

CE agent（ce-scout, ce-worker 等）的 frontmatter 已定义：
- `systemPromptMode: replace` — 完整替换
- `inheritSkills: true` + 具体 skill 引用
- `inheritProjectContext: true`

合并后保持 CE agent 不变，通用 agent（scout, worker 等）作为独立可用选项保留在 `extensions/subagent/agents/`。两者可共存，命名不同不冲突。

#### 5. skills/pi-subagents/SKILL.md

从 pi-subagents/skills/ 搬入。

### 不搬入的文件

| 文件 | 原因 |
|------|------|
| `install.mjs` | 不再需要独立安装脚本 |
| `package.json` | 合并到 super-pi 的 package.json |
| `CHANGELOG.md` | 可选，但优先级低 |
| `README.md` | 合并到 super-pi 的文档 |

### 版权

pi-subagents 使用 MIT 许可证，需要在融合的代码中保留原始版权声明：

```
// Portions based on pi-subagents by Nico Bailon
// https://github.com/nicobailon/pi-subagents
// MIT License
```

## 验证清单

- [ ] `pi install npm:@leing2021/super-pi` 一个命令完成安装
- [ ] `pi list` 显示一个包，包含 ce-core + super-pi-extension + subagent
- [ ] `subagent` 工具正常注册（single/chain/parallel/async 模式）
- [ ] CE agents（ce-scout 等）能被 subagent 发现和调用
- [ ] 通用 agents（scout 等）也能被 subagent 发现和调用
- [ ] CE chains（ce-standard 等）能正常运行
- [ ] model strategy sync 正常工作
- [ ] 无 "pi-subagents not found" 警告
- [ ] /run, /run-chain 等 slash commands 已移除

## 风险

| 风险 | 缓解措施 |
|------|----------|
| 上游 pi-subagents 更新需手动同步 | 可通过 git subtree 或定期 diff 管理 |
| 包体积增加（~20k 行） | 实际影响小，用户只下载一次 |
| Agent 命名冲突 | 通用版和 CE 版名称不同，不冲突 |
