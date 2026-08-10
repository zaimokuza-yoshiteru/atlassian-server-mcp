import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { checkGeneratedArtifacts } from "../scripts/generate-operations.mjs";

const root = process.cwd();

describe("operation generation pipeline", () => {
  it("contains one deterministic raw registry entry per operation", () => {
    const registry = JSON.parse(
      fs.readFileSync(path.join(root, "src/operations/registry.json"), "utf8")
    );
    const ids = registry.operations.map((operation) => operation.operationId);
    expect(registry.schemaVersion).toBe(1);
    expect(ids).toHaveLength(1120);
    expect(new Set(ids).size).toBe(1120);
    expect(
      registry.operations.every(
        (operation) =>
          operation.product &&
          operation.method &&
          operation.path &&
          typeof operation.summary === "string"
      )
    ).toBe(true);
  });

  it("keeps registry summaries English and preserves Chinese descriptions as summaryZh", () => {
    const CJK = /[㐀-䶿一-鿿豈-﫿]/;
    const registry = JSON.parse(
      fs.readFileSync(path.join(root, "src/operations/registry.json"), "utf8")
    );
    expect(registry.operations.filter((operation) => CJK.test(operation.summary))).toEqual([]);
    const withZh = registry.operations.filter((operation) => operation.summaryZh);
    expect(withZh).toHaveLength(988);
    expect(withZh.every((operation) => CJK.test(operation.summaryZh))).toBe(true);
  });

  it("checks generated TypeScript and registry without writing", () => {
    const result = spawnSync(process.execPath, ["scripts/generate-operations.mjs", "--check"], {
      cwd: root,
      encoding: "utf8"
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("deterministic");
  });

  it("detects mutations in generated TypeScript and registry bytes", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "atlassian-generator-check-"));
    const generated = path.join(directory, "generated.ts");
    const registry = path.join(directory, "registry.json");
    fs.writeFileSync(generated, "generated\n");
    fs.writeFileSync(registry, "registry\n");
    fs.writeFileSync(generated, "manual mutation\n");
    fs.writeFileSync(registry, "manual mutation\n");
    expect(
      checkGeneratedArtifacts({ [generated]: "generated\n", [registry]: "registry\n" })
    ).toEqual([path.relative(root, generated), path.relative(root, registry)]);
  });
});
