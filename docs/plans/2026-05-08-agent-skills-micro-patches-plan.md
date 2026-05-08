# Plan: agent-skills 微模式吸收（4 个微补丁 — Approach B 嵌入式）

> Review mode: Strict Review  
> Review outcome: Approach B selected  
> Key decisions: source-driven 和 stop-the-line 嵌入 workflow steps / Hard gates，不只放 rules 文件

## Problem summary

基于对 `addyosmani/agent-skills`（`742dca5`）的分析，super-pi 吸收 4 个高 ROI 微模式。总新增文档内容控制在 ~500 tokens 内，不新增文件。

关联需求：`docs/brainstorms/2026-05-08-agent-skills-borrowing-analysis.md`

## Relevant learnings

- `docs/solutions/architecture/2026-04-23-shared-pipeline-config-gated-autocontinue.md` — 跨阶段共享规则的单点维护模式。

## Scope boundaries

### In scope

- 修改 8 个 `skills/*/SKILL.md` 的 `description` 字段（frontmatter 单行改动）
- 在 `rules/common/development-workflow.md` 补充 1 条 source-driven 触发规则
- 在 `skills/02-plan/SKILL.md` workflow step 中嵌入 source-driven 提示
- 在 `skills/03-work/SKILL.md` Hard gates 中嵌入 Stop-the-line 规则
- 在 `skills/03-work/SKILL.md` workflow step 中嵌入 source-driven 提示
- 在 `skills/04-review/references/reviewer-selection.md` 补充五轴基准 + 修正 typo

### Out of scope

- 不新增任何文件
- 不新增 skills / tools / commands / agents
- 不修改 `extensions/` 下的 TypeScript 代码
- 不修改 README（但执行后需验证 README skill 表语义一致性）
- 不修改 AGENT.md / package.json

## Implementation units

### Unit 1: 强化 8 个 skill description

**Goal:** 让每个 skill 的 frontmatter description 包含“做什么 + Use when 触发条件”，提升 agent 自动选择技能的准确性。

**Constraint:** 每个 description 控制在 180 字符内，触发条件具体、窄而清晰。

**Files:**
- `skills/01-brainstorm/SKILL.md`
- `skills/02-plan/SKILL.md`
- `skills/03-work/SKILL.md`
- `skills/04-review/SKILL.md`
- `skills/05-learn/SKILL.md`
- `skills/06-next/SKILL.md`
- `skills/07-worktree/SKILL.md`
- `skills/08-help/SKILL.md`

**Draft descriptions:**

| Skill | Current | Draft |
|---|---|---|
| 01-brainstorm | Brainstorm requirements with three modes: CE discovery, Startup Diagnostic, Builder Mode. | Discover requirements through structured multi-round dialog. Use when the request is ambiguous, needs discovery, or describes a new idea/product. |
| 02-plan | Turn requirements into a plan. Optional CEO-style strategic review after. | Turn requirements into an execution-ready plan with TDD-gated implementation units. Use when a brainstorm artifact exists and is ready for planning. |
| 03-work | Execute plan-driven work in a controlled Phase 1 workflow. | Execute plan units with parallel subagents, TDD enforcement, and checkpoint resume. Use when a plan path is ready for implementation. |
| 04-review | Review code with structured findings. Optional browser QA and regression tests. | Review code changes across five axes with evidence-first findings. Use after implementation is complete and before committing. |
| 05-learn | Capture solved problems as reusable solution artifacts. | Capture solved problems as searchable solution artifacts. Use after a workflow loop completes or a non-trivial problem is solved. |
| 06-next | Inspect workflow state and recommend the single best next Compound Engineering skill. Use --verbose for a full status report. | Inspect workflow artifacts and recommend the single best next skill. Use when unsure what to run next. |
| 07-worktree | Create and manage git worktrees for isolated feature development. | Create and manage git worktrees for isolated feature development. Use when starting a feature that needs branch isolation. |
| 08-help | Explain when to use each Compound Engineering Phase 1 skill and how they connect. | Explain Phase 1 skills and their connections. Use when learning the workflow or deciding which skill applies. |

**Verification:**
```bash
grep -c "Use when" skills/*/SKILL.md | grep -v ':0$' | wc -l
# 预期 8
```

**Dependencies:** None

---

### Unit 2: source-driven trigger 嵌入 common rule + plan/work workflow steps

**Goal:** 在 Research First 流程中补充触发条件，并在 02-plan 和 03-work 的实际 workflow steps 中嵌入 source-driven 提示，确保 agent 在 plan 和 work 阶段都会检查官方来源。

**Files:**
- `rules/common/development-workflow.md` — step 0 末尾追加 1 条规则
- `skills/02-plan/SKILL.md` — 在 Planning flow step 4 ("Gather repository context") 后插入 1 步
- `skills/03-work/SKILL.md` — 在 Workflow step 7 (TDD per unit) 后插入 1 步

**Draft content:**

`rules/common/development-workflow.md` step 0 末尾追加：
```markdown
   - **Source-driven trigger:** When implementation depends on a framework/library API, version-specific behavior, or a recommended pattern, verify against official documentation and cite key sources in the output. Pure logic, renaming, or in-project pattern reuse does not require external citation.
```

`skills/02-plan/SKILL.md` Planning flow step 4 后插入：
```markdown
5. **Source-driven check:** For each unit that involves framework/library APIs, add a note: "Verify against official docs before implementing."
```

`skills/03-work/SKILL.md` Workflow step 7 后插入：
```markdown
8. **Source-driven gate:** Before implementing framework/library-specific code, verify the API or pattern against official documentation. Flag unverified patterns as UNVERIFIED in output.
```

**Verification:**
```bash
grep -c "Source-driven" rules/common/development-workflow.md  # 预期 1
grep -c "Source-driven" skills/02-plan/SKILL.md                # 预期 1
grep -c "Source-driven" skills/03-work/SKILL.md                # 预期 1
```

**Dependencies:** None（可与 Unit 1 并行，但必须先于 Unit 3 完成，因为 Unit 3 也改 03-work）

---

### Unit 3: Stop-the-line 嵌入 03-work Hard gates

**Goal:** 在 `03-work` 的 Hard gates 区域嵌入 Stop-the-line 规则，使其成为 Hard gates 的一部分而非孤立 block。

**Files:**
- `skills/03-work/SKILL.md` — 在 "Hard gates — TDD enforcement" section 末尾、Workflow section 之前

**Draft content（追加到 Hard gates section 末尾）:**

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

**Verification:**
```bash
grep -c "Stop-the-line" skills/03-work/SKILL.md  # 预期 ≥ 1
```

**Dependencies:** Unit 2 必须先完成（同一文件）

---

### Unit 4: 校准 review 五轴 + 修 typo

**Goal:** 在 reviewer-selection 中明确基础 review 检查面为五轴模型，修正 `performan04-reviewer` typo。

**Files:**
- `skills/04-review/references/reviewer-selection.md` — 两处改动

**Draft content:**

在 "Base reviewers" 区域前加一行总述：
```markdown
All reviewers evaluate changes across five axes: correctness, readability, architecture, security, performance. Base reviewers cover axes 1-3 by default; conditional reviewers add depth on specific axes.
```

修 typo：`performan04-reviewer` → `performance-reviewer`

**Verification:**
```bash
grep "performan04" skills/04-review/references/reviewer-selection.md  # 预期无输出
grep -c "five axes" skills/04-review/references/reviewer-selection.md  # 预期 1
```

**Dependencies:** None

---

## Dependency graph

```
Unit 1 (8 descriptions)  →  Unit 2 (source-driven)  →  Unit 3 (stop-the-line)
                                                                        ↑
                                                            同文件 03-work/SKILL.md

Unit 4 (review 五轴) — 完全独立，可与任意单元并行
```

**文件重叠分析：**

| 文件 | Unit 1 | Unit 2 | Unit 3 | Unit 4 |
|---|:---:|:---:|:---:|:---:|
| skills/02-plan/SKILL.md | ✗ | ✗ | | |
| skills/03-work/SKILL.md | ✗ | ✗ | ✗ | |
| skills/04-review/.../reviewer-selection.md | | | | ✗ |
| rules/common/development-workflow.md | | ✗ | | |
| 其余 5 个 skills/*/SKILL.md | ✗ | | | |

✗ = 存在重叠，不能并行

**执行顺序：**

1. **Unit 1**：更新 8 个 skill description
2. **Unit 2**：加入 source-driven trigger 到 common rule + 02-plan/03-work workflow steps
3. **Unit 3**：把 Stop-the-line 嵌入 03-work Hard gates section
4. **Unit 4**：review 五轴 + typo 修复（可与 1-3 并行，但为降低复杂度建议最后执行）

**核心约束：Unit 1 → 2 → 3 必须严格串行。Unit 4 独立。**

## Verification strategy

### Per-unit verification

每个 unit 改完后立即执行对应 grep 验证。

### Overall verification

```bash
# 1. 所有 skill description 包含 "Use when"
grep "Use when" skills/*/SKILL.md | wc -l  # 预期 ≥ 8

# 2. 无 typo 残留
grep "performan04" skills/04-review/references/reviewer-selection.md  # 预期无输出

# 3. Stop-the-line 存在
grep "Stop-the-line" skills/03-work/SKILL.md  # 预期有输出

# 4. Source-driven 三处存在
grep -c "Source-driven" rules/common/development-workflow.md  # 预期 1
grep -c "Source-driven" skills/02-plan/SKILL.md                # 预期 1
grep -c "Source-driven" skills/03-work/SKILL.md                # 预期 1

# 5. 不新增文件
git diff --name-only  # 预期只包含已列出的文件

# 6. Token 成本评估
git diff --stat  # 预期总新增行数 < 50 行

# 7. README 语义一致性检查
grep "brainstorm\|plan\|work\|review\|learn" README.md
# 人工审阅：README skill 表的 "Does" 描述是否与新 description 语义一致
```

## Estimated total token cost

| Unit | Estimated new content |
|---|---:|
| Unit 1 (8 descriptions) | ~200 tokens |
| Unit 2 (1 rule + 2 workflow steps) | ~80 tokens |
| Unit 3 (Stop-the-line + anti-rationalization) | ~100 tokens |
| Unit 4 (five-axes line + typo fix) | ~30 tokens |
| **Total** | **~410 tokens** |

Within the 500-token constraint.

## Strict Review artifacts

### Error and Rescue Map

本计划无代码改动，不引入新 method/codepath。Error map 不适用。

### Failure Modes Registry

| Codepath | Failure Mode | Risk | Mitigation |
|---|---|---|---|
| Unit 1 | description 改变影响 skill routing | Med | 执行后验证 `pi list` 输出正常；保持触发条件窄而清晰 |
| Unit 2 | source-driven step 被跳过 | Low | 三处嵌入（rule + plan + work）形成多层提醒 |
| Unit 3 | Stop-the-line 只被当作建议 | Low | 嵌入 Hard gates section 标题明确标注 "(Hard gate)" |
| Unit 4 | typo 修正遗漏 | None | grep 验证 |

### Temporal Interrogation

```
MINUTE 1-5 (Unit 1):   需要知道每个 skill 的当前 description 和触发条件。
MINUTE 5-10 (Unit 2):  需要精确定位 planning flow step 4 和 workflow step 7 的插入点。
                       可能遇到 step numbering 重排问题。
MINUTE 10-15 (Unit 3): 需要确认 Stop-the-line 放在 Hard gates 末尾是正确的。
                       注意：Unit 3 必须在 Unit 2 之后执行。
MINUTE 15-20 (Unit 4): 简单 typo 修复 + 一行新增。
                       需要确认五轴措辞与现有 reviewer persona 描述不冲突。
MINUTE 20+ (验证):     grep 验证 + README 一致性检查。
```

**应现在解决的决策：**
1. Unit 2 中 02-plan 和 03-work 的插入步骤号是否会因 Unit 2/3 的改动而变？
   → 是，需要先写 Unit 2，再根据实际 step numbering 写 Unit 3。
2. README skill 表需要同步更新吗？
   → 不主动更新，但执行后人工检查。如果发现语义不一致再决定。

### Test Diagram

本计划无代码改动，测试通过 grep 验证：

| 改动 | Happy path 验证 | Edge case |
|---|---|---|
| Unit 1 | 8/8 description 含 "Use when" | 每个 < 180 字符 |
| Unit 2 | 3/3 文件含 "Source-driven" | 不重复出现 |
| Unit 3 | Stop-the-line 在 Hard gates section 内 | 标题含 "Hard gate" |
| Unit 4 | typo 清除 + five axes 存在 | 五轴措辞不与已有 persona 冲突 |
