# Bug：02-plan 调用 10-rules 时未加载语言级规则（typescript）

> 日期：2026-04-25
> 修复日期：2026-04-26
> 状态：✅ **已修复**（方案 C）
> 严重度：中（计划阶段缺少语言特定约束，可能导致生成的实现计划不符合语言规范）
> 影响场景：02-plan 在 TypeScript 项目中生成实施计划时

---

## 现象

在 PU 项目（TypeScript monorepo）执行 `/skill:02-plan` 时，10-rules 只加载了 common 级规则，没有加载 `rules/typescript/` 目录下的语言级规则。

实际加载的文件：
- `rules/common/development-workflow.md` ✅
- `rules/common/testing.md` ✅
- `rules/typescript/*` ❌ **未加载**

## 具体后果

计划文档中没有反映 TypeScript 特有的约束，例如：
- TypeScript 的 Zod schema 编写规范
- TypeScript 的 interface vs type 选择
- TypeScript 的 enum vs const enum vs union type 选择
- TypeScript 的 import/export 规范（.js 后缀等）

这些约束在 `rules/typescript/` 的 5 个文件中定义，但计划阶段完全没读到。

## 根因

### 问题出在两处

**1. `10-rules` SKILL.md 的 Pre-flight 定义不完整**

当前 02-plan 的 Pre-flight 只要求：

```markdown
### Before planning (02-plan)

Read at minimum:
- `rules/common/development-workflow.md`
- `rules/common/testing.md`
```

而 03-work 的 Pre-flight 明确要求加载语言目录：

```markdown
### Before implementation (03-work)

Read the common minimum above, plus:
- The language directory matching the active codebase (e.g. `rules/typescript/` for TS work)
- `rules/web/` files if the task involves frontend/browser concerns
```

**02-plan 跳过了语言检测步骤**，导致计划阶段不知道项目用什么语言，也不会加载语言级规则。

**2. `02-plan` SKILL.md 没有语言检测指令**

02-plan 的 Core rules 只说：

```markdown
- Before planning, read the `10-rules` skill and load `rules/common/development-workflow.md` and `rules/common/testing.md` for coding standards context.
```

硬编码了只加载 common，没有说"检测项目语言并加载对应目录"。

### 本质问题

**计划阶段的规则加载策略不够智能**：它假设计划阶段不需要语言特定知识，但实际上：

- 计划要写具体的文件路径和代码结构 → 需要知道语言的文件命名规范
- 计划要写 Zod Schema → 需要知道 TypeScript 的 Zod 用法
- 计划要写 interface 定义 → 需要知道 TypeScript 的 interface 规范
- 计划的 Verification commands → 需要知道语言的测试/构建命令

## 建议修复

### 方案 A：修改 10-rules SKILL.md（推荐）

在 `Before planning (02-plan)` 段落中增加语言检测：

```markdown
### Before planning (02-plan)

Read at minimum:
- `rules/common/development-workflow.md`
- `rules/common/testing.md`
- **Detect the active language** from the project (check `tsconfig.json`, `package.json`, `Cargo.toml`, `go.mod`, etc.) and load the matching language directory
```

### 方案 B：修改 02-plan SKILL.md

在 02-plan 的 Core rules 中增加语言检测指令：

```markdown
- Before planning, read the `10-rules` skill and load:
  1. `rules/common/development-workflow.md` and `rules/common/testing.md`
  2. **Detect the project's primary language** (check for tsconfig.json → typescript, Cargo.toml → rust, etc.)
  3. Load the matching language-specific rules (e.g. `rules/typescript/`)
```

### 方案 C：A + B 同时修改（最彻底）

同时修改 10-rules 和 02-plan，确保：
1. 10-rules 的 Pre-flight 明确要求 plan 阶段也做语言检测
2. 02-plan 的 Core rules 给出具体的语言检测方法

## 验证方法

修复后，在 TypeScript 项目中执行 02-plan：
1. 检查是否读取了 `rules/typescript/testing.md`（应覆盖 `common/testing.md`）
2. 检查是否读取了 `rules/typescript/coding-style.md`
3. 检查计划文档是否反映了 TypeScript 特有的约束

---

## 复现步骤

1. 在一个 TypeScript 项目中启动 pi
2. 执行 `/skill:02-plan`
3. 观察 10-rules 的加载行为
4. 预期：只加载了 `common/` 目录的规则
5. 实际：`typescript/` 目录的规则被跳过
