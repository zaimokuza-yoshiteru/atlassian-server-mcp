import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { adminAuth, ensureLicense, loadDcEnv, productUrls, selectedProducts } from "./dc-env.mjs";
import { buildRunManifest, embedManifestInReport, sha256File } from "./lib/e2e-manifest.mjs";

loadDcEnv();
const productArg = process.argv[2];
const action = process.argv[3] ?? "test";
const allowSweepFailures = process.argv.includes("--allow-sweep-failures");
const products =
  productArg === "all"
    ? ["jira", "confluence", "bitbucket"]
    : selectedProducts(productArg ? [productArg] : []);

if (products.length !== 1 && productArg !== "all") {
  throw new Error("Local E2E accepts exactly one product, or the explicit 'all' sequencer");
}
if (!new Set(["test", "up", "down", "reset"]).has(action)) {
  throw new Error("Action must be test, up, down, or reset");
}

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited with ${code ?? signal}`))
    );
  });
}

const OPERATIONAL_ENDPOINTS = {
  jira: "/rest/api/2/serverInfo",
  confluence: "/rest/api/user/current",
  bitbucket: "/rest/api/1.0/application-properties"
};

// serverInfo probe endpoints for the productVersion evidence field — the
// same endpoints the MCP service uses for its own server-info probe.
const SERVER_INFO_ENDPOINTS = {
  jira: "/rest/api/2/serverInfo",
  confluence: "/rest/applinks/1.0/manifest",
  bitbucket: "/rest/api/1.0/application-properties"
};

function gitEvidence() {
  const head = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  if (head.status !== 0) throw new Error(`git rev-parse HEAD failed: ${head.stderr.trim()}`);
  const status = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" });
  if (status.status !== 0)
    throw new Error(`git status --porcelain failed: ${status.stderr.trim()}`);
  const dirtyFiles = status.stdout.split("\n").filter(Boolean);
  return { gitSha: head.stdout.trim(), dirty: dirtyFiles.length > 0, dirtyFiles };
}

function dockerImageDigest(product) {
  const ps = spawnSync("docker", ["compose", "--profile", product, "ps", "-q", product], {
    encoding: "utf8"
  });
  const containerId = ps.status === 0 ? ps.stdout.trim().split("\n").filter(Boolean)[0] : "";
  if (!containerId)
    throw new Error(`cannot resolve the running ${product} container for image-digest evidence`);
  const image = spawnSync("docker", ["inspect", "--format", "{{.Image}}", containerId], {
    encoding: "utf8"
  });
  if (image.status !== 0 || !image.stdout.trim())
    throw new Error(`docker inspect failed for the ${product} container: ${image.stderr.trim()}`);
  const imageId = image.stdout.trim();
  const digests = spawnSync(
    "docker",
    ["image", "inspect", "--format", "{{json .RepoDigests}}", imageId],
    { encoding: "utf8" }
  );
  if (digests.status === 0) {
    try {
      const repoDigests = JSON.parse(digests.stdout.trim());
      if (Array.isArray(repoDigests) && repoDigests.length > 0) return repoDigests[0];
    } catch {
      /* fall through to the image id */
    }
  }
  return imageId;
}

async function probeProductVersion(product) {
  const baseUrl = productUrls()[product];
  try {
    const response = await fetch(new URL(SERVER_INFO_ENDPOINTS[product], baseUrl), {
      headers: { authorization: adminAuth(product), accept: "application/json" },
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) return null;
    const data = await response.json();
    for (const key of ["version", "buildVersion", "displayVersion"]) {
      if (typeof data?.[key] === "string" && data[key]) return data[key];
    }
    return null;
  } catch {
    return null;
  }
}

// Run evidence chain: bind this run to its manifest before any test executes,
// so a report can never be mistaken for evidence of a different
// commit/workspace.
async function writeRunManifest(product, startedAt) {
  const git = gitEvidence();
  const manifest = buildRunManifest({
    product,
    gitSha: git.gitSha,
    dirty: git.dirty,
    dirtyFiles: git.dirtyFiles,
    startedAt,
    dockerImageDigest: dockerImageDigest(product),
    productVersion: await probeProductVersion(product),
    coverageSha: sha256File(resolve("tests/e2e/coverage.json")),
    policySha: sha256File(resolve("src/exposure-policy.json"))
  });
  const manifestPath = resolve(`.e2e-state/${product}/run-manifest.json`);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(
    `[e2e] ${product}: run manifest written (gitSha=${manifest.gitSha.slice(0, 12)}, dirty=${manifest.dirty}, productVersion=${manifest.productVersion ?? "unknown"})\n`
  );
  return manifest;
}

async function waitForProductReady(product) {
  const baseUrl = productUrls()[product];
  const deadline = Date.now() + 180_000;
  // Assigned in both the try and catch arms below before every read; the
  // timeout error reports whichever status was observed last.
  let lastStatus;
  process.stdout.write(`[e2e] ${product}: waiting up to 180s for REST plugins to initialize\n`);
  for (;;) {
    try {
      const response = await fetch(new URL(OPERATIONAL_ENDPOINTS[product], baseUrl), {
        headers: { authorization: adminAuth(product), accept: "application/json" },
        signal: AbortSignal.timeout(5_000)
      });
      lastStatus = `HTTP ${response.status}`;
      // A 401/403 means the application is serving REST, so do not waste the
      // full initialization window when the supplied credential is wrong.
      if (response.ok || response.status === 401 || response.status === 403) {
        process.stdout.write(`[e2e] ${product}: REST application is responding (${lastStatus})\n`);
        return;
      }
    } catch (error) {
      lastStatus = error?.cause?.code ?? error?.message ?? "connection error";
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `${product} REST application did not become ready within 180 seconds (${lastStatus}). ` +
          "The container healthcheck passed, but Atlassian plugins may still be initializing. " +
          "Check docker compose logs, available CPU/memory, license state, and setup wizard completion."
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}

async function testProduct(product) {
  // Clear the invoked-ops journal so every run starts from a clean slate.
  // Without this, the append-only journal accumulates across runs and
  // reconciliation can produce false PASS from a previous run's calls.
  // Stale-evidence cleanup: also remove this product's previous run report
  // and run manifest at the same point, so stale evidence can never survive
  // into reconciliation.
  // Other products' state directories are deliberately left untouched.
  const invokedOpsPath = resolve(`.e2e-state/${product}/invoked-ops.jsonl`);
  if (existsSync(invokedOpsPath)) rmSync(invokedOpsPath);
  const reportPath = resolve(`.e2e-state/${product}/run-report.json`);
  if (existsSync(reportPath)) rmSync(reportPath);
  const manifestPath = resolve(`.e2e-state/${product}/run-manifest.json`);
  if (existsSync(manifestPath)) rmSync(manifestPath);
  const runStartedAt = new Date().toISOString();
  await waitForProductReady(product);
  const manifest = await writeRunManifest(product, runStartedAt);
  process.stdout.write(`[e2e] ${product}: checking license\n`);
  await ensureLicense(product);
  process.stdout.write(`[e2e] ${product}: preparing fixtures and reviewer\n`);
  await run(process.execPath, ["scripts/e2e-prepare.mjs", product]);
  process.stdout.write(`[e2e] ${product}: running built stdio MCP scenarios\n`);
  const fileRoot = resolve(`.e2e-state/files/${product}`);
  mkdirSync(fileRoot, { recursive: true });
  // Invoke the repository-pinned Vitest entrypoint directly. Calling `pnpm
  // exec` here needlessly re-enters Corepack and can fail before the test
  // process starts when a local pnpm signature cannot be refreshed offline.
  let testsPassed = true;
  try {
    await run(
      process.execPath,
      [resolve("node_modules/vitest/vitest.mjs"), "run", "--config", "vitest.e2e.config.ts"],
      {
        ...process.env,
        E2E_PRODUCT: product,
        ATLASSIAN_PRODUCTS: product,
        ATLASSIAN_FILE_ROOT: fileRoot
      }
    );
  } catch {
    testsPassed = false;
    process.stdout.write(
      `[e2e] ${product}: vitest exited with failures — reconciliation and journal scan will still run\n`
    );
  }

  // Embed the run evidence into the vitest JSON report so the report is
  // self-contained and reconciliation can validate it on its own.
  if (existsSync(reportPath)) {
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    writeFileSync(reportPath, `${JSON.stringify(embedManifestInReport(report, manifest))}\n`);
  }

  // Operation-level reconciliation (always runs, even on test failure).
  process.stdout.write(`[e2e] ${product}: reconciling automated operations\n`);
  await run(process.execPath, ["scripts/e2e-reconcile.mjs", product]);

  // Scan cleanup journal for warnings from this run.
  const journalPath = resolve(".e2e-state/cleanup-journal.jsonl");
  if (existsSync(journalPath)) {
    const lines = readFileSync(journalPath, "utf8").split("\n").filter(Boolean);
    const entries = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((entry) => entry && entry.timestamp >= runStartedAt);
    const failures = entries.filter((entry) => entry.status === "cleanup-failed");
    if (failures.length > 0) {
      process.stdout.write(`\n⚠ CLEANUP FAILURES (${failures.length}):\n`);
      for (const f of failures) {
        process.stdout.write(
          `  ${f.product}/${f.resource}/${f.id}: ${f.error ?? "unknown error"}\n`
        );
      }
      throw new Error(
        `${product}: ${failures.length} resource(s) failed to clean up. ` +
          "Check the journal at .e2e-state/cleanup-journal.jsonl for details."
      );
    }
    // Residual sweep failures from this run fail the run by default;
    // --allow-sweep-failures is an exploratory-run escape hatch only.
    const sweepFailures = entries.filter((entry) => entry.status === "sweep-failed");
    if (sweepFailures.length > 0) {
      process.stdout.write(`\n⚠ SWEEP FAILURES (${sweepFailures.length}):\n`);
      for (const f of sweepFailures) {
        process.stdout.write(
          `  ${f.product}/${f.resource}/${f.id}: ${f.error ?? "unknown error"}\n`
        );
      }
      if (!allowSweepFailures) {
        throw new Error(
          `${product}: ${sweepFailures.length} residual resource(s) failed to sweep. ` +
            "Check the journal at .e2e-state/cleanup-journal.jsonl for details. " +
            "Re-run with --allow-sweep-failures for exploratory runs only."
        );
      }
      process.stdout.write(
        "⚠ --allow-sweep-failures: continuing despite sweep failures (exploratory run — not valid release evidence)\n"
      );
    }
  }
  if (!testsPassed) {
    throw new Error(`${product} E2E tests failed — see vitest output above for details`);
  }
}

async function up(product) {
  await run("docker", ["compose", "--profile", product, "up", "-d", "--wait"]);
  await waitForProductReady(product);
}

async function down(product, volumes = false) {
  await run("docker", ["compose", "--profile", product, "down", ...(volumes ? ["--volumes"] : [])]);
}

if (productArg === "all" && action === "test") {
  for (const product of products) {
    process.stdout.write(`[e2e] ${product}: starting its isolated baseline\n`);
    try {
      await up(product);
      await testProduct(product);
    } finally {
      await down(product);
    }
  }
} else {
  const product = products[0];
  if (action === "test") await testProduct(product);
  if (action === "up") await up(product);
  if (action === "down") await down(product);
  if (action === "reset") await down(product, true);
}
