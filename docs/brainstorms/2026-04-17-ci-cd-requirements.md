# Requirements

## Problem

super-pi has no CI/CD. Tests and publishing rely entirely on manual execution in a local environment. This means:
- No automated test verification on push or PR
- No guard against publishing broken packages
- No consistent release process tied to version tags

## Goals

- Automated test runs on every push and PR to `main`
- Automated npm publish triggered by pushing a version tag (`v*`)
- Clear separation between test and publish workflows
- Minimal, maintainable GitHub Actions configuration

## Non-goals

- No automated version bumping (version is set manually)
- No changelog generation
- No cross-platform test matrix (Bun on a single OS is sufficient for now)
- No npm provenance or signing in this iteration

## Approach options

### A: Two separate workflows (recommended)

- `test.yml` — runs on push/PR to main, executes `bun test`
- `publish.yml` — runs on tag push `v*`, runs tests then `npm publish`

Pros: clean separation, easy to read, each workflow does one thing.
Cons: two files to maintain.

### B: Single workflow with conditional jobs

One `ci.yml` with `test` job always running and `publish` job gated on tag.

Pros: single file.
Cons: harder to read, conditional logic adds complexity.

### C: Two workflows + publish dry-run on PR

Same as A but adds `npm publish --dry-run` on every PR.

Pros: extra safety net before merge.
Cons: slightly heavier, dry-run already passes locally before merge.

## Recommended direction

**Approach A**: Two separate workflow files. `test.yml` for continuous test verification, `publish.yml` for tag-triggered npm publish. Simple, clear, and follows GitHub Actions best practices for package publishing.

## Success criteria

- [ ] Pushing to main or opening a PR triggers `bun test`
- [ ] Pushing a `v*` tag triggers `bun test` followed by `npm publish`
- [ ] Both workflows run on GitHub Actions with Bun
- [ ] No secrets leakage; npm token stored as GitHub secret `NPM_TOKEN`
- [ ] Workflows are documented in README
