// Package smoke test: pack the tarball, then install it into an EMPTY
// consumer directory with npm (not pnpm) — simulating a real end user.
// Linking the repository's own node_modules into the unpacked package (the
// previous approach) could mask missing dependency declarations; a real
// install fails hard when any runtime dependency is undeclared.
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isBuiltin } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertAllDistFilesHaveSources } from "./lib/dist-sources.mjs";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = await mkdtemp(join(tmpdir(), "atlassian-server-mcp-smoke-"));
const NPM_RUN_OPTIONS = { maxBuffer: 16 * 1024 * 1024 };

try {
  const { stdout } = await run("npm", ["pack", "--json", "--pack-destination", temp], {
    cwd: root,
    ...NPM_RUN_OPTIONS
  });
  // npm pack runs the prepack script, whose pnpm/tsc banners share stdout
  // with the JSON payload — slice from the first "[" instead of parsing the
  // whole stream.
  const packed = JSON.parse(stdout.slice(stdout.indexOf("[")));
  const filename = packed?.[0]?.filename;
  if (typeof filename !== "string") throw new Error("npm pack did not return a tarball");
  const tarball = join(temp, filename);

  const consumer = join(temp, "consumer");
  await mkdir(consumer, { recursive: true });
  await run("npm", ["init", "-y"], { cwd: consumer, ...NPM_RUN_OPTIONS });
  await run(
    "npm",
    ["install", tarball, "--omit=dev", "--no-audit", "--no-fund", "--loglevel=error"],
    { cwd: consumer, ...NPM_RUN_OPTIONS }
  );

  const installed = join(consumer, "node_modules", "@zaimokuza", "atlassian-server-mcp");
  const packageJson = JSON.parse(await readFile(join(installed, "package.json"), "utf8"));
  const version = packageJson.version;
  if (typeof version !== "string") throw new Error("packed package has no version");

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

  console.log(`OK package smoke: version=${version}, tarball=${filename}`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
