---
title: "Embedded micro-patterns from external agent-skills: skill description triggers, source-driven gates, stop-the-line, and anti-rationalization"
category: workflow
severity: medium
tags: [pi, skill, workflow, description, source-driven, stop-the-line, anti-rationalization, minimalism, hard-gate, token-optimization, skill-routing]
applies_when:
  - "评估外部 agent 技能库后，发现少量高 ROI 微模式值得吸收"
  - "希望在不新增技能/工具/命令的前提下改善 agent 行为质量"
  - "需要在文档中嵌入行为约束，但控制 token 成本在 500 tokens 内"
  - "Stop-the-line 规则和 source-driven 验证需要嵌入实际 workflow steps，不只放在 rules 文件中"
  - "Anti-rationalization 需要在 Hard gates 中显式表达，防止 agent 合理化跳过失败"
---

# Problem

评估 `addyosmani/agent-skills` 后，需要决定哪些模式值得借鉴、哪些不适合照搬。初始方案偏向"新增技能/agents"，但经过 Strict Review 的 Premise Challenge，发现：

1. 新增技能/agents 会增加认知面，与极简原则冲突
2. 把规则只放在 rules 文件中容易被跳过
3. 行为约束必须嵌入实际 workflow steps / Hard gates 才有约束力
4. 纯文档改动（不改 TypeScript）是最小可行方案

# Context

## 初始错误方向

- 想新增 `debugging` / `source-driven-development` / `code-simplification` 技能
- 想引进 `code-reviewer` / `security-auditor` / `test-engineer` agents
- 想新增 `/ship` 等 command 层
- 把 source-driven 和 stop-the-line 规则只放在 `rules/common/` 文件中

## Strict Review 发现的问题

- 新增技能/agents 增加用户心智入口，违背极简原则
- 规则只放在 rules 文件中容易被 agent 跳过
- Stop-the-line 如果只是孤立 markdown block，约束力不足
- description 改变会影响 Pi skill registration/routing（不是"无行为影响的文档"）
- Unit 1/2/3 存在文件重叠，不能并行执行

## 关键决策

- **Approach B（嵌入式微补丁）**：不新增技能/工具/命令；只做文档级微调，嵌入 workflow steps 和 Hard gates
- **Token 约束**：总新增 ~410 tokens，不超过 500
- **执行顺序**：Unit 1 → 2 → 3 必须串行（文件重叠），Unit 4 独立

# Solution

## 四个微补丁

### Patch 1: 强化 skill description（8 个文件）

将每个 `skills/*/SKILL.md` 的 frontmatter `description` 改为 "Does X. Use when Y." 格式。

**格式示例：**
```yaml
description: "Execute plan units with parallel subagents, TDD enforcement, and checkpoint resume. Use when a plan path is ready for implementation."
```

**效果：** 提升 agent 自动选择技能的准确性。控制在 180 字符内，触发条件窄而清晰。

### Patch 2: Source-driven trigger 嵌入 3 处

不是只放在 `rules/common/development-workflow.md`，而是同时嵌入：

1. `rules/common/development-workflow.md` step 0 末尾
2. `skills/02-plan/SKILL.md` Planning flow step 4 后（Source-driven check）
3. `skills/03-work/SKILL.md` Workflow step 7 后（Source-driven gate）

**触发条件（狭义）：**
> When implementation depends on a framework/library API, version-specific behavior, or a recommended pattern, verify against official documentation and cite key sources. Pure logic, renaming, or in-project pattern reuse does not require external citation.

### Patch 3: Stop-the-line + Anti-rationalization 嵌入 Hard gates

放在 `skills/03-work/SKILL.md` 的 `## Hard gates — TDD enforcement` section 末尾，成为 Hard gate 的一部分：

```markdown
## Stop-the-line rule (Hard gate)

When any unexpected failure occurs during execution:

1. **STOP** adding features or making changes
2. **PRESERVE** evidence (error output, repro steps)
3. **DIAGNOSE** root cause — reproduce, localize, reduce
4. **FIX** the root cause, not the symptom
5. **GUARD** with a regression test
6. **RESUME** only after verification passes

Anti-rationalization — when a gate fails or evidence is missing:
- Do not rationalize, downgrade, or explain away the failure.
- Stop, report the blocker with evidence, and either fix the root cause or ask for direction.
- Do not continue unrelated implementation after failed verification.

This is a hard gate — do not push past a failing test or broken build to continue implementation. Errors compound.
```

### Patch 4: Review 五轴基准 + typo 修复

在 `skills/04-review/references/reviewer-selection.md` 的 Reviewer personas 前加总述：

> All reviewers evaluate changes across five axes: correctness, readability, architecture, security, performance. Base reviewers cover axes 1–3 by default; conditional reviewers add depth on specific axes.

并修复 `performan04-reviewer` → `performance-reviewer` typo。

## Token 成本

| Patch | Tokens |
|---|---:|
| 8 个 description | ~200 |
| Source-driven × 3 | ~80 |
| Stop-the-line + anti-rationalization | ~100 |
| Review 五轴 + typo | ~30 |
| **Total** | **~410** |

## 执行约束

- 不新增文件（所有改动是已有文件的编辑）
- 不新增 skills / tools / commands / agents
- 不修改 `extensions/` 下的 TypeScript 代码
- Unit 1 → 2 → 3 必须串行（文件重叠）
- Unit 4 独立
- README 只做一致性检查，除非发现明显不一致才改

# What future 02-plan runs should learn from this

- 评估外部模式时，先问"新增 vs 嵌入"哪个更小
- 规则嵌入 workflow steps 比放在 rules 文件中更可靠
- Hard gates 中的规则比孤立段落更有约束力
- Strict Review 的 Premise Challenge 能发现"看起来合理但实际上无效"的方案
- 文件级并行要检查重叠，不能只看逻辑依赖

# What future 04-review runs should learn from this

- description 改变会影响 skill routing，不是"无行为影响的文档"
- Stop-the-line 和 TDD enforcement 虽然都叫"gate"，但类别不同（failure handling vs test-first）
- `.gitignore` 改动如果不在 plan scope 内，应主动提示用户确认
- 纯文档改动无代码测试，验证靠 grep 命令 + 人工审阅

# Related solutions

- `docs/solutions/architecture/2026-04-23-shared-pipeline-config-gated-autocontinue.md` — 共享规则 + token 优化，本方案遵循同样原则
- `docs/brainstorms/2026-05-08-agent-skills-borrowing-analysis.md` — 原始需求分析
- `docs/plans/2026-05-08-agent-skills-micro-patches-plan.md` — 实施计划（Strict Review 后 Approach B）

# Verification commands

```bash
# 所有 skill description 包含触发条件
grep -c "Use when\|Use after" skills/*/SKILL.md | grep -v ':0$' | wc -l
# 预期: 8

# 无 typo 残留
grep "performan04" skills/04-review/references/reviewer-selection.md
# 预期: 无输出

# Stop-the-line 存在
grep "Stop-the-line" skills/03-work/SKILL.md
# 预期: 有输出

# Source-driven 三处存在
grep -c "Source-driven" rules/common/development-workflow.md skills/02-plan/SKILL.md skills/03-work/SKILL.md
# 预期: 3

# 无新增文件
git diff --name-only | grep -E "^.+$"
# 预期: 只有已列出的文件

# Token 成本
git diff --stat
# 预期: < 50 行新增
```
