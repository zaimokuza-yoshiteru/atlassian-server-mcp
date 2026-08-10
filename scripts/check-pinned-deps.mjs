// Dependency pinning gate (supply-chain hardening).
//
// Every direct dependency must be pinned to an exact version — no ^/~
// ranges — so consumers installing the published package resolve the exact
// tree the release was tested against. Every runtime dependency must also
// appear in bundleDependencies so its bytes ship inside the tarball: npm
// ignores a nested npm-shrinkwrap.json, making bundleDependencies the only
// mechanism that also pins transitive dependencies for consumers.
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));

const EXACT =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const failures = [];

for (const section of ["dependencies", "devDependencies", "optionalDependencies"]) {
  for (const [name, spec] of Object.entries(pkg[section] ?? {})) {
    if (!EXACT.test(spec)) {
      failures.push(
        `${section}.${name} is "${spec}" — pin an exact version (e.g. "1.2.3"); ranges let consumers resolve code the release never tested`
      );
    }
  }
}

const runtimeDeps = Object.keys(pkg.dependencies ?? {});
const bundled = pkg.bundleDependencies;
if (!Array.isArray(bundled) || bundled.length === 0) {
  failures.push(
    "bundleDependencies must list every runtime dependency — bundled bytes are what actually lock the consumer install"
  );
} else {
  for (const name of runtimeDeps) {
    if (!bundled.includes(name)) {
      failures.push(
        `runtime dependency "${name}" is not in bundleDependencies — add it, or its transitive tree is resolved by the consumer's npm, unpinned`
      );
    }
  }
  for (const name of bundled) {
    if (!Object.hasOwn(pkg.dependencies ?? {}, name)) {
      failures.push(
        `bundleDependencies lists "${name}" which is not a runtime dependency — bundled code must come from "dependencies"`
      );
    }
  }
}

if (failures.length > 0) {
  console.error(`dependency pinning check failed (${failures.length}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`OK pinned deps: ${runtimeDeps.length} runtime deps exact and bundled`);
