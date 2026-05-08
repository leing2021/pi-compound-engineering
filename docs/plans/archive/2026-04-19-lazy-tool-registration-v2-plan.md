# Pi Context Optimization: before_agent_start Lazy Tool Registration

## Background

Previous attempt documented in `pi-context-optimization-lazy-registration.md` failed due to timing issues with `input` event hook. This solution re-analyzes the timing and proposes a correct approach using `before_agent_start`.

## Root Cause Re-Analysis

### The timing is actually safe

The `prompt()` method in `agent-session.js` has this sequence:

```
1. emitInput()              ← NOT suitable (too early, skill not expanded)
2. _expandSkillCommand()    ← /skill:name content becomes part of user message
3. emitBeforeAgentStart()   ← 🎯 CORRECT HOOK (after skill expansion, before LLM)
4. agent.prompt()           ← createContextSnapshot() captures tools
5. runAgentLoop()           ← LLM processes with correct tools
```

### Why `before_agent_start` works

1. **After skill expansion**: The expanded `/skill:03-work` content is in the prompt text
2. **Before createContextSnapshot()**: Tools registered here ARE in the snapshot
3. **System prompt consistency**: `refreshTools()` → `setActiveToolsByName()` → `_rebuildSystemPrompt()` keeps tools and prompt in sync
4. **In the same turn**: The LLM sees both the skill content AND the tools in one request

### Why `input` event was the wrong hook (previous failure)

The previous attempt likely used the `input` event which:
- Fires before `_expandSkillCommand()` (skill content not yet available for keyword detection)
- May have had implementation bugs in the refresh+activate chain

## Proposed Solution

### Strategy: Two-mode extension with `before_agent_start` trigger

**Mode 1: Minimal** (default) — No CE extension tools loaded
- 4 built-in tools only: read, bash, edit, write
- System prompt has no CE tool promptSnippets
- Saves ~2,195 tokens tool schema + ~660 tokens system prompt per request

**Mode 2: CE Active** — Triggered by CE-related input
- All 13 CE tools loaded and active
- System prompt includes CE tool promptSnippets
- Persists for the rest of the session

### Trigger Detection

In `before_agent_start`, scan the prompt text for CE patterns:

```typescript
const CE_TRIGGER_PATTERNS = [
  // Skill commands
  /\/skill:(01|02|03|04|05|06|07|08|09)/,
  /\/skill:(brainstorm|plan|work|review|compound|next|worktree|status|help)/,
  // CE workflow keywords
  /\b(brainstorm|brainstorming)\b.*\b(requirement|idea|concept)\b/i,
  /\b(plan|planning)\b.*\b(implementation|unit|task)\b/i,
  /\b(review|code review)\b/i,
  /\b(compound|compound engineering)\b/i,
  /\b(worktree)\b/i,
  /\b(checkpoint|resume)\b/i,
  /\b(task split|parallel)\b/i,
  /\b(artifact|workflow state)\b/i,
  // Explicit CE commands
  /^\s*\/(brainstorm|plan|work|review|compound|next|status|help|worktree)\b/,
]
```

### Implementation Sketch

```typescript
// ce-core/index.ts

// Store tool definitions without registering
const lazyToolDefs = new Map<string, ToolDef>()
let ceMode = false

export default function ceCoreExtension(pi: ExtensionAPI) {
  // Create tools but DON'T register them yet
  const artifactHelper = createArtifactHelperTool()
  const subagent = createSubagentTool()
  // ... all 13 tools

  // Store for lazy registration
  lazyToolDefs.set('artifact_helper', { tool: artifactHelper, params: artifactHelperParams, execute: ... })
  // ... all 13 tools

  // The trigger hook
  pi.on('before_agent_start', async (event, ctx) => {
    if (ceMode) return // Already active

    const promptText = event.prompt || ''
    if (!isCETrigger(promptText)) return

    // Activate: register all CE tools
    ceMode = true
    registerAllCETools(pi)
    // registerTool internally calls refreshTools which calls setActiveToolsByName
    // which calls _rebuildSystemPrompt → system prompt updated with new tools
  })

  // Keep session_start for footer etc (non-tool features)
  pi.on('session_start', async (_event, ctx) => {
    // Stats footer, etc. (no tool registration)
  })
}

function isCETrigger(text: string): boolean {
  return CE_TRIGGER_PATTERNS.some(p => p.test(text))
}

function registerAllCETools(pi: ExtensionAPI) {
  for (const [name, def] of lazyToolDefs) {
    pi.registerTool({
      name: def.tool.name,
      label: def.tool.label,
      description: def.tool.description,
      parameters: def.params,
      async execute(toolCallId, params, signal, onUpdate, ctx) {
        // delegate to actual tool implementation
      },
    })
  }
  // Note: each pi.registerTool() call internally triggers refreshTools()
  // The last call leaves the registry in the correct state
}
```

### Key Safety Guarantees

1. **No race condition**: `before_agent_start` → `refreshTools()` → `agent.prompt()` are sequential
2. **System prompt consistency**: `refreshTools()` rebuilds system prompt via `_rebuildSystemPrompt()`
3. **Graceful degradation**: If trigger fails, user sees "Tool not found" and can retry
4. **Session persistence**: Once activated, tools stay for the entire session
5. **No breaking changes**: Non-CE sessions never load CE tools

### Verification Steps

Before merging, test these scenarios:

1. **Non-CE session**: Regular coding task → no CE tools in context → ✅ saves tokens
2. **CE trigger**: User types "帮我写个 plan" → tools loaded → LLM can call plan_diff ✅
3. **Skill command**: `/skill:03-work ...` → skill expanded → tools loaded → LLM calls tools ✅
4. **Persistence**: After first trigger, subsequent prompts have CE tools ✅
5. **Compaction**: After compaction, CE tools still available ✅
6. **Multi-tool call**: LLM calls multiple CE tools in one turn ✅

### Expected Impact

| Metric | Before | After (non-CE) | After (CE) |
|--------|--------|----------------|------------|
| Tool schema tokens | ~2,980 | ~785 (built-in only) | ~2,980 |
| System prompt tokens | ~2,137 | ~1,200 (no CE skills/tools) | ~2,137 |
| Fixed overhead | ~5,117 | ~1,985 | ~5,117 |
| Savings per request | — | **~3,132 tokens (61%)** | 0 |

### Open Questions

1. **Should CE skills (01-09) also be hidden in non-CE mode?**
   - Pro: Further reduces system prompt (~1,447 tokens)
   - Con: LLM can't auto-suggest CE skills
   - Recommendation: Keep skills visible (small overhead, enables discoverability)

2. **Should activation be irreversible?**
   - Current proposal: Yes, once activated, stays for session
   - Alternative: Deactivate after N turns of no CE tool usage
   - Recommendation: Keep simple, irreversible is fine

3. **What about subagent/parallel_subagent in non-CE skills?**
   - Some user-level skills might reference these tools
   - Recommendation: Always include subagent + parallel_subagent (most versatile)
   - Or: Add tool detection in skills that need them
