#!/usr/bin/env node
// Verifies the committed release evidence for a tag checkout.
//
// Tag convention (docs/en/release-process.md): a release tag points at the
// evidence commit; the evidence file inside proves the tag's PARENT commit.
// This script fails non-zero unless release-evidence/<parent>.json exists,
// parses, binds gitSha == parent, and records a fully green operation-level
// gate (totalPassed == totalExpected, zero partial/notRun, zero failed tests
// per product). Used by .github/workflows/release.yml; the local counterpart
// for re-checking live .e2e-state is release-check.mjs --proven-sha.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const evidenceDir = process.env.RELEASE_EVIDENCE_DIR ?? resolve("release-evidence");

const failures = [];

const head = spawnSync("git", ["rev-parse", "HEAD^"], { encoding: "utf8" });
if (head.status !== 0) {
  process.stderr.write(
    `verify-release-evidence: git rev-parse HEAD^ failed: ${head.stderr.trim()}\n`
  );
  process.exit(1);
}
const parent = head.stdout.trim();

const evidencePath = resolve(evidenceDir, `${parent}.json`);
if (!existsSync(evidencePath)) {
  failures.push(`release evidence missing at ${evidencePath} (tag parent ${parent})`);
} else {
  let evidence;
  try {
    evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  } catch {
    evidence = null;
  }
  if (!evidence) {
    failures.push(`release evidence at ${evidencePath} is not valid JSON`);
  } else {
    if (evidence.gitSha !== parent) {
      failures.push(
        `evidence gitSha ${evidence.gitSha ?? "(missing)"} != tag parent commit ${parent}`
      );
    }
    if (!Number.isInteger(evidence.totalExpected) || evidence.totalExpected <= 0) {
      failures.push(
        `evidence totalExpected must be > 0, got ${evidence.totalExpected ?? "(missing)"}`
      );
    }
    if (evidence.totalPassed !== evidence.totalExpected) {
      failures.push(
        `evidence totalPassed ${evidence.totalPassed ?? "(missing)"} != totalExpected ${evidence.totalExpected ?? "(missing)"}`
      );
    }
    if ((evidence.totalPartial ?? 0) > 0 || (evidence.totalNotRun ?? 0) > 0) {
      failures.push(
        `evidence records partial/notRun operations (partial=${evidence.totalPartial ?? 0}, notRun=${evidence.totalNotRun ?? 0})`
      );
    }
    for (const [product, entry] of Object.entries(evidence.products ?? {})) {
      if ((entry?.numFailedTests ?? 0) > 0) {
        failures.push(`${product}: evidence records ${entry.numFailedTests} failed test(s)`);
      }
    }
  }
}

if (failures.length > 0) {
  process.stdout.write("[verify-release-evidence] FAIL:\n");
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(1);
}
process.stdout.write(`[verify-release-evidence] OK: ${evidencePath} proves tag parent ${parent}\n`);
