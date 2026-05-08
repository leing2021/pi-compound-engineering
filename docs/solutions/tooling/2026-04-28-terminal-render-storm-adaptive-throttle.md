---
title: "Terminal Render Storm Prevention: Adaptive Throttle & Interval Patterns"
category: tooling
severity: high
tags: [throttle, adaptive-interval, render-storm, terminal-tui, subagent, parallel, dedup, timer-safety, widget-animation, performance]
applies_when:
  - "多个并行子进程或事件源驱动同一个终端 TUI 渲染管道"
  - "setInterval 动画在高并发时导致终端卡死或无法滚动"
  - "需要在 extension 层（而非外部 TUI 库）控制渲染频率"
  - "timer 动态切换间隔时需要避免状态丢失"
  - "onUpdate / requestRender 调用频率过高需要节流"
---

# Problem

当 8 个 subagent 同时并行运行时，终端页面卡住、无法向上滚动。根因是多层次的渲染风暴：

1. **Widget 动画定时器**: 80ms 间隔 (12.5 renders/s)，每个 running job 持续触发
2. **前台并行 onUpdate**: 8 个子进程的 stdout 事件交错，50-100+ fireUpdate/s
3. **Activity timer**: 每个子进程 1000ms 间隔，8 个 = 8 checks/s
4. **Async poller**: 250ms 间隔 (4/s) + 文件系统读取
5. **所有组件叠加**: 理论峰值 ~75-125 renders/s，终端 stdout 被 ANSI escape 序列淹没

# Context

super-pi 的 subagent extension 使用 pi-tui 渲染 widget。pi-tui 和 pi-coding-agent 是外部包，不能修改。所有优化必须在 extension 层完成。

核心约束：
- 不能修改 pi-tui 的 `MIN_RENDER_INTERVAL_MS`
- 不能修改 pi-coding-agent 的 event pipeline
- 优化不能影响 subagent 功能（同步、异步、chain、parallel）

# Solution

三层防御策略，每层独立可测试：

## 1. 自适应间隔 (Adaptive Interval)

```typescript
export function resolveWidgetInterval(runningCount: number): number {
  if (runningCount <= 2) return 250;
  if (runningCount <= 4) return 400;
  if (runningCount <= 6) return 600;
  return 1000;
}
```

应用于所有时间驱动的渲染源：
- Widget 动画: 250ms → 1000ms 自适应
- Async poller: 1000ms → 2000ms 自适应
- Activity timer: 1000ms → 2000-3000ms

**关键设计**: 分档而非线性。线性降频在低并行时效果不明显，分档让每档都有明确的感知差异。

## 2. 事件流节流 (Event Stream Throttle)

```typescript
export function createThrottle<T extends (...args: any[]) => void>(
  fn: T, intervalMs: number,
): T & { flush(): void; dispose(): void } {
  // 首帧立即执行，interval 内合并，尾部补发最新帧
  // flush() 用于进程结束时立即刷新
  // dispose() 用于清理定时器
}
```

前台并行的 onUpdate 回调被 throttle 包装：
- 1 task: 不节流 (0ms)
- 2-4 tasks: 200ms
- 5-8 tasks: 500ms
- 9+ tasks: 1000ms

**关键设计**: 首帧立即执行确保用户感知响应性。`flush()` 在 `finally` 块中调用确保最后一帧不丢失。

## 3. 渲染去重 (Render Dedup)

```typescript
function computeWidgetHash(jobs: AsyncJobState[]): string {
  return jobs.map((j) =>
    `${j.asyncId}:${j.status}:${j.currentTool ?? ""}:${j.currentStep ?? ""}:${j.lastActivityAt ?? 0}:${j.activityState ?? ""}:${j.updatedAt ?? 0}`
  ).join("|");
}
```

在 `renderWidget()` 和 `refreshAnimatedWidget()` 中，先比较 hash，无变化则跳过 `requestRender()`。

**关键设计**: 用业务字段拼接而非 `JSON.stringify`，避免序列化大对象的性能开销。

## 4. Timer 安全切换模式

```typescript
// ❌ 错误: stopWidgetAnimation() 清空所有状态后再递归重建
stopWidgetAnimation();  // 清空 latestWidgetJobs, latestWidgetCtx, hash
ensureWidgetAnimation(); // latestWidgetJobs 为空，interval 计算错误

// ✅ 正确: 分离"停 timer"和"清状态"
function stopAnimationTimer(): void {
  if (widgetTimer) {
    clearInterval(widgetTimer);
    widgetTimer = undefined;
  }
}

// 需要清状态时用完整版
export function stopWidgetAnimation(): void {
  stopAnimationTimer();
  latestWidgetCtx = undefined;
  latestWidgetJobs = [];
  lastWidgetContentHash = "";
  outputActivityCache.clear();
}
```

动态间隔切换时只调 `stopAnimationTimer()`，保留 jobs 数据供新 timer 使用。

# Why this works

1. **终端人眼可接受 4-8 fps** — 将渲染从 60-125/s 降到 ≤8/s，用户无感知但终端不再卡死
2. **自适应分档** — 低并行时保持响应性，高并行时自动降频，无需手动调参
3. **首帧立即执行** — throttle 不引入首帧延迟，用户操作感知无变化
4. **去重消除无效渲染** — 即使 timer 触发，数据未变也不写 stdout
5. **所有优化在 extension 层** — 不修改外部包，升级 pi-tui/pi-coding-agent 不受影响

# Prevention

1. **新增渲染源时**: 必须使用 `resolve*Interval()` 自适应函数，不要硬编码常量
2. **新增 timer 时**: 区分"停 timer"和"清状态"两个操作，动态切换间隔时只用前者
3. **新增 onUpdate 回调时**: 用 `createThrottle` 包装，在 `finally` 中 flush + dispose
4. **测试**: 为每个自适应函数写单元测试，为整体写 stress test 验证总频率 ≤ 8/s
5. **grep 搜索关键词**: `setInterval`, `requestRender`, `onUpdate` — 新增这些时触发自查

## 性能对比

| 组件 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| Widget 动画 | 12.5/s | 1-4/s | 3-12x |
| 并行 onUpdate | 50-100+/s | 1-5/s | 10-100x |
| Activity Timer | 8/s (×8进程) | 0.33/s (共享) | 24x |
| Async Poller | 4/s | 0.5-1/s | 4-8x |
| **总渲染频率** | **~75-125/s** | **≤8/s** | **~15x** |
