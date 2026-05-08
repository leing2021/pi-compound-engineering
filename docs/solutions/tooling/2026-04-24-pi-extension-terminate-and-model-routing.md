---
title: "Pi 扩展 terminate 语义与 input hook 模型路由实现"
category: tooling
severity: high
tags:
  - pi
  - extension
  - terminate
  - input-hook
  - model-routing
  - runtime
  - brainstorm-dialog
  - settings.json
  - modelStrategy
applies_when:
  - "Pi 扩展工具返回 terminate: true 导致 agent turn 提前结束"
  - "brainstorm 模式对话不显示问题，需要输入'继续'才继续"
  - "运行过程中对话偶尔中断，需要输入'继续'"
  - "在 .pi/settings.json 中配置 modelStrategy 但阶段模型不切换"
  - "需要实现分阶段自动模型路由"
  - "开发或审查 Pi 扩展的 terminate 和 input hook 行为"
---

# Problem

两个关联的 Pi 扩展 runtime 问题：

1. **terminate 导致对话中断**：ce-core 扩展的 6 个中间态/状态查询型工具（brainstorm_dialog、workflow_state、review_router、session_checkpoint、session_history、pattern_extractor）在注册时返回了 `terminate: true`，导致 agent turn 提前结束。表现：brainstorm 不显示问题、对话偶尔需要输入"继续"才继续。

2. **modelStrategy 只有文档没有 runtime**：`.pi/settings.json` 的 `modelStrategy` 配置在 skill 文档和 README 中描述了分阶段模型路由功能，但全仓没有任何 TypeScript 代码实际执行模型切换。表现：从 02-plan 到 03-work，底部状态栏模型始终不变。

# Context

这两个问题在 super-pi 项目的 ce-core 扩展中发现。

**terminate 问题根因**：`extensions/ce-core/index.ts` 中工具注册的 execute 函数返回了 `terminate: true`。Pi 框架收到这个标记后会结束当前 agent turn，导致工具的中间结果（如 brainstorm_dialog 的 analysis + questions）不会被继续处理和展示给用户。

**modelStrategy 问题根因**：`skills/references/pipeline-config.md` 和 README 里写了"读 settings.json → 解析 modelStrategy → /model targetModel"的流程，但这是给 LLM 的文本指令，不是 runtime 代码。LLM 可能忘记执行、执行方式不一致、或根本不具备 `/model` 的调用能力。

# Solution

## Fix 1：移除非终结型工具的 terminate: true

**原则**：只有真正需要结束 agent turn 的工具才应该返回 `terminate: true`。

工具分类：
- **终结型**（应该 terminate）：没有，ce-core 的工具都不是终结型的
- **中间态型**（不应 terminate）：brainstorm_dialog（提供分析和问题后等待用户回复）、workflow_state（查询当前工作流状态）、review_router（返回 reviewer 列表）、session_checkpoint（保存/加载执行进度）、session_history（记录/查询执行历史）、pattern_extractor（提取/分类模式）

修复方式：从这 6 个工具的 execute 返回值中移除 `terminate: true`。

```typescript
// ❌ 修复前
return {
  content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  details: result,
  terminate: true,  // ← 这行导致 agent turn 提前结束
}

// ✅ 修复后
return {
  content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  details: result,
}
```

## Fix 2：用 input hook 实现运行时模型路由

**架构选择**：在扩展的 `input` 事件中拦截 `/skill:01-05` 命令，而不是依赖 LLM 自觉执行。

```typescript
// 在 ce-core extension 工厂函数中注册 input hook
export default function ceCoreExtension(pi: ExtensionAPI) {
  pi.on("input", async (event, ctx) => {
    // 1. 检查是否是阶段 skill 命令
    const stageKey = parseStageSkillName(event.text)
    if (!stageKey) return { action: "continue" }

    // 2. 读取 .pi/settings.json 的 modelStrategy
    const settings = await readProjectSettings(ctx.cwd)
    const targetModelRef = settings?.modelStrategy?.[stageKey]
      ?? settings?.modelStrategy?.default
    if (!targetModelRef) return { action: "continue" }

    // 3. 解析 "provider/model-id" 或裸 model id
    const parsed = parseModelRef(targetModelRef, ctx.model?.provider)

    // 4. 查找模型并切换
    const model = ctx.modelRegistry.find(parsed.provider, parsed.id)
    const switched = await pi.setModel(model)

    // 5. 始终放行 skill 执行
    return { action: "continue" }
  })
}
```

**关键设计决策**：
- 所有代码路径都返回 `{ action: "continue" }`，不会拦截或吞掉用户输入
- 支持完整格式 `"anthropic/claude-opus-4-1"` 和裸 id `"claude-opus-4-1"`
- 裸 id 自动复用当前 session 的 provider
- 模型切换成功时发 `info` 级别通知
- 失败时发 `warning` 级别通知，不阻断 skill 执行
- 所有 `ctx.ui.notify()` 调用前都有 `if (ctx.hasUI)` 保护

# Why this works

**terminate 问题**：Pi 框架的 `terminate: true` 语义是"这个工具调用完成后，结束当前 agent turn"。对于 brainstorm_dialog 这类需要继续对话的工具，terminate 会导致框架在工具返回后立即停止，用户的中间结果（分析、问题）来不及展示。移除后，工具返回结果给 agent，agent 可以继续处理和展示。

**modelStrategy 问题**：`input` 事件在用户输入被处理之前触发，早于 skill 展开。这保证了：
1. 模型切换发生在 skill 执行之前
2. 不依赖 LLM 自觉执行
3. 每次进入阶段 skill 都会检查，不会遗漏
4. 行为一致且可测试

# Prevention

1. **terminate 审计**：新注册工具时，明确分类为"终结型"或"中间态型"。只有真正需要结束 turn 的工具才设 `terminate: true`。运行测试验证：
   ```typescript
   expect(result.terminate).not.toBe(true)
   ```

2. **文档 vs runtime 一致性**：当 skill 文档描述了自动化行为时，必须同时实现对应的 runtime 代码。测试方法：在测试文件中验证注册了正确的 event handler。

3. **input hook 模式**：需要拦截 `/skill:` 命令做预处理时，用 `pi.on("input", ...)` 而不是让 LLM 自觉执行。这是 Pi 扩展框架推荐的事件驱动方式。

4. **ctx.hasUI 保护**：所有 UI 调用（`ctx.ui.*`）前必须检查 `ctx.hasUI`，因为 print/RPC 模式下 UI 不可用。
