---
title: "发版 changelog 空升级陷阱：版本号变了但内容没变"
category: workflow
severity: high
tags:
  - changelog
  - release
  - versioning
  - semver
  - git
  - README
  - consistency
applies_when:
  - "发版 commit 只改了版本号，没有新增 changelog 条目"
  - "新版本的 changelog 内容和上一版完全相同（条目被吞掉）"
  - "chore(release) commit 的 diff 只含版本号替换"
  - "版本号递增但无功能变更支撑"
  - "README 和 README_CN 的 changelog 需要同步"
---

# Problem

发版时只修改了 `package.json` 的 `version` 字段和 README 中的版本号（如 `0.19.6` → `0.19.7`），但 **changelog 条目没有新增**，而是直接把旧条目的版本号改掉。结果是：

1. **旧版本 changelog 被吞**：0.19.6 的条目消失了（被重命名为 0.19.7）
2. **新版本内容为空**：0.19.7 的 changelog 内容和 0.19.6 完全一样，没有新功能记录
3. **用户困惑**：查 changelog 时找不到 0.19.6，且 0.19.7 描述的功能其实是上个版本做的

典型 diff 特征：

```diff
-### 0.19.6 — some feature
+### 0.19.7 — some feature
```

只改了版本号，内容行一字未动。

# Context

在 `super-pi` 项目中，`v0.19.7` 发布时出现了这个问题：

- commit `37e4e2b` 的 diff 只有 3 行版本号替换（`README.md`、`README_CN.md`、`package.json`）
- changelog 中 `0.19.6` 条目被改为 `0.19.7`，0.19.6 永久消失
- 在此 commit 和上一个功能 commit 之间**零代码差异**
- 与 [atomic-versioning-protocol.md](../git-workflow/atomic-versioning-protocol.md) 相关但不同：原子版本解决了 tag/commit 不一致，本问题解决 **changelog 内容完整性**

# Solution

## 发版前检查清单

每次发版 commit 前必须验证：

```bash
# 1. 确认有实际代码变更支撑新版本
git log --oneline <上一版 tag>..HEAD
# 如果只返回本 commit → 没有功能变更，不应该发版

# 2. 确认 changelog 有新增条目（不是替换）
git diff -- README.md | grep "^+###"
# 应该看到新增的版本标题，而不是删除旧行+新增同名行

# 3. 确认旧版本条目仍存在
grep "^### 0.19.6" README.md
# 如果无输出 → 旧条目被吞了
```

## 正确的 changelog 添加模式

```markdown
<!-- ✅ 正确：新增条目，保留旧条目 -->
### 0.19.7 — fix: extension loading error
- Fixed ...

### 0.19.6 — pi-subagents integration extension
- New `super-pi-extension`: ...
```

```markdown
<!-- ❌ 错误：替换旧条目版本号 -->
### 0.19.7 — pi-subagents integration extension   ← 内容是 0.19.6 的
- New `super-pi-extension`: ...

### 0.19.5 — ...                                  ← 0.19.6 消失了
```

## 恢复已吞掉的条目

如果已经发布了一个空升级版本：

1. 恢复被吞条目（把被改名的条目改回原版本号）
2. 新增一个条目记录实际变更内容（如果有）
3. 在空版本和正确版本之间加一个 Note 标注

```markdown
### 0.20.0 — Extension API migration + v0.19.7 rework
- Migrated ...
- Restored v0.19.6 changelog entry overwritten by v0.19.7.

### 0.19.6 — pi-subagents integration extension
- ...（恢复的原始内容）

### 0.19.5 — ...

> **Note:** v0.19.7 was a broken release — version bump with no code change, changelog entry for v0.19.6 overwritten. v0.20.0 supersedes it.
```

## 中英文同步

`README.md` 和 `README_CN.md` 的 changelog 必须同步操作：
- 两个文件各自有独立的版本标题行
- `grep` 验证时必须同时检查两边

```bash
grep "^### 0.20.0" README.md README_CN.md
# 应该返回两行
```

# Why this works

Changelog 是版本历史的唯一可读记录。每个版本的条目代表一个时间点的功能快照。如果把旧条目重命名而不是新增：
- **历史断裂**：某个版本的功能永远找不到对应的 changelog 条目
- **语义混乱**：用户会认为 0.19.7 的功能是 "pi-subagents integration"，实际上那是 0.19.6 的功能
- **tag 不可信**：`git tag v0.19.7` 指向的 commit 没有对应功能代码，导致回溯困难

# Prevention

1. **发版前 diff 检查**：`git diff` 应该包含 `+###` 新增行，而非 `-### 0.X.Y` + `+### 0.X.Z` 替换行
2. **版本间必须有功能 commit**：如果没有 `feat:` / `fix:` commit 夹在两个版本 tag 之间，不应该发版
3. **使用 `npm version` 自动化**：结合 [atomic-versioning-protocol.md](../git-workflow/atomic-versioning-protocol.md)，减少手动操作出错
4. **双文件同步验证**：修改 changelog 后立即 `grep` 两个 README 文件

# Related

- [atomic-versioning-protocol.md](../git-workflow/atomic-versioning-protocol.md) — npm version 原子操作 + tag 一致性
- [2026-04-27-pi-extension-factory-function-format.md](../tooling/2026-04-27-pi-extension-factory-function-format.md) — 本次发版修复的核心 extension 问题
