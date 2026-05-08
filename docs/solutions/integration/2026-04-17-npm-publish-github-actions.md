# Problem

`npm publish` in GitHub Actions fails with authentication errors even when `NPM_TOKEN` is set as an environment variable on the publish step. The token is present but npm does not recognize it.

# Context

Discovered while adding CI/CD to super-pi. The initial `publish.yml` workflow set `NODE_AUTH_TOKEN` as an env variable on the `npm publish` step but did not configure the npm registry URL. Without `registry-url` configuration, npm does not know to use `NODE_AUTH_TOKEN` for authentication against the npm registry.

This is a common pitfall when combining Bun for install/test with npm for publish in the same workflow.

# Solution

Add `actions/setup-node@v4` with `registry-url: "https://registry.npmjs.org"` before the `npm publish` step. This configures npm's `.npmrc` to point to the correct registry and tells it to read `NODE_AUTH_TOKEN` for authentication.

```yaml
- uses: actions/setup-node@v4
  with:
    registry-url: "https://registry.npmjs.org"
- run: npm publish --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Also add `permissions: contents: read` to the workflow to follow least-privilege. The publish action only needs npm token, not GitHub write permissions.

# Why this works

`NODE_AUTH_TOKEN` is the conventional env variable name that `actions/setup-node` configures npm to read when `registry-url` is set. Without `setup-node`, npm has no idea to treat this env variable as a registry auth token.

# Prevention

When adding `npm publish` to any GitHub Actions workflow:

1. Always include `actions/setup-node@v4` with `registry-url`
2. Always set `permissions` to minimum required access
3. Always use `NPM_TOKEN` secret name (conventional and expected by setup-node)
4. Test with `npm publish --dry-run` locally first, but remember dry-run does not test auth

Future `ce-plan` runs should check for this pattern when planning CI/CD workflows. Future `ce-review` runs should flag `npm publish` steps that lack `setup-node` with `registry-url`.
