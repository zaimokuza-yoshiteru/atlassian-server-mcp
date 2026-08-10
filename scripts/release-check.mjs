#!/usr/bin/env node
// Release-candidate evidence gate (production-readiness plan §8, round-2 R3/R9).
//
// Validates that the workspace is clean and that all three products have a
// self-contained E2E run report proving the exact target SHA — the current
// HEAD by default, or the SHA passed via `--proven-sha <sha>` (used on the
// evidence commit, where HEAD has moved past the proven SHA, and by the
// release workflow):
//   - workspace: git status --porcelain must be empty
//   - .e2e-state/<product>/run-report.json must exist and parse for every product
//   - report gitSha == target SHA and report dirty == false
//   - zero sweep-failed journal entries since that report's startedAt
//   - report coverageSha / policySha == SHA-256 of the current generated
//     artifacts (tests/e2e/coverage.json, src/exposure-policy.json)
//   - the report records zero failed tests and numTotalTests > 0
//   - operation-level reconcile (scripts/lib/e2e-reconcile.mjs) against the
//     coverage ledger's automated operations: expected counts are derived
//     from the ledger per product (never hardcoded); every operation must be
//     PASS — zero PARTIAL, zero NOT RUN
//   - .e2e-state/<product>/run-manifest.json must exist, parse as JSON, and
//     agree with the report on product/gitSha/dirty/startedAt/productVersion/
//     dockerImageDigest/coverageSha/policySha
//
// When every check passes, writes release-evidence/<gitSha>.json summarizing
// the three product evidence sets (per-product operation counts plus
// report/manifest/invoked-ops hashes) and prints OK. Any failure exits
// non-zero and writes nothing.
//
// There is no --allow-stale/--allow-sweep-failures escape hatch here by
// design: development debugging belongs to scripts/e2e-reconcile.mjs, release
// evidence must be exact. Regression tests keep it that way.
//
// The RELEASE_CHECK_* environment overrides exist so unit tests can point the
// script at fixtures; they are not part of the release flow.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { sha256File } from "./lib/e2e-manifest.mjs";
import { parseInvokedOps, reconcileProduct } from "./lib/e2e-reconcile.mjs";

const PRODUCTS = ["jira", "confluence", "bitbucket"];
// Manifest fields that must agree with the run report.
const MANIFEST_AGREEMENT_FIELDS = [
  "product",
  "gitSha",
  "dirty",
  "startedAt",
  "productVersion",
  "dockerImageDigest",
  "coverageSha",
  "policySha"
];

function usage() {
  process.stderr.write(
    "Usage: node scripts/release-check.mjs [--proven-sha <sha>]\n" +
      "  --proven-sha <sha>  validate evidence bound to <sha> instead of HEAD\n" +
      "                      (evidence-commit re-checks and the release workflow)\n"
  );
}

// Strict argument parsing: unknown flags (including any stale/sweep escape
// hatch) are a hard failure.
const args = process.argv.slice(2);
let provenSha = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--proven-sha" && typeof args[i + 1] === "string" && args[i + 1].length > 0) {
    provenSha = args[i + 1];
    i++;
  } else {
    usage();
    process.exit(1);
  }
}
if (provenSha !== null && !/^[0-9a-f]{40}$/i.test(provenSha)) {
  process.stderr.write(`--proven-sha expects a 40-hex-character commit SHA, got: ${provenSha}\n`);
  process.exit(1);
}

const stateDir = process.env.E2E_STATE_DIR ?? ".e2e-state";
const coveragePath = process.env.ATLASSIAN_COVERAGE_JSON ?? resolve("tests/e2e/coverage.json");
const policyPath = process.env.ATLASSIAN_POLICY_JSON ?? resolve("src/exposure-policy.json");
const journalPath = process.env.E2E_CLEANUP_JOURNAL ?? resolve(stateDir, "cleanup-journal.jsonl");
const evidenceDir = process.env.RELEASE_EVIDENCE_DIR ?? resolve("release-evidence");

function gitEvidence() {
  // Test hooks; the release flow always uses the real git commands.
  if (process.env.RELEASE_CHECK_GIT_SHA && process.env.RELEASE_CHECK_GIT_DIRTY !== undefined) {
    return {
      gitSha: process.env.RELEASE_CHECK_GIT_SHA,
      dirty: process.env.RELEASE_CHECK_GIT_DIRTY === "true"
    };
  }
  const head = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  if (head.status !== 0) throw new Error(`git rev-parse HEAD failed: ${head.stderr.trim()}`);
  const status = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" });
  if (status.status !== 0)
    throw new Error(`git status --porcelain failed: ${status.stderr.trim()}`);
  return {
    gitSha: head.stdout.trim(),
    dirty: status.stdout.split("\n").filter(Boolean).length > 0
  };
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

// Sweep failures are judged per product against the journal since that
// product's run started — the same window scripts/e2e.mjs gates on, so an
// exploratory --allow-sweep-failures run can never become release evidence.
function sweepFailuresSince(product, startedAt) {
  if (!existsSync(journalPath)) return [];
  return readFileSync(journalPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(
      (entry) =>
        entry &&
        entry.product === product &&
        entry.status === "sweep-failed" &&
        typeof entry.timestamp === "string" &&
        entry.timestamp >= startedAt
    );
}

const failures = [];
const git = gitEvidence();
// The SHA the evidence must prove: HEAD by default, --proven-sha on the
// evidence commit / in the release workflow.
const targetSha = provenSha ?? git.gitSha;

if (git.dirty) {
  failures.push("workspace is dirty (git status --porcelain is not empty)");
}

const coverage = readJson(coveragePath);
if (!coverage) {
  failures.push(`coverage ledger missing or unreadable at ${coveragePath}`);
}
const coverageSha = sha256File(coveragePath);
const policySha = sha256File(policyPath);

const products = {};
let totalExpected = 0;
let totalPassed = 0;
let totalPartial = 0;
let totalNotRun = 0;

for (const product of PRODUCTS) {
  const reportPath = resolve(stateDir, product, "run-report.json");
  const manifestPath = resolve(stateDir, product, "run-manifest.json");
  const invokedPath = resolve(stateDir, product, "invoked-ops.jsonl");
  const report = readJson(reportPath);

  const invokedOps = parseInvokedOps(
    existsSync(invokedPath) ? readFileSync(invokedPath, "utf8") : ""
  );
  const verdict = reconcileProduct({
    product,
    coverage: coverage ?? { operations: [] },
    report: report ?? null,
    invokedOps
  });
  totalExpected += verdict.expected;
  totalPassed += verdict.pass;
  totalPartial += verdict.partial;
  totalNotRun += verdict.notRun;

  products[product] = {
    gitSha: report?.gitSha ?? null,
    dirty: report?.dirty ?? null,
    startedAt: report?.startedAt ?? null,
    productVersion: report?.productVersion ?? null,
    dockerImageDigest: report?.dockerImageDigest ?? null,
    coverageSha: report?.coverageSha ?? null,
    policySha: report?.policySha ?? null,
    expectedOperations: verdict.expected,
    passedOperations: verdict.pass,
    partialOperations: verdict.partial,
    notRunOperations: verdict.notRun,
    numTotalTests: report?.numTotalTests ?? null,
    numPassedTests: report?.numPassedTests ?? null,
    numFailedTests: report?.numFailedTests ?? null,
    runReportSha256: existsSync(reportPath) ? sha256File(reportPath) : null,
    runManifestSha256: existsSync(manifestPath) ? sha256File(manifestPath) : null,
    invokedOpsSha256: existsSync(invokedPath) ? sha256File(invokedPath) : null
  };

  if (verdict.expected === 0) {
    failures.push(`${product}: coverage ledger has no automated operations for this product`);
  }
  if (!report) {
    failures.push(`${product}: run report missing or unreadable at ${reportPath}`);
    continue;
  }
  if (report.gitSha !== targetSha) {
    failures.push(
      `${product}: report gitSha ${report.gitSha ?? "(missing)"} != ${provenSha ? `proven SHA ${targetSha}` : `HEAD ${targetSha}`}`
    );
  }
  if (report.dirty === true) {
    failures.push(`${product}: report was produced with a dirty workspace (dirty == true)`);
  }
  if (report.coverageSha !== coverageSha) {
    failures.push(`${product}: report coverageSha does not match the current coverage.json`);
  }
  if (report.policySha !== policySha) {
    failures.push(`${product}: report policySha does not match the current exposure-policy.json`);
  }
  if ((report.numFailedTests ?? 0) > 0) {
    failures.push(`${product}: report records ${report.numFailedTests} failed test(s)`);
  }
  if (!Number.isInteger(report.numTotalTests) || report.numTotalTests <= 0) {
    failures.push(
      `${product}: report numTotalTests must be > 0, got ${report.numTotalTests ?? "(missing)"}`
    );
  }
  if (typeof report.startedAt !== "string" || !Number.isFinite(Date.parse(report.startedAt))) {
    failures.push(`${product}: report startedAt ${report.startedAt ?? "(missing)"} is not valid`);
  } else {
    const sweepFailures = sweepFailuresSince(product, report.startedAt);
    if (sweepFailures.length > 0) {
      failures.push(
        `${product}: ${sweepFailures.length} sweep-failed journal entr${
          sweepFailures.length === 1 ? "y" : "ies"
        } since the run started`
      );
    }
  }

  // Manifest: must exist, parse as JSON, and agree with the report field by
  // field — an existence check alone would let a stale or forged manifest
  // through.
  if (!existsSync(manifestPath)) {
    failures.push(`${product}: run manifest missing at ${manifestPath}`);
  } else {
    const manifest = readJson(manifestPath);
    if (!manifest) {
      failures.push(`${product}: run manifest at ${manifestPath} is not valid JSON`);
    } else {
      for (const field of MANIFEST_AGREEMENT_FIELDS) {
        if (manifest[field] !== report[field]) {
          failures.push(
            `${product}: run manifest ${field} ${JSON.stringify(manifest[field])} does not match the report ${JSON.stringify(report[field])}`
          );
        }
      }
    }
  }

  // Operation-level reconcile gate: a "0 tests / 0 failed" report can never
  // become evidence — every ledger operation must be proven PASS.
  if (verdict.reportMissing) {
    failures.push(`${product}: ${verdict.notRun} operation(s) NOT RUN (run report missing)`);
  } else {
    if (verdict.partial > 0) {
      const ops = verdict.operations
        .filter((op) => op.status === "PARTIAL")
        .map((op) => op.operationId);
      failures.push(`${product}: ${verdict.partial} PARTIAL operation(s): ${ops.join(", ")}`);
    }
    if (verdict.notRun > 0) {
      const ops = verdict.operations
        .filter((op) => op.status === "NOT RUN")
        .map((op) => op.operationId);
      failures.push(`${product}: ${verdict.notRun} NOT RUN operation(s): ${ops.join(", ")}`);
    }
    if (verdict.pass !== verdict.expected) {
      failures.push(
        `${product}: passed operations ${verdict.pass} != ledger expected ${verdict.expected}`
      );
    }
  }
}

if (failures.length > 0) {
  process.stdout.write(`[release-check] FAIL: release evidence is not valid for ${targetSha}:\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(1);
}

mkdirSync(evidenceDir, { recursive: true });
const evidencePath = resolve(evidenceDir, `${targetSha}.json`);
writeFileSync(
  evidencePath,
  `${JSON.stringify(
    {
      schemaVersion: 2,
      gitSha: targetSha,
      createdAt: new Date().toISOString(),
      workspace: { dirty: git.dirty },
      coverageSha,
      policySha,
      totalExpected,
      totalPassed,
      totalPartial,
      totalNotRun,
      products
    },
    null,
    2
  )}\n`
);
process.stdout.write(`[release-check] evidence written to ${evidencePath}\n`);
process.stdout.write(
  `[release-check] ${totalPassed}/${totalExpected} operations PASS across ${PRODUCTS.length} products\n`
);
process.stdout.write("[release-check] OK\n");
