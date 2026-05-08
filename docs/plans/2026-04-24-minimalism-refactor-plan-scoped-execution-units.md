# 极简化重构执行清单（缩范围版）

> 日期：2026-04-24  
> 关联计划：`docs/plans/2026-04-24-minimalism-refactor-plan-scoped.md`  
> 目标：只处理用户默认心智、重复入口、README 过长这 3 类用户可见问题，不在本轮扩展到状态模型重构与 token 优化。

---

## 一、执行原则

1. **只做用户可见面的减法**
   - 本轮只碰主入口、主叙事、README 暴露面
   - 不扩展到内部架构治理

2. **先收入口，再改说明**
   - 先确定 `08-status` / `06-next` 的关系
   - 再修改 README / README_CN，避免反复返工

3. **兼容优先于激进删除**
   - 若 `06-next` 需要保留，先降级为兼容入口
   - 避免一轮内引入过强断裂

4. **禁止新增概念**
   - 不新增新的总控 skill
   - 不新增新的“替代入口”

---

## 二、推荐执行顺序

1. Unit 01：收口 `06-next` → `08-status`
2. Unit 02：弱化 `07-worktree`
3. Unit 03：下沉 `09-help`
4. Unit 04：README / README_CN 瘦身
5. Unit 05：回归检查与结果记录

---

## 三、Implementation Units

## Unit 01：收口 `06-next` → `08-status`

### 目标
让 `08-status` 成为默认的“状态 + 下一步”统一入口，消除重复心智。

### 修改文件
- `skills/06-next/SKILL.md`
- `skills/08-status/SKILL.md`
- `README.md`
- `README_CN.md`

### 动作
- 将 `06-next` 的主职责下沉到 `08-status`
- 调整 `08-status` 文案，明确其负责：
  - 扫描当前 workflow 状态
  - 推荐单一最佳下一步 skill
- 调整 `06-next`：
  - 如保留，则改为兼容入口/轻提示入口
  - 明确主入口已经是 `08-status`
- README / README_CN 不再把 `06-next` 作为主路径强调

### 完成标准
- 用户看到 `08-status` 即可理解其包含“看状态 + 下一步建议”
- README 首页不再并列突出 `06-next`
- `06-next` 不再形成独立主心智

### 验证
- 搜索 README / README_CN / skills 中 `06-next` 提法，确认已降级
- 检查 `08-status` 文案是否明确承担下一步推荐职责

---

## Unit 02：弱化 `07-worktree`

### 目标
把 `07-worktree` 从默认工作流中后移，标记为高级工程能力。

### 修改文件
- `skills/07-worktree/SKILL.md`
- `README.md`
- `README_CN.md`

### 动作
- 在 `07-worktree` 中补充定位：advanced / optional
- 删除 README 首页对 worktree 的主推叙事
- 如 README 仍需提及，只保留一行：复杂/隔离开发时可选使用

### 完成标准
- 首页主流程不要求理解 `07-worktree`
- 新用户只看首页也不会误以为 worktree 是默认必经步骤

### 验证
- README 首页只突出主 5 步循环
- `07-worktree` 仅出现在高级能力或附加说明区域

---

## Unit 03：下沉 `09-help`

### 目标
把“解释工作流”的能力移到文档层，不再占据默认技能心智。

### 修改文件
- `skills/09-help/SKILL.md`
- `README.md`
- `README_CN.md`

### 动作
- 调整 `09-help` 定位：文档型/辅助型入口
- 把必要的工作流解释迁移到 README 的“如何开始”短段落
- 删除 README 首页对 `09-help` 的主路径强调

### 完成标准
- 新用户不依赖 `09-help` 也能理解从哪里开始
- `09-help` 不再与主技能并列形成入口竞争

### 验证
- README 首页可以独立解释“先 brainstorm / 再 plan / 再 work / 再 review / 再 learn”
- `09-help` 只出现在补充说明中

---

## Unit 04：README / README_CN 瘦身

### 目标
把首页改成短入口，而不是全量总册。

### 修改文件
- `README.md`
- `README_CN.md`

### 动作
- 首页只保留：
  1. super-pi 是什么
  2. 默认 5 个主 skill
  3. 最短使用路径
  4. `08-status` 统一入口说明
  5. 高级能力一行提示
  6. 详细文档链接
- 后移或删除：
  - 过长 tools 总表
  - 非主路径 skills 大段介绍
  - 历史演进型长内容
  - 重复解释主流程的段落

### 完成标准
- README / README_CN 首页明显变短
- 新用户能快速看懂默认工作流
- 技能和工具暴露面明显收缩

### 验证
- 人工检查 README 首页长度与层级
- 搜索是否仍存在对 `06-next` / `07-worktree` / `09-help` 的过度强调

---

## Unit 05：回归检查与结果记录

### 目标
确认本轮减法没有引入新的入口混乱，并记录结果。

### 修改文件
- `docs/reports/2026-04-24-minimalism-refactor-scoped-results.md`（新建）

### 动作
- 总结本轮实际改动
- 记录：
  - 哪些入口被收口
  - 哪些能力被后移
  - README 首页缩减结果
  - 哪些事项被明确延后

### 完成标准
- 有一份清晰结果文档，说明本轮只做了什么、没做什么

### 验证
- 结果文档存在
- 内容能支撑后续是否继续做 Phase 2 内部优化的判断

---

## 四、不纳入本轮的事项

以下内容明确不做：

1. 状态模型统一重构
   - `workflow_state`
   - `session_checkpoint`
   - `context_handoff`
   - `session_history`

2. 全量 tool schema description 压缩
   - `extensions/ce-core/index.ts` token 优化延后

3. 正式 Core / Optional tools 架构治理
   - 本轮只做 README 层轻量弱化

4. 历史文档全面同步清洗
   - 旧报告、旧分析保留历史上下文

---

## 五、验收标准

本轮完成后，应满足：

1. 默认主心智收缩到 5 个主 skill
2. `08-status` 成为唯一默认状态/下一步入口
3. `07-worktree` 成为高级可选能力
4. `09-help` 不再作为默认入口竞争者
5. README / README_CN 首页显著变短，且更清楚

---

## 六、完成后再决定的下一步

若本轮效果明显，再复评以下问题：

1. 是否继续做状态模型边界收口
2. 是否单独立项做 token 固定成本优化
3. 是否为 tools 做正式的 core/optional 分层文档
4. 是否需要清理历史文档中的重复叙事
