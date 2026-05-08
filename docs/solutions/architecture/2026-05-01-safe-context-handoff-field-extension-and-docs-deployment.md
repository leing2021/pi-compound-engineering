---
title: "安全扩展 context-handoff 工具字段与文档部署路径陷阱"
category: architecture
severity: high
tags:
  - context-handoff
  - activeRules
  - field-extension
  - backward-compatibility
  - normalizeStateEntry
  - toStringArray
  - installed-package
  - repo-local
  - skills-deployment
  - pipeline-config
  - token-roi
applies_when:
  - "为 context_handoff 工具添加新的可选字段（如 activeRules、新的结构化数据）"
  - "修改 skills/ 目录下的 SKILL.md 或 references/ 文档"
  - "在已有 TypeBox schema + tool wrapper 架构上扩展参数"
  - "03-work 执行中发现文档改动可能只应用到全局安装包而非 repo"
  - "review 阶段验证 git diff 是否包含所有计划内文件"
---

# Problem

在 Super Pi 的 Memory Optimization Phase 2 中，需要为 `context_handoff` 工具安全添加 `activeRules` 字段，同时更新 6 个 skill 文档文件。实施过程中出现了两类可复用的问题模式：

1. **字段扩展遗漏**：`context_handoff` 的改动链路很长（interface → state → result → normalize → template → schema → wrapper → tests），容易在某个环节遗漏。
2. **文档部署位置错误**：skill 文档改动被应用到全局安装包路径（`/Users/jasonle/.nvm/.../node_modules/@leing2021/super-pi/skills/`），而非仓库本地路径（`skills/`），导致 `git diff` 不包含这些文件，提交后改动丢失。

# Context

本次改动涉及 9 个文件，跨代码和文档两类：

**代码文件（3 个）**：
- `extensions/ce-core/tools/context-handoff.ts` — 核心实现
- `extensions/ce-core/index.ts` — TypeBox schema + wrapper passthrough
- `tests/context-handoff.test.ts` — 6 个新测试

**文档文件（6 个）**：
- `skills/references/pipeline-config.md` — 共享 pipeline 规则
- `skills/02-plan/SKILL.md`、`skills/03-work/SKILL.md`、`skills/04-review/SKILL.md` — skill 工作流
- `skills/06-next/SKILL.md`、`skills/06-next/references/recommendation-logic.md` — 推荐逻辑

04-review 审查时发现：3 个代码文件出现在 `git diff` 中，但 6 个文档文件不在——它们只被修改了全局安装包副本。

# Solution

## 模式 A：安全扩展 context-handoff 字段的 Checklist

当为 `context_handoff` 添加新的可选 `string[]` 字段时，需要按以下完整链路逐一修改：

### 1. 类型层（context-handoff.ts）

```
ContextHandoffInput  →  activeRules?: string[]
ContextStateEntry    →  activeRules: string[]       （必填，normalize 保证默认值）
ContextHandoffResult →  activeRules?: string[]
```

### 2. 归一化层（context-handoff.ts）

```typescript
// normalizeStateEntry 中：
activeRules: toStringArray(state.activeRules),  // 缺失时返回 []
```

这是 **backward compatibility 的关键**：旧 state 文件没有此字段，`toStringArray(undefined)` 返回 `[]`。

### 3. 模板层（context-handoff.ts）

```typescript
// buildDefaultHandoffMarkdown input 类型中添加字段
// 模板数组中添加 section：
"## Active Rules",
formatBullets(input.activeRules),
"",
```

### 4. 操作层（context-handoff.ts）

所有 5 个操作函数都需要处理：

| 操作 | 需要改动 |
|------|---------|
| `save()` | 从 input 提取 → 传给 template → 写入 state → 返回 |
| `load()` | 从 state 读取 → 返回 |
| `latest()` | 从 state 读取 → 返回 |
| `status()` | 从 state 读取 → 返回 |
| `validate()` | 视需求决定是否检查 |

### 5. 注册层（index.ts）

```typescript
// TypeBox schema 中添加：
activeRules: Type.Optional(Type.Array(Type.String(), { description: "..." }))

// execute wrapper 中添加：
activeRules: params.activeRules,
```

### 6. 测试层（context-handoff.test.ts）

必须覆盖的场景：

1. **Round-trip**：save → load/latest/status 返回相同值
2. **Template rendering**：默认模板包含新 section
3. **Default value**：省略时返回 `[]`
4. **Soft constraint**：>5 不报错（如果适用）
5. **Backward compatibility**：旧 state 文件缺少字段 → 加载返回 `[]`
6. **Custom markdown**：自定义 handoffMarkdown 时 state 仍持久化新字段

## 模式 B：文档部署位置防错规则

### 规则

**所有 skill 文档改动必须同时应用到仓库本地 `skills/` 目录**，不能只修改全局安装包路径。

### 检查方法

```bash
# 在 03-work 执行完毕、04-review 开始前运行：
git diff --stat

# 确认所有计划修改的 skills/*.md 文件都在 diff 中
# 如果缺失，说明改动只到了全局安装包路径
```

### 原因

Pi 的 skill 发现机制是：
1. 先检查项目级 `skills/` 目录
2. 再检查全局安装包

修改全局安装包在开发时「看起来有效」（因为 Pi 能读到），但 `git diff` 不会追踪这些文件，提交后改动丢失。

# Why this works

**字段扩展**：遵循已有 `compressionRisk` / `currentTruth` 等字段的模式，确保每个环节都不遗漏。`toStringArray()` 归一化是 backward compatibility 的保障——旧 state 文件加载时不会 crash。

**文档部署**：识别到 Pi 的 skill 发现机制有两条路径（project-local + global），开发时容易只修改了 global 副本。在 04-review 阶段用 `git diff --stat` 做显式检查可以捕获这个问题。

# Prevention

1. **03-work 执行时**：修改 `skills/` 文档文件时，使用 `git diff --stat` 验证改动在仓库 diff 中。如果使用绝对路径编辑了全局安装包文件，同步修改仓库本地副本。
2. **04-review 审查时**：第一步就运行 `git diff --stat`，对照计划文件列表检查所有文件是否在 diff 中。
3. **字段扩展时**：使用上述 Checklist 逐一确认 6 个层面（类型 → 归一化 → 模板 → 操作 → 注册 → 测试）。
4. **向后兼容测试**：始终包含「旧 state 无新字段」的测试用例，确保 `normalizeStateEntry` 的默认值逻辑正确。

> **Cross-links**:
> - `docs/solutions/architecture/2026-04-24-runtime-context-path-portability.md` — repo-relative path 模式
> - `docs/solutions/workflow/2026-04-24-evidence-first-handoff-lite-template.md` — handoff-lite 模板结构
> - `docs/solutions/architecture/2026-04-23-shared-pipeline-config-gated-autocontinue.md` — pipeline-config 维护模式
