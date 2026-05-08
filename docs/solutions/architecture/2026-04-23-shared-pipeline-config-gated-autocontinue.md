---
title: "Shared pipeline config for model routing via runtime input hook"
category: architecture
severity: high
tags: [pi, skill, pipeline, modelStrategy, input-hook, runtime, token-optimization, shared-reference]
applies_when:
  - "多个 SKILL.md 需要重复注入同一套流程规则（状态提示、下一步流转）"
  - "希望降低 token 成本并减少多文件规则漂移"
  - "02-plan 与 04-review 需要稳定给出下一步并保持流程一致"
  - "需要实现分阶段自动模型切换"
---

# Problem

Phase 1 的 01-05 技能都需要同一类规则：按阶段切模型、输出统一 Pipeline Status。把完整规则复制到每个 SKILL.md 会导致重复文本增加 token 消耗与维护成本。

# Context

本次改动采用"共享引用文件 + 轻量注入"模式：

- 新建 `skills/references/pipeline-config.md`
- `01-brainstorm` 到 `05-learn` 每个 SKILL.md 只保留两处引用（头部 + 结尾）
- `pipeline-config.md` 统一定义：
  - `modelStrategy` 阶段模型路由（由 ce-core extension input hook 自动执行）
  - `Pipeline Status` 固定输出格式

与已有方案 `docs/solutions/architecture/2026-04-21-progressive-rules-integration.md` 为**中等重叠**：都使用"共享规则、按需加载、减少重复"，但本条聚焦于流水线状态机与模型路由，而不是语言规则加载。

# Solution

1. 把跨阶段共性规则集中到 `skills/references/pipeline-config.md`
2. 各 SKILL.md 只做引用，不内联大段重复逻辑
3. 模型路由由 ce-core 扩展的 `input` hook 在运行时自动处理（拦截 `/skill:01-05` 命令，读取 `.pi/settings.json` 的 `modelStrategy`，调用 `pi.setModel()`），不再依赖 LLM 自觉执行
4. Status 模板要求替换真实值，禁止输出 `<placeholder>`

# Why this works

- **单点维护**：规则改动只改一个文件，避免五处漂移
- **低 token 开销**：主技能文本保持短小，按需读取共享规则
- **行为一致**：02-plan 和 04-review 的"下一步提示"逻辑统一
- **Runtime 保证**：模型切换由扩展 input hook 在代码层执行，不依赖 LLM 遵循文档指令

# Prevention

- 新增跨阶段规则时，优先放入共享 reference 文件，不要复制到多个 SKILL.md
- 模型路由行为由 runtime 代码保证，不要在 skill 文档中写"请执行 /model"之类的 LLM 指令
- 评审时固定检查：
  1. `modelStrategy` 有 default 兜底
  2. `Pipeline Status` 输出真实值
  3. input hook 测试覆盖完整路径

> **历史记录**: `pipeline.autoContinue` 配置项已被移除。Pi 没有提供 `skill_end` 事件，无法在 skill 完成后自动触发下一个 skill。靠 LLM 自觉续跑不可靠，留着只增加困惑。详见 `docs/solutions/tooling/2026-04-24-pi-extension-terminate-and-model-routing.md`。
