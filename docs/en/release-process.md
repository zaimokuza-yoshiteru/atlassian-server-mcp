# Release process

> [中文版本](../zh-CN/release-process.md)（中文翻译仅供参考，以本英文版为准）

A short maintainer memo for cutting a release of
`@zaimokuza/atlassian-server-mcp`. Publishing is automated by
`.github/workflows/release.yml` (triggered by pushing a `v*` tag, gated by the
`npm-production` environment with required reviewers). The maintainer performs
the evidence chain locally, creates the tag, and configures the one-time
repository/npm settings; everything else runs in the workflow.

## 1. Pre-flight gates

1. Working tree clean: `git status --porcelain` is empty.
2. `pnpm test:ci` green locally (same gate as CI: lint, format, typecheck,
   build, unit tests with coverage thresholds, contract tests, generated-file
   drift checks, package smoke).
3. Unit coverage thresholds in `vitest.config.ts` still reflect the measured
   baseline (see `docs/en/test-strategy.md`).

## 2. RC Freeze evidence chain

The release candidate must be proven by a full local E2E run bound to the exact
commit being released (the Phase B baseline run does not count — later phases
change the runtime, transport, registry, and generators):

1. Record the HEAD SHA to be proven ("proven SHA").
2. Run the full local E2E: `pnpm e2e:all`, then reconcile each product.
   Every product must PASS with zero residual sweep failures.
3. Run `node scripts/release-check.mjs`. Its contract:
   - verifies the working tree is clean;
   - for each product, reads `.e2e-state/<product>/run-report.json` and
     requires `gitSha == <proven SHA>`, `dirty == false`, zero sweep failures,
     and `coverageSha` / `policySha` matching the current generated artifacts;
   - requires `numTotalTests > 0` and zero failed tests — a fake "0 tests /
     0 failed" report can never pass;
   - enforces operation-level reconciliation against the automated ledger in
     `tests/e2e/coverage.json` (expected counts are derived from the ledger
     per product, never hardcoded): every operation must be PASS, with zero
     PARTIAL and zero NOT RUN;
   - requires `.e2e-state/<product>/run-manifest.json` to exist, parse as
     JSON, and agree with the report on product/gitSha/dirty/startedAt/
     productVersion/dockerImageDigest/coverageSha/policySha;
   - on success writes `release-evidence/<provenSHA>.json` (schema v2:
     per-product operation/test counts plus SHA-256 of each report, manifest,
     and invoked-ops journal, with top-level totals) and prints `OK`;
   - any mismatch exits non-zero. There are deliberately no
     `--allow-stale`/`--allow-sweep-failures` escape hatches.
4. Commit `release-evidence/<provenSHA>.json` as its own commit (message:
   evidence for `<provenSHA>`). The evidence commit advances HEAD; the evidence
   inside still names the proven code SHA. To re-verify on the evidence commit,
   run `node scripts/release-check.mjs --proven-sha <provenSHA>`.

## 3. Version and tag

1. Set `version` in `package.json` (for example `1.0.0`).
2. Verify the tarball contents: `pnpm pack:release` (staging pack — never
   `pnpm pack`/`npm pack` from the repo root; pnpm symlinks corrupt the
   bundle), then confirm `README.md`, `README.zh-CN.md`, `LICENSE`, `dist/`,
   and the bundled `node_modules/` are inside.
3. Tag the evidence commit (so the tag carries the evidence), and verify the
   evidence file's `gitSha` equals the tag's parent commit.

## 4. Publish (automated workflow, maintainer-gated)

Pushing the tag runs `.github/workflows/release.yml` in the `npm-production`
environment (required reviewers approve the run). The workflow, in order:
verifies tag == package.json version → `pnpm install --frozen-lockfile` →
`pnpm test:ci` → verifies `release-evidence/<tag parent>.json` binds the tag's
parent commit with a fully green operation gate → packs the tarball and checks
every dist file maps to a source → generates the SBOM and SHA256SUMS → checks
whether the version already exists on npm (idempotent: if it does, npm publish
is skipped with a warning and the workflow still publishes the GitHub Release)
→ publishes with `--provenance` under the
fail-closed dist-tag policy (stable → `latest`, `-rc.N` → `rc`, any other
prerelease suffix fails) → flips the pre-created draft GitHub Release public.

### First release of the package (manual bootstrap)

npm only allows binding a trusted publisher to a package that **already
exists**, so the very first release cannot use the workflow's OIDC publish:

1. Run steps 1–3 above (CI, E2E, release-check, evidence commit, tag).
2. Pack locally: `pnpm pack:release` (staging pack — see step 3.2).
3. `npm login` (interactive, 2FA), then
   `npm publish <tarball> --access public --tag latest` — no `--provenance`.
4. On npmjs.com, bind the trusted publisher: repository
   `zaimokuza-yoshiteru/atlassian-server-mcp`, workflow `release.yml`,
   environment `npm-production`.
5. Push the tag. The workflow sees the version already exists, skips npm
   publish, and attaches the artifacts to the GitHub Release.

From the second release on, tag push is fully automated.

Maintainer responsibilities around the workflow:

- One-time setup: npm trusted publisher bound to this repository + the
  `release.yml` workflow + the `npm-production` environment; the environment
  configured with required reviewers. No long-lived npm token is used.
- Release notes: written by hand on the draft GitHub Release before it is
  flipped public (there is no CHANGELOG by design).
- Attachments uploaded by the workflow: tarball, `sbom.json`, `SHA256SUMS`,
  and the release evidence JSON. The raw E2E run reports/manifests live in
  gitignored `.e2e-state/` and **cannot** be attached by the workflow — the
  evidence JSON carries their SHA-256. If raw reports are needed on the
  release, upload them manually from the machine that ran the E2E suite.
- Repository settings (public visibility, branch protection, secret scanning)
  are repository-admin actions outside this document.

## 5. Post-release

- Bump `version` to the next development version if desired.
