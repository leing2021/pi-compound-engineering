# Requirements

## Problem

CE skill executions leave no persistent history. Each session starts from scratch. There is no way to query past brainstorm/plan/work/review executions or their outcomes.

## Goals

- A `session_history` tool that records and queries CE skill execution history
- All CE skill executions are logged to `.context/compound-engineering/history/`
- Operations: `record` (log an execution), `query` (search by skill/date/artifact), `latest` (most recent per skill)
- Update `ce-status` and `ce-next` to leverage history

## Non-goals

- No external database
- No history cleanup/TTL
- No changes to other skills beyond ce-status/ce-next

## Success criteria

- [ ] `session_history` can record executions
- [ ] `session_history` can query by skill name
- [ ] `session_history` can return latest per skill
- [ ] `ce-status` mentions `session_history`
- [ ] `ce-next` mentions `session_history`
- [ ] All existing tests pass
