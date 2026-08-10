#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { canonicalizeSpec, loadSpec, PRODUCTS, SPEC_SOURCES } from "../scripts/lib/spec-loader.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RULE = path.join(ROOT, "rule");
// Cache and inventory output locations are overridable so tests can run the
// full generator against a disposable copy (rule/spec-cache/ and the
// generated rule/api-inventory-* files are committed canonical snapshots).
const CACHE_DIR = process.env.ATLASSIAN_SPEC_CACHE_DIR ?? path.join(RULE, "spec-cache");
const INVENTORY_OUT_DIR = process.env.ATLASSIAN_INVENTORY_OUT_DIR ?? RULE;
const BASELINE_DOC = path.join(RULE, "api-inventory-official.md");
const TARGETS = [
  ...PRODUCTS.map((product) => path.join(CACHE_DIR, `${product}.json`)),
  path.join(CACHE_DIR, "manifest.json"),
  ...PRODUCTS.map((product) => path.join(INVENTORY_OUT_DIR, `api-inventory-${product}.json`)),
  path.join(INVENTORY_OUT_DIR, "api-inventory-diff.md")
];

const EXPECTED = {
  jira: {
    count: 437,
    openapi: "3.0.1",
    title: "Jira Software Data Center REST API Reference",
    version: "11.3.8"
  },
  confluence: { count: 176, openapi: "3.0.1", title: "Confluence Data Center", version: "10.2.14" },
  bitbucket: { count: 572, openapi: "3.0.1", title: "Bitbucket Data Center", version: "10.4" },
  supplements: 6,
  baseline: 1141
};
const args = new Set(process.argv.slice(2));
const refresh = args.has("--refresh");
const bootstrap = args.has("--bootstrap");
const acceptDrift = args.has("--accept-drift");
const offline = args.has("--offline") || !refresh;
const check = args.has("--check");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function identity(row) {
  return `${row.product}|${row.method}|${row.path}`;
}
function sortRows(rows) {
  return [...rows].sort((a, b) => identity(a).localeCompare(identity(b)));
}
function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, content, "utf8");
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function parseBaseline(file) {
  const rows = [];
  const expression = /^\| (GET|POST|PUT|PATCH|DELETE) \| (\/[^|]+) \| ([^|]*) \|/;
  let product = "";
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (line.startsWith("# 第一部分：Jira")) product = "jira";
    if (line.startsWith("# 第二部分：Confluence")) product = "confluence";
    if (line.startsWith("# 第三部分：Bitbucket")) product = "bitbucket";
    const match = line.match(expression);
    if (!match) continue;
    const pathName = match[2].trim();
    rows.push({ product, method: match[1], path: pathName, summary: match[3].trim() });
  }
  return sortRows(rows);
}
function sourceRows() {
  const rows = [];
  const expression = /^([a-z]+(?:\.[a-z0-9-]+)+) - (GET|POST|PUT|PATCH|DELETE) (\/\S+) - (.*)$/;
  let product = "";
  let section = "";
  for (const line of fs.readFileSync(path.join(RULE, "source.md"), "utf8").split(/\r?\n/)) {
    if (line.startsWith("# ")) product = line.slice(2).trim().toLowerCase();
    if (line.startsWith("## ")) section = line.slice(3).trim();
    const match = line.match(expression);
    if (match && (section === "暴露在聚合方法中" || section === "完全不提供的功能"))
      rows.push({ product, method: match[2], path: match[3], summary: match[4] });
  }
  return sortRows(rows);
}
function specRows(product, spec) {
  const rows = [];
  for (const [pathName, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of ["get", "post", "put", "patch", "delete", "head", "options", "trace"]) {
      const operation = pathItem?.[method];
      if (!operation || typeof operation !== "object") continue;
      const canonicalPath =
        product === "jira" && !pathName.startsWith("/rest/")
          ? `/rest${pathName}`
          : product === "bitbucket" && !pathName.startsWith("/rest/")
            ? `/rest${pathName}`
            : pathName;
      rows.push({
        product,
        method: method.toUpperCase(),
        path: canonicalPath,
        summary: operation.summary ?? "",
        sourceKind: "openapi"
      });
    }
  }
  return sortRows(rows);
}
function addScope(row) {
  if (row.product !== "jira") return { ...row, inProjectBaseline: baselineSet.has(identity(row)) };
  if (row.path.startsWith("/rest/api/2/"))
    return { ...row, inProjectBaseline: baselineSet.has(identity(row)) };
  if (row.path.startsWith("/rest/agile/1.0/"))
    return { ...row, inProjectBaseline: false, scopeReason: "jira-software-agile" };
  if (row.path.startsWith("/rest/auth/1/"))
    return { ...row, inProjectBaseline: false, scopeReason: "jira-auth-session" };
  throw new Error(`unknown Jira path prefix: ${row.path}`);
}

const baselineRows = parseBaseline(BASELINE_DOC);
const baselineSet = new Set(baselineRows.map(identity));
const source = sourceRows();

async function loadSnapshots() {
  const snapshots = {};
  for (const product of PRODUCTS) {
    snapshots[product] = await loadSpec(product, {
      cacheDir: CACHE_DIR,
      refresh: refresh && !offline,
      offline
    });
  }
  return snapshots;
}

function buildArtifacts(snapshots) {
  const specs = Object.fromEntries(
    PRODUCTS.map((product) => [product, specRows(product, snapshots[product])])
  );
  const supplements = baselineRows
    .filter((row) => row.product === "bitbucket" && row.path.startsWith("/rest/zdu/"))
    .map((row) => ({ ...row, sourceKind: "documented-supplement" }));
  const full = Object.fromEntries(
    PRODUCTS.map((product) => [
      product,
      sortRows([...(specs[product] ?? []), ...(product === "bitbucket" ? supplements : [])]).map(
        addScope
      )
    ])
  );
  const inventories = Object.fromEntries(PRODUCTS.map((product) => [product, full[product]]));
  const sourceIds = new Set(source.map(identity));
  const fullIds = new Set(Object.values(full).flat().map(identity));
  const projectIds = new Set(baselineRows.map(identity));
  const missingFromSource = [...fullIds].filter((id) => !sourceIds.has(id)).sort();
  const sourceOnly = [...sourceIds].filter((id) => !fullIds.has(id)).sort();
  const outsideBaseline = [...fullIds].filter((id) => !projectIds.has(id)).sort();
  const inProjectIds = new Set(
    Object.values(full)
      .flat()
      .filter((row) => row.inProjectBaseline)
      .map(identity)
  );
  const baselineMismatch = [...projectIds]
    .filter((id) => !inProjectIds.has(id))
    .concat([...inProjectIds].filter((id) => !projectIds.has(id)))
    .sort();
  if (baselineSet.size !== EXPECTED.baseline)
    throw new Error(
      `baseline triple count mismatch: expected ${EXPECTED.baseline}, got ${baselineSet.size}`
    );
  if (baselineMismatch.length)
    throw new Error(
      `project baseline triple mismatch: ${baselineMismatch.slice(0, 10).join(", ")}`
    );
  const diff =
    [
      "# API inventory diff",
      "",
      `- Official full inventory: ${fullIds.size}`,
      `- Project baseline: ${projectIds.size}`,
      `- Source registry: ${sourceIds.size}`,
      "",
      "## Official full vs source",
      "",
      ...diffLines(missingFromSource, "official-only"),
      ...diffLines(sourceOnly, "source-only"),
      "",
      "## Project baseline vs source",
      "",
      ...diffLines([...projectIds].filter((id) => !sourceIds.has(id)).sort(), "baseline-only"),
      ...diffLines([...sourceIds].filter((id) => !projectIds.has(id)).sort(), "source-only"),
      "",
      "## Official outside project baseline",
      "",
      ...diffLines(outsideBaseline, "official-outside-baseline")
    ].join("\n") + "\n";
  return { inventories, diff, specs, supplements };
}
function diffLines(ids, label) {
  return ids.length ? ids.map((id) => `- ${label}: ${id}`) : [`- ${label}: (none)`];
}
function validateSnapshots(snapshots, artifacts) {
  const specCounts = Object.fromEntries(
    PRODUCTS.map((product) => [product, artifacts.specs[product].length])
  );
  if (
    specCounts.jira !== EXPECTED.jira.count ||
    specCounts.confluence !== EXPECTED.confluence.count ||
    specCounts.bitbucket !== EXPECTED.bitbucket.count ||
    artifacts.supplements.length !== EXPECTED.supplements ||
    baselineRows.length !== EXPECTED.baseline
  )
    throw new Error(
      `inventory count mismatch: ${JSON.stringify({ specCounts, supplements: artifacts.supplements.length, baseline: baselineRows.length })}`
    );
  for (const product of PRODUCTS) {
    const expected = EXPECTED[product];
    if (
      snapshots[product].openapi !== expected.openapi ||
      snapshots[product].info.title !== expected.title ||
      snapshots[product].info.version !== expected.version
    )
      throw new Error(
        `${product} spec openapi/title/version mismatch: ${snapshots[product].openapi} ${snapshots[product].info.title} ${snapshots[product].info.version}`
      );
  }
}
function operationFingerprints(spec) {
  const result = new Map();
  for (const [pathName, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of ["get", "post", "put", "patch", "delete", "head", "options", "trace"]) {
      const operation = pathItem?.[method];
      if (!operation || typeof operation !== "object") continue;
      const fingerprint = {
        summary: operation.summary ?? null,
        operationId: operation.operationId ?? null,
        tags: operation.tags ?? [],
        deprecated: operation.deprecated ?? false,
        parameters: operation.parameters ?? [],
        requestBody: operation.requestBody ?? null,
        responses: operation.responses ?? {}
      };
      result.set(`${method.toUpperCase()} ${pathName}`, sha256(canonicalizeSpec(fingerprint)));
    }
  }
  return result;
}
function driftReport(oldSpecs, newSpecs, products, oldHashes = {}) {
  const lines = ["official spec drift detected", "", "SHA changes:"];
  for (const product of products)
    lines.push(
      `- ${product}: ${oldHashes[product] ?? sha256(canonicalizeSpec(oldSpecs[product]))} -> ${sha256(canonicalizeSpec(newSpecs[product]))}`
    );
  for (const product of products) {
    const oldIds = new Set(operationFingerprints(oldSpecs[product]).keys());
    const newIds = new Set(operationFingerprints(newSpecs[product]).keys());
    const added = [...newIds].filter((id) => !oldIds.has(id)).sort();
    const removed = [...oldIds].filter((id) => !newIds.has(id)).sort();
    const oldFp = operationFingerprints(oldSpecs[product]);
    const newFp = operationFingerprints(newSpecs[product]);
    const changed = [...newIds]
      .filter((id) => oldFp.has(id) && oldFp.get(id) !== newFp.get(id))
      .sort();
    lines.push(
      ``,
      `${product} endpoint identity diff:`,
      ...diffLines(added, "added"),
      ...diffLines(removed, "removed"),
      `${product} operation schema fingerprint diff:`
    );
    if (changed.length)
      for (const id of changed)
        lines.push(`- changed: ${id} old=${oldFp.get(id)} new=${newFp.get(id)}`);
    else lines.push("- changed: (none)");
  }
  return lines.join("\n");
}

async function main() {
  if (acceptDrift && (!refresh || !args.has("--accept-drift")))
    throw new Error("--accept-drift requires --refresh");
  if (bootstrap && !refresh) throw new Error("--bootstrap requires --refresh");
  const present = TARGETS.filter(fs.existsSync).length;
  if (bootstrap && present !== 0 && present !== TARGETS.length)
    throw new Error(`partial inventory snapshot: ${present}/${TARGETS.length} target files exist`);
  if (bootstrap && present === TARGETS.length)
    throw new Error("--bootstrap is only allowed when all target files are absent");
  const previousSnapshots = Object.fromEntries(
    PRODUCTS.filter((product) => fs.existsSync(path.join(CACHE_DIR, `${product}.json`))).map(
      (product) => [product, readJson(path.join(CACHE_DIR, `${product}.json`))]
    )
  );
  const snapshots = await loadSnapshots();
  const artifacts = buildArtifacts(snapshots);
  const counts = Object.fromEntries(
    PRODUCTS.map((product) => [product, artifacts.inventories[product].length])
  );
  validateSnapshots(snapshots, artifacts);
  const specBytes = Object.fromEntries(
    PRODUCTS.map((product) => [product, canonicalizeSpec(snapshots[product])])
  );
  const specHashes = Object.fromEntries(
    PRODUCTS.map((product) => [product, sha256(specBytes[product])])
  );
  const inventoryBytes = Object.fromEntries(
    PRODUCTS.map((product) => [product, canonicalizeSpec(artifacts.inventories[product])])
  );
  const inventoryHashes = Object.fromEntries(
    PRODUCTS.map((product) => [product, sha256(inventoryBytes[product])])
  );
  const diffHash = sha256(artifacts.diff);
  const oldManifestFile = path.join(CACHE_DIR, "manifest.json");
  const oldManifest = fs.existsSync(oldManifestFile) ? readJson(oldManifestFile) : null;
  const changed =
    oldManifest &&
    PRODUCTS.some((product) => oldManifest.sources?.[product]?.sha256 !== specHashes[product]);
  if (changed && !acceptDrift) {
    const changedProducts = PRODUCTS.filter(
      (product) => oldManifest.sources?.[product]?.sha256 !== specHashes[product]
    );
    throw new Error(
      `${driftReport(previousSnapshots, snapshots, changedProducts, Object.fromEntries(changedProducts.map((product) => [product, oldManifest.sources[product].sha256])))}\n\nRerun with --refresh --accept-drift after review.`
    );
  }
  const manifest = {
    schemaVersion: 1,
    sources: Object.fromEntries(
      PRODUCTS.map((product) => [
        product,
        {
          url: SPEC_SOURCES[product].url,
          openapi: snapshots[product].openapi ?? null,
          version: snapshots[product].info?.version ?? null,
          sha256: specHashes[product]
        }
      ])
    ),
    inventories: inventoryHashes,
    diffSha256: diffHash,
    counts: {
      specDiscovered: Object.fromEntries(PRODUCTS.map((p) => [p, artifacts.specs[p].length])),
      documentedSupplements: artifacts.supplements.length,
      officialFull: Object.values(counts).reduce((a, n) => a + n, 0),
      projectBaseline: baselineRows.length,
      source: source.length
    }
  };
  if (check) {
    for (const file of TARGETS)
      if (!fs.existsSync(file)) throw new Error(`missing generated inventory file: ${file}`);
    for (const product of PRODUCTS) {
      const file = path.join(INVENTORY_OUT_DIR, `api-inventory-${product}.json`);
      if (sha256(fs.readFileSync(file)) !== inventoryHashes[product])
        throw new Error(`inventory drift: ${product}`);
      if (sha256(fs.readFileSync(path.join(CACHE_DIR, `${product}.json`))) !== specHashes[product])
        throw new Error(`spec cache drift: ${product}`);
    }
    if (
      fs.readFileSync(path.join(INVENTORY_OUT_DIR, "api-inventory-diff.md"), "utf8") !==
      artifacts.diff
    )
      throw new Error("diff drift");
    const committed = readJson(oldManifestFile);
    if (
      JSON.stringify({ ...committed, fetchedAt: undefined }) !==
      JSON.stringify({ ...manifest, fetchedAt: undefined })
    )
      throw new Error("manifest drift");
    console.log(`OK inventory check: ${JSON.stringify(manifest.counts)}`);
    return;
  }
  const missingTarget = TARGETS.some((file) => !fs.existsSync(file));
  if (!oldManifest || changed || missingTarget) {
    for (const product of PRODUCTS)
      atomicWrite(path.join(CACHE_DIR, `${product}.json`), specBytes[product]);
    for (const product of PRODUCTS)
      atomicWrite(
        path.join(INVENTORY_OUT_DIR, `api-inventory-${product}.json`),
        inventoryBytes[product]
      );
    atomicWrite(path.join(INVENTORY_OUT_DIR, "api-inventory-diff.md"), artifacts.diff);
    const committedManifest = { ...manifest, fetchedAt: new Date().toISOString() };
    atomicWrite(oldManifestFile, `${JSON.stringify(committedManifest, null, 2)}\n`);
  }
  console.log(`OK inventory generated: ${JSON.stringify(manifest.counts)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  });

export {
  canonicalizeSpec,
  identity,
  parseBaseline,
  sourceRows,
  specRows,
  buildArtifacts,
  validateSnapshots,
  driftReport
};
