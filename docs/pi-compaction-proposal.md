# Pi Compaction 策略优化提案

## 现状

当前 pi compaction 机制将对话历史压缩为结构化摘要，但存在以下问题：

### 问题 1：Skill 内联块被当成普通消息压缩

当用户通过 `/skill:xxx` 调用技能时，完整 SKILL.md（约 500-2500 tokens）被包装成 `<skill>` XML 块注入对话历史。在 compaction 触发时，它们被当成普通消息交给 LLM 摘要压缩。

**后果**：
- LLM 摘要时倾向于压缩/丢弃详细的技能指令
- 压缩后的摘要可能丢失关键决策规则（如 TDD gates）
- 后续轮次缺少完整的技能指令，行为偏离预期

### 问题 2：多次压缩导致技能信息丢失

一次完整 CE 流程内联 5 个 skill，约 4,000 tokens。如果对话发生多次 compaction，这些技能块被反复摘要，细节逐渐丢失。

### 问题 3：Compaction 摘要未显式记录技能状态

当前摘要模板不包含技能清单，后续无法快速识别需要重新加载哪些技能。

---

## 解决方案

### 方案 A：Compaction 时识别并保留 Skill 块（核心）

**修改位置**：`pi-coding-agent/dist/core/compaction/compaction.js`

**修改内容**：在 `prepareCompaction()` 中，compaction 摘要前识别 `<skill>` 块，替换为元信息。

```javascript
// 在 utils.js 或 compaction.js 中添加

/**
 * 检查消息内容是否包含 <skill> XML 块
 */
function isSkillBlock(message) {
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
 * 从 skill 块中提取元信息
 * 输入: <skill name="xxx" location="...">...</skill>
 * 输出: <skill name="xxx" location="...">[内容已压缩]</skill>
 */
function compressSkillBlock(message) {
  // 提取 name 和 location
  const nameMatch = message.content.match(/<skill name="([^"]+)"/);
  const locMatch = message.content.match(/location="([^"]+)"/);
  if (!nameMatch || !locMatch) return message;
  
  // 用元信息替换完整内容
  const compressed = `<skill name="${nameMatch[1]}" location="${locMatch[1]}">[skill content compressed - use /skill:${nameMatch[1]} to reload]</skill>`;
  
  return {
    ...message,
    content: typeof message.content === "string" 
      ? compressed 
      : [{ type: "text", text: compressed }]
  };
}

/**
 * 提取并压缩消息中的 skill 块
 */
function extractAndCompressSkillBlocks(messages) {
  const skillMeta = [];  // 收集 skill 元信息用于摘要
  
  const compressed = messages.map(msg => {
    if (!isSkillBlock(msg)) return msg;
    
    // 提取 name
    const nameMatch = (typeof msg.content === "string" ? msg.content : msg.content[0]?.text || "").match(/<skill name="([^"]+)"/);
    if (nameMatch) {
      skillMeta.push(nameMatch[1]);
    }
    
    return compressSkillBlock(msg);
  });
  
  return { compressed, skillMeta };
}
```

**修改 `SUMMARIZATION_PROMPT`**：在摘要模板中增加技能清单部分。

```javascript
const SUMMARIZATION_PROMPT = `...existing prompt...

## Active Skills Used
[List of skills invoked in this conversation, if any]
[Note: Full skill content was compressed - reload with /skill:<name> if needed]

Keep each section concise...`;
```

### 方案 B：Compaction 摘要模板增加 Active Skills 部分

**修改位置**：`pi-coding-agent/dist/core/compaction/compaction.js`

**修改内容**：`SUMMARIZATION_PROMPT` 和 `UPDATE_SUMMARIZATION_PROMPT` 增加：

```javascript
const SUMMARIZATION_PROMPT = `The messages above are a conversation to summarize...

## Active Skills
[Skills invoked: skill-name-1, skill-name-2]
[Reload with: /skill:skill-name-1, /skill:skill-name-2]

Use this EXACT format:
## Goal
...
`;
```

---

## 影响评估

| 指标 | 当前 | 方案 A+B 后 |
|------|------|-------------|
| 5 skill 内联 token | ~4,000 | ~500 |
| Compaction 摘要 | 不含技能清单 | 显式记录技能 |
| Skill 可恢复性 | 依赖摘要质量 | 显式元信息 |
| 实现复杂度 | — | 中等 |
| 风险 | — | 低 |

---

## 测试验证

1. 单元测试：`isSkillBlock()`, `compressSkillBlock()` 正确识别和压缩
2. 集成测试：compaction 后 `/skill:xxx` 能重新加载完整内容
3. 端到端测试：长对话（多次 compaction）行为正确

---

## 参考代码位置

- `pi-coding-agent/dist/core/compaction/compaction.js` - `SUMMARIZATION_PROMPT`, `prepareCompaction()`
- `pi-coding-agent/dist/core/compaction/utils.js` - `serializeConversation()`

---

## 上游贡献路径

由于 pi-coding-agent 是 npm 包（只有 `dist/`，无源文件），上游贡献需要：

1. **提 Issue**：描述问题和解决方案，等待 maintainer 回应
2. **Fork 并 PR**：
   - 需要找到源项目位置（可能不是 npm 上的位置）
   - 或在 forked 版本中实现，等待 merge

**当前限制**：直接修改 `dist/` 会在下次 `npm update` 时丢失。

---

## 附：本地 workaround（不依赖上游）

在等待上游实现期间，可以通过以下方式缓解问题：

### Workaround 1：减少同时内联的 skill 数量

对于 CE 流程，不要一次性加载所有 5 个 skill，而是在每个阶段只加载当前需要的：

```
Phase 1: 加载 01-brainstorm (内联) → 执行 → compaction
Phase 2: 加载 02-plan (内联) → 执行 → compaction
...
```

每次 compaction 只压缩 1 个 skill（约 500-800 tokens），而不是 5 个。

### Workaround 2：使用 `disableModelInvocation=true`

对于不常用的 skill，设置 `disableModelInvocation=true`，这样 skill 只在显式 `/skill:xxx` 调用时加载，不会在 system prompt 中列出。

### Workaround 3：调整 compaction 参数

```json
{
  "compaction": {
    "reserveTokens": 16384,  // 减小，触发更频繁但每次压缩量小
    "keepRecentTokens": 10000  // 减小，保留更多近期上下文
  }
}
```

更大的 `reserveTokens` 意味着更晚触发 compaction，但每次压缩的对话量更大，skill 信息丢失更多。更小的 `keepRecentTokens` 意味着保留的对话更少。

---

## 当前用户配置

```json
{
  "compaction": {
    "reserveTokens": 32768,
    "keepRecentTokens": 30000
  }
}
```
