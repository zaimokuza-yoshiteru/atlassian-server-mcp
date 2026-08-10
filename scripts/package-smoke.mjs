// Package smoke test: pack the tarball via scripts/pack.mjs (staging pack —
// repo-root npm pack breaks bundleDependencies under pnpm), then install it
// into an EMPTY consumer directory with npm (not pnpm) — simulating a real
// end user. Linking the repository's own node_modules into the unpacked
// package (the previous approach) could mask missing dependency
// declarations; a real install fails hard when any runtime dependency is
// undeclared.
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isBuiltin } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertAllDistFilesHaveSources } from "./lib/dist-sources.mjs";
import { npmArgs } from "./lib/npm-cli.mjs";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = await mkdtemp(join(tmpdir(), "atlassian-server-mcp-smoke-"));
const NPM_RUN_OPTIONS = { maxBuffer: 16 * 1024 * 1024 };

try {
  // Staging pack: real npm-installed node_modules, bundled deps included,
  // dist verified against src/. Prints "OK pack: <path> (N files)".
  await run(process.execPath, [join(root, "scripts", "pack.mjs"), "--out", temp], {
    cwd: root,
    ...NPM_RUN_OPTIONS
  });
  const tarballs = (await readdir(temp)).filter((file) => file.endsWith(".tgz"));
  if (tarballs.length !== 1)
    throw new Error(`expected exactly one tarball, got: ${tarballs.join(", ")}`);
  const tarball = join(temp, tarballs[0]);

  const consumer = join(temp, "consumer");
  await mkdir(consumer, { recursive: true });
  await run(process.execPath, npmArgs(["init", "-y"]), { cwd: consumer, ...NPM_RUN_OPTIONS });
  // --offline with a fresh, empty cache is the acid test for the bundle: if
  // any runtime byte were missing from the tarball, npm would need the
  // registry (or a warm cache) and this install would fail.
  const emptyCache = join(temp, "npm-cache");
  await run(
    process.execPath,
    npmArgs([
      "install",
      tarball,
      "--omit=dev",
      "--offline",
      "--cache",
      emptyCache,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--loglevel=error"
    ]),
    { cwd: consumer, ...NPM_RUN_OPTIONS }
  );

  const installed = join(consumer, "node_modules", "@zaimokuza", "atlassian-server-mcp");
  const packageJson = JSON.parse(await readFile(join(installed, "package.json"), "utf8"));
  const version = packageJson.version;
  if (typeof version !== "string") throw new Error("packed package has no version");

  // Bundle lock: the consumer must end up with exactly the pinned versions,
  // served from the bundled bytes nested inside the package — not from a
  // registry re-resolution. npm ls must exit 0: an UNMET transitive
  // dependency (e.g. @modelcontextprotocol/core) fails here.
  const rootPkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const bundledModules = join(installed, "node_modules");
  for (const [name, pinned] of Object.entries(rootPkg.dependencies ?? {})) {
    const depPkg = JSON.parse(await readFile(join(bundledModules, name, "package.json"), "utf8"));
    if (depPkg.version !== pinned) {
      throw new Error(
        `consumer installed ${name}@${depPkg.version}, expected the pinned ${pinned} — bundleDependencies is not locking the tree`
      );
    }
  }
  await run(process.execPath, npmArgs(["ls", "--all", "--omit=dev"]), {
    cwd: consumer,
    ...NPM_RUN_OPTIONS
  });

  // Dependency-declaration consistency: every bare module specifier the
  // packed runtime code imports must be declared in the packed package's
  // dependencies. A pure install/import check is blind when another
  // dependency pulls the same package in transitively (e.g. zod via
  // @modelcontextprotocol/server), so the declarations are verified against
  // what the dist code actually imports.
  const packedDependencies = packageJson.dependencies ?? {};
  const distDir = join(installed, "dist");
  const distFiles = await readdir(distDir, { recursive: true });

  // Stale-artifact guard: every packed dist file must map back to a source
  // file under this repo's src/ — a leftover like operation-policy.js (no
  // src/operation-policy.ts) must never ship.
  assertAllDistFilesHaveSources(distFiles, join(root, "src"), "packed tarball");

  const missingDeclarations = new Set();
  const SPECIFIER = /\b(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
  for (const file of distFiles) {
    if (!file.endsWith(".js")) continue;
    const source = await readFile(join(distDir, file), "utf8");
    for (const match of source.matchAll(SPECIFIER)) {
      const specifier = match[1];
      // Module specifiers never contain whitespace, commas, or quotes; such
      // matches are string data (e.g. a query parameter literally named
      // "from" in the generated operation manifests), not imports.
      if (/[\s,"']/.test(specifier)) continue;
      if (specifier.startsWith(".") || isBuiltin(specifier)) continue;
      const name = specifier.startsWith("@")
        ? specifier.split("/").slice(0, 2).join("/")
        : specifier.split("/")[0];
      if (!Object.hasOwn(packedDependencies, name)) missingDeclarations.add(name);
    }
  }
  if (missingDeclarations.size > 0) {
    throw new Error(
      `packed runtime imports undeclared dependencies: ${[...missingDeclarations].sort().join(", ")} — declare them in package.json "dependencies"`
    );
  }

  for (const required of ["dist/cli.js", "dist/index.js", "dist/exposure-policy.json"]) {
    await readFile(join(installed, required));
  }

  // The bin must run and --help must exit 0.
  const help = await run(
    join(consumer, "node_modules", ".bin", "atlassian-server-mcp"),
    ["--help"],
    { cwd: consumer, ...NPM_RUN_OPTIONS }
  );
  if (!help.stdout.includes("atlassian-server-mcp")) throw new Error("packed CLI --help failed");

  // The package must import cleanly from the consumer project (this resolves
  // the full runtime dependency tree) and its VERSION must match.
  const checkScript = join(consumer, "check.mjs");
  await writeFile(
    checkScript,
    [
      'import { VERSION } from "@zaimokuza/atlassian-server-mcp";',
      `if (VERSION !== ${JSON.stringify(version)}) {`,
      "  console.error(`entry VERSION ${VERSION} does not match " + JSON.stringify(version) + "`);",
      "  process.exit(1);",
      "}",
      "console.log(`import OK, VERSION=${VERSION}`);"
    ].join("\n")
  );
  await run(process.execPath, [checkScript], { cwd: consumer, ...NPM_RUN_OPTIONS });

  console.log(`OK package smoke: version=${version}, tarball=${tarballs[0]}`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
