// Failure-semantics tests for scripts/release-check.mjs. Each case builds a
// disposable .e2e-state fixture (three products) plus fake coverage/policy
// artifacts and spawns the real script, asserting its exit code and whether
// the release-evidence file is written — the release gate is only meaningful
// if it is 100% non-zero on stale/missing/mismatched evidence, and if a fake
// "0 tests / 0 failed" report can never produce evidence.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const root = path.resolve(process.cwd());
const temporaries = [];
const PRODUCTS = ["jira", "confluence", "bitbucket"];
const FAKE_HEAD = "a".repeat(40);
const OPS = {
  jira: "jira.fake.op",
  confluence: "confluence.fake.op",
  bitbucket: "bitbucket.fake.op"
};
const SCENARIOS = {
  jira: "jira-scenario",
  confluence: "confluence-scenario",
  bitbucket: "bitbucket-scenario"
};

afterEach(() => {
  while (temporaries.length > 0) fs.rmSync(temporaries.pop(), { recursive: true, force: true });
});

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function coverageOperations() {
  return PRODUCTS.map((product) => ({
    operationId: OPS[product],
    product,
    requiredTier: "read",
    method: "GET",
    path: "/rest/api/2/fake",
    status: "automated",
    scenario: SCENARIOS[product],
    evidence: "test"
  }));
}

// A complete passing fixture: three products each with a fresh, consistent
// run report (one passing scenario test) + invoked-ops journal + run manifest
// agreeing with the report, a coverage ledger with one automated op per
// product, and an empty cleanup journal.
function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-check-test-"));
  temporaries.push(dir);
  const stateDir = path.join(dir, "state");
  const evidenceDir = path.join(dir, "evidence");
  const coveragePath = path.join(dir, "coverage.json");
  fs.writeFileSync(
    coveragePath,
    `${JSON.stringify({ schemaVersion: 1, operations: coverageOperations() }, null, 2)}\n`
  );
  const policyPath = path.join(dir, "exposure-policy.json");
  fs.writeFileSync(
    policyPath,
    `${JSON.stringify({ schemaVersion: 1, tiers: {}, excluded: [] }, null, 2)}\n`
  );
  const journalPath = path.join(stateDir, "cleanup-journal.jsonl");
  const startedAt = new Date().toISOString();
  const reports = {};
  for (const product of PRODUCTS) {
    const productDir = path.join(stateDir, product);
    fs.mkdirSync(productDir, { recursive: true });
    const report = {
      numTotalTests: 1,
      numPassedTests: 1,
      numFailedTests: 0,
      testResults: [
        {
          name: `${product}.e2e.test.ts`,
          assertionResults: [
            { ancestorTitles: [SCENARIOS[product]], title: "works", status: "passed" }
          ]
        }
      ],
      product,
      gitSha: FAKE_HEAD,
      dirty: false,
      startedAt,
      dockerImageDigest: `atlassian/${product}@sha256:fake`,
      productVersion: "1.0.0",
      coverageSha: sha256(coveragePath),
      policySha: sha256(policyPath)
    };
    reports[product] = report;
    fs.writeFileSync(path.join(productDir, "run-report.json"), `${JSON.stringify(report)}\n`);
    fs.writeFileSync(
      path.join(productDir, "run-manifest.json"),
      `${JSON.stringify({ schemaVersion: 1, ...report })}\n`
    );
    fs.writeFileSync(
      path.join(productDir, "invoked-ops.jsonl"),
      `${JSON.stringify({ operationId: OPS[product], isError: false, expectError: false })}\n`
    );
  }
  fs.writeFileSync(journalPath, "");
  return { dir, stateDir, evidenceDir, coveragePath, policyPath, journalPath, startedAt, reports };
}

function runReleaseCheck(fixture, { env = {}, args = [] } = {}) {
  return spawnSync(process.execPath, ["scripts/release-check.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      E2E_STATE_DIR: fixture.stateDir,
      ATLASSIAN_COVERAGE_JSON: fixture.coveragePath,
      ATLASSIAN_POLICY_JSON: fixture.policyPath,
      E2E_CLEANUP_JOURNAL: fixture.journalPath,
      RELEASE_EVIDENCE_DIR: fixture.evidenceDir,
      RELEASE_CHECK_GIT_SHA: FAKE_HEAD,
      RELEASE_CHECK_GIT_DIRTY: "false",
      ...env
    }
  });
}

function rewriteReport(fixture, product, override) {
  const reportPath = path.join(fixture.stateDir, product, "run-report.json");
  const report = { ...fixture.reports[product], ...override };
  fs.writeFileSync(reportPath, `${JSON.stringify(report)}\n`);
  fixture.reports[product] = report;
}

// Keep the manifest consistent when a rewrite should NOT exercise the
// manifest-agreement check.
function syncManifest(fixture, product) {
  fs.writeFileSync(
    path.join(fixture.stateDir, product, "run-manifest.json"),
    `${JSON.stringify({ schemaVersion: 1, ...fixture.reports[product] })}\n`
  );
}

function rewriteCoverage(fixture, operations) {
  fs.writeFileSync(
    fixture.coveragePath,
    `${JSON.stringify({ schemaVersion: 1, operations }, null, 2)}\n`
  );
  // coverageSha is embedded in every report and manifest — refresh all.
  for (const product of PRODUCTS) {
    rewriteReport(fixture, product, { coverageSha: sha256(fixture.coveragePath) });
    syncManifest(fixture, product);
  }
}

function evidencePath(fixture, sha = FAKE_HEAD) {
  return path.join(fixture.evidenceDir, `${sha}.json`);
}

describe("release-check failure semantics", () => {
  it("passes a complete fresh evidence set and writes the evidence file (exit 0)", () => {
    const fixture = makeFixture();
    const result = runReleaseCheck(fixture);
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("OK");
    expect(result.stdout).toContain("3/3 operations PASS");
    const evidence = JSON.parse(fs.readFileSync(evidencePath(fixture), "utf8"));
    expect(evidence.gitSha).toBe(FAKE_HEAD);
    expect(evidence.totalExpected).toBe(3);
    expect(evidence.totalPassed).toBe(3);
    expect(evidence.totalPartial).toBe(0);
    expect(evidence.totalNotRun).toBe(0);
    expect(Object.keys(evidence.products).sort()).toEqual([...PRODUCTS].sort());
    for (const product of PRODUCTS) {
      const entry = evidence.products[product];
      expect(entry.expectedOperations).toBe(1);
      expect(entry.passedOperations).toBe(1);
      expect(entry.partialOperations).toBe(0);
      expect(entry.notRunOperations).toBe(0);
      expect(entry.numTotalTests).toBe(1);
      expect(entry.numPassedTests).toBe(1);
      expect(typeof entry.runManifestSha256).toBe("string");
      expect(typeof entry.runReportSha256).toBe("string");
      expect(typeof entry.invokedOpsSha256).toBe("string");
    }
  });

  it("fails when the workspace is dirty (exit 1, no evidence file)", () => {
    const fixture = makeFixture();
    const result = runReleaseCheck(fixture, { env: { RELEASE_CHECK_GIT_DIRTY: "true" } });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("workspace is dirty");
    expect(fs.existsSync(evidencePath(fixture))).toBe(false);
  });

  it("fails when a product report is missing (exit 1)", () => {
    const fixture = makeFixture();
    fs.unlinkSync(path.join(fixture.stateDir, "confluence", "run-report.json"));
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("confluence: run report missing");
    expect(fs.existsSync(evidencePath(fixture))).toBe(false);
  });

  it("fails when a report gitSha differs from HEAD (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, "jira", { gitSha: "0".repeat(40) });
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("jira: report gitSha");
  });

  it("fails when a report was produced with a dirty workspace (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, "bitbucket", { dirty: true });
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("bitbucket: report was produced with a dirty workspace");
  });

  it("fails when a report coverageSha does not match (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, "jira", { coverageSha: "f".repeat(64) });
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("jira: report coverageSha");
  });

  it("fails when a report policySha does not match (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, "jira", { policySha: "e".repeat(64) });
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("jira: report policySha");
  });

  it("fails when a report records failed tests (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, "confluence", { numFailedTests: 2 });
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("confluence: report records 2 failed test(s)");
  });

  it("fails on a sweep-failed entry after the run started (exit 1)", () => {
    const fixture = makeFixture();
    fs.writeFileSync(
      fixture.journalPath,
      `${JSON.stringify({
        timestamp: new Date(Date.parse(fixture.startedAt) + 1000).toISOString(),
        product: "confluence",
        resource: "content",
        id: "123",
        status: "sweep-failed"
      })}\n`
    );
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("confluence: 1 sweep-failed journal entry");
  });

  it("ignores sweep-failed entries that predate the run (exit 0)", () => {
    const fixture = makeFixture();
    fs.writeFileSync(
      fixture.journalPath,
      `${JSON.stringify({
        timestamp: "2000-01-01T00:00:00.000Z",
        product: "confluence",
        resource: "content",
        id: "123",
        status: "sweep-failed"
      })}\n`
    );
    const result = runReleaseCheck(fixture);
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  });

  it("fails when a run manifest is missing (exit 1)", () => {
    const fixture = makeFixture();
    fs.unlinkSync(path.join(fixture.stateDir, "bitbucket", "run-manifest.json"));
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("bitbucket: run manifest missing");
  });

  it("fails when a report startedAt is invalid (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, "jira", { startedAt: "not-a-date" });
    syncManifest(fixture, "jira");
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("jira: report startedAt");
  });
});

describe("release-check operation-level gate (R3)", () => {
  it("fails when the coverage ledger has no automated operations (exit 1)", () => {
    const fixture = makeFixture();
    rewriteCoverage(fixture, []);
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("coverage ledger has no automated operations");
    expect(fs.existsSync(evidencePath(fixture))).toBe(false);
  });

  it("fails when the report testResults are empty (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, "jira", { testResults: [] });
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("jira: 1 NOT RUN operation(s)");
    expect(fs.existsSync(evidencePath(fixture))).toBe(false);
  });

  it("fails when numTotalTests is 0 — a fake 0/0 report cannot pass (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, "jira", { numTotalTests: 0, numPassedTests: 0 });
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("jira: report numTotalTests must be > 0");
    expect(fs.existsSync(evidencePath(fixture))).toBe(false);
  });

  it("fails when an operation has no invoked journal record (exit 1)", () => {
    const fixture = makeFixture();
    fs.unlinkSync(path.join(fixture.stateDir, "jira", "invoked-ops.jsonl"));
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`jira: 1 NOT RUN operation(s): ${OPS.jira}`);
    expect(fs.existsSync(evidencePath(fixture))).toBe(false);
  });

  it("fails when a scenario is absent from the report (NOT RUN) (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, "confluence", {
      testResults: [
        {
          name: "confluence.e2e.test.ts",
          assertionResults: [
            { ancestorTitles: ["some-other-scenario"], title: "works", status: "passed" }
          ]
        }
      ]
    });
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`confluence: 1 NOT RUN operation(s): ${OPS.confluence}`);
  });

  it("fails when a scenario has a failing it() (PARTIAL) (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, "bitbucket", {
      testResults: [
        {
          name: "bitbucket.e2e.test.ts",
          assertionResults: [
            { ancestorTitles: [SCENARIOS.bitbucket], title: "breaks", status: "failed" }
          ]
        }
      ]
    });
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`bitbucket: 1 PARTIAL operation(s): ${OPS.bitbucket}`);
  });

  it("fails when the manifest disagrees with the report (exit 1)", () => {
    const fixture = makeFixture();
    const manifestPath = path.join(fixture.stateDir, "jira", "run-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.productVersion = "9.9.9";
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("jira: run manifest productVersion");
    expect(fs.existsSync(evidencePath(fixture))).toBe(false);
  });

  it("fails when the manifest is not valid JSON (exit 1)", () => {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.stateDir, "jira", "run-manifest.json"), "{not json\n");
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("jira: run manifest");
    expect(result.stdout).toContain("not valid JSON");
    expect(fs.existsSync(evidencePath(fixture))).toBe(false);
  });

  it("fails when passed operations disagree with the ledger expectation (exit 1)", () => {
    const fixture = makeFixture();
    rewriteCoverage(fixture, [
      ...coverageOperations(),
      {
        operationId: "jira.fake.uncovered",
        product: "jira",
        requiredTier: "read",
        method: "GET",
        path: "/rest/api/2/uncovered",
        status: "automated",
        scenario: "uncovered-scenario",
        evidence: "test"
      }
    ]);
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("jira: passed operations 1 != ledger expected 2");
    expect(fs.existsSync(evidencePath(fixture))).toBe(false);
  });

  it("has no stale/sweep escape hatches (regression, exit 1 on both)", () => {
    const fixture = makeFixture();
    const stale = runReleaseCheck(fixture, { args: ["--allow-stale"] });
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain("Usage:");
    const sweep = runReleaseCheck(fixture, { args: ["--allow-sweep-failures"] });
    expect(sweep.status).toBe(1);
    expect(sweep.stderr).toContain("Usage:");
    expect(fs.existsSync(evidencePath(fixture))).toBe(false);
  });
});

describe("release-check --proven-sha (R9)", () => {
  const PROVEN = "b".repeat(40);

  function provenFixture() {
    // Simulates the evidence commit: HEAD has moved on, the reports prove
    // the parent SHA passed to --proven-sha.
    const fixture = makeFixture();
    for (const product of PRODUCTS) {
      rewriteReport(fixture, product, { gitSha: PROVEN });
      syncManifest(fixture, product);
    }
    return fixture;
  }

  it("passes on the evidence commit with --proven-sha <parent> (exit 0)", () => {
    const fixture = provenFixture();
    const result = runReleaseCheck(fixture, { args: ["--proven-sha", PROVEN] });
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    const evidence = JSON.parse(fs.readFileSync(evidencePath(fixture, PROVEN), "utf8"));
    expect(evidence.gitSha).toBe(PROVEN);
  });

  it("fails with a forged --proven-sha (exit 1, no evidence file)", () => {
    const fixture = makeFixture();
    const forged = "0".repeat(40);
    const result = runReleaseCheck(fixture, { args: ["--proven-sha", forged] });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("proven SHA");
    expect(fs.existsSync(evidencePath(fixture, forged))).toBe(false);
  });

  it("rejects a malformed --proven-sha value (exit 1)", () => {
    const fixture = makeFixture();
    const result = runReleaseCheck(fixture, { args: ["--proven-sha", "not-a-sha"] });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("40-hex-character");
  });

  it("fails without --proven-sha when HEAD moved past the proven SHA (default unchanged)", () => {
    const fixture = provenFixture();
    const result = runReleaseCheck(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("report gitSha");
  });
});
