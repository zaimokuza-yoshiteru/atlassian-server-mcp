#!/usr/bin/env node
// Verifies that the environment variable names documented in the user wiki
// match the variables the code actually reads.
//
// Code truth: src/config.ts (plus the product list in src/types.ts, from
// which the per-product `${prefix}_URL/_TOKEN/_CA_FILE/_FILE_ROOT` keys are
// derived).
//
// Checked documents (English is authoritative and carries the full reference
// tables):
//   docs/wiki/en/Authentication-and-TLS.md
//   docs/wiki/en/Client-Configuration.md
//
// Rules:
// - A variable named in the docs but never read by the code is a hard
//   failure: a misspelled documented variable is worse than an undocumented
//   one.
// - A variable read by the code but absent from the docs is a warning only.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const CONFIG_FILE = "src/config.ts";
export const TYPES_FILE = "src/types.ts";
export const DOC_FILES = [
  "docs/wiki/en/Authentication-and-TLS.md",
  "docs/wiki/en/Client-Configuration.md"
];

// Product prefixes come from src/types.ts PRODUCTS ("jira" -> "JIRA").
export function extractProductPrefixes(typesSource) {
  const match = typesSource.match(/PRODUCTS\s*=\s*\[([^\]]+)\]/);
  if (!match) throw new Error("cannot locate the PRODUCTS array in src/types.ts");
  const products = [...match[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
  if (products.length === 0) throw new Error("PRODUCTS array in src/types.ts is empty");
  return products.map((product) => product.toUpperCase().replace(/-/g, "_"));
}

// All env keys src/config.ts reads: literal `env.NAME` accesses plus the
// per-product template keys built from `${prefix}_...`.
export function extractCodeEnvKeys(configSource, typesSource) {
  const keys = new Set();
  for (const match of configSource.matchAll(/\benv\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    keys.add(match[1]);
  }
  const prefixes = extractProductPrefixes(typesSource);
  for (const match of configSource.matchAll(/\$\{prefix\}_([A-Z][A-Z0-9_]*)/g)) {
    for (const prefix of prefixes) keys.add(`${prefix}_${match[1]}`);
  }
  // The *_OPREATIONS names are deliberate misspelling rejection traps, not
  // configuration surface; they are not part of the readable key set.
  for (const key of [...keys]) {
    if (key.includes("OPREATIONS")) keys.delete(key);
  }
  return keys;
}

// Env-var-shaped tokens in a markdown document. Note: the misspelled
// ..._OPREATIONS names are intentionally NOT filtered here — a document that
// names a variable the code never reads must fail.
export function extractDocEnvKeys(markdown) {
  const keys = new Set();
  const pattern =
    /\b(?:ATLASSIAN|JIRA|CONFLUENCE|BITBUCKET)_[A-Z0-9_]+\b|\b(?:HTTPS?_PROXY|NO_PROXY|https?_proxy|no_proxy)\b/g;
  for (const match of markdown.matchAll(pattern)) {
    keys.add(match[0]);
  }
  return keys;
}

// docEntries: [{ file, keys: Set<string> }]. Returns { unknown, undocumented }
// where unknown entries fail the check and undocumented entries are warnings.
export function checkEnvDocs(codeKeys, docEntries) {
  const unknown = [];
  for (const { file, keys } of docEntries) {
    for (const key of [...keys].sort()) {
      if (!codeKeys.has(key)) unknown.push({ file, key });
    }
  }
  const documented = new Set(docEntries.flatMap((entry) => [...entry.keys]));
  const undocumented = [...codeKeys].filter((key) => !documented.has(key)).sort();
  return { unknown, undocumented };
}

function main() {
  const configSource = fs.readFileSync(path.join(ROOT, CONFIG_FILE), "utf8");
  const typesSource = fs.readFileSync(path.join(ROOT, TYPES_FILE), "utf8");
  const codeKeys = extractCodeEnvKeys(configSource, typesSource);
  const docEntries = DOC_FILES.map((file) => ({
    file,
    keys: extractDocEnvKeys(fs.readFileSync(path.join(ROOT, file), "utf8"))
  }));
  const { unknown, undocumented } = checkEnvDocs(codeKeys, docEntries);

  for (const key of undocumented) {
    process.stdout.write(`[env-docs] WARNING: ${key} is read by the code but not documented\n`);
  }
  for (const { file, key } of unknown) {
    process.stderr.write(
      `[env-docs] ERROR: ${file} documents ${key}, which the code never reads\n`
    );
  }
  if (unknown.length > 0) {
    process.stderr.write(
      `[env-docs] FAIL: ${unknown.length} documented variable(s) do not exist in the code\n`
    );
    process.exit(1);
  }
  process.stdout.write(
    `[env-docs] OK: ${docEntries.length} document(s) checked, all documented variables exist in the code\n`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
