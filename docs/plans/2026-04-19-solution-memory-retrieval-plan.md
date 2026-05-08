---
date: 2026-04-19
topic: solution-memory-retrieval
requirements: docs/brainstorms/2026-04-19-solution-memory-retrieval-requirements.md
---

# Plan: Solution Memory 结构化检索

## Overview

为 `docs/solutions/` 添加结构化 frontmatter 和 grep-first 分层检索策略，使 `02-plan` 和 `04-review` 能精准按需加载相关 solution，不全量加载 context。

需求文档: `docs/brainstorms/2026-04-19-solution-memory-retrieval-requirements.md`

## Implementation Units

### Unit 1: 更新 solution-schema.yaml 为 5 字段 frontmatter

**Purpose**: 定义精简版 frontmatter schema，替换现有的 5 字段（title, problem_type, summary, created_at, related_paths）为新的 5 字段（title, category, severity, tags, applies_when）。

**Files:**
- `skills/05-learn/references/solution-schema.yaml`

**Steps:**
- [x] 1. 写一个测试验证 schema 文件包含 5 个 required 字段：title, category, severity, tags, applies_when
- [x] 2. 确认测试失败（当前 schema 有不同的 required 字段）
- [x] 3. 重写 `solution-schema.yaml` 为新 schema
- [x] 4. 运行测试确认通过

**Verification:**
```bash
npx vitest run tests/skill-contracts.test.ts
```

**Expected:** Schema 文件定义 title(string), category(string), severity(enum), tags(string[]), applies_when(string[]) 为 required。

---

### Unit 2: 新建 solution-search-strategy.md

**Purpose**: 创建 grep-first 分层检索策略文件，供 02-plan 和 04-review 引用。

**Files:**
- `skills/05-learn/references/solution-search-strategy.md`

**Steps:**
- [x] 1. 写一个测试验证 solution-search-strategy.md 文件存在且包含关键步骤关键词
- [x] 2. 确认测试失败（文件不存在）
- [x] 3. 创建 `solution-search-strategy.md`，包含：
  - Step 1: 从任务描述提取关键词
  - Step 2: grep frontmatter 字段（先项目级，再全局级 ~/.pi/agent/docs/solutions/）
  - Step 3: 合并候选、缩窄
  - Step 4: 只读 frontmatter（前 15 行）
  - Step 5: 评分排序
  - Step 6: 全文读 top-N（≤3）
- [x] 4. 运行测试确认通过

**Verification:**
```bash
npx vitest run tests/skill-contracts.test.ts
```

**Expected:** 文件存在，包含 "grep"、"frontmatter"、"severity" 等关键词。

---

### Unit 3: 更新 05-learn SKILL.md 写入模板

**Purpose**: 修改 05-learn 的 skill 指令，强制要求写入 frontmatter，并支持两级存储路径。

**Files:**
- `skills/05-learn/SKILL.md`
- `skills/05-learn/assets/solution-template.md`

**Steps:**
- [x] 1. 写一个测试验证 solution-template.md 包含 frontmatter 占位符
- [x] 2. 确认测试失败（当前模板无 frontmatter）
- [x] 3. 更新 `solution-template.md`，在顶部加入 YAML frontmatter 模板（title, category, severity, tags, applies_when）
- [x] 4. 更新 `05-learn/SKILL.md`：
  - Core rules 加 "Every solution MUST include YAML frontmatter per `references/solution-schema.yaml`"
  - Core rules 加 "Determine storage level: project-specific → `{项目repo}/docs/solutions/`, cross-project → `~/.pi/agent/docs/solutions/`. Default to global when uncertain."
  - Workflow step 6 更新为 "Write or update the solution artifact with YAML frontmatter under the appropriate docs/solutions/<category>/"
- [x] 5. 运行测试确认通过

**Verification:**
```bash
npx vitest run tests/skill-contracts.test.ts
```

**Expected:** 模板包含 frontmatter，SKILL.md 包含 frontmatter 强制要求和两级存储说明。

---

### Unit 4: 更新 02-plan 和 04-review 引用检索策略

**Purpose**: 在 02-plan 和 04-review 的 SKILL.md 中引用 solution-search-strategy.md，替换笼统的"搜索 docs/solutions/"指令。

**Files:**
- `skills/02-plan/SKILL.md`
- `skills/04-review/SKILL.md`

**Steps:**
- [x] 1. 写一个测试验证 02-plan 和 04-review 都包含对 solution-search-strategy.md 的引用
- [x] 2. 确认测试失败（当前无引用）
- [x] 3. 修改 `02-plan/SKILL.md`：
  - Core rules: 将 "Search `docs/solutions/` for prior learnings" 替换为 "Search solutions using the strategy in `05-learn/references/solution-search-strategy.md` — grep frontmatter first, only load matching files"
  - Planning flow step 2: 将笼统搜索替换为 "Execute the solution search strategy from `05-learn/references/solution-search-strategy.md` to find relevant learnings"
- [x] 4. 修改 `04-review/SKILL.md`：
  - Core rules: 将 "Search `docs/solutions/` for related prior failures" 替换为 "Search solutions using the strategy in `05-learn/references/solution-search-strategy.md`"
  - Workflow step 4: 替换为 "Execute the solution search strategy from `05-learn/references/solution-search-strategy.md` to find relevant learnings"
- [x] 5. 运行测试确认通过

**Verification:**
```bash
npx vitest run tests/skill-contracts.test.ts
```

**Expected:** 两个 SKILL.md 都包含对 solution-search-strategy.md 的引用，不再有笼统的"搜索 docs/solutions/"指令。

---

### Unit 5: 补充现有 solution 文件的 frontmatter

**Purpose**: 给 2 个现有 solution 文件手动补 5 字段 YAML frontmatter。

**Files:**
- `~/.pi/agent/docs/solutions/integration/2026-04-17-npm-publish-github-actions.md`
- `~/.pi/agent/docs/solutions/tooling/pi-context-optimization-lazy-registration.md`

**Steps:**
- [x] 1. 给 `integration/2026-04-17-npm-publish-github-actions.md` 添加 frontmatter：
  ```yaml
  ---
  title: npm publish via GitHub Actions
  category: integration
  severity: high
  tags: [npm, github-actions, ci-cd, publishing]
  applies_when: [setting up npm publishing, configuring GitHub Actions for node packages]
  ---
  ```
- [x] 2. 给 `tooling/pi-context-optimization-lazy-registration.md` 添加 frontmatter：
  ```yaml
  ---
  title: Pi Context Optimization - When Lazy Registration Fails
  category: tooling
  severity: high
  tags: [pi, context, lazy-registration, tools, timing, race-condition]
  applies_when: [optimizing startup context, implementing dynamic tool registration, reducing token overhead]
  ---
  ```
- [x] 3. 验证两个文件的 frontmatter 可被 grep 正确匹配

**Verification:**
```bash
grep -rl "tags:.*npm" ~/.pi/agent/docs/solutions/ && grep -rl "tags:.*race-condition" ~/.pi/agent/docs/solutions/
```

**Expected:** 两个文件分别被对应的 grep 匹配到。

---

## Execution order

Units 1-3 修改 super-pi skill 文件，有内部依赖（Unit 2 的策略文件被 Unit 3 引用，Unit 1 的 schema 被 Unit 3 的模板引用）。建议顺序：

```
Unit 1 (schema) → Unit 2 (search strategy) → Unit 3 (compound SKILL.md + template) → Unit 4 (plan/review SKILL.md) → Unit 5 (补 frontmatter)
```

Unit 1-4 修改 `~/code/super-pi/skills/` 下文件，Unit 5 修改 `~/.pi/agent/docs/` 下文件。互不冲突。

## TDD summary

| Unit | RED | GREEN | REFACTOR |
|------|-----|-------|----------|
| 1 | 测试期望新 schema 字段 | 重写 schema | N/A |
| 2 | 测试期望策略文件存在 | 创建策略文件 | N/A |
| 3 | 测试期望模板含 frontmatter | 更新模板 + SKILL.md | N/A |
| 4 | 测试期望引用策略文件 | 更新 02-plan + 04-review | N/A |
| 5 | grep 验证 frontmatter 可搜索 | 补 frontmatter | N/A |
