# Plan: pi-subagents 源码融合

## Problem summary

super-pi v0.21.0 通过 `peerDependencies` 依赖 pi-subagents，导致用户需要安装两个包，且 `super-pi-extension/index.ts` 的安装检测逻辑误判（检查 git clone 路径而非 npm 全局路径），永远显示 "pi-subagents not found" 警告。

**目标**：把 pi-subagents v0.20.1 的全部源码融入 super-pi，用户只需 `pi install npm:@leing2021/super-pi`。

**需求文档**：`docs/brainstorms/2026-04-28-pi-subagents-deep-integration.md`

## Relevant learnings

- `~/.pi/agent/docs/solutions/integration/resolve-extension-tool-name-conflicts-by-delegation.md` — 记录了 v0.21.0 从"自己实现 subagent"转为"委托给 pi-subagents"的历史决策。现在我们要走得更远：从委托到融合。
- `~/.pi/agent/docs/solutions/tooling/2026-04-21-pi-extension-gotchas.md` — Pi 扩展开发陷阱（ctx.hasUI、工厂函数、状态持久化、/reload）
- `docs/solutions/integration/2026-04-17-npm-publish-github-actions.md` — npm 发布流程

## Scope boundaries

### In scope
- 复制 pi-subagents v0.20.1 全部 .ts 源码到 `extensions/subagent/`
- 复制 agents/、prompts/、skills/ 目录
- 修改 package.json（依赖、pi 配置）
- 精简 super-pi-extension/index.ts（移除检测逻辑）
- 裁剪 slash commands（移除 /run, /run-chain 等）
- 更新测试
- 更新 README

### Out of scope
- 深度重构 pi-subagents 代码（先完整搬入再逐步优化）
- 修改 pi-subagents 的核心执行逻辑
- 重写 agent 合并逻辑（CE agent 和通用 agent 共存，不做运行时继承）
- 上游同步策略的具体实现（仅文档说明）

## Implementation units

### Unit 1: 复制 pi-subagents 源码到 extensions/subagent/

**Goal**: 将 pi-subagents v0.20.1 的所有运行时代码复制到 super-pi 仓库，保持文件结构和 import 路径不变。

**Files**:
- 创建 `extensions/subagent/` 目录
- 创建 `extensions/subagent/agents/` 目录（8 个通用 agent .md 文件）
- 创建 `extensions/subagent/prompts/` 目录（4 个 prompt .md 文件）
- 复制约 45 个 .ts 文件到 `extensions/subagent/`
- 创建 `skills/pi-subagents/SKILL.md`

**Patterns to follow**:
- pi-subagents 内部使用相对 import（`./agents.ts`），文件放在同一目录层级即可
- 版权头：每个文件头部添加 `// Based on pi-subagents by Nico Bailon (MIT License)`

**Steps**:
- [ ] 1. 从全局 node_modules 复制全部 .ts 文件（排除 install.mjs、package.json、CHANGELOG.md、README.md）
- [ ] 2. 复制 agents/ 目录（8 个 .md 文件）
- [ ] 3. 复制 prompts/ 目录（4 个 .md 文件）
- [ ] 4. 复制 skills/pi-subagents/SKILL.md 到 skills/pi-subagents/
- [ ] 5. 添加版权头到所有搬入的文件
- [ ] 6. 验证所有 .ts 文件无 TypeScript 编译错误

**Verification**:
```bash
# 确认文件数量
ls extensions/subagent/*.ts | wc -l  # 应约 45
ls extensions/subagent/agents/*.md | wc -l  # 应为 8
ls extensions/subagent/prompts/*.md | wc -l  # 应为 4

# TypeScript 类型检查（如果有 tsconfig 覆盖）
# 注意：pi-subagents 依赖 @mariozechner/pi-tui 等 peer，需要确认能引用
```

**Dependencies**: none

### Unit 2: 修改 package.json 声明和依赖

**Goal**: 更新 package.json 使 pi-subagents 代码成为 super-pi 的正式组成部分。

**Files**:
- `package.json`

**Test scenarios**:
- Happy: `pi install npm:@leing2021/super-pi` 安装后，`pi list` 显示所有 extensions
- Edge: typebox 版本兼容

**Steps**:
- [ ] 1. 编写测试：验证 package.json 的 pi.extensions 包含 `"./extensions/subagent"`
- [ ] 2. 运行测试确认 RED
- [ ] 3. 修改 package.json：
  - `peerDependencies` 移除 `pi-subagents`
  - `dependencies` 添加 `typebox: "^1.1.24"`（从 peerDeps 移到 deps）
  - `pi.extensions` 添加 `"./extensions/subagent"`
  - `pi.agents` 添加 `"./extensions/subagent/agents"`
  - `pi.prompts` 添加 `"./extensions/subagent/prompts"`
  - `pi.skills` 添加 `"./skills/pi-subagents"`（如有需要）
  - `files` 确保 `"extensions"` 覆盖新增目录
- [ ] 4. 运行测试确认 GREEN
- [ ] 5. 版本号 bump 为 `0.22.0`（minor，新增功能）

**Verification**:
```bash
bun test tests/package-structure.test.ts
```

**Dependencies**: Unit 1

### Unit 3: 精简 super-pi-extension/index.ts

**Goal**: 移除错误的安装检测逻辑和自动安装功能，只保留 model strategy sync。

**Files**:
- `extensions/super-pi-extension/index.ts`

**Test scenarios**:
- Happy: 扩展加载无警告，model strategy 正常 sync
- Edge: 无 settings.json 时不崩溃
- Error: settings.json 格式错误时优雅降级

**Steps**:
- [ ] 1. 编写测试：验证 index.ts 不引用 `isPiSubagentsInstalled` 或 `tryAutoInstallPiSubagents`
- [ ] 2. 运行测试确认 RED
- [ ] 3. 删除 `isPiSubagentsInstalled()` 函数
- [ ] 4. 删除 `tryAutoInstallPiSubagents()` 函数
- [ ] 5. 删除 `formatInstallInstructions()` 函数
- [ ] 6. 删除安装检测相关的 import（`execSync`）
- [ ] 7. 简化 `session_start` handler：只保留 `autoSyncSettings` 调用和加载确认消息
- [ ] 8. 运行测试确认 GREEN
- [ ] 9. Refactor: 确认 model-sync.ts 独立且无需改动

**Verification**:
```bash
bun test tests/ce-core-extension.test.ts
grep -n "isPiSubagentsInstalled\|tryAutoInstallPiSubagents\|formatInstallInstructions\|execSync" extensions/super-pi-extension/index.ts
# 应无结果
```

**Dependencies**: Unit 2

### Unit 4: 裁剪 slash commands

**Goal**: 移除 `/run`、`/run-chain`、`/chain`、`/parallel` 等 UI slash commands。**保留 `/agents`（Agent Manager TUI）和 `ctrl+shift+a` 快捷键**，以及诊断命令 `/subagents-status` 和 `/subagents-doctor`。

**Files**:
- `extensions/subagent/slash-commands.ts`

**Steps**:
- [ ] 1. 在 `slash-commands.ts` 中移除 `/run` 命令注册
- [ ] 2. 移除 `/chain` 命令注册
- [ ] 3. 移除 `/run-chain` 命令注册
- [ ] 4. 移除 `/parallel` 命令注册
- [ ] 5. **保留** `/agents` 命令注册（Agent Manager TUI 入口）
- [ ] 6. **保留** `ctrl+shift+a` 快捷键注册
- [ ] 7. **保留** `/subagents-status` 和 `/subagents-doctor`
- [ ] 8. 清理不再需要的辅助函数（`parseAgentArgs`、`parseAgentToken`、`parseInlineConfig`、`extractExecutionFlags`、`makeAgentCompletions`、`makeChainCompletions`、`discoverSavedChains`、`mapSavedChainSteps`、`runSlashSubagent`、`requestSlashRun`、`buildSlashExportText` 等）
- [ ] 9. **注意**: `openAgentManager` 及其依赖（`agent-manager.ts`、`agent-manager-*.ts`、`subagents-status.ts`）必须保留
- [ ] 10. 验证 TypeScript 编译通过

**Verification**:
```bash
grep -c "registerCommand\|registerShortcut" extensions/subagent/slash-commands.ts
# 应为 4（agents + subagents-status + subagents-doctor + ctrl+shift+a）
```

**Dependencies**: Unit 1

### Unit 5: 更新现有测试

**Goal**: 更新 package-structure 和 skill-contracts 测试以反映新结构。

**Files**:
- `tests/package-structure.test.ts`
- `tests/skill-contracts.test.ts`

**Steps**:
- [ ] 1. 编写测试：验证 `extensions/subagent/index.ts` 存在
- [ ] 2. 编写测试：验证 `extensions/subagent/agents/` 下有 8 个 agent
- [ ] 3. 编写测试：验证 package.json 不含 `pi-subagents` peerDep
- [ ] 4. 编写测试：验证 package.json 含 `typebox` dep（非 peerDep）
- [ ] 5. 编写测试：验证 `skills/pi-subagents/SKILL.md` 存在
- [ ] 6. 运行全部测试确认 GREEN
- [ ] 7. Refactor: 清理测试中过时的断言

**Verification**:
```bash
bun test
```

**Dependencies**: Unit 2, Unit 3, Unit 4

### Unit 6: 更新 README 和文档

**Goal**: 更新 README 反映单包安装体验和新的架构。

**Files**:
- `README.md`
- `README_CN.md`

**Steps**:
- [ ] 1. 更新安装说明：移除 "还需要安装 pi-subagents" 的说明
- [ ] 2. 更新工具列表：说明 subagent 工具已内置
- [ ] 3. 更新架构说明：添加 subagent 扩展的描述
- [ ] 4. 添加第三方致谢部分：感谢 pi-subagents 的贡献
- [ ] 5. 验证 README 中的安装命令和描述准确

**Verification**:
```bash
bun test tests/package-structure.test.ts  # README 测试
```

**Dependencies**: Unit 5

### Unit 7: 端到端验证和发布准备

**Goal**: 本地验证融合后的包能正常工作，准备发布。

**Files**:
- 无新文件

**Steps**:
- [ ] 1. 运行完整测试套件：`bun test`
- [ ] 2. 本地安装测试：`npm pack` + `pi install` 验证
- [ ] 3. 验证 `pi list` 显示一个包，包含所有 extensions
- [ ] 4. 验证无 "pi-subagents not found" 警告
- [ ] 5. 验证 subagent 工具可用（single/chain/parallel 模式）
- [ ] 6. 验证 CE agents 和 chains 能正常引用
- [ ] 7. 更新 CHANGELOG（如有）

**Verification**:
```bash
bun test
pi list
# 手动 pi 启动验证
```

**Dependencies**: Unit 6

## Verification strategy

### Targeted verification (per unit)
每个 unit 都有具体的 verification commands，在上述各 unit 中列出。

### Broader verification
1. **安装测试**: `npm pack` → `pi install` → `pi list` 确认单包包含全部功能
2. **运行时测试**: 启动 pi，确认 subagent 工具注册，CE chains 可执行
3. **回归测试**: 确认原有 CE tools（artifact_helper, workflow_state 等）不受影响
4. **清理验证**: 确认无残留的 pi-subagents 引用（除了版权声明和致谢）

---

## CEO Review 记录

**Review mode**: CEO Review
**Date**: 2026-04-28

### 关键决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 融合方式 | 源码融合（方案 B） | 完全自主控制，单包安装体验 |
| Slash commands | 保留 /agents + 诊断命令 | Agent Manager TUI 是重要交互入口 |
| 版本 | v0.20.1 | 当前已安装版本，稳定 |
| Agent 体系 | 通用版 + CE 版共存 | 命名不冲突（xxx vs ce-xxx） |

### 已验证风险点

1. ✅ **Peer 依赖**: pi-tui, pi-agent-core, pi-ai 均已在 super-pi node_modules 中可用
2. ✅ **Agent 发现**: pi-subagents 的 agents.ts 使用 `import.meta.url` 相对路径发现 agents，搬到 extensions/subagent/ 后自动生效
3. ✅ **命名冲突**: 通用 agent 和 CE agent 名称不同，无冲突
4. ⚠️ **上游同步**: 需手动关注 pi-subagents 更新，建议用 git subtree 管理
