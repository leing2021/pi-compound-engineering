---
title: Store runtime handoff paths as repo-relative paths
category: architecture
severity: low
tags:
  - context-handoff
  - handoff-lite
  - repo-relative
  - path-portability
  - context-state
applies_when:
  - Persisting runtime workflow state under .context/compound-engineering/
  - Returning handoff or checkpoint paths from extension tools
  - Building copyable new-session prompts from saved state
---

# Problem

Runtime context tools can accidentally persist absolute local filesystem paths such as `/Users/.../.context/compound-engineering/handoffs/latest.md`.

That makes handoff-lite state less portable, leaks machine-specific details into copyable prompts, and conflicts with status-lite docs that expect paths like `.context/compound-engineering/handoffs/latest.md`.

# Context

This surfaced during review of the token/context workflow optimization. The new `context_handoff` tool wrote the correct files, but returned and stored absolute `latestHandoffPath` and dated handoff paths in `context-state.json`.

The implementation docs and examples all used repo-relative paths, and future sessions are expected to continue by reading paths relative to the repo root.

# Solution

Use two path layers:

1. **Filesystem operations** use absolute paths created from `repoRoot`.
2. **Persisted state and public tool results** use repo-relative paths.

Recommended helpers:

```ts
function toRepoRelative(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath)
}

function resolveRepoPath(repoRoot: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath)
}
```

When saving, write files with absolute paths but store/return relative paths. When loading, resolve either a relative or absolute input path for backward compatibility.

# Why this works

Repo-relative paths are stable across machines, worktrees, and new sessions as long as the repo root is known. They also keep handoff prompts shorter and match the Compound Engineering artifact conventions.

Resolving both relative and absolute paths on load preserves compatibility with older state files or explicit user input.

# Prevention

- For any tool receiving `repoRoot`, treat persisted artifact references as repo-relative unless there is a specific external reason not to.
- Add tests that assert returned paths can be joined with `repoRoot` to locate the actual file.
- In reviews, check `.context/` state and handoff prompts for accidental machine-specific absolute paths.
