#!/usr/bin/env node
// Operation-level reconciliation + evidence-chain validation for local E2E.
//
// Failure semantics (gate, not report):
//   - run report missing -> exit 1 (a missing report can never pass silently)
//   - embedded evidence stale or inconsistent -> exit 1, unless --allow-stale
//     is passed (development debugging only; release flows must not use it)
//   - any PARTIAL or NOT RUN operation -> exit 1
//
// The reconcile core lives in scripts/lib/e2e-reconcile.mjs and is shared
// with scripts/release-check.mjs; this CLI only handles git/evidence-chain
// checks and human-readable output.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { sha256File } from "./lib/e2e-manifest.mjs";
import { parseInvokedOps, reconcileProduct } from "./lib/e2e-reconcile.mjs";

const args = process.argv.slice(2);
const product = args.find((arg) => !arg.startsWith("--"));
const allowStale = args.includes("--allow-stale");
if (!product) {
  process.stderr.write("Usage: node scripts/e2e-reconcile.mjs <product> [--allow-stale]\n");
  process.exit(1);
}

// Path overrides exist so unit tests can point the script at fixtures.
const stateDir = process.env.E2E_STATE_DIR ?? ".e2e-state";
const coveragePath = process.env.ATLASSIAN_COVERAGE_JSON ?? resolve("tests/e2e/coverage.json");
const policyPath = process.env.ATLASSIAN_POLICY_JSON ?? resolve("src/exposure-policy.json");
const reportPath = resolve(stateDir, product, "run-report.json");
const invokedPath = resolve(stateDir, product, "invoked-ops.jsonl");

function currentGitEvidence() {
  const head = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  if (head.status !== 0) throw new Error(`git rev-parse HEAD failed: ${head.stderr.trim()}`);
  const committed = spawnSync("git", ["log", "-1", "--format=%cI"], { encoding: "utf8" });
  if (committed.status !== 0) throw new Error(`git log failed: ${committed.stderr.trim()}`);
  return { gitSha: head.stdout.trim(), commitTime: committed.stdout.trim() };
}

// Returns a list of human-readable evidence failures (empty when consistent).
function evidenceFailures(report, { gitSha, commitTime, coverageSha, policySha }) {
  const failures = [];
  if (report.gitSha !== gitSha)
    failures.push(`report gitSha ${report.gitSha ?? "(missing)"} != current HEAD ${gitSha}`);
  if (report.dirty === true)
    failures.push("report was produced with a dirty workspace (dirty == true)");
  if (report.coverageSha !== coverageSha)
    failures.push("report coverageSha does not match the current tests/e2e/coverage.json");
  if (report.policySha !== policySha)
    failures.push("report policySha does not match the current src/exposure-policy.json");
  const startedAt = Date.parse(report.startedAt ?? "");
  const headCommittedAt = Date.parse(commitTime);
  if (!Number.isFinite(startedAt))
    failures.push(`report startedAt ${report.startedAt ?? "(missing)"} is not a valid timestamp`);
  else if (startedAt < headCommittedAt)
    failures.push(
      `report startedAt ${report.startedAt} predates the HEAD commit time ${commitTime}`
    );
  return failures;
}

function printOperations(operations) {
  for (const op of operations) {
    const detail = op.detail ? `, ${op.detail}` : "";
    process.stdout.write(
      `${op.status.padEnd(9)} ${op.operationId}  (scenario: ${op.scenario}${detail})\n`
    );
  }
}

// 1. Read coverage ledger.
let coverage;
try {
  coverage = JSON.parse(readFileSync(coveragePath, "utf8"));
} catch {
  process.stdout.write(`[reconcile] Cannot read coverage ledger at ${coveragePath}\n`);
  process.exit(1);
}

// 2. Read vitest JSON report — missing report is a hard failure (exit 1).
let report;
try {
  report = JSON.parse(readFileSync(reportPath, "utf8"));
} catch {
  const verdict = reconcileProduct({ product, coverage, report: null, invokedOps: new Map() });
  process.stdout.write(
    `[reconcile] FAIL: run report missing or unreadable at ${reportPath} — the E2E run did not complete; this gate cannot pass\n`
  );
  printOperations(verdict.operations);
  process.exit(1);
}

// 2.1 Evidence-chain consistency: the report must prove it was produced from
// the current commit, a clean workspace, and the current generated artifacts.
const staleFailures = evidenceFailures(report, {
  ...currentGitEvidence(),
  coverageSha: sha256File(coveragePath),
  policySha: sha256File(policyPath)
});
if (staleFailures.length > 0) {
  if (!allowStale) {
    process.stdout.write(
      `[reconcile] FAIL: ${product} run report is stale or inconsistent — it is not evidence for the current code:\n`
    );
    for (const failure of staleFailures) process.stdout.write(`  - ${failure}\n`);
    process.stdout.write(
      "[reconcile] Re-run the E2E suite, or pass --allow-stale for development debugging only.\n"
    );
    process.exit(1);
  }
  process.stdout.write(
    "\n╔══════════════════════════════════════════════════════════════════════╗\n"
  );
  process.stdout.write(
    "║  WARNING: --allow-stale — accepting a STALE/INCONSISTENT run report  ║\n"
  );
  process.stdout.write(
    "║  This verdict is NOT valid release evidence.                         ║\n"
  );
  process.stdout.write(
    "╚══════════════════════════════════════════════════════════════════════╝\n"
  );
  for (const failure of staleFailures) process.stdout.write(`  - ${failure}\n`);
}

// 2.5 Read invoked-ops journal to verify each automated op was actually exercised.
const invokedOps = parseInvokedOps(
  existsSync(invokedPath) ? readFileSync(invokedPath, "utf8") : ""
);

// 3. Reconcile and emit one line per automated operation.
const verdict = reconcileProduct({ product, coverage, report, invokedOps });

if (verdict.expected === 0) {
  process.stdout.write(`[reconcile] ${product}: no automated operations in ledger\n`);
  process.exit(0);
}

printOperations(verdict.operations);
process.stdout.write(
  `\n${product}: ${verdict.pass} PASS / ${verdict.partial} PARTIAL / ${verdict.notRun} NOT RUN  (${verdict.expected} automated ops)\n`
);
process.exit(verdict.partial > 0 || verdict.notRun > 0 ? 1 : 0);
