# 分析报告：addyosmani/agent-skills 对 super-pi 的可借鉴点

> 日期：2026-05-08  
> 对象：https://github.com/addyosmani/agent-skills  
> 取样版本：`742dca5`（2026-05-06）  
> 原则：极简优先 —— 非必要，不增溢  
> 结论类型：讨论用分析报告，非实施计划

---

## 1. 一句话结论

`agent-skills` 值得借鉴的是**技能写作与质量门的微模式**，不值得照搬的是它的**大而全技能目录、跨工具适配层、persona/command 编排体系**。

对 super-pi 最合适的方向是：**不新增技能、不新增工具、不扩大主流程，只把少量高 ROI 规则吸收到现有 01-05 流程和 rules 中。**

---

## 2. 证据摘要

### agent-skills 的形态

- 21 个技能：覆盖 spec / plan / build / test / review / ship / security / performance / UI / API / docs / migration 等。
- 7 个 slash commands：`/spec`、`/plan`、`/build`、`/test`、`/review`、`/code-simplify`、`/ship`。
- 3 个 persona：`code-reviewer`、`security-auditor`、`test-engineer`。
- 强调：
  - Process, not prose
  - Anti-rationalization
  - Verification is non-negotiable
  - Progressive disclosure
  - Token-conscious

### super-pi 的形态

- 8 个技能，其中默认主循环是：
  - `01-brainstorm → 02-plan → 03-work → 04-review → 05-learn`
- 有 runtime tools：`brainstorm_dialog`、`plan_diff`、`session_checkpoint`、`task_splitter`、`review_router`、`context_handoff` 等。
- 已经具备：
  - artifact 持久化
  - checkpoint resume
  - TDD gates
  - review routing
  - solution memory
  - context handoff

### 关键差异

| 维度 | agent-skills | super-pi | 含义 |
|---|---|---|---|
| 主定位 | 通用工程技能库 | Pi-native Compound Engineering workflow | super-pi 不应变成通用技能超市 |
| 编排方式 | command + persona + skill | skill pipeline + runtime tools | super-pi 的优势在 runtime，不在技能数量 |
| 内容颗粒 | 20+ 专项技能 | 5 主流程 + 支撑技能 | super-pi 应保持主心智收敛 |
| 状态机制 | 主要靠 prompt discipline | artifact + checkpoint + handoff | super-pi 已有更强状态承载 |
| 风险 | 技能多，覆盖广 | 工具多，流程强 | super-pi 的优化应减少而不是增加认知面 |

---

## 3. 可借鉴内容评估

### A. 值得借鉴：技能文件的“行为约束结构”

`agent-skills/docs/skill-anatomy.md` 的核心价值不是格式，而是它让技能更像可执行流程：

- `When to Use` 明确触发条件
- `Common Rationalizations` 阻止 agent 找理由跳步骤
- `Red Flags` 让 agent 自检是否偏航
- `Verification` 要求证据而不是“看起来没问题”

super-pi 现有技能已经有 Core rules / Workflow / gates，但有些 frontmatter description 偏短，触发条件不够具体。例如：

```yaml
01-brainstorm: Brainstorm requirements with three modes...
03-work: Execute plan-driven work...
```

这些对人类清楚，但对自动 skill routing 的帮助有限。

**极简采纳建议：**

只做一件小事：把 8 个 `SKILL.md` 的 `description` 调整成“做什么 + Use when 触发条件”。不新增 section，不扩写长文。

示例方向：

```yaml
description: "Discover requirements and write a durable brainstorm artifact. Use when requirements are ambiguous, a new idea needs shaping, or the user asks what to build."
```

**收益：**提升 agent 自动选择技能的准确性。  
**成本：**只改 8 行左右。  
**是否增加心智负担：**否。

---

### B. 值得借鉴：Anti-rationalization，但只能“微量注入”

`agent-skills` 每个技能都有 Common Rationalizations，例如：

- “这个很简单，不需要 spec”
- “我最后再测试”
- “顺手重构一下”
- “我对这个 API 很有信心，不用查文档”

这类内容对 agent 很有效，因为 agent 的常见失败不是不知道原则，而是会合理化跳过原则。

super-pi 已经有硬门禁，例如 TDD gates、approval gate、handoff gate。缺口不在“更多规则”，而在少数高频违规处的反借口提示。

**极简采纳建议：**

不要给每个 skill 添加完整 `Common Rationalizations` 表。只在已有 rules 或相关 reference 中加入极少数高频反借口：

1. `03-work` / testing：
   - “最后一起测”不是验证；每个 unit 必须有 RED/GREEN 证据。
2. `02-plan` / planning：
   - “任务很明显”不是计划；至少要写 acceptance + verification。
3. `04-review` / review：
   - “review 说得对”不是证据；每条 finding 先验证再接受。
4. common workflow：
   - “顺手清理”是 scope creep；非任务范围只记录，不修改。

**收益：**减少最常见 agent 偏航。  
**成本：**每处 1-2 行。  
**风险：**如果写成大表，会膨胀 token 和维护面。

---

### C. 值得借鉴：Stop-the-line debugging

`debugging-and-error-recovery` 的强点是：遇到失败时先停止继续开发，保留证据，复现，定位，修根因，再加回归保护。

super-pi 的 `03-work` 已有 failure checkpoint / retry，但可以更明确地规定：

```text
Unexpected failure → STOP adding features → preserve evidence → reproduce/localize → fix root cause → add regression guard → resume
```

**极简采纳建议：**

在 `03-work` failure handling 或 `rules/common/testing.md` 中加入一个 5 行 Stop-the-line block。不要新增 debugging skill。

**收益：**对 TDD 执行阶段非常高。  
**成本：**极低。  
**是否新增心智入口：**否。

---

### D. 部分借鉴：Source-driven development

`source-driven-development` 的原则是：框架/库相关实现必须查官方文档并引用来源，避免训练数据过时。

super-pi 已经在 `rules/common/development-workflow.md` 有 Research First：

- GitHub code search
- library docs
- package registries
- open-source reuse

缺口不是“没有 research”，而是“什么时候必须引用官方来源”不够尖锐。

**极简采纳建议：**

只补一条规则：

> 当实现依赖特定框架/库 API、版本行为或推荐模式时，必须查官方文档；最终报告中引用关键来源。纯逻辑、小改名、项目内模式复用不需要外部引用。

**收益：**减少过时 API / 幻觉 API。  
**成本：**1 条规则。  
**风险：**如果要求所有改动都 cite，会显著拖慢执行；必须限定触发条件。

---

### E. 部分借鉴：Review 五轴模型与 persona 报告格式

`agent-skills` 的 code review 采用五轴：

1. Correctness
2. Readability
3. Architecture
4. Security
5. Performance

super-pi 的 `04-review` 已经有：

- diff scope
- `review_router`
- reviewer personas
- structured findings
- autofix loop
- evidence-first review discipline

所以不需要新增 `code-reviewer/security-auditor/test-engineer` persona 文件。super-pi 现有 `review_router` 已经承担了类似路由职责。

**极简采纳建议：**

只做一致性校准：

- 在 `04-review` 输出 schema 或 reviewer selection 中明确五轴是基础检查面。
- 顺手修正当前文档中的一个明显 typo：`performan04-reviewer` 应为 `performance-reviewer`。

**收益：**更清楚、更专业。  
**成本：**极低。  
**风险：**不要引入 agent-skills 的三 persona 体系，否则和 `review_router` 重叠。

---

### F. 不建议借鉴：20+ 技能目录

`agent-skills` 把 frontend、API、security、performance、CI、docs、migration 等拆成独立技能。这适合“通用技能库”，但不适合 super-pi 当前定位。

super-pi 的核心价值是：用户能沿着一个稳定 workflow 走完闭环：

```text
think → plan → build → review → learn
```

如果引入大量专项技能，会带来：

- 主路径心智膨胀
- skill 选择成本增加
- 现有 rules 与新 skill 重叠
- runtime tools 的优势被 prompt 技能目录稀释

**结论：不采纳。**  
专项知识继续放在 `rules/`、`references/` 或 `docs/solutions/`，不要升级成主技能。

---

### G. 不建议借鉴：persona/command 三层体系

`agent-skills` 的层次是：

```text
Command = when
Persona = who
Skill = how
```

这在 Claude Code 插件生态里很自然。但 super-pi 已经有 Pi skill + CE tools + review_router + subagent tools。再引入独立 persona/command 层，会造成重叠：

- `/ship` 与 super-pi 的 review / commit / learn 流程重叠
- 三 persona 与 `review_router` 重叠
- command alias 体系与 `/skill:xx` 主路径重叠

**结论：不采纳。**  
如果未来要改善入口体验，应优先优化 `06-next` / README / skill description，而不是新增命令层。

---

### H. 不建议借鉴：跨工具适配文档

`agent-skills` 提供 Cursor、Gemini、Windsurf、OpenCode、Copilot、Kiro 等多工具安装指南。这对它的定位有价值，但 super-pi 是 Pi-native npm package。

**结论：暂不采纳。**  
除非未来战略变成“跨 agent workflow 包”，否则这些内容会稀释 README。

---

### I. 不建议现在借鉴：WebFetch cache hooks

`agent-skills` 的 SDD cache hook 设计很精巧：用 HTTP `ETag` / `Last-Modified` revalidation 避免重复 fetch，同时不牺牲 freshness。

但这是 Claude Code hook 体系下的优化。super-pi 当前已做 context handoff / read-output-filter / token 优化。引入 hook cache 会增加：

- harness 依赖
- 本地缓存状态
- debug 面
- 安全与陈旧性解释成本

**结论：暂不采纳。**  
只有当 super-pi 后续大量官方文档 fetch 成为真实瓶颈，再单独评估。

---

## 3.5 关于 agent-skills 的 agents：不建议引进，只借鉴报告结构

agent-skills 提供 3 个 persona：

- `code-reviewer`
- `security-auditor`
- `test-engineer`

结论：**不建议作为 super-pi 的新 agents 引进。**

原因：

1. **与现有 `04-review` / `review_router` 职责重叠**
   - super-pi 已经根据 diff metadata 选择 reviewer personas。
   - 再引入固定三 agent，会形成“双路由”：到底听 `review_router`，还是听静态 agents？

2. **会增加用户心智入口**
   - 当前 super-pi 的默认路径是 5 步 loop。
   - 引入 agents 后，用户会开始思考“该跑 skill 还是 agent”，违背极简原则。

3. **Pi-native 优势不在静态 persona 文件**
   - super-pi 的优势是 runtime tools：checkpoint、handoff、plan_diff、review_router、solution memory。
   - agent-skills 的 agents 更适合 Claude Code plugin 的 command/persona/skill 三层生态。

4. **现有 subagent/parallel 能力已足够**
   - super-pi 已有 `ce_subagent` / `ce_parallel_subagent`。
   - 如果需要多视角 review，应由 `review_router` 动态产出任务，而不是新增固定 agent 文件。

可借鉴但不引进的部分：

- `code-reviewer` 的五轴报告结构。
- `security-auditor` 的风险分级语言。
- `test-engineer` 的 coverage gap / Prove-It 表达方式。

采纳方式：把这些作为 **04-review 输出格式与 reviewer rubric 的微调参考**，而不是新增 agents。

明确不做：

- 不新增 `agents/code-reviewer.md`
- 不新增 `agents/security-auditor.md`
- 不新增 `agents/test-engineer.md`
- 不新增 `/ship` 式三 agent fan-out command
- 不让 persona 成为 super-pi 的新用户入口

---

## 4. 推荐方向：只做 4 个微补丁

如果要从这次分析落到 super-pi 优化，我建议只做以下四项：

### Patch 1：强化 8 个 skill description

目标：让每个 description 都包含：

```text
Does X. Use when Y.
```

不改 workflow，不新增 sections。

### Patch 2：加一条 Source-driven 触发规则

位置候选：`rules/common/development-workflow.md`

内容限定为：框架/库 API、版本行为、推荐模式相关时查官方文档并引用来源。

### Patch 3：在 03-work 加 Stop-the-line failure block

位置候选：`skills/03-work/SKILL.md` 或 `rules/common/testing.md`

内容限定为 5 行，不新增 debugging skill。

### Patch 4：校准 review 五轴 + 修 typo

位置候选：`skills/04-review/references/reviewer-selection.md`

- 明确基础 review 面：correctness / readability / architecture / security / performance
- 修正 `performan04-reviewer` typo

---

## 5. 明确不做的事

为保持极简，本轮不建议：

- 新增 `debugging` skill
- 新增 `source-driven-development` skill
- 新增 `code-simplification` skill
- 新增 `/ship` 或 command alias 层
- 复制 agent-skills 的 persona 文件
- 引入 hook cache
- 写跨工具安装指南
- 把 frontend/API/security/performance 拆成独立技能
- 在每个 skill 中加入完整 Common Rationalizations 表

这些都可能“有用”，但不符合 super-pi 当前最重要的优势：**少入口、强流程、有状态、可恢复、可沉淀。**

---

## 5.5 Token ROI 评估

结论：**高 ROI**，但前提是坚持微补丁，不引进 agents / 新 skills / 新 command 层。

预计新增 token：约 **250-500 tokens**，且多数为阶段内按需加载；只有 skill description 可能增加少量常驻注册成本。

| 微补丁 | 成本 | 收益 |
|---|---:|---|
| 强化 8 个 skill description | +150-300 tokens | 降低选错 skill / 路由不清 |
| Source-driven 触发规则 | +30-60 tokens | 降低框架 API 幻觉与返工 |
| Stop-the-line failure block | +50-100 tokens | 防止失败后继续堆代码，ROI 最高 |
| Review 五轴校准 + typo 修复 | +30-80 tokens | 提升 review 一致性，减少重复解释 |

对比：引进 3 个 agents 是 **低 ROI**。它会增加文件、入口、路由解释和 review 重叠；其核心价值只是 rubric，应该吸收到 `04-review`，而不是新增 persona 层。

硬约束：后续实施时总新增文档内容控制在 **500 tokens 内**，不新增文件。

---

## 6. 方案比较

| 方案 | 内容 | 优点 | 缺点 | 结论 |
|---|---|---|---|---|
| A. 微模式吸收 | 只做 4 个微补丁 | 高 ROI、低 token、低认知成本 | 改善幅度克制 | 推荐，已获用户同意 |
| B. 新增专项技能 | 加 debugging/source-driven/code-simplify 等 | 看起来能力更全 | 主路径变胖，和 rules 重叠 | 不推荐 |
| C. 复制 agent-skills 架构 | commands + personas + 20 skills | 生态完整 | 违背 Pi-native 与极简原则 | 明确不推荐 |

---

## 7. Premise Challenge

在继续之前，建议确认这些前提：

1. super-pi 的核心竞争力是 **Pi-native workflow + runtime state/tools**，不是技能数量。
2. 优化目标是 **减少 agent 失败模式**，不是扩大功能表。
3. 所有借鉴都应优先进入现有 `skills/`、`rules/`、`references/`，而不是新增主入口。
4. 如果一个规则只在少数场景有用，应放在按需加载 reference/rules 中，而不是常驻主路径。

---

## 8. 成功标准

如果后续采纳推荐方向，成功应表现为：

- 8 个 skill 的触发描述更准确。
- 03-work 遇到失败时更少“继续往前写”。
- 框架/库相关实现更少依赖记忆和猜测。
- 04-review 的基础检查面更清楚。
- 没有新增技能、工具、命令层或用户心智入口。

---

## 9. 用户决策与下一步

用户已同意：

- 采用“方案 A：4 个微补丁”
- 不新增技能
- 不新增工具
- 不新增命令层
- 不引进 agent-skills 的 agents，只借鉴 review/report rubric
- 以 Token ROI 为约束，总新增文档内容控制在 500 tokens 内

下一步：进入 `02-plan`，把 4 个微补丁拆成最小实施单元。