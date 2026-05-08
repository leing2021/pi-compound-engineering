# Super Pi

**让 AI 编程 agent 从「写代码的工具」变成「靠谱的工程师」。**

安装后,告诉 Pi 你想做什么,然后不断说「继续」——它会自己走完 **想清楚 → 计划好 → 写代码 → 审查 → 沉淀经验** 的完整循环。

```bash
pi install npm:@leing2021/super-pi
```

---

## 五步核心循环

```
01-brainstorm → 02-plan → 03-work → 04-review → 05-learn
  想清楚          计划好      写代码       审查         沉淀
```

| Skill | 功能 | 核心工具 |
|-------|------|----------|
| **01-brainstorm** | YC 风格追问,三种模式(Startup/Builder/CE) | `brainstorm_dialog` |
| **02-plan** | RED→GREEN→REFACTOR,增量更新,可选 CEO Review | `plan_diff` |
| **03-work** | 并行执行,断点续传,严格 TDD | `ce_subagent`, `ce_parallel_subagent` |
| **04-review** | 自动分配评审,结构化发现,可选浏览器 QA | `review_router` |
| **05-learn** | 模式提取 → 可搜索知识卡片 | `pattern_extractor` |
| **06-next** | 下一步推荐 + 完整状态报告 | `workflow_state` |
| **07-worktree** | 隔离 git worktree 开发 | `worktree_manager` |
| **08-help** | Phase 1 skill 说明与使用指南 | — |

### 模型与思考深度路由

在 `.pi/settings.json` 中配置:

```json
{
  "modelStrategy": {
    "01-brainstorm": "anthropic/claude-sonnet-4-20250514",
    "02-plan": "anthropic/claude-opus-4-20250115"
  },
  "thinkingStrategy": {
    "01-brainstorm": "high",
    "02-plan": "high",
    "03-work": "medium"
  }
}
```

模型和思考深度自动切换——无需手动 `/model`。

## 设计哲学与致谢

**80% 规划和审查，20% 执行。**

目标不是让 AI 更快地写代码，而是让 AI 写之前先想清楚、写之后认真审查，并把解决过的问题沉淀下来。

Super Pi 不是 fork，也不是 wrapper。它从下面这些项目中提取有价值的方法，并用 Pi 原生的 skills、tools、artifacts、checkpoints 和 handoffs 重新实现。

| 项目 | Super Pi 借鉴的核心内容 |
|------|--------------------------|
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | “Use when” 技能触发条件、source-driven verification、stop-the-line hard gate、anti-rationalization、五轴 review baseline。仅作为嵌入式微模式吸收，不新增 skills/tools/commands/agents。 |
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) | 并行 subagent 编排、checkpoint 断点续传、持续学习循环、token-conscious agent workflow 设计。 |
| [superpowers](https://github.com/obra/superpowers) | 严格 TDD gates、设计检查清单、review discipline，以及“agent 需要硬门禁而不是温和建议”的理念。 |
| [compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) | think → plan → build → review → learn 五步循环，以及 knowledge compounding 的骨架。 |
| [gstack](https://github.com/garrytan/gstack) | YC 式 forcing questions、CEO Review 认知框架、Browser QA 模式、failure maps、evidence-first validation。 |

---

## 快速开始

```
你: 我想做一个帮助独立开发者找到用户的工具

→ 01-brainstorm: YC 风格追问 → docs/brainstorms/requirements.md
→ 02-plan: RED→GREEN→REFACTOR 单元 → docs/plans/plan.md
→ 03-work: 并行执行,断点续传
→ 04-review: 结构化发现,可选浏览器 QA
→ 05-learn: 知识沉淀

你: 继续
→ /skill:06-next 自动推荐下一个步骤
```

**中断后恢复:**
```
你: /skill:03-work docs/plans/plan.md
→ 自动加载 checkpoint,跳过已完成单元,从断点继续
```

---

## Token 消耗

新对话开销: **~2,600 tokens** (200K 上下文的 1.3%)。

| 组件 | Tokens |
|------|--------|
| 8 个 skill 注册 | ~490 |
| System prompt (skills) | ~1,400 |
| Skill 内联 (每次调用) | ~500-800 |

按需加载:只加载当前需要的 skills。

完整评估 → [`docs/token-cost-evaluation.md`](docs/token-cost-evaluation.md)

---

## 生成的结构

```
your-project/
├── docs/
│   ├── brainstorms/      # 需求文档
│   ├── plans/             # 执行计划
│   └── solutions/         # 知识卡片
└── .context/
    └── compound-engineering/
        ├── checkpoints/  # 断点文件
        ├── dialogs/      # 对话状态
        └── history/       # 执行历史
```

**把所有文件提交到 git** ——这些文件是项目的可追溯记忆。

---

## 技术架构

- **8 个 skills** 配专用工具
- **14 个工具** + 2 个辅助
- **~2800 行** TypeScript, **175 个测试**
- **渐进式规则加载** ——只加载当前任务需要的

规则放在 `rules/` (11 个通用 + 语言特定)。项目级规则优先。

---

## 更新日志

完整版本历史请查看 [CHANGELOG_CN.md](./CHANGELOG_CN.md)。

## 仓库

- **GitHub**: https://github.com/leing2021/super-pi
- **npm**: https://www.npmjs.com/package/@leing2021/super-pi

## 开发

```bash
bun test
npm publish --dry-run
```