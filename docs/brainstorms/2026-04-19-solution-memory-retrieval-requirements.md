---
date: 2026-04-19
topic: solution-memory-retrieval
status: approved
---

# Solution Memory: 结构化检索方案

## 问题

super-pi 的 `docs/solutions/` 知识库缺乏结构化检索机制：

- `02-plan` 和 `04-review` 只写了"搜索 `docs/solutions/`"，没有具体检索策略
- solution 文件没有结构化元数据，无法精准 grep 过滤
- 文件增多后 AI 要么全量加载（浪费 context），要么不搜（浪费已有知识）
- 当前 2 个文件，需设计支持 50+ 的方案

## 参考来源

- **compound-engineering-plugin (CEP)**: `learnings-researcher` agent 的 grep-first 分层检索 + YAML frontmatter schema（12+ 字段，面向 Rails 项目）
- **everything-claude-code (ECC)**: Instinct 系统（被动学习 + confidence 加权）— 评估后不借鉴，因为 pi 没有 hook 机制，且解决的是不同问题（隐式学习 vs 显式知识管理）

## 决策

### D1: 检索逻辑位置 — references 文件（方案 B）

**选择**: 在 `05-learn/references/solution-search-strategy.md` 中定义检索策略，`02-plan` 和 `04-review` 各引用一次。

| 选项 | 结论 | 理由 |
|------|------|------|
| A. 内联在 SKILL.md | ✗ | 检索逻辑 ~20 行，复制两份维护成本高 |
| B. references 文件 | **✓** | 按需加载 ~500B，DRY，改一处全生效 |
| C. 新建 skill | ✗ | 多一条常驻注册，但只在两个 skill 内部用到 |

### D2: Frontmatter schema — 精简版 5 字段

**选择**: `title`, `category`, `severity`, `tags`, `applies_when`

| 字段 | 类型 | 用途 |
|------|------|------|
| `title` | string | 人类可读标题，grep 搜索的第一目标 |
| `category` | string | 子目录名（tooling, integration 等） |
| `severity` | enum: critical, high, medium, low | 优先级排序依据 |
| `tags` | string[] | 关键词列表，最精确的 grep 匹配维度 |
| `applies_when` | string[] | 触发条件描述，用于语义匹配 |

**未选字段及理由：**
- `problem_type`: 可从 category 推断
- `scope`: super-pi 没有 project/global 跨项目共享需求
- `module/component/symptoms/root_cause`: CEP 面向 Rails 的细粒度，通用工具包不需要

### D3: 现有文件 — 手动补 frontmatter

两个现有 solution 文件立即补充 frontmatter，确保检索机制上线即完整覆盖。

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `05-learn/references/solution-search-strategy.md` | 新建 | grep-first 分层检索策略 |
| `05-learn/SKILL.md` | 修改 | 写入模板加 frontmatter 要求 |
| `02-plan/SKILL.md` | 修改 | 引用 solution-search-strategy.md |
| `04-review/SKILL.md` | 修改 | 引用 solution-search-strategy.md |
| `05-learn/references/solution-schema.yaml` | 修改 | 更新为 5 字段 schema |
| `docs/solutions/integration/2026-04-17-npm-publish-github-actions.md` | 修改 | 补 frontmatter |
| `docs/solutions/tooling/pi-context-optimization-lazy-registration.md` | 修改 | 补 frontmatter |

## 检索策略设计（solution-search-strategy.md）

借鉴 CEP 的 learnings-researcher，适配 pi skill 架构：

```
Step 1: 从任务描述提取关键词（技术术语、问题指标、组件名）
Step 2: grep 搜索 frontmatter 字段（tags, title, applies_when）
  - 并行跑多个 grep 模式
  - 只返回文件路径，不加载内容
Step 3: 合并候选文件，如果 >10 个则缩窄模式
Step 4: 只读候选文件的 frontmatter（前 15 行）
Step 5: 评分排序（severity + 关键词匹配度）
Step 6: 只全文读 top-N（≤3）高相关文件
```

## 成功标准

1. 02-plan/04-review 执行时，AI 能精准找到相关 solution，不全量加载
2. 05-learn 写出的 solution 自动包含 5 字段 frontmatter
3. 现有 2 个 solution 文件都有 frontmatter
4. 检索策略单一来源，02-plan 和 04-review 引用同一文件
