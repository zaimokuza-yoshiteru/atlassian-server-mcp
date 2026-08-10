// Failure-semantics tests for scripts/e2e-reconcile.mjs. Each case builds a
// disposable .e2e-state fixture plus fake coverage/policy artifacts and
// spawns the real script, asserting its exit code — the reconcile gate is
// only meaningful if the process exit code is right.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const root = path.resolve(process.cwd());
const temporaries = [];

afterEach(() => {
  while (temporaries.length > 0) fs.rmSync(temporaries.pop(), { recursive: true, force: true });
});

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}
const HEAD = git(["rev-parse", "HEAD"]);

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

// A minimal but complete passing fixture: one automated op, a passing vitest
// report, a matching invoked-ops journal line, and fresh evidence fields.
function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reconcile-test-"));
  temporaries.push(dir);
  const stateDir = path.join(dir, "state");
  const productDir = path.join(stateDir, "jira");
  fs.mkdirSync(productDir, { recursive: true });
  const coveragePath = path.join(dir, "coverage.json");
  fs.writeFileSync(
    coveragePath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        operations: [
          {
            operationId: "jira.fake.op",
            product: "jira",
            requiredTier: "read",
            method: "GET",
            path: "/rest/api/2/fake",
            status: "automated",
            scenario: "fake-scenario",
            evidence: "test"
          }
        ]
      },
      null,
      2
    )}\n`
  );
  const policyPath = path.join(dir, "exposure-policy.json");
  fs.writeFileSync(
    policyPath,
    `${JSON.stringify({ schemaVersion: 1, tiers: { "jira.fake.op": "read" }, excluded: [] }, null, 2)}\n`
  );
  const reportPath = path.join(productDir, "run-report.json");
  const report = {
    numTotalTests: 1,
    testResults: [
      {
        name: "fake.e2e.test.ts",
        assertionResults: [{ ancestorTitles: ["fake-scenario"], title: "works", status: "passed" }]
      }
    ],
    product: "jira",
    gitSha: HEAD,
    dirty: false,
    startedAt: new Date().toISOString(),
    dockerImageDigest: null,
    productVersion: "11.3.5",
    coverageSha: sha256(coveragePath),
    policySha: sha256(policyPath)
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report)}\n`);
  fs.writeFileSync(
    path.join(productDir, "invoked-ops.jsonl"),
    `${JSON.stringify({ operationId: "jira.fake.op", isError: false, expectError: false })}\n`
  );
  return { dir, stateDir, coveragePath, policyPath, reportPath, report };
}

function runReconcile(fixture, extraArgs = []) {
  return spawnSync(process.execPath, ["scripts/e2e-reconcile.mjs", "jira", ...extraArgs], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      E2E_STATE_DIR: fixture.stateDir,
      ATLASSIAN_COVERAGE_JSON: fixture.coveragePath,
      ATLASSIAN_POLICY_JSON: fixture.policyPath
    }
  });
}

function rewriteReport(fixture, override) {
  fs.writeFileSync(fixture.reportPath, `${JSON.stringify({ ...fixture.report, ...override })}\n`);
}

describe("e2e-reconcile failure semantics", () => {
  it("passes a fresh consistent report (exit 0)", () => {
    const fixture = makeFixture();
    const result = runReconcile(fixture);
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("1 PASS / 0 PARTIAL / 0 NOT RUN");
  });

  it("fails when the run report is missing (exit 1)", () => {
    const fixture = makeFixture();
    fs.unlinkSync(fixture.reportPath);
    const result = runReconcile(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("run report missing or unreadable");
  });

  it("fails when report gitSha differs from HEAD (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, { gitSha: "0".repeat(40) });
    const result = runReconcile(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("stale or inconsistent");
    expect(result.stdout).toContain("gitSha");
  });

  it("fails when the report was produced with a dirty workspace (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, { dirty: true, dirtyFiles: [" M src/index.ts"] });
    const result = runReconcile(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("dirty == true");
  });

  it("fails when the coverage SHA does not match (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, { coverageSha: "f".repeat(64) });
    const result = runReconcile(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("coverageSha");
  });

  it("fails when the policy SHA does not match (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, { policySha: "e".repeat(64) });
    const result = runReconcile(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("policySha");
  });

  it("fails when startedAt predates the HEAD commit time (exit 1)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, { startedAt: "2000-01-01T00:00:00.000Z" });
    const result = runReconcile(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("predates the HEAD commit time");
  });

  it("--allow-stale bypasses evidence checks with a prominent warning (exit 0)", () => {
    const fixture = makeFixture();
    rewriteReport(fixture, { gitSha: "0".repeat(40), dirty: true });
    const result = runReconcile(fixture, ["--allow-stale"]);
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("--allow-stale");
    expect(result.stdout).toContain("NOT valid release evidence");
    expect(result.stdout).toContain("1 PASS / 0 PARTIAL / 0 NOT RUN");
  });

  it("still fails on op-level NOT RUN even with fresh evidence (exit 1)", () => {
    const fixture = makeFixture();
    fs.unlinkSync(path.join(fixture.stateDir, "jira", "invoked-ops.jsonl"));
    const result = runReconcile(fixture);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("NOT RUN");
  });
});
