# Issue: Compaction doesn't handle `<skill>` blocks specially — skill instructions lost during summarization

## Problem

When users invoke skills via `/skill:xxx`, the `_expandSkillCommand()` method in `agent-session.ts` reads the full SKILL.md file and injects it into the conversation as a `<skill>` XML block:

```
<skill name="01-brainstorm" location="/path/to/SKILL.md">
References are relative to /path/to/skill/dir.

[Full SKILL.md content, ~500-2500 tokens depending on skill]
</skill>
```

These skill blocks become part of the conversation history. When compaction triggers, they're treated as regular messages and passed to the LLM for summarization.

**Consequences:**
1. LLM summarization tends to compress or drop detailed skill instructions
2. TDD gates, hard constraints, and other critical rules may be lost
3. After compaction, the model may not follow skill rules correctly
4. For workflows that invoke multiple skills (e.g., CE workflow: brainstorm → plan → work → review → learn), skill blocks accumulate (~4,000 tokens for 5 skills)

## Current Behavior

The `findCutPoint()` function in `compaction.ts` walks backwards from the newest messages, accumulating estimated message sizes until `keepRecentTokens` is reached. Skill blocks are treated identically to regular user/assistant messages with no special handling.

## Proposed Solution

### Phase 1: Identify and compress skill blocks during compaction preparation

Add `extractAndCompressSkillBlocks()` to `compaction.ts`:

```typescript
/**
 * Check if a message contains a <skill> XML block
 */
function isSkillBlock(message: AgentMessage): boolean {
  if (message.role !== "user") return false;
  const content = message.content;
  if (typeof content === "string") {
    return content.includes("<skill name=");
  }
  if (Array.isArray(content)) {
    return content.some(block => 
      block.type === "text" && block.text.includes("<skill name=")
    );
  }
  return false;
}

/**
 * Compress a skill block to just its metadata
 * Input:  <skill name="xxx" location="...">...</skill>
 * Output: <skill name="xxx" location="...">[compressed]</skill>
 */
function compressSkillBlock(message: AgentMessage): { compressed: AgentMessage; skillNames: string[] } {
  const text = typeof message.content === "string" 
    ? message.content 
    : message.content.find(b => b.type === "text")?.text || "";
  
  const skillNames: string[] = [];
  const skillMatches = text.matchAll(/<skill name="([^"]+)"/g);
  for (const match of skillMatches) {
    skillNames.push(match[1]);
  }
  
  const compressed = text.replace(
    /<skill name="([^"]+)" location="([^"]+)">[\s\S]*?<\/skill>/g,
    '<skill name="$1" location="$2">[skill content compressed — use /skill:$1 to reload]</skill>'
  );
  
  const compressedMessage = {
    ...message,
    content: typeof message.content === "string"
      ? compressed
      : [{ type: "text" as const, text: compressed }]
  };
  
  return { compressed: compressedMessage, skillNames };
}
```

### Phase 2: Update summarization prompts to include active skills

Modify `SUMMARIZATION_PROMPT` to include a section for invoked skills:

```typescript
const SUMMARIZATION_PROMPT = `The messages above are a conversation to summarize...

## Skills Invoked
[List of skill names invoked in this conversation, if any]
[Note: Full skill content was compressed — reload with /skill:<name> if needed]

Use this EXACT format:
## Goal
[What is the user trying to accomplish?]
...
`;
```

## Impact

| Metric | Before | After |
|--------|--------|-------|
| 5 skill blocks token cost | ~4,000 | ~300 |
| Summarization quality | Skill rules may be lost | Skill names explicitly recorded |
| Skill recovery after compaction | Depends on LLM summary quality | Explicit `/skill:xxx` reload |

## Testing

1. Unit tests for `isSkillBlock()` and `compressSkillBlock()`
2. Integration test: compaction followed by `/skill:xxx` reload produces correct content
3. End-to-end: long conversation with multiple compactions maintains correct behavior

## Related Code

- `agent-session.ts` — `_expandSkillCommand()` injects skill blocks
- `compaction.ts` — `prepareCompaction()`, `SUMMARIZATION_PROMPT`
- `utils.ts` — `serializeConversation()`

---

Would you accept a PR implementing this? Happy to work on it.
