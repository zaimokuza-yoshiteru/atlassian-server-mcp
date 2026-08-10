// Operation-level reconciliation core, shared by the scripts/e2e-reconcile.mjs
// CLI and scripts/release-check.mjs. Both consumers call these functions
// directly — parsing CLI stdout is forbidden.
//
// Inputs: the coverage ledger (tests/e2e/coverage.json), the vitest JSON run
// report, and the invoked-ops journal. Output: a structured verdict object.

// Automated ledger operations for one product, grouped by scenario:
// Map<scenario, operationId[]>.
export function ledgerOperationsByScenario(coverage, product) {
  const scenarioOps = new Map();
  for (const entry of coverage?.operations ?? []) {
    if (entry.status === "automated" && entry.product === product) {
      const ops = scenarioOps.get(entry.scenario) ?? [];
      ops.push(entry.operationId);
      scenarioOps.set(entry.scenario, ops);
    }
  }
  return scenarioOps;
}

// Parse invoked-ops journal lines into Map<operationId, {isError, expectError}[]>.
export function parseInvokedOps(journalText) {
  const opInvocation = new Map();
  for (const line of String(journalText ?? "")
    .split("\n")
    .filter(Boolean)) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const opId = entry.operationId ?? null;
    if (!opId) continue;
    const rec = opInvocation.get(opId) ?? [];
    rec.push({ isError: entry.isError === true, expectError: entry.expectError === true });
    opInvocation.set(opId, rec);
  }
  return opInvocation;
}

/**
 * Reconcile one product's automated operations against the run evidence.
 *
 * @param {object} input
 * @param {string} input.product
 * @param {object} input.coverage parsed coverage ledger
 * @param {object|null} input.report parsed vitest JSON report, or null when
 *   missing/unreadable
 * @param {Map} input.invokedOps output of parseInvokedOps
 * @returns {{
 *   product: string, expected: number, reportMissing: boolean,
 *   pass: number, partial: number, notRun: number,
 *   operations: Array<{operationId: string, scenario: string,
 *     status: "PASS"|"PARTIAL"|"NOT RUN", detail: string}>
 * }}
 *
 * Verdicts per operation:
 *   PASS:    suite passed and at least one invocation where expectError === isError
 *   PARTIAL: the scenario has a failing it(), or the op was invoked but no
 *            invocation matched its expected outcome
 *   NOT RUN: the scenario is absent from the report, or the suite passed but
 *            the op was never invoked
 */
export function reconcileProduct({ product, coverage, report, invokedOps }) {
  const scenarioOps = ledgerOperationsByScenario(coverage, product);
  const operations = [];
  let pass = 0;
  let partial = 0;
  let notRun = 0;

  if (!report) {
    for (const [scenario, ops] of [...scenarioOps].sort(([a], [b]) => a.localeCompare(b))) {
      for (const operationId of ops) {
        operations.push({ operationId, scenario, status: "NOT RUN", detail: "" });
        notRun++;
      }
    }
    return {
      product,
      expected: operations.length,
      reportMissing: true,
      pass,
      partial,
      notRun,
      operations
    };
  }

  // Vitest JSON report shape: { testResults: [{ name, assertionResults:
  // [{ ancestorTitles: [...], title, status: "passed"|"failed" }] }] }
  const scenarioStatus = new Map(); // scenario → { passed: number, failed: string[] }
  for (const suite of report.testResults ?? []) {
    for (const assertion of suite.assertionResults ?? []) {
      // ancestorTitles is the chain of describe names; find the outermost
      // ancestor matching a known scenario name (scenario describes may nest
      // inside plain group describes).
      const ancestors = assertion.ancestorTitles ?? [];
      const scenario = ancestors.find((a) => scenarioOps.has(a));
      if (!scenario) continue;
      const status = scenarioStatus.get(scenario) ?? { passed: 0, failed: [] };
      if (assertion.status === "passed") {
        status.passed++;
      } else {
        status.failed.push(assertion.title);
      }
      scenarioStatus.set(scenario, status);
    }
  }

  for (const [scenario, ops] of [...scenarioOps].sort(([a], [b]) => a.localeCompare(b))) {
    const status = scenarioStatus.get(scenario);
    if (!status) {
      for (const operationId of ops) {
        operations.push({ operationId, scenario, status: "NOT RUN", detail: "" });
        notRun++;
      }
    } else if (status.failed.length > 0) {
      for (const operationId of ops) {
        operations.push({
          operationId,
          scenario,
          status: "PARTIAL",
          detail: `failed: ${status.failed.join(", ")}`
        });
        partial++;
      }
    } else {
      // Suite passed — check per-op invocation. An op PASSes when at least
      // one invocation matches its expected outcome (expectError === isError).
      for (const operationId of ops) {
        const inv = invokedOps.get(operationId);
        if (!inv || inv.length === 0) {
          operations.push({
            operationId,
            scenario,
            status: "NOT RUN",
            detail: "suite passed but op never invoked"
          });
          notRun++;
        } else if (inv.some((e) => e.expectError === e.isError)) {
          operations.push({ operationId, scenario, status: "PASS", detail: "" });
          pass++;
        } else {
          operations.push({
            operationId,
            scenario,
            status: "PARTIAL",
            detail: "invoked but no invocation matched its expected outcome"
          });
          partial++;
        }
      }
    }
  }

  return {
    product,
    expected: operations.length,
    reportMissing: false,
    pass,
    partial,
    notRun,
    operations
  };
}
