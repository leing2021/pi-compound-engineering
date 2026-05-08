# Requirements: super-pi 工作流体验优化

## Problem

使用 super-pi 的 01-05 标准流水线时存在 4 个体验痛点：
1. 不同阶段需要频繁手动切换模型
2. 阶段完成后状态提示不稳定，不知道当前在哪一步、下一步做什么
3. 标准流水线无法无人值守自动推进
4. subagent 几乎不被触发，存在感低

## Goals

- 一次配置，自动按阶段切换模型
- 每步结束后稳定输出当前进度和下一步
- 可选自动续跑标准流水线
- subagent 维持现状

## Non-goals

- 不实现完整的 pipeline orchestrator
- 不新增 extension tool 或 TUI 组件
- 不修改 pi 底层行为
- 不新增或移除 subagent 相关代码

## Approach options

### 方案 A：纯 Skill 层实现（已选 ✅）

只改 5 个 SKILL.md 文件（01-05），零代码改动。

### 方案 B：Extension + Skill 混合

新增 pipeline_config tool + 修改 SKILL.md + 可选 TUI widget。更可靠但多代码。

### 方案 C：完整 Pipeline Orchestrator

独立 extension 统一管理。过度工程，违背极简原则。

## Recommended direction

**方案 A：纯 Skill 层实现**

### 实现细节

#### 1. 模型自动切换

**配置**：在 `.pi/settings.json` 中增加 `modelStrategy` 字段：

```json
{
  "modelStrategy": {
    "01-brainstorm": "claude-sonnet-4-20250514",
    "02-plan": "claude-opus-4-20250115",
    "03-work": "claude-sonnet-4-20250514",
    "04-review": "claude-sonnet-4-20250514",
    "05-learn": "claude-haiku-4-20250414",
    "default": "claude-sonnet-4-20250514"
  }
}
```

**SKILL.md 指令**（加在每个 skill 头部）：
- 读取 `.pi/settings.json` 的 `modelStrategy`
- 根据当前 skill 编号匹配模型
- 若匹配到且非当前模型，执行 `/model <模型名>` 切换
- 未配置则走当前默认模型

#### 2. 状态提示

**每个 SKILL.md 尾部增加统一输出模板**：

```
---
📊 Pipeline Status
- Current: 02-plan
- Output: docs/plans/2026-04-23-xxx-plan.md
- Next: /skill:03-work
---
```

- 使用 `workflow_state` tool 扫描已有产物辅助判断进度
- 格式固定，用户一眼看清

#### 3. 流水线续跑

**配置**：在 `.pi/settings.json` 中增加 `pipeline` 字段：

```json
{
  "pipeline": {
    "autoContinue": false
  }
}
```

**SKILL.md 尾部指令**：
- 检查 `pipeline.autoContinue`
- 若为 `true`，自动输入下一条 `/skill:0X-xxx`
- 若为 `false`（默认），只显示状态提示，等用户手动触发

#### 4. subagent

维持现状，不做任何改动。

### 改动范围

| 文件 | 改动内容 |
|------|---------|
| skills/01-brainstorm/SKILL.md | 头部加模型切换指令，尾部加状态输出+续跑检查 |
| skills/02-plan/SKILL.md | 同上 |
| skills/03-work/SKILL.md | 同上 |
| skills/04-review/SKILL.md | 同上 |
| skills/05-learn/SKILL.md | 同上 |

共 5 个文件，零代码改动。

## Success criteria

- 用户配置一次 modelStrategy 后，进入任意 skill 时自动切换到对应模型
- 每个阶段完成后稳定输出 Pipeline Status 块
- autoContinue=true 时流水线自动推进，=false 时等待手动触发
- 不引入新 bug，不影响现有 subagent 代码
