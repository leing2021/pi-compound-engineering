---
title: "Pi 扩展工厂函数格式陷阱：export default {} 不等于 export default function"
category: tooling
severity: high
tags:
  - pi
  - extension
  - factory-function
  - export-default
  - ExtensionAPI
  - loading-error
applies_when:
  - "运行 pi 报错：Extension does not export a valid factory function"
  - "扩展文件使用 export default { name, description, load() } 对象格式但无法加载"
  - "编写或迁移 Pi 扩展时不确定正确的导出格式"
  - "扩展在其他框架能用但在 pi 里加载失败"
  - "升级 pi 版本后扩展突然不工作"
---

# Problem

编写 Pi 扩展时，如果 `export default` 导出的是一个**对象**（含 `load()` 方法），而非**工厂函数**，pi 启动时会报错：

```
Error: Failed to load extension "path/to/extension/index.ts":
Extension does not export a valid factory function
```

这个错误信息明确但容易让人困惑——"我的扩展明明有 export default，为什么说格式不对？"

# Context

**发现的场景**：`super-pi-extension/index.ts` 使用了类似其他框架的扩展注册模式：

```typescript
// ❌ 错误格式 — 对象 + load() 方法
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

export default {
  name: "super-pi-extension",
  description: "...",

  async load(ctx: ExtensionContext): Promise<void> {
    // 初始化逻辑
  },
};
```

这在某些插件框架（如 Fastify 插件、VS Code 扩展注册器）中是常见模式，但 **Pi 扩展系统不是这样工作的**。

**另一个踩坑点**：当扩展通过 npm 全局安装时（`~/.nvm/.../lib/node_modules/@leing2021/super-pi/extensions/`），本地修改源码 `~/code/super-pi/` 不会影响全局安装的副本。需要同时修复两处。

# Solution

Pi 扩展必须导出一个**工厂函数**，接收 `ExtensionAPI` 参数：

```typescript
// ✅ 正确格式 — 工厂函数
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  // 用 pi.on() 注册事件处理
  pi.on("session_start", async (_event, ctx) => {
    // 初始化逻辑
  });

  // 用 pi.registerTool() 注册工具
  // 用 pi.registerCommand() 注册命令
}
```

## 关键区别对照

| 方面 | ❌ 错误（对象） | ✅ 正确（工厂函数） |
|------|----------------|-------------------|
| 导出 | `export default { load() }` | `export default function(pi) {}` |
| 初始化入口 | `load(ctx)` 方法 | 函数体本身（在 `session_start` 事件中做异步初始化） |
| 上下文获取 | `ctx` 作为 `load()` 参数 | `ctx` 在每个事件 handler 的第二个参数 |
| API 访问 | 无（对象内拿不到 `pi`） | `pi` 参数提供 `on`、`registerTool`、`registerCommand` 等 |
| 异步支持 | `async load()` | 函数体同步执行注册，异步工作放在事件 handler 中 |
| 类型 | `ExtensionContext` | `ExtensionAPI`（工厂参数）+ 事件 handler 的 `ctx: ExtensionContext` |

## 迁移模式

如果原始代码是对象格式 `export default { load(ctx) { ... } }`：

1. 将 `load(ctx)` 的内容移入 `pi.on("session_start", ...)` 事件
2. `ctx.cwd` 改为从事件 handler 的 `ctx` 获取
3. 其他方法（如 `registerTool`、`registerCommand`）直接用 `pi` 参数调用
4. 删除 `name`、`description` 字段（Pi 不需要）

```typescript
// 迁移前
export default {
  name: "my-ext",
  async load(ctx: ExtensionContext): Promise<void> {
    doSomething(ctx.cwd);
    if (!checkDependency()) {
      console.warn("Missing dep");
    }
  },
};

// 迁移后
export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    doSomething(ctx.cwd);
    if (!checkDependency()) {
      console.warn("Missing dep");
    }
  });
}
```

## 排查全局安装副本问题

如果修改了本地源码但 `pi` 仍然报错：

```bash
# 1. 找到全局安装路径
which pi
# → ~/.nvm/versions/node/v22.20.0/bin/pi

# 2. 找到扩展的实际加载路径（从错误信息中）
# Error: Failed to load extension "/Users/jasonle/.nvm/.../lib/node_modules/@leing2021/super-pi/extensions/..."

# 3. 确认两处文件是否一致
diff ~/code/super-pi/extensions/super-pi-extension/index.ts \
     ~/.nvm/.../lib/node_modules/@leing2021/super-pi/extensions/super-pi-extension/index.ts

# 4. 修复全局副本或重新安装
```

# Why this works

Pi 的扩展加载器（通过 jiti 加载 TypeScript）检查 `module.exports.default` 的类型：
- 如果是 `function` → 视为工厂函数，调用它并传入 `ExtensionAPI`
- 如果是其他类型（对象、class 实例等）→ 抛出 "does not export a valid factory function"

工厂函数模式让 Pi 能在调用时注入 `ExtensionAPI`（包含 `on`、`registerTool`、`registerCommand` 等方法），而不是让扩展自己管理生命周期。对象格式的 `load()` 方法不符合这个调用约定。

# Prevention

1. **新建扩展时**：从 `export default function (pi: ExtensionAPI) { ... }` 开始，不要从对象格式开始
2. **从其他框架迁移时**：不要复制 `export default { load() }` 模式，按 Pi 的工厂函数模式重写
3. **类型检查**：只 import `ExtensionAPI`（工厂参数类型），`ExtensionContext`（事件 handler 参数类型）从事件回调中获取
4. **全局安装一致性**：修改源码后，记得同步修复全局安装副本或重新 `npm install -g`

# Related

- `docs/solutions/tooling/2026-04-24-pi-extension-terminate-and-model-routing.md` — Pi 扩展的 `terminate` 语义与 input hook
- `docs/solutions/tooling/2026-04-24-pi-0.70-upgrade-memory.md` — Pi 升级时的扩展生命周期注意事项
- [Pi Extensions 官方文档](../extensions.md) — 完整的扩展 API 参考
