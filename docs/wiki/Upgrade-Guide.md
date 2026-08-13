# Upgrade Guide

## Versioning

The package `@zaimokuza/atlassian-server-mcp` follows semantic versioning,
with notable changes recorded on the GitHub Releases page. v1.0.0 is the
first stable release.

## Upgrading

**npm-installed:**

```bash
# your client runs npx @zaimokuza/atlassian-server-mcp — clear the npx cache or pin a version
npx @zaimokuza/atlassian-server-mcp@latest doctor
```

**Source checkout:**

```bash
git pull --ff-only
pnpm install
pnpm build
node dist/cli.js doctor
```

## After every upgrade

1. Read the GitHub Release notes for the new version — breaking changes and
   new environment variables are called out there.
2. Re-run `doctor` against each configured product; new checks may appear.
3. If you pin `--exposure-tier` or FORCE patterns, re-check
   `atlassian_discover_operations` output: operation counts change between
   releases and new operations may land
   inside your existing globs.
4. Review pinned limits (`--max-download-bytes`, `--max-output-bytes`,
   `--cursor-ttl-seconds`) against the new defaults.

## Compatibility expectations

- The operation registry and exposure policy are regenerated from official
  Atlassian specs per release; operation IDs are stable within a major
  version.
- The error contract (`error.kind` / `status` / `operationId` /
  `fieldErrors`) is stable within a major version.
- Defaults only change when called out in the release notes.

---

[中文版](Upgrade-Guide.zh-CN.md) · English is the authoritative version.
