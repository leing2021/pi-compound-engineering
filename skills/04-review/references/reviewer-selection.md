# Reviewer selection

Use the `review_router` tool to determine which reviewers to apply based on diff metadata.

## How to use

1. Collect diff stats: files changed, insertions, deletions.
2. Call `review_router` with these inputs.
3. Apply the returned reviewer personas to the review.

## Reviewer personas

All reviewers evaluate changes across five axes: correctness, readability, architecture, security, performance. Base reviewers cover axes 1–3 by default; conditional reviewers add depth on specific axes.

### Base reviewers (always active)

- **correctness-reviewer**: Logical correctness, intended behavior, edge cases.
- **testing-reviewer**: Test coverage, test quality, missing test scenarios.
- **maintainability-reviewer**: Code clarity, naming, structure, duplication.

### Conditional reviewers (routed by `review_router`)

- **security-reviewer**: Triggered when auth, permissions, tokens, sessions, or crypto files change. Reviews for injection, auth bypass, credential leakage.
- **performance-reviewer**: Triggered when query, cache, database, or streaming files change. Reviews for N+1, unnecessary allocation, missing indexes.
- **integration-reviewer**: Triggered when CI/CD, Docker, package.json, or config files change. Reviews for dependency conflicts, build breakage, deployment issues.
- **thoroughness-reviewer**: Triggered for large diffs (5+ files or 300+ lines). Reviews for incomplete refactors, missed callers, inconsistent changes.
