#!/usr/bin/env node
// Local/CI guard: every file in dist/ must map back to a source file under
// src/ (see scripts/lib/dist-sources.mjs). Catches stale build artifacts
// before they leak into the packed tarball. Used by the release workflow's
// tarball content check (with --dist pointing at the unpacked tarball);
// package-smoke applies the same logic to the installed tarball.
import { readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertAllDistFilesHaveSources } from "./lib/dist-sources.mjs";

const args = process.argv.slice(2);
let distArg = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--dist" && typeof args[i + 1] === "string" && args[i + 1].length > 0) {
    distArg = args[i + 1];
    i++;
  } else {
    process.stderr.write("Usage: node scripts/check-dist-sources.mjs [--dist <dir>]\n");
    process.exit(1);
  }
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = distArg ? resolve(distArg) : resolve(root, "dist");
const srcDir = resolve(root, "src");

if (!existsSync(distDir)) {
  console.error(`check-dist-sources: dist/ does not exist — run pnpm build first`);
  process.exit(1);
}

const distFiles = readdirSync(distDir, { recursive: true }).filter((entry) =>
  statSync(join(distDir, entry)).isFile()
);

try {
  assertAllDistFilesHaveSources(distFiles, srcDir, "dist/");
  console.log(`check-dist-sources: OK (${distFiles.length} dist files, all have sources)`);
} catch (error) {
  console.error(`check-dist-sources: FAIL: ${error.message}`);
  process.exit(1);
}
