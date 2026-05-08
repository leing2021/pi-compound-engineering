# Plan: super-pi 工作流体验优化

## Problem summary

使用 super-pi 01-05 流水线时有 4 个体验痛点：需手动切换模型、状态提示不稳定、无法无人值守续跑、subagent 存在感低。需求文档：`docs/brainstorms/2026-04-23-super-pi-workflow-experience-requirements.md`。

## Relevant learnings

无相关 solution。

## Scope boundaries

**In scope**：
- 新建 `skills/references/pipeline-config.md` 公共指令文件
- 5 个 SKILL.md（01-05）头部和尾部各加一行引用
- `.pi/settings.json` 新增 `modelStrategy` 和 `pipeline.autoContinue` 配置

**Out of scope**：
- 不改任何 TypeScript 代码
- 不改 subagent 相关代码
- 不新增 extension tool
- 不做 TUI widget

## CEO Review 决策记录

- **方案选择**: B（公共引用文件），模型切换逻辑写一次维护一处
- **P1**: agent 通过 SKILL.md 指令执行 /model 切换，公共引用方式优化 Token ROI
- **P2**: 5 个阶段独立配模型，未配置走 default
- **P3**: autoContinue 通过 agent 指令触发，用户接受可靠性风险
- **Temporal 注意**: pipeline-config.md 指令需精确无歧义；autoContinue 在 Pipeline Status 之后触发

## Implementation units

### Unit 1: 新建 pipeline-config.md 公共指令文件

**Goal**: 创建 `skills/references/pipeline-config.md`，包含模型切换、状态输出、续跑逻辑的完整指令。

**Files**:
- Create: `skills/references/pipeline-config.md`

**Patterns to follow**: SKILL.md 的引用机制使用相对路径，agent 按需读取。

**Test scenarios**:
- 文件存在且包含 modelStrategy、Pipeline Status、autoContinue 三个核心指令段
- 指令步骤明确无歧义，agent 无需额外推理

**Verification**:
```bash
test -f skills/references/pipeline-config.md && echo "exists"
grep -c "modelStrategy" skills/references/pipeline-config.md
grep -c "Pipeline Status" skills/references/pipeline-config.md
grep -c "autoContinue" skills/references/pipeline-config.md
```

**Dependencies**: 无

---

### Unit 2: 01-brainstorm SKILL.md 添加引用

**Goal**: 在 01-brainstorm 的 SKILL.md 头部（Core rules 之前）和尾部（末尾）各加一行引用 pipeline-config.md。

**Files**:
- Modify: `skills/01-brainstorm/SKILL.md`

**Test scenarios**:
- 头部引用在 frontmatter 之后、Core rules 之前
- 尾部引用在文件最末尾

**Verification**:
```bash
grep -c "pipeline-config" skills/01-brainstorm/SKILL.md
```

**Dependencies**: Unit 1

---

### Unit 3: 02-plan SKILL.md 添加引用

**Goal**: 在 02-plan 的 SKILL.md 头部和尾部各加一行引用。

**Files**:
- Modify: `skills/02-plan/SKILL.md`

**Verification**:
```bash
grep -c "pipeline-config" skills/02-plan/SKILL.md
```

**Dependencies**: Unit 1

---

### Unit 4: 03-work SKILL.md 添加引用

**Goal**: 在 03-work 的 SKILL.md 头部和尾部各加一行引用。

**Files**:
- Modify: `skills/03-work/SKILL.md`

**Verification**:
```bash
grep -c "pipeline-config" skills/03-work/SKILL.md
```

**Dependencies**: Unit 1

---

### Unit 5: 04-review SKILL.md 添加引用

**Goal**: 在 04-review 的 SKILL.md 头部和尾部各加一行引用。

**Files**:
- Modify: `skills/04-review/SKILL.md`

**Verification**:
```bash
grep -c "pipeline-config" skills/04-review/SKILL.md
```

**Dependencies**: Unit 1

---

### Unit 6: 05-learn SKILL.md 添加引用

**Goal**: 在 05-learn 的 SKILL.md 头部和尾部各加一行引用。05 是最后一步，pipeline-config.md 内部需处理无下一步的情况。

**Files**:
- Modify: `skills/05-learn/SKILL.md`

**Verification**:
```bash
grep -c "pipeline-config" skills/05-learn/SKILL.md
```

**Dependencies**: Unit 1

## Verification strategy

1. `skills/references/pipeline-config.md` 存在且包含三个核心指令段
2. 5 个 SKILL.md 各包含 2 处 pipeline-config 引用（头部 + 尾部）
3. 手动触发 `/skill:01-brainstorm`，确认 agent 读取配置并尝试模型切换
4. 确认 skill 完成后输出 Pipeline Status 块
5. 分别测试 `autoContinue = true` 和 `false` 两种行为
