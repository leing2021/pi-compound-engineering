# Bug：read 工具在长文件时过滤截断，导致关键信息遗漏

> 日期：2026-04-25
> 严重度：中（导致分析结论不完整，遗漏核心概念）
> 影响场景：brainstorm / plan 等需要完整理解文档上下文的技能

---

## 现象

使用 `read` 工具读取多个长文档时，输出被自动过滤截断：

```
[Read output filtered: 6.8KB → 5.3KB (1.5KB saved, strategy: markdown (headings + first paragraph))]
[Read output filtered: 3.3KB → 2.5KB (775B saved, strategy: markdown (headings + first paragraph))]
[Read output filtered: 8.0KB → 6.2KB (1.8KB saved, strategy: markdown (headings + first paragraph))]
```

过滤策略是 `markdown (headings + first paragraph)`，即只保留标题和每个章节的第一段。

## 具体后果

在评估 pi-agent-core 架构时，一次性读取了 3 个 tri_brain 文档：

1. `chapter_1_tri_brain_system.md` — 被截断，**遗漏了 Builder 的完整定义**
2. `chapter_7_system_os.md` — 被截断，**遗漏了 Builder 的五大子系统（Schema OS / Prompt OS / Pipeline OS / QA OS / Versioning OS）**
3. `execution_agents_capability_vs_residency_2026-04-22.md` — 被截断，**遗漏了"由 Builder 临时拉起运行时 Agent"的关键描述**

导致最终分析中 **Builder 作为执行层中枢被完全遗漏**，用户不得不手动纠正。

## 根因

1. **read 工具的默认过滤策略过于激进** — 对于需要完整理解上下文的文档，`headings + first paragraph` 会丢失大量实质内容
2. **批量读取时没有补偿机制** — 连续读取多个大文件时，过滤截断的累积效果更严重
3. **没有自动检测遗漏的机制** — 当输出被截断时，没有提示"你读的内容不完整，建议继续读"

## 建议修复

### 方案 A：read 工具层面

- 在 brainstorm/plan 等需要深度理解的场景下，自动检测文件大小，对超过阈值的文件发出提示或自动分页读取
- 被截断时，在输出末尾加一行明确提示：`⚠️ 以上内容经过截断过滤，完整文件共 XX 行，当前仅显示标题和首段。如需完整内容请用 offset/limit 参数分页读取。`

### 方案 B：技能层面

- 在 brainstorm 技能的 instructions 中，增加规则：**读取超过 100 行的文档时，必须用 offset/limit 分页完整读取，不接受过滤截断的输出**
- 对核心设计文档（如 tri_brain 系列），标记为"必须完整阅读"

### 方案 C：行为层面（立即可行）

- 当看到 `[Read output filtered]` 时，**立即用 `bash cat` 或分页 `read` 重新读取完整内容**
- 不要基于截断输出发结论

## 教训

**文档的标题和首段往往是最泛化的描述，核心细节在正文。** 对于架构设计文档，截断过滤等同于丢失关键信息。这个问题不只是这一次——任何需要深度理解上下文的场景都可能中招。

---

## 复现步骤

1. 用 `read` 工具一次性读取 3 个以上的长 markdown 文档
2. 每个文档超过 100 行
3. 观察输出是否被截断
4. 基于截断输出做分析 → 概率性遗漏关键信息
