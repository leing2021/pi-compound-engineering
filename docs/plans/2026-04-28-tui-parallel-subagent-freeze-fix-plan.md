# Plan: 修复并行 Subagent 运行时终端页面卡死问题

## Problem summary

当 8 个 subagent 同时并行运行时，终端页面卡住、无法向上滚动。根因是多层次的渲染风暴（render storm），主要由以下因素叠加造成：

### 根因分析

**1. Widget 动画定时器高频刷屏 (render.ts)**
- `WIDGET_ANIMATION_MS = 80ms` → 每秒 12.5 次 widget 重绘
- `ensureWidgetAnimation()` 在有 running job 时启动 `setInterval`，每 80ms 调用 `ctx.ui.requestRender()`
- 8 个并行 subagent 都处于 running 状态时，该定时器持续工作

**2. 前台并行执行 onUpdate 无节流 (execution.ts → subagent-executor.ts)**
- 每个 `fireUpdate()` 在每个 JSON event 到达时立即触发 `options.onUpdate()`
- 8 个并行 child process 的 stdout 事件交错触发
- 每个子进程的 `tool_execution_start` / `tool_execution_end` / `message_end` / `tool_result_end` 都会触发 `fireUpdate()`
- 在前台并行模式下，每个子进程的 `onUpdate` 回调会合并所有子进程结果后调用 `input.onUpdate()`
- **这意味着 8 个进程的所有事件被聚合后全部驱动 TUI 渲染**

**3. TUI 最小渲染间隔过短 (pi-tui)**
- `MIN_RENDER_INTERVAL_MS = 16ms` (60fps)
- 对于终端 TUI 来说完全没必要，终端人眼可接受 4-8 fps（125-250ms）
- 60fps 的渲染频率在大量内容变化时导致巨大的 stdout 写入量

**4. 异步 job poller 轮询 (async-job-tracker.ts)**
- `POLL_INTERVAL_MS = 250ms` → 每秒 4 次文件系统读取
- 轮询中调用 `renderWidget()` + `ctx.ui.requestRender()`
- 与 widget 动画定时器叠加 → 实际渲染频率更高

**5. 子进程退出后 stdio 管道阻塞 (post-exit-stdio-guard.ts)**
- `hardMs: 8000` 的硬超时可能在大量并行时导致多个僵尸管道同时等待
- 管道未正确关闭时，Node.js event loop 可能被阻塞

**6. Control config activityTimer (execution.ts)**
- 每 1000ms 的 `activityTimer` 用于监控 activity state
- 8 个并行子进程各自有独立的 activityTimer
- 每个触发时调用 `updateActivityState()` → `fireUpdate()`

### 叠加效果

在最坏情况下：
- Widget 动画: 12.5 renders/s
- 异步 poller: 4 renders/s (如果同时有异步任务)
- 8 个前台子进程的 event-driven onUpdate: 可能达到 50-100+ fireUpdate/s
- Activity timers: 8 timers × 1/s = 8 checks/s

终端 stdout 被大量 ANSI escape 序列淹没，导致：
1. **终端缓冲区溢出** → 无法正常处理滚动事件
2. **事件循环阻塞** → Node.js 主线程忙于渲染，无法响应输入
3. **ANSI 同步输出 `\x1b[?2026h/l` 与滚动冲突** → 差分渲染在大量变化时退化为全量重绘

## Relevant learnings

- `docs/solutions/tooling/subagent-recursion-guard-and-env-concurrency.md` — 并发安全模式
- 无直接相关的 TUI 渲染解决方案

## Scope boundaries

### In scope
1. 降低 widget 动画刷新频率
2. 为前台并行 onUpdate 添加节流（throttle）
3. 调整 TUI 最小渲染间隔（通过 requestRender 频率控制）
4. 优化 control config activityTimer 的触发频率
5. 降低异步 poller 频率
6. 添加子进程数量感知的自适应节流

### Out of scope
- 修改 pi-tui 核心库（这是外部包）
- 修改 pi-coding-agent 框架代码（这是外部包）
- 子进程业务逻辑变更
- 子进程退出流程重构

## Implementation units

### Unit 1: Widget 动画频率优化 + 自适应节流

**Purpose**: 降低 widget 动画刷新频率，从 80ms (12.5fps) 调整到 250ms (4fps)；根据并行子进程数量自适应降频。

**Files**:
- `extensions/subagent/render.ts`

**Steps**:
- [ ] 1. 写测试：验证 `WIDGET_ANIMATION_MS` 默认值和自适应函数的行为
- [ ] 2. 运行测试确认失败 (RED)
- [ ] 3. 将 `WIDGET_ANIMATION_MS` 从 80ms 改为 250ms
- [ ] 4. 新增 `resolveWidgetInterval(runningCount: number): number` 函数：
  - 1-2 个 running: 250ms
  - 3-4 个 running: 400ms
  - 5-6 个 running: 600ms
  - 7+ 个 running: 1000ms
- [ ] 5. 修改 `ensureWidgetAnimation()` 使用自适应间隔
- [ ] 6. 修改 `refreshAnimatedWidget()` 加入时间戳比较，跳过不必要的渲染
- [ ] 7. 运行测试确认通过 (GREEN)
- [ ] 8. 重构：清理旧的硬编码常量

**Verification commands**:
```bash
npx vitest run extensions/subagent/__tests__/render-widget.test.ts
```

**Expected results**: 所有测试通过，widget 动画在高并行时频率自动降低

---

### Unit 2: 前台并行 onUpdate 节流器

**Purpose**: 为前台并行子进程的 `onUpdate` 回调添加基于时间的节流，防止 8 个子进程的事件流导致渲染风暴。

**Files**:
- `extensions/subagent/throttle.ts` (新建)
- `extensions/subagent/execution.ts`
- `extensions/subagent/subagent-executor.ts`

**Steps**:
- [ ] 1. 写测试：验证 `createThrottle()` 的节流行为（首帧立即执行、间隔内丢弃、间隔后补发最新帧）
- [ ] 2. 运行测试确认失败 (RED)
- [ ] 3. 创建 `throttle.ts`，实现 `createThrottle<T extends (...args: any[]) => void>(fn: T, intervalMs: number): T`
  - 首次调用立即执行
  - 在 intervalMs 内的后续调用只保存最新参数，不立即执行
  - intervalMs 到期后，如果有 pending 调用，执行最后一次
  - 提供 `flush()` 方法用于进程结束时立即刷新
  - 提供 `dispose()` 方法清理定时器
- [ ] 4. 运行测试确认通过 (GREEN)
- [ ] 5. 在 `subagent-executor.ts` 的 `runForegroundParallelTasks()` 中，对 `input.onUpdate` 包装节流器：
  ```typescript
  const throttledOnUpdate = input.onUpdate 
    ? createThrottle(input.onUpdate, resolveThrottleInterval(input.tasks.length))
    : undefined;
  ```
- [ ] 6. 新增 `resolveThrottleInterval(taskCount: number): number`：
  - 1 task: 不节流（返回 0 或直接不包装）
  - 2-4 tasks: 200ms
  - 5-8 tasks: 500ms
  - 9+ tasks: 1000ms
- [ ] 7. 确保节流器在 `finally` 块中 flush 和 dispose
- [ ] 8. 在 `execution.ts` 的 `runSingleAttempt` 中对单个子进程的 `fireUpdate` 也加入节流（当外部传入 onUpdate 时）
- [ ] 9. 运行所有测试

**Verification commands**:
```bash
npx vitest run extensions/subagent/__tests__/throttle.test.ts
npx vitest run extensions/subagent/__tests__/subagent-executor.test.ts
```

**Expected results**: 所有测试通过，并行 onUpdate 不再造成渲染风暴

---

### Unit 3: Control Activity Timer 频率优化

**Purpose**: 降低 control config 的 activity 检测频率，从 1000ms 改为根据并行数量自适应。

**Files**:
- `extensions/subagent/execution.ts`

**Steps**:
- [ ] 1. 写测试：验证 activityTimer 间隔的自适应计算
- [ ] 2. 运行测试确认失败 (RED)
- [ ] 3. 将 activityTimer 间隔从硬编码 1000ms 改为自适应：
  - 单个子进程: 2000ms
  - 存在并行场景（通过参数传递并发数）: 3000ms
- [ ] 4. 运行测试确认通过 (GREEN)
- [ ] 5. 确保不影响 needs_attention 检测的及时性（检测阈值是独立配置的）

**Verification commands**:
```bash
npx vitest run extensions/subagent/__tests__/execution-activity.test.ts
```

**Expected results**: 测试通过，activityTimer 在高并发时不加剧渲染压力

---

### Unit 4: 异步 Job Poller 频率优化

**Purpose**: 降低异步 job 状态轮询频率，减少不必要的文件系统读取和 widget 重绘。

**Files**:
- `extensions/subagent/async-job-tracker.ts`
- `extensions/subagent/types.ts`

**Steps**:
- [ ] 1. 写测试：验证 poller 在不同 running job 数量下的行为
- [ ] 2. 运行测试确认失败 (RED)
- [ ] 3. 将 `POLL_INTERVAL_MS` 默认值从 250ms 改为 1000ms
- [ ] 4. 在 poller 循环中加入自适应间隔：
  - 0 个 running: 保持 1000ms（快速检测新 job）
  - 1-2 个 running: 1000ms
  - 3-4 个 running: 1500ms
  - 5+ 个 running: 2000ms
- [ ] 5. 使用 `clearInterval` + `setInterval` 动态调整间隔
- [ ] 6. 运行测试确认通过 (GREEN)
- [ ] 7. 重构：确保 poller 在无 job 时能正确停止

**Verification commands**:
```bash
npx vitest run extensions/subagent/__tests__/async-job-tracker.test.ts
```

**Expected results**: 测试通过，poller 在高并行时频率降低，减少 I/O 和渲染

---

### Unit 5: requestRender 调用优化 + 去重

**Purpose**: 在 subagent extension 层面优化 `requestRender()` 的调用模式，避免重复请求渲染。

**Files**:
- `extensions/subagent/render.ts`
- `extensions/subagent/async-job-tracker.ts`

**Steps**:
- [ ] 1. 写测试：验证 widget 渲染在数据未变化时跳过 `requestRender()`
- [ ] 2. 运行测试确认失败 (RED)
- [ ] 3. 在 `renderWidget()` 中加入内容 hash 比较：
  ```typescript
  const newContent = buildWidgetLines(jobs, ctx.ui.theme);
  // 与上次渲染内容比较，无变化则跳过
  ```
- [ ] 4. 在 `refreshAnimatedWidget()` 中同样加入比较
- [ ] 5. 在 `async-job-tracker.ts` 的 `rerenderWidget` 中加入脏数据标记
- [ ] 6. 运行测试确认通过 (GREEN)

**Verification commands**:
```bash
npx vitest run extensions/subagent/__tests__/render-dedup.test.ts
```

**Expected results**: 无数据变化时 requestRender 不被调用，减少无效渲染

---

### Unit 6: 综合集成测试 + 文档更新

**Purpose**: 验证所有优化在高并行场景下的综合效果。

**Files**:
- `extensions/subagent/__tests__/parallel-render-stress.test.ts` (新建)

**Steps**:
- [ ] 1. 编写压力测试：模拟 8 个并行子进程同时发送事件，验证：
  - onUpdate 实际触发次数被限制在合理范围（不超过 4-8 次/秒）
  - widget 动画间隔自适应降低
  - activityTimer 不产生过度调用
- [ ] 2. 运行测试确认通过
- [ ] 3. 更新 `types.ts` 中的注释文档，说明节流策略
- [ ] 4. 运行全量测试确认无回归

**Verification commands**:
```bash
npx vitest run extensions/subagent/__tests__/parallel-render-stress.test.ts
npx vitest run extensions/subagent/
```

**Expected results**: 所有测试通过，8 并行 subagent 场景下终端不再卡死

## Verification strategy

1. **单元测试**: 每个实现单元的独立测试全部通过
2. **集成压力测试**: 模拟 8 个并行 subagent 的事件流，验证渲染频率不超过 8 次/秒
3. **手动验证**: 实际运行 8 个并行 subagent，确认终端可正常滚动
4. **回归测试**: 确保 subagent 的功能（同步、异步、chain、parallel）不受影响

## 性能优化总结

| 组件 | 优化前 | 优化后 | 改善幅度 |
|------|--------|--------|----------|
| Widget 动画 | 80ms (12.5/s) | 250-1000ms 自适应 (1-4/s) | 3-12x 降频 |
| 并行 onUpdate | 无节流 (50-100+/s) | 200-1000ms 节流 (1-5/s) | 10-100x 降频 |
| Activity Timer | 1000ms × N 进程 | 2000-3000ms 共享 | 2-3x 降频 |
| Async Poller | 250ms (4/s) | 1000-2000ms 自适应 (0.5-1/s) | 4-8x 降频 |
| Render 去重 | 每次都触发 | 内容变化才触发 | 消除无效渲染 |
