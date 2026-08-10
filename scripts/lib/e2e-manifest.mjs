// Evidence-chain helpers for local E2E runs. Every run binds its report to
// the exact code commit, the workspace state, the container image digest,
// the probed product version, and the SHAs of the two generated governance
// artifacts (coverage ledger + exposure policy), so a stale report can never
// pass reconciliation as fresh evidence. Pure and unit-testable: the e2e
// runner collects the values, these functions shape them.
import crypto from "node:crypto";
import fs from "node:fs";

export function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const MAX_DIRTY_FILES = 20;

export function buildRunManifest({
  product,
  gitSha,
  dirty,
  dirtyFiles = [],
  startedAt,
  dockerImageDigest = null,
  productVersion = null,
  coverageSha,
  policySha
}) {
  for (const [key, value] of Object.entries({
    product,
    gitSha,
    startedAt,
    coverageSha,
    policySha
  })) {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`run manifest field "${key}" must be a non-empty string`);
    }
  }
  if (typeof dirty !== "boolean") throw new Error('run manifest field "dirty" must be a boolean');
  if (dockerImageDigest !== null && typeof dockerImageDigest !== "string")
    throw new Error('run manifest field "dockerImageDigest" must be a string or null');
  if (productVersion !== null && typeof productVersion !== "string")
    throw new Error('run manifest field "productVersion" must be a string or null');
  if (!Array.isArray(dirtyFiles))
    throw new Error('run manifest field "dirtyFiles" must be an array');
  const manifest = {
    schemaVersion: 1,
    product,
    gitSha,
    dirty,
    startedAt,
    dockerImageDigest,
    productVersion,
    coverageSha,
    policySha
  };
  if (dirty) manifest.dirtyFiles = dirtyFiles.slice(0, MAX_DIRTY_FILES);
  return manifest;
}

// Embed the same evidence fields into the vitest JSON run report so the
// report is self-contained and reconciliation can validate it without a
// sidecar file.
export function embedManifestInReport(report, manifest) {
  const { schemaVersion, ...fields } = manifest;
  return { ...report, ...fields };
}
