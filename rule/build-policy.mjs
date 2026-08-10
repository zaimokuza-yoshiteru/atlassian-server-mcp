#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_FILE = path.join(ROOT, "rule", "source.md");
const REGISTRY_FILE = path.join(ROOT, "src", "operations", "registry.json");
const POLICY_FILE = path.join(ROOT, "src", "exposure-policy.json");
const TIERS = ["read", "safe", "risky", "max"];
const VALID_SECTIONS = new Set(["暴露在聚合方法中", "完全不提供的功能"]);
const PRODUCTS = new Set(["jira", "confluence", "bitbucket"]);
const OPERATION_LINE =
  /^([a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+) - (GET|POST|PUT|PATCH|DELETE) (\/\S+) - (.+)$/;
const OPERATION_SHAPE = /^[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+\s+-\s+/;

function sourceSha256(source) {
  return crypto.createHash("sha256").update(source, "utf8").digest("hex");
}
function canonicalPolicy(policy) {
  return `${JSON.stringify(policy, null, 2)}\n`;
}
function readRegistry() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.operations))
    throw new Error("registry.json must use schemaVersion 1 and contain operations[]");
  const ids = new Set();
  const tuples = new Set();
  for (const operation of registry.operations) {
    if (!operation.operationId || !operation.product || !operation.method || !operation.path)
      throw new Error("registry operation has missing identity field");
    const tuple = `${operation.product}|${operation.method}|${operation.path}`;
    if (ids.has(operation.operationId))
      throw new Error(`duplicate registry operationId: ${operation.operationId}`);
    if (tuples.has(tuple)) throw new Error(`duplicate registry method/path: ${tuple}`);
    ids.add(operation.operationId);
    tuples.add(tuple);
  }
  return registry.operations;
}

function parseSource(source) {
  const entries = [];
  let product = "";
  let section = "";
  let tier = null;
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("# ")) {
      const heading = line.slice(2).trim();
      product = heading.toLowerCase();
      if (!PRODUCTS.has(product))
        throw new Error(`unknown product title at source.md:${index + 1}: ${heading}`);
      section = "";
      tier = null;
      continue;
    }
    if (line.startsWith("## ")) {
      section = line.slice(3).trim();
      tier = null;
      continue;
    }
    if (line.startsWith("### ")) {
      const heading = line.slice(4).trim();
      if (section === "暴露在聚合方法中") {
        if (!TIERS.includes(heading))
          throw new Error(`unknown tier at source.md:${index + 1}: ${heading}`);
        tier = heading;
      } else if (section === "完全不提供的功能") {
        throw new Error(
          `unexpected tier under permanent-excluded section at source.md:${index + 1}`
        );
      }
      continue;
    }
    if (!line.trim() || line.trim().startsWith(">") || line.trim().startsWith("<!--")) continue;
    const operationMatch = line.match(OPERATION_LINE);
    if (operationMatch) {
      if (!VALID_SECTIONS.has(section))
        throw new Error(`misplaced operation at source.md:${index + 1}: ${operationMatch[1]}`);
      if (section === "暴露在聚合方法中" && !tier)
        throw new Error(`operation has no tier at source.md:${index + 1}: ${operationMatch[1]}`);
      entries.push({
        operationId: operationMatch[1],
        product,
        method: operationMatch[2],
        path: operationMatch[3],
        tier: section === "完全不提供的功能" ? null : tier,
        line: index + 1
      });
      continue;
    }
    if (VALID_SECTIONS.has(section)) {
      throw new Error(`unparseable content in valid source section at source.md:${index + 1}`);
    }
    if (!VALID_SECTIONS.has(section) && OPERATION_SHAPE.test(line))
      throw new Error(`misplaced operation at source.md:${index + 1}`);
  }
  return entries;
}

function buildPolicy(source, registry) {
  const entries = parseSource(source);
  const registryById = new Map(registry.map((operation) => [operation.operationId, operation]));
  const seen = new Set();
  const tiers = {};
  const excluded = [];
  for (const entry of entries) {
    if (!registryById.has(entry.operationId))
      throw new Error(`unknown operation in source.md:${entry.operationId}`);
    if (seen.has(entry.operationId))
      throw new Error(`duplicate operation in source.md:${entry.operationId}`);
    seen.add(entry.operationId);
    const operation = registryById.get(entry.operationId);
    if (
      operation.product !== entry.product ||
      operation.method !== entry.method ||
      operation.path !== entry.path
    )
      throw new Error(
        `registry mismatch for ${entry.operationId}: source=${entry.method} ${entry.path}, registry=${operation.method} ${operation.path}`
      );
    if (entry.tier) tiers[entry.operationId] = entry.tier;
    else excluded.push(entry.operationId);
  }
  const missing = registry
    .filter((operation) => !seen.has(operation.operationId))
    .map((operation) => operation.operationId);
  if (missing.length)
    throw new Error(
      `source.md does not cover registry operations: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ` (+${missing.length - 5})` : ""}`
    );
  return {
    schemaVersion: 1,
    sourceSha256: sourceSha256(source),
    tiers: Object.fromEntries(Object.entries(tiers).sort(([a], [b]) => a.localeCompare(b))),
    excluded: [...excluded].sort()
  };
}

function run({ check = false } = {}) {
  const source = fs.readFileSync(SOURCE_FILE, "utf8");
  const policy = buildPolicy(source, readRegistry());
  const rendered = canonicalPolicy(policy);
  if (check) {
    if (!fs.existsSync(POLICY_FILE) || fs.readFileSync(POLICY_FILE, "utf8") !== rendered)
      throw new Error("exposure-policy.json is stale");
    console.log(
      `OK policy check: tiers=${Object.keys(policy.tiers).length} excluded=${policy.excluded.length}`
    );
    return policy;
  }
  fs.writeFileSync(POLICY_FILE, rendered, "utf8");
  console.log(
    `OK policy generated: tiers=${Object.keys(policy.tiers).length} excluded=${policy.excluded.length}`
  );
  return policy;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run({ check: process.argv.includes("--check") });
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}

export { TIERS, buildPolicy, canonicalPolicy, parseSource, readRegistry, run, sourceSha256 };
