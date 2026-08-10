// Isolation contract: the committed canonical snapshots under
// rule/spec-cache/ and the generated rule/api-inventory-*.json /
// rule/api-inventory-diff.md files must never be modified by this suite.
// Every case that exercises the generator runs it against a disposable copy
// in an fs.mkdtemp workspace via the ATLASSIAN_SPEC_CACHE_DIR /
// ATLASSIAN_INVENTORY_OUT_DIR overrides; read-only cases may read the
// canonical files but must not write them.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { loadSpec } from "../scripts/lib/spec-loader.mjs";
import {
  buildArtifacts,
  driftReport,
  parseBaseline,
  validateSnapshots
} from "../rule/fetch-api-inventory.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(process.cwd());
const products = ["jira", "confluence", "bitbucket"];
const canonicalCacheDir = path.join(root, "rule", "spec-cache");
const temporaries = [];

afterEach(() => {
  while (temporaries.length > 0) {
    fs.rmSync(temporaries.pop(), { recursive: true, force: true });
  }
});

// Copy the canonical spec cache and inventory outputs into a fresh temp
// workspace; all mutating scenarios operate exclusively on this copy.
function makeWorkspace() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-test-"));
  temporaries.push(workspace);
  const cacheDir = path.join(workspace, "spec-cache");
  const outDir = path.join(workspace, "out");
  fs.cpSync(canonicalCacheDir, cacheDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  for (const product of products) {
    fs.copyFileSync(
      path.join(root, "rule", `api-inventory-${product}.json`),
      path.join(outDir, `api-inventory-${product}.json`)
    );
  }
  fs.copyFileSync(
    path.join(root, "rule", "api-inventory-diff.md"),
    path.join(outDir, "api-inventory-diff.md")
  );
  return { workspace, cacheDir, outDir };
}

function workspaceTargets({ cacheDir, outDir }) {
  return [
    ...products.map((product) => path.join(cacheDir, `${product}.json`)),
    path.join(cacheDir, "manifest.json"),
    ...products.map((product) => path.join(outDir, `api-inventory-${product}.json`)),
    path.join(outDir, "api-inventory-diff.md")
  ];
}

// Async spawn, never spawnSync: the child parses multi-MB specs and can run
// for tens of seconds on a loaded CI runner; a sync spawn blocks the vitest
// worker's event loop and trips its RPC heartbeat ("Timeout calling
// onTaskUpdate"), failing the whole run despite green tests.
async function runInventory(workspace, ...args) {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      ["rule/fetch-api-inventory.mjs", ...args],
      {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        env: {
          ...process.env,
          ATLASSIAN_SPEC_CACHE_DIR: workspace.cacheDir,
          ATLASSIAN_INVENTORY_OUT_DIR: workspace.outDir
        }
      }
    );
    return { status: 0, stdout, stderr };
  } catch (error) {
    return {
      status: error.code ?? 1,
      stdout: error.stdout ?? "",
      stderr: `${error.stderr ?? ""}${error.message}`
    };
  }
}

function backup(files) {
  return new Map(
    files.map((file) => [
      file,
      { bytes: fs.readFileSync(file), mtimeMs: fs.statSync(file).mtimeMs }
    ])
  );
}

describe.sequential("official API inventory", () => {
  it("keeps the verified three-product counts and documented supplements", async () => {
    const snapshots = {};
    for (const product of products) {
      snapshots[product] = await loadSpec(product, { cacheDir: canonicalCacheDir, offline: true });
    }
    const artifacts = buildArtifacts(snapshots);
    expect(
      Object.fromEntries(
        Object.entries(artifacts.specs).map(([product, rows]) => [product, rows.length])
      )
    ).toEqual({ jira: 437, confluence: 176, bitbucket: 572 });
    expect(artifacts.supplements).toHaveLength(6);
    expect(
      Object.fromEntries(
        Object.entries(artifacts.inventories).map(([product, rows]) => [product, rows.length])
      )
    ).toEqual({ jira: 437, confluence: 176, bitbucket: 578 });
    expect(parseBaseline(path.join(root, "rule", "api-inventory-official.md"))).toHaveLength(1141);
  });

  it("emits canonical JSON and deterministic diff output", async () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(canonicalCacheDir, "manifest.json"), "utf8")
    );
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.counts).toMatchObject({
      officialFull: 1191,
      projectBaseline: 1141,
      source: 1120
    });
    expect(fs.readFileSync(path.join(root, "rule", "api-inventory-diff.md"), "utf8")).toContain(
      "## Official full vs source"
    );
  });

  it("rejects fixed-version/count input before any commit is possible", async () => {
    const snapshots = {};
    for (const product of products) {
      snapshots[product] = await loadSpec(product, { cacheDir: canonicalCacheDir, offline: true });
    }
    const artifacts = buildArtifacts(snapshots);
    const invalid = structuredClone(snapshots);
    invalid.jira.info.title = "invalid title";
    expect(() => validateSnapshots(invalid, artifacts)).toThrow(/openapi\/title\/version mismatch/);
  });

  it("fails partial bootstrap without writing", async () => {
    const workspace = makeWorkspace();
    const targets = workspaceTargets(workspace);
    const missing = targets.at(-1);
    const saved = backup(targets);
    fs.renameSync(missing, `${missing}.partial-test`);
    const result = await runInventory(workspace, "--refresh", "--bootstrap", "--offline");
    expect(result.status).not.toBe(0);
    for (const [file, value] of saved)
      if (file !== missing) expect(fs.readFileSync(file)).toEqual(value.bytes);
  }, 60_000);

  it("same-SHA refresh does not change bytes or mtimes", async () => {
    const workspace = makeWorkspace();
    const saved = backup(workspaceTargets(workspace));
    expect((await runInventory(workspace, "--refresh", "--offline")).status).toBe(0);
    for (const [file, value] of saved) {
      expect(fs.readFileSync(file)).toEqual(value.bytes);
      expect(fs.statSync(file).mtimeMs).toBe(value.mtimeMs);
    }
  }, 60_000);

  it("rejects drift without accept and preserves committed files", async () => {
    const workspace = makeWorkspace();
    const targets = workspaceTargets(workspace);
    const jira = path.join(workspace.cacheDir, "jira.json");
    const spec = JSON.parse(fs.readFileSync(jira, "utf8"));
    const firstPath = Object.keys(spec.paths).find((key) =>
      Object.values(spec.paths[key]).some((operation) => operation && typeof operation === "object")
    );
    const firstMethod = Object.keys(spec.paths[firstPath]).find(
      (method) => spec.paths[firstPath][method] && typeof spec.paths[firstPath][method] === "object"
    );
    spec.paths[firstPath][firstMethod].summary =
      `${spec.paths[firstPath][firstMethod].summary ?? ""} schema-only-test`;
    fs.writeFileSync(jira, `${JSON.stringify(spec, null, 2)}\n`);
    const beforeCommit = backup(targets.filter((file) => file !== jira));
    const result = await runInventory(workspace, "--refresh", "--offline");
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/official spec drift detected/);
    for (const [file, value] of beforeCommit) expect(fs.readFileSync(file)).toEqual(value.bytes);
  }, 60_000);

  it("accepts drift and commits a complete snapshot", async () => {
    const workspace = makeWorkspace();
    const jira = path.join(workspace.cacheDir, "jira.json");
    const spec = JSON.parse(fs.readFileSync(jira, "utf8"));
    const firstPath = Object.keys(spec.paths)[0];
    const firstMethod = Object.keys(spec.paths[firstPath]).find(
      (method) => spec.paths[firstPath][method] && typeof spec.paths[firstPath][method] === "object"
    );
    spec.paths[firstPath][firstMethod].summary =
      `${spec.paths[firstPath][firstMethod].summary ?? ""} accepted-drift-test`;
    fs.writeFileSync(jira, `${JSON.stringify(spec, null, 2)}\n`);
    expect((await runInventory(workspace, "--refresh", "--offline", "--accept-drift")).status).toBe(
      0
    );
    const manifest = JSON.parse(
      fs.readFileSync(path.join(workspace.cacheDir, "manifest.json"), "utf8")
    );
    expect(manifest.sources.jira.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(fs.existsSync(path.join(workspace.outDir, "api-inventory-diff.md"))).toBe(true);
  }, 60_000);

  it("reports old and new operation fingerprints for schema-only drift", () => {
    const oldSpec = { paths: { "/x": { get: { summary: "old", responses: {} } } } };
    const newSpec = { paths: { "/x": { get: { summary: "new", responses: {} } } } };
    expect(driftReport({ jira: oldSpec }, { jira: newSpec }, ["jira"])).toMatch(
      /old=[0-9a-f]{64} new=[0-9a-f]{64}/
    );
  });

  it("detects an interrupted/partial transaction with --check", async () => {
    const workspace = makeWorkspace();
    const missing = workspaceTargets(workspace).find((file) =>
      file.endsWith("api-inventory-jira.json")
    );
    fs.unlinkSync(missing);
    expect((await runInventory(workspace, "--offline", "--check")).status).not.toBe(0);
  }, 60_000);

  it("fails generator when cache is missing without attempting network", async () => {
    const workspace = makeWorkspace();
    fs.unlinkSync(path.join(workspace.cacheDir, "jira.json"));
    let result;
    try {
      await execFileAsync(process.execPath, ["scripts/generate-operations.mjs", "--check"], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, ATLASSIAN_SPEC_CACHE_DIR: workspace.cacheDir }
      });
      result = { status: 0, stdout: "", stderr: "" };
    } catch (error) {
      result = {
        status: error.code ?? 1,
        stdout: error.stdout ?? "",
        stderr: `${error.stderr ?? ""}${error.message}`
      };
    }
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/spec cache missing/);
  }, 60_000);
});
