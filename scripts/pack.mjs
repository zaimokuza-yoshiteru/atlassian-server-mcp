// Release packer: builds the npm tarball from a clean STAGING directory.
//
// Packing from the repo root does not work with bundleDependencies under
// pnpm: npm pack dereferences pnpm's symlinked node_modules, dragging
// .pnpm store paths into the tarball and dropping transitive dependencies
// (e.g. @modelcontextprotocol/core) where Node cannot resolve them. The
// staging install uses npm with the exact-pinned dependency list, producing
// real files — the bundled bytes a consumer will actually run.
//
// Usage: node scripts/pack.mjs [--out <dir>]   (default: repo root)
// The caller builds first (pnpm build); this script packs the current dist.
import { existsSync } from "node:fs";
import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertAllDistFilesHaveSources } from "./lib/dist-sources.mjs";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NPM_OPTS = { maxBuffer: 64 * 1024 * 1024 };

const args = process.argv.slice(2);
let out = root;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out" && i + 1 < args.length) {
    out = resolve(args[++i]);
  } else {
    throw new Error(`unknown argument: ${args[i]} (usage: node scripts/pack.mjs [--out <dir>])`);
  }
}

const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const bundled = pkg.bundleDependencies ?? [];
const runtimeDeps = pkg.dependencies ?? {};
if (bundled.length === 0) {
  throw new Error(
    "package.json has no bundleDependencies — run node scripts/check-pinned-deps.mjs"
  );
}

// The staged dist must be current: every file maps back to a source in src/.
const distDir = join(root, "dist");
if (!existsSync(distDir)) throw new Error("dist/ is missing — run pnpm build first");
const distFiles = await readdir(distDir, { recursive: true });
assertAllDistFilesHaveSources(distFiles, join(root, "src"), "dist");

/** Fail when any staged package carries install scripts (supply-chain gate). */
async function assertNoInstallScripts(modulesDir) {
  const offenders = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === ".bin") continue;
      const sub = join(dir, entry.name);
      if (entry.name.startsWith("@")) {
        await walk(sub);
        continue;
      }
      const pkgPath = join(sub, "package.json");
      if (existsSync(pkgPath)) {
        const depPkg = JSON.parse(await readFile(pkgPath, "utf8"));
        const scripts = depPkg.scripts ?? {};
        const hooks = ["preinstall", "install", "postinstall"].filter((hook) => scripts[hook]);
        if (hooks.length > 0) {
          offenders.push(
            `${depPkg.name ?? entry.name}@${depPkg.version ?? "?"} (${hooks.join(", ")})`
          );
        }
      }
      const nested = join(sub, "node_modules");
      if (existsSync(nested)) await walk(nested);
    }
  }
  await walk(modulesDir);
  if (offenders.length > 0) {
    throw new Error(
      `staged dependencies carry install scripts: ${offenders.join(", ")} — review the dependency before allowing it into the bundle`
    );
  }
}

const staging = await mkdtemp(join(tmpdir(), "atlassian-server-mcp-pack-"));
try {
  for (const entry of ["package.json", ...(pkg.files ?? [])]) {
    await cp(join(root, entry), join(staging, entry), { recursive: true });
  }

  // Real npm install of the exact-pinned runtime tree. --ignore-scripts: no
  // dependency executes code at install time here or downstream.
  await run(
    "npm",
    ["install", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund", "--loglevel=error"],
    { cwd: staging, ...NPM_OPTS }
  );

  // Every bundled dependency must be staged at exactly the pinned version,
  // and no staged package may carry install scripts.
  const stagedModules = join(staging, "node_modules");
  for (const name of bundled) {
    const depPkgPath = join(stagedModules, name, "package.json");
    if (!existsSync(depPkgPath)) {
      throw new Error(`bundled dependency ${name} is missing from the staged install`);
    }
    const depPkg = JSON.parse(await readFile(depPkgPath, "utf8"));
    if (depPkg.version !== runtimeDeps[name]) {
      throw new Error(
        `bundled ${name} resolved to ${depPkg.version}, expected the pinned ${runtimeDeps[name]}`
      );
    }
  }
  await assertNoInstallScripts(stagedModules);

  // Pack from staging. --ignore-scripts: staging has no src/, so the prepack
  // build must not run; dist was verified above.
  const { stdout } = await run(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", out],
    { cwd: staging, ...NPM_OPTS }
  );
  const packed = JSON.parse(stdout.slice(stdout.indexOf("[")));
  const entry = packed?.[0];
  if (typeof entry?.filename !== "string") throw new Error("npm pack did not return a tarball");
  const files = (entry.files ?? []).map((file) => file.path);

  if (files.some((file) => file.includes(".pnpm"))) {
    throw new Error("tarball contains .pnpm store paths — pnpm symlink pollution in the bundle");
  }
  if (files.some((file) => file === "package-lock.json")) {
    throw new Error("package-lock.json must never ship in the tarball");
  }
  for (const name of bundled) {
    if (!files.some((file) => file.startsWith(`node_modules/${name}/`))) {
      throw new Error(`tarball is missing the bundled bytes of ${name}`);
    }
  }

  console.log(`OK pack: ${join(out, entry.filename)} (${files.length} files)`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
