# Requirements

## Problem

`ce-compound` currently writes solution artifacts from a single session's learnings. It cannot identify recurring patterns across multiple sessions/artifacts.

## Goals

- A `pattern_extractor` tool that analyzes artifacts and session history to identify common patterns
- Operations: `extract` (scan artifacts for recurring patterns), `categorize` (group patterns by type)
- Update `ce-compound` SKILL.md to use `pattern_extractor` for smarter solution generation

## Non-goals

- No ML/AI-based pattern detection
- No automatic solution generation
- No changes to other skills

## Success criteria

- [ ] `pattern_extractor` can extract recurring patterns from a set of artifacts
- [ ] `pattern_extractor` can categorize patterns by type
- [ ] `ce-compound` mentions `pattern_extractor`
- [ ] All existing tests pass
