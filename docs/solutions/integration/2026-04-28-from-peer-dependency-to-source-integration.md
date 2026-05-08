---
title: From Peer Dependency Delegation to Source Integration
category: integration
severity: high
tags: [peer-dependency, source-integration, extension, subagent, package-merge, slash-commands, single-package, pi-subagents]
applies_when:
  - a peer dependency causes poor user experience (multi-step install, false warnings)
  - merging a dependency's source into the host package for single-package delivery
  - trimming slash commands from an integrated extension
  - migrating from dependency detection to built-in capability
---

# Problem

super-pi v0.21.0 used `peerDependencies` to delegate subagent capabilities to the `pi-subagents` package. This caused two issues:

1. **False alarm**: `isPiSubagentsInstalled()` checked `~/.pi/agent/extensions/subagent/` (git clone path), but `pi install npm:pi-subagents` installs to global node_modules. The warning always fired.
2. **Multi-step install**: Users needed `pi install npm:@leing2021/super-pi` + `pi install npm:pi-subagents`, with a red warning between steps.

# Context

This pattern emerged after v0.21.0's delegation approach (`docs/solutions/integration/resolve-extension-tool-name-conflicts-by-delegation.md`). While delegation solved tool name conflicts, it introduced UX regressions. The decision was made to go further: absorb pi-subagents source code entirely.

Three approaches were evaluated:
- **A. Fix detection only** — patch the path check, still two packages
- **B. Source integration** — copy all .ts files, single package
- **C. Wrapper package** — thin wrapper that installs both

Approach B was chosen for complete control and single-command install.

# Solution

## 1. Copy source files (not package reference)

Copy all `.ts` files, `agents/`, `prompts/`, `skills/` from the dependency into `extensions/subagent/`. Keep relative import paths intact — since all files are co-located, `./agents.ts` references work without changes.

**Key insight**: pi-subagents uses `import.meta.url` for `BUILTIN_AGENTS_DIR` discovery. Moving files to `extensions/subagent/` automatically resolves to the correct path.

```bash
# Copy all .ts files (excluding install.mjs, package.json, etc.)
find /path/to/pi-subagents/ -maxdepth 1 -name "*.ts" -exec cp {} extensions/subagent/ \;
cp -r pi-subagents/agents/ extensions/subagent/agents/
cp -r pi-subagents/prompts/ extensions/subagent/prompts/
```

## 2. Move dependencies from peerDeps to deps

Move the dependency's non-peer dependencies (only `typebox` in this case) from `peerDependencies` to `dependencies`:

```json
{
  "peerDependencies": {
    "@mariozechner/pi-coding-agent": "*"
  },
  "dependencies": {
    "typebox": "^1.1.24"
  }
}
```

Remove the integrated package from `peerDependencies` entirely.

## 3. Register in Pi manifest

Add the new extension, agents, and prompts to `package.json`'s `pi` section:

```json
{
  "pi": {
    "extensions": ["./extensions", "./extensions/super-pi-extension", "./extensions/subagent"],
    "agents": ["./extensions/super-pi-extension/agents", "./extensions/subagent/agents"],
    "prompts": ["./extensions/subagent/prompts"]
  }
}
```

## 4. Remove host's detection/installation logic

Delete functions that detect or auto-install the former dependency:
- `isPiSubagentsInstalled()` — path-based detection
- `tryAutoInstallPiSubagents()` — auto-install via `execSync`
- `formatInstallInstructions()` — UI warning banner
- `execSync` import from `node:child_process`

## 5. Trim slash commands

Keep only commands that the host package needs:
- **Keep**: `/agents` (Agent Manager TUI), `/subagents-status`, `/subagents-doctor`, `Ctrl+Shift+A`
- **Remove**: `/run`, `/chain`, `/run-chain`, `/parallel` (host invokes via subagent tool, not slash)

When trimming, also remove helper functions that only the removed commands use (`parseAgentArgs`, `parseInlineConfig`, `extractExecutionFlags`, etc.), but keep functions used by retained commands (`openAgentManager`, `runSlashSubagent`, etc.).

**Important**: When inlining helper logic (like `mapSavedChainSteps`), pay attention to field name differences between source and target interfaces (e.g., `ChainStepConfig.skills` → `SubagentParamsLike.skill`).

## 6. Add copyright headers

Add attribution to all copied files:

```
// Based on pi-subagents by Nico Bailon (https://github.com/nicobailon/pi-subagents)
// MIT License
```

# Why this works

1. **Single package**: Users install once, get everything. No detection logic needed.
2. **Import paths intact**: Co-locating files preserves relative imports.
3. **`import.meta.url` self-resolves**: The dependency's agent discovery uses `import.meta.url` to find agents relative to `agents.ts`. Moving the file tree preserves this behavior.
4. **No runtime changes**: The integrated code runs identically — same functions, same execution paths.

# Prevention

- **Avoid peer dependency delegation for user-facing packages** — if the host directly calls the dependency's features in its own UX (slash commands, tool registration, agent loading), source integration provides better control.
- **Test detection logic paths** — if you must detect a dependency, test the detection against actual install methods (`pi install npm:`, git clone, local link) to avoid false negatives.
- **When integrating source code, trim aggressively** — only keep what the host needs. Slash commands are a prime target: the host already has its own invocation mechanism (tools, skills).

## Cross-reference

- Predecessor: `docs/solutions/integration/resolve-extension-tool-name-conflicts-by-delegation.md` (v0.21.0 delegation approach)
- This supersedes the delegation approach for this specific case, but the delegation pattern itself remains valid when you need loose coupling between packages.
