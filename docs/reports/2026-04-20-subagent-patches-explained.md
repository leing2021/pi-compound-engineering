# Subagent 改动说明与功能对比

> 日期：2026-04-20
> 来源：借鉴 `pi-subagents` 的高 ROI 特性
> 范围：`extensions/ce-core/tools/` 下的 `subagent.ts`、`parallel-subagent.ts`、新增 `subagent-depth-guard.ts`

---

## 一、改动动机

`super-pi` 的 `subagent` 和 `parallel_subagent` 工具存在两个工程风险：

1. **无递归保护** — 子代理内部如果再触发子代理，会无限递归，导致 token / session / process 爆炸
2. **无上下文裁剪** — 所有子代理（包括并行 worker）都继承全量 skills，浪费 token 并可能行为跑偏

从 `pi-subagents` 项目中提炼出两个最小可借鉴点，以最低复杂度解决上述问题。

---

## 二、子代理调用逻辑

### 整体调用链

```
用户输入 → Pi Agent → 调用 tool(subagent / parallel_subagent)
                              │
                              ▼
                     ① checkSubagentDepth()   ← 深度守卫
                              │
                        超限? ──── throw Error("depth limit reached")
                              │
                         允许执行 ↓
                              │
                     ② buildExecOptions()      ← 构建 CLI flags + env
                              │
                   ┌──────────┴──────────┐
                   │                     │
              inheritSkills          depth env
              = false?               注入
              → 加 --no-skills    PI_SUBAGENT_DEPTH=depth+1
                   │              PI_SUBAGENT_MAX_DEPTH=max
                   └──────────┬──────────┘
                              ▼
                     ③ runner(prompt, execOptions)
                              │
                              ▼
                     ④ createSubagentRunner 工厂闭包
                        ├── mutex.acquire()          ← 并发安全
                        ├── 合并 extraFlags → pi --no-session [--no-skills] -p "..."
                        ├── 临时注入 extraEnv → process.env
                        ├── pi.exec("pi", args, { signal, timeout })
                        ├── 恢复 process.env
                        └── mutex.release()          ← 释放锁
                              │
                              ▼
                     ⑤ 子进程 pi 启动
                        继承了 process.env 中的深度变量
                        → 子进程的 subagent tool 再次执行 ① 时
                          会读到递增后的 depth
                          如果超限就会 block
```

### 三层各司其职

| 层 | 文件 | 职责 |
|---|---|---|
| **守卫层** | `subagent-depth-guard.ts` | 读环境变量、判断深度、构建子进程 env |
| **并发层** | `async-mutex.ts` | 序列化 process.env 读写，防止并行子代理 env 竞态 |
| **工具层** | `subagent.ts` / `parallel-subagent.ts` | 调用守卫、组装 `execOptions`、构建 prompt |
| **执行层** | `index.ts` → `createSubagentRunner` | 把 `execOptions` 拆解成实际 CLI 参数 + mutex 保护的 env 注入 |

### 关键设计决策

#### 1. env 传递方式：异步互斥锁 + save/restore

`pi.exec()` 不支持 `env` 参数（子进程直接继承 `process.env`）。使用 `AsyncMutex` 序列化 env 的 save/modify/exec/restore 过程：

```typescript
const release = await mutex.acquire()  // 获取锁
saved = process.env[key]               // 记住旧值
process.env[key] = newValue            // 写入新值
try { pi.exec(...) }                    // 子进程继承新值（互斥：不会被打断）
finally {
  process.env[key] = saved             // 恢复
  release()                             // 释放锁
}
```

**为什么需要互斥锁？** `parallel_subagent` 用 `Promise.allSettled` 并发调用多个 runner。如果多个 runner 同时写 `process.env.PI_SUBAGENT_DEPTH`，save/restore 会互相覆盖导致 env 泄漏。互斥锁保证同一时刻只有一个 runner 在操作 env。

#### 2. `inheritSkills` 的默认值策略不同

| 工具 | 默认 `inheritSkills` | 理由 |
|---|---|---|
| `subagent`（串行） | `true` | 串行任务通常是 workflow 链条的一部分，可能需要 skills 上下文 |
| `parallel_subagent`（并行） | `false` | 并行 worker 是纯执行单元，应走窄上下文减少 token 浪费和行为跑偏 |

#### 3. 递归深度传递是自动的、无感的

不需要调用方手动传——工具内部自动完成：

```
父进程 PI_SUBAGENT_DEPTH=0, MAX=2
  → getChildDepthEnv() → { DEPTH: "1", MAX: "2" }
  → 子进程继承后读到 DEPTH=1
    → 如果子进程再调 subagent → getChildDepthEnv() → { DEPTH: "2", MAX: "2" }
      → 孙进程读到 DEPTH=2 = MAX → checkSubagentDepth() 返回 allowed: false → throw
```

---

## 三、修改前后功能对比表

### 核心能力对比

| 维度 | 修改前 | 修改后 | 变化说明 |
|---|---|---|---|
| **递归深度保护** | ❌ 无 | ✅ `PI_SUBAGENT_DEPTH` / `PI_SUBAGENT_MAX_DEPTH` 环境变量守卫 | 防止子代理无限递归 |
| **深度超限行为** | 子进程继续执行 → 资源失控 | 抛出 `Error("depth limit reached")` fail fast | 从"隐性炸弹"变成"显式拦截" |
| **默认最大深度** | 无限制 | 2 | 可通过环境变量覆盖 |
| **上下文继承控制** | ❌ 无 | ✅ `inheritSkills` 参数 | 子代理可选是否继承 skills |
| **并行 worker 默认上下文** | 全量继承 | 窄上下文（`--no-skills`） | 减少 token 浪费 |
| **串行 subagent 默认上下文** | 全量继承 | 全量继承（向后兼容） | `inheritSkills` 默认 `true` |

### 接口变化

| 维度 | 修改前 | 修改后 | 变化说明 |
|---|---|---|---|
| **CLI 参数** | `pi --no-session -p "..."` | `pi --no-session [--no-skills] -p "..."` | 按需追加 flag |
| **子进程环境变量** | 无额外 env | 自动注入 `PI_SUBAGENT_DEPTH` / `PI_SUBAGENT_MAX_DEPTH` | 子进程自动获得递增深度 |
| **`SubagentRunner` 签名** | `(prompt: string) => Promise<string>` | `(prompt: string, options?: SubagentExecOptions) => Promise<string>` | 新增可选第二参数 |
| **`SubagentInput` 字段** | `agent`, `task`, `chain` | + `inheritSkills?: boolean` | 新增可选字段 |
| **`ParallelSubagentInput` 字段** | `tasks` | + `inheritSkills?: boolean` | 新增可选字段 |

### 文件与测试变化

| 维度 | 修改前 | 修改后 | 变化说明 |
|---|---|---|---|
| **新增模块** | — | `subagent-depth-guard.ts`（75 行） | 独立模块，无外部依赖 |
| **测试数量** | 142 pass | 158 pass（+16） | 全部通过 |
| **改动的已有文件** | — | `subagent.ts`, `parallel-subagent.ts`, `index.ts`, `ce-core-extension.test.ts` | 共 4 文件 |

---

## 四、新增测试明细

| # | 测试名称 | 验证内容 |
|---|---|---|
| 1 | defaults to depth=0, max=2 when env vars unset | 默认值正确 |
| 2 | allows execution at depth < max | 正常放行 |
| 3 | blocks execution at depth >= max | 超限拦截 |
| 4 | blocks execution at depth > max | 严重超限拦截 |
| 5 | depth=0, max=0 disables subagent entirely | 完全禁用模式 |
| 6 | handles invalid depth as 0 | 容错：非数字 depth |
| 7 | handles invalid max as default | 容错：非数字 max |
| 8 | getChildDepthEnv increments depth and preserves max | env 递增正确 |
| 9 | getChildDepthEnv accepts custom maxDepth override | 自定义 max 覆盖 |
| 10 | subagent tool blocks execution when depth exceeded | subagent 集成：超限 throw |
| 11 | parallel_subagent tool blocks execution when depth exceeded | parallel 集成：超限 throw |
| 12 | subagent tool passes execOptions with depth env | 验证 env 正确传递给 runner |
| 13 | subagent with inheritSkills=false passes --no-skills | 裁剪：flag 存在 |
| 14 | subagent with inheritSkills=true does not pass --no-skills | 兼容：flag 不存在 |
| 15 | parallel_subagent defaults to inheritSkills=false | 并行默认窄上下文 |
| 16 | parallel_subagent with inheritSkills=true keeps skills | 并行可显式开启继承 |

---

## 五、向后兼容性

| 场景 | 兼容性 | 说明 |
|---|---|---|
| 现有调用不传 `inheritSkills` | ✅ 完全兼容 | 行为与修改前一致 |
| 现有调用不设环境变量 | ✅ 兼容 | `depth=0, max=2`，默认放行 |
| 现有 skill 中使用 `subagent` tool | ✅ 兼容 | schema 是 Optional，LLM 自动忽略 |
| 已有测试 | ✅ 全部通过 | 无修改原有测试用例 |
| `SubagentRunner` 签名变化 | ✅ 兼容 | 第二参数是 Optional |

---

## 六、改动文件清单

```
新增:
  extensions/ce-core/tools/subagent-depth-guard.ts    (+78 行)
  extensions/ce-core/tools/async-mutex.ts               (+32 行)

修改:
  extensions/ce-core/tools/subagent.ts                 (+30 行净增)
  extensions/ce-core/tools/parallel-subagent.ts        (+30 行净增)
  extensions/ce-core/index.ts                          (+49 行净增)
  tests/ce-core-extension.test.ts                      (+418 行净增)

统计: +580 行, -30 行
测试: 162 pass, 0 fail, 523 expect() calls, 275ms
```

---

## 七、环境变量参考

| 变量名 | 作用 | 默认值 | 示例 |
|---|---|---|---|
| `PI_SUBAGENT_DEPTH` | 当前嵌套深度（只读，由系统自动设置） | `0` | 子进程自动收到 `1` |
| `PI_SUBAGENT_MAX_DEPTH` | 最大允许深度（可由用户设置） | `2` | `PI_SUBAGENT_MAX_DEPTH=3` 允许三层嵌套 |

### 典型使用场景

```bash
# 完全禁用子代理
PI_SUBAGENT_MAX_DEPTH=0 pi

# 允许更深嵌套（谨慎使用）
PI_SUBAGENT_MAX_DEPTH=4 pi

# 正常使用（默认 max=2，无需设置）
pi
```
