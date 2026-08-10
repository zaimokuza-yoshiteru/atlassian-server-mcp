// Guards the stale-build-artifact check used by package-smoke and the
// release workflow: a dist file with no corresponding source must fail the
// check, and removing it must make the check pass again.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assertAllDistFilesHaveSources,
  sourcelessDistFiles
} from "../scripts/lib/dist-sources.mjs";

let fixture;

function touch(root, rel) {
  const path = join(root, ...rel.split("/"));
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, "x");
}

beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), "dist-sources-test-"));
  mkdirSync(join(fixture, "src", "operations"), { recursive: true });
  touch(fixture, "src/foo.ts");
  touch(fixture, "src/exposure-policy.json");
  touch(fixture, "src/operations/registry.json");
});

afterEach(() => {
  rmSync(fixture, { recursive: true, force: true });
});

const srcDir = () => join(fixture, "src");

describe("dist source mapping", () => {
  it("accepts dist files that map to src sources", () => {
    const distFiles = [
      "foo.js",
      "foo.js.map",
      "foo.d.ts",
      "foo.d.ts.map",
      "exposure-policy.json",
      "operations/registry.json"
    ];
    expect(sourcelessDistFiles(distFiles, srcDir())).toEqual([]);
    expect(() => assertAllDistFilesHaveSources(distFiles, srcDir())).not.toThrow();
  });

  it("fails on a sourceless stale artifact, then passes after cleanup", () => {
    const distFiles = [
      "foo.js",
      "operation-policy.js",
      "operation-policy.js.map",
      "operation-policy.d.ts",
      "operation-policy.d.ts.map",
      "operation-policy.json"
    ];
    expect(sourcelessDistFiles(distFiles, srcDir())).toEqual([
      "operation-policy.d.ts",
      "operation-policy.d.ts.map",
      "operation-policy.js",
      "operation-policy.js.map",
      "operation-policy.json"
    ]);
    expect(() => assertAllDistFilesHaveSources(distFiles, srcDir())).toThrow(
      /operation-policy\.js/
    );

    const cleaned = distFiles.filter((file) => !file.startsWith("operation-policy."));
    expect(sourcelessDistFiles(cleaned, srcDir())).toEqual([]);
    expect(() => assertAllDistFilesHaveSources(cleaned, srcDir())).not.toThrow();
  });

  it("normalizes Windows path separators", () => {
    expect(sourcelessDistFiles(["operations\\registry.json"], srcDir())).toEqual([]);
    expect(sourcelessDistFiles(["operations\\stale.js"], srcDir())).toEqual([
      "operations/stale.js"
    ]);
  });
});
