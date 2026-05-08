# Plan: CE subagent tool namespace compatibility

## Problem summary

`@leing2021/super-pi` 的 `ce-core` 扩展当前注册 `subagent` 工具；第三方 `pi-subagents` 扩展也注册 `subagent` 工具。两者完整同时安装时会发生 Pi extension tool name conflict，启动失败或工具语义混乱。

长期目标：让 `pi-subagents` 继续拥有通用 `subagent` 名称；`super-pi` 的 CE 专用 skill-router 子代理改用明确命名空间，避免与第三方扩展冲突，同时保留 CE pipeline 的串行/并行技能执行能力。

## Relevant learnings

- `~/.pi/agent/docs/solutions/integration/resolve-extension-tool-name-conflicts-by-delegation.md` — 同名 extension tool 会导致 Pi 启动失败；正确模式是单一 owner 或明确分界，不做脆弱 runtime detection fallback。
- `docs/solutions/integration/2026-04-28-from-peer-dependency-to-source-integration.md` — source integration 可解决单包体验，但当前用户要求是“与外部 pi-subagents 同时安装也不冲突”，因此本计划选择 namespace compatibility 而非融合源码。
- `~/.pi/agent/docs/solutions/tooling/subagent-recursion-guard-and-env-concurrency.md` — CE 子代理 runner 已具备 env depth guard、mutex、`--no-skills` context slimming；重命名时必须保持这些行为和测试。

## Scope boundaries

### In scope

- 将 CE 专用 skill-router 工具从 `subagent` 改名为 `ce_subagent`。
- 将 CE 并行 skill-router 工具从 `parallel_subagent` 改名为 `ce_parallel_subagent`，降低与 pi-subagents 的 parallel tasks 语义混淆。
- 更新 `03-work` skill 和相关 contract/test 文档引用。
- 更新 package/test 断言，证明 `ce-core` 不再注册通用 `subagent`。
- 保留底层文件名 `extensions/ce-core/tools/subagent.ts`、`parallel-subagent.ts`，避免大范围 import churn；只改 tool exported `name` 与用户可见描述。

### Out of scope

- 不安装或修改 `pi-subagents` 包本身。
- 不把 pi-subagents 源码融合进 super-pi。
- 不删除 CE 专用子代理实现；只重命名其 tool namespace。
- 不更改 `PI_SUBAGENT_DEPTH` / `PI_SUBAGENT_MAX_DEPTH` 环境变量名，避免破坏已有 recursion guard 语义。
- 不修改历史 docs/brainstorms/plans/solutions 中的旧记录，除非测试明确依赖当前文档。

## Implementation units

### Unit 1: CE tool names use explicit namespace

**Purpose**: 消除运行时 tool name conflict，使 `ce-core` 不再注册通用 `subagent`，而是注册 `ce_subagent` 与 `ce_parallel_subagent`。

**Files**:

- Modify: `extensions/ce-core/tools/subagent.ts`
- Modify: `extensions/ce-core/tools/parallel-subagent.ts`
- Modify: `extensions/ce-core/index.ts`
- Modify: `tests/ce-core-extension.test.ts`

**Steps**:

- [ ] RED: 更新 `tests/ce-core-extension.test.ts`，期望 `createSubagentTool().name === "ce_subagent"`、`createParallelSubagentTool().name === "ce_parallel_subagent"`，并期望 extension registration list 不包含裸 `subagent` / `parallel_subagent`。
- [ ] RED: 运行 `bun test tests/ce-core-extension.test.ts --filter "subagent"`，确认失败原因为当前工具仍叫旧名称。
- [ ] GREEN: 修改 `createSubagentTool()` 返回的 `name` 为 `ce_subagent`；修改 `createParallelSubagentTool()` 返回的 `name` 为 `ce_parallel_subagent`。
- [ ] GREEN: 更新 `extensions/ce-core/index.ts` 中两个工具的 label/description/parameter description，明确它们是 “CE skill-based subagent”，并避免描述为通用 subagent。
- [ ] GREEN: 运行 targeted test，确认通过。
- [ ] REFACTOR: 检查错误消息和 describe 名称是否需要同步，保持测试可读。
- [ ] Unit verification: 运行完整 `bun test tests/ce-core-extension.test.ts`。

**Verification commands**:

```bash
bun test tests/ce-core-extension.test.ts --filter "subagent"
bun test tests/ce-core-extension.test.ts
```

**Expected results**:

- RED 阶段测试失败，指出旧工具名仍为 `subagent` / `parallel_subagent`。
- GREEN 后所有 ce-core tests 通过。
- `ceCoreExtension()` 注册工具列表包含 `ce_subagent`、`ce_parallel_subagent`，不包含裸 `subagent` 或 `parallel_subagent`。

### Unit 2: CE skill instructions reference renamed tools

**Purpose**: 让模型执行 CE pipeline 时调用正确的新工具，避免继续尝试调用旧 `subagent` / `parallel_subagent`。

**Files**:

- Modify: `skills/03-work/SKILL.md`
- Modify: `tests/skill-contracts.test.ts`
- Optional modify: `README.md`
- Optional modify: `README_CN.md`

**Steps**:

- [ ] RED: 更新 `tests/skill-contracts.test.ts`，期望 `skills/03-work/SKILL.md` 包含 `ce_subagent` 与 `ce_parallel_subagent`，且当前工作流段不再推荐裸 `subagent` / `parallel_subagent`。
- [ ] RED: 运行 `bun test tests/skill-contracts.test.ts --filter "03-work"` 或完整 skill contracts，确认失败来自旧引用。
- [ ] GREEN: 更新 `skills/03-work/SKILL.md` Core rules 与 Workflow，把 `parallel_subagent` 替换为 `ce_parallel_subagent`，把 `subagent` 替换为 `ce_subagent`，并补一句：通用 `subagent` 名称保留给 pi-subagents 等 agent 扩展。
- [ ] GREEN: 如 README 当前工具列表提到旧 CE 工具名，更新为新名称并说明兼容 pi-subagents。
- [ ] GREEN: 运行 skill contract tests。
- [ ] REFACTOR: 检查 skill 文案是否仍然准确区分 inline execution、CE skill execution、third-party agent execution。
- [ ] Unit verification: grep 当前可执行说明中是否仍有旧工具推荐。

**Verification commands**:

```bash
bun test tests/skill-contracts.test.ts
grep -R "parallel_subagent\|Use \*\*`subagent`\*\*\|`subagent` only" -n skills tests README.md README_CN.md
```

**Expected results**:

- `03-work` 明确推荐 `ce_parallel_subagent` 与 `ce_subagent`。
- skill contract tests 通过。
- grep 不再发现当前 workflow 文档要求调用旧 CE 工具名；历史 docs 目录可保留旧记录。

### Unit 3: Package compatibility contract documents coexistence with pi-subagents

**Purpose**: 给未来维护者和用户一个可测试的兼容性契约：super-pi 的 CE tools 有自己的 namespace，第三方 `pi-subagents` 可拥有通用 `subagent`。

**Files**:

- Modify: `tests/package-structure.test.ts`
- Modify: `README.md`
- Modify: `README_CN.md`
- Optional create/modify: `docs/pi-subagents-conflict-analysis.md`

**Steps**:

- [ ] RED: 在 `tests/package-structure.test.ts` 新增断言：README 说明 `ce_subagent`/`ce_parallel_subagent` 与 `pi-subagents` 可共存，且不要求用户必须安装 `pi-subagents`。
- [ ] RED: 运行 `bun test tests/package-structure.test.ts`，确认 README 缺少新兼容说明而失败。
- [ ] GREEN: 更新 README/README_CN：
  - CE 专用工具名：`ce_subagent`、`ce_parallel_subagent`。
  - 通用 `subagent` 可由 `pi-subagents` 提供。
  - 同时安装时不会因 CE tool 名称冲突。
  - 配套使用建议：super-pi 管 CE pipeline，pi-subagents 管通用 multi-agent execution。
- [ ] GREEN: 如 `docs/pi-subagents-conflict-analysis.md` 仍写“严重冲突”为当前事实，补充“解决方案/当前计划”段，说明命名空间迁移后的状态。
- [ ] GREEN: 运行 package structure test。
- [ ] REFACTOR: 确认中英文 README 术语一致。
- [ ] Unit verification: 运行 grep 检查 package README 不再声称 CE 注册裸 `subagent`。

**Verification commands**:

```bash
bun test tests/package-structure.test.ts
grep -n "ce_subagent\|ce_parallel_subagent\|pi-subagents" README.md README_CN.md
```

**Expected results**:

- README 和 README_CN 均说明兼容模式。
- package structure tests 通过。
- 用户能从文档理解：`subagent` 属于通用 agent extension；CE skill-router 使用 `ce_subagent` namespace。

### Unit 4: Full regression and conflict guard

**Purpose**: 证明本次命名空间迁移没有破坏 CE pipeline，并用静态检查防止未来误注册裸 `subagent`。

**Files**:

- Modify: `tests/ce-core-extension.test.ts`
- Optional modify: `tests/package-structure.test.ts`

**Steps**:

- [ ] RED: 新增静态 guard test，读取 `extensions/ce-core/index.ts` 和 tool files，断言 `ce-core` 注册结果中没有裸 `subagent`；如需要，断言旧名字只允许出现在历史 docs 或 compatibility explanation 中。
- [ ] RED: 运行 full tests，确认当前旧实现触发失败。
- [ ] GREEN: 完成 Unit 1-3 后运行完整测试。
- [ ] GREEN: 运行静态 grep：`grep -R 'name: "subagent"\|name: "parallel_subagent"' extensions/ce-core tests skills package.json` 应无不期望结果。
- [ ] REFACTOR: 如测试过度脆弱，改为基于 `ceCoreExtension()` 注册结果，而非纯文本匹配。
- [ ] Unit verification: `bun test` 全量通过。

**Verification commands**:

```bash
bun test
grep -R 'name: "subagent"\|name: "parallel_subagent"' extensions/ce-core tests skills package.json || true
```

**Expected results**:

- 全量测试通过。
- 静态检查没有发现 CE extension 注册裸 `subagent` 或 `parallel_subagent`。
- 与 `pi-subagents` 完整同时安装时，至少不会再发生 `subagent` tool-name collision；剩余兼容风险仅限 slash commands/skills/docs 层面的用户选择，不是 runtime tool collision。

## Verification strategy

1. **TDD targeted tests**: 每个 unit 先改测试确认 RED，再改实现确认 GREEN。
2. **Contract tests**: `tests/ce-core-extension.test.ts` 证明注册工具名；`tests/skill-contracts.test.ts` 证明 skill 文案调用新工具；`tests/package-structure.test.ts` 证明 README 对外契约。
3. **Static grep**: 确认 `extensions/ce-core` 不再出现 `name: "subagent"` 或 `name: "parallel_subagent"` 注册。
4. **Full regression**: `bun test`。
5. **Manual runtime smoke after implementation**: 启动 Pi 并观察 available tools，确认 CE tools 为 `ce_subagent`/`ce_parallel_subagent`；如已安装 `pi-subagents`，确认其 `subagent` 可同时存在。

## Compatibility notes

- 这是对 CE tool API 的轻微破坏性变更：旧提示中手动要求调用 `subagent`/`parallel_subagent` 的用户需要改为 `ce_subagent`/`ce_parallel_subagent`。
- 对普通 CE skill 用户影响较小，因为 `03-work` 文案会同步更新。
- 如果 `pi-subagents` 未安装，用户仍可使用 CE pipeline；只是通用 `subagent` agent manager 能力不可用。
- 如果 `pi-subagents` 已安装，`subagent` 归 pi-subagents，`ce_subagent` 归 super-pi，职责清晰。
