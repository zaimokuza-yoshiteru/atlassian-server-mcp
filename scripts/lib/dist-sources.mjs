// Maps packed dist artifacts back to their sources under src/.
// Every dist/**/*.js (and its .js.map / .d.ts / .d.ts.map companions) must
// come from a src/**/*.ts file; dist/**/*.json must be an explicit copy of
// the same path under src/ (e.g. src/exposure-policy.json via
// resolveJsonModule). Anything else is a stale build artifact that must not
// ship in the tarball.
import { existsSync } from "node:fs";
import { join } from "node:path";

function sourceCandidates(rel) {
  if (rel.endsWith(".d.ts.map")) return [rel.slice(0, -".d.ts.map".length) + ".ts"];
  if (rel.endsWith(".d.ts")) return [rel.slice(0, -".d.ts".length) + ".ts"];
  if (rel.endsWith(".js.map")) return [rel.slice(0, -".js.map".length) + ".ts"];
  if (rel.endsWith(".js")) return [rel.slice(0, -".js".length) + ".ts"];
  if (rel.endsWith(".json")) return [rel];
  return [];
}

/**
 * @param {Iterable<string>} distFiles dist-relative file paths
 * @param {string} srcDir absolute path to the source root (src/)
 * @returns {string[]} dist-relative paths with no corresponding source file
 */
export function sourcelessDistFiles(distFiles, srcDir) {
  const sourceless = [];
  for (const file of distFiles) {
    const rel = String(file).replace(/\\/g, "/");
    const candidates = sourceCandidates(rel);
    if (candidates.length === 0) continue;
    if (!candidates.some((candidate) => existsSync(join(srcDir, candidate)))) {
      sourceless.push(rel);
    }
  }
  return sourceless.sort();
}

/** Throw when any dist file has no source; `label` identifies the context. */
export function assertAllDistFilesHaveSources(distFiles, srcDir, label = "dist") {
  const sourceless = sourcelessDistFiles(distFiles, srcDir);
  if (sourceless.length > 0) {
    throw new Error(
      `${label} contains build artifacts with no corresponding source file under src/: ${sourceless.join(", ")} — run pnpm clean && pnpm build and remove the stale sources`
    );
  }
}
