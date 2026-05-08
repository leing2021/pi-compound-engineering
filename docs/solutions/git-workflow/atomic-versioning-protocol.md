---
title: Atomic Versioning and Tagging Protocol for NPM Packages
category: git-workflow
severity: high
tags: [git, npm, versioning, tag, release, automate, workflow-consistency]
applies_when: [releasing new versions of npm packages, updating package.json and git tags simultaneously, ensuring CI/CD release triggers work correctly]
---

# Problem

Manual updates to `package.json` version numbers and Git tags are prone to human error, leading to several issues:
1. **Version Mismatch**: The Git tag (e.g., `v0.18.2`) points to a commit where `package.json` still says `0.18.1`.
2. **NPM Publish Failure**: CI/CD workflows (like GitHub Actions) often check the `package.json` version against the NPM registry. If it hasn't been bumped, the publish step fails or is skipped.
3. **Tracking Difficulty**: It becomes hard to correlate specific releases with the state of the codebase.

# Solution

Use **Atomic Versioning Commands** to synchronize all release artifacts in a single step.

## 1. Use `npm version`

Instead of manually editing files, use the built-in `npm version` command. It performs three actions atomically:
- Bumps the version in `package.json`.
- Commits the change with a standardized message.
- Creates a local Git tag.

```bash
# Recommended command
npm version patch -m "chore: bump version to %s for release"
```

## 2. Atomic Push

Push both the branch and the new tags in one go to ensure the CI/CD trigger and the version-bumped code arrive together.

```bash
git push origin main --tags
```

## 3. Post-Release Verification

When using GitHub Actions for publishing, always verify that the version string in `package.json` was correctly bumped before pushing the tag, as most publish scripts rely on this string to identify the target NPM version.

# Benefits

- **Zero Mismatch**: Guarantees that the code at the tag location has the correct version string.
- **Automation Friendly**: Easily integrated into scripts or AI agent prompts.
- **Cleaner History**: Standardizes commit messages for version bumps.

# Related Solutions
- [tool-parameter-type-robustness.md](../tooling/tool-parameter-type-robustness.md) - Context on tool parameter robustness often fixed in these releases.
