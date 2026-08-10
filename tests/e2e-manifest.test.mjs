import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildRunManifest,
  embedManifestInReport,
  sha256File
} from "../scripts/lib/e2e-manifest.mjs";

const temporaries = [];
afterEach(() => {
  while (temporaries.length > 0) fs.rmSync(temporaries.pop(), { recursive: true, force: true });
});

const validInput = {
  product: "jira",
  gitSha: "a".repeat(40),
  dirty: false,
  startedAt: "2026-08-09T00:00:00.000Z",
  dockerImageDigest: "atlassian/jira-software@sha256:" + "b".repeat(64),
  productVersion: "11.3.5",
  coverageSha: "c".repeat(64),
  policySha: "d".repeat(64)
};

describe("E2E run manifest", () => {
  it("builds a manifest with the full evidence field set", () => {
    const manifest = buildRunManifest(validInput);
    expect(manifest).toEqual({ schemaVersion: 1, ...validInput });
    expect(manifest).not.toHaveProperty("dirtyFiles");
  });

  it("records dirtyFiles (truncated to 20) only when the workspace is dirty", () => {
    const dirtyFiles = Array.from({ length: 30 }, (_, index) => ` M file-${index}.ts`);
    const manifest = buildRunManifest({ ...validInput, dirty: true, dirtyFiles });
    expect(manifest.dirtyFiles).toHaveLength(20);
    expect(manifest.dirtyFiles[0]).toBe(" M file-0.ts");
    expect(manifest.dirtyFiles.at(-1)).toBe(" M file-19.ts");
  });

  it.each([
    ["product", { product: "" }],
    ["gitSha", { gitSha: "" }],
    ["startedAt", { startedAt: 123 }],
    ["coverageSha", { coverageSha: null }],
    ["policySha", { policySha: undefined }],
    ["dirty", { dirty: "no" }],
    ["dockerImageDigest", { dockerImageDigest: 42 }],
    ["productVersion", { productVersion: { version: "1" } }]
  ])("rejects invalid field: %s", (_field, override) => {
    expect(() => buildRunManifest({ ...validInput, ...override })).toThrow(/run manifest field/);
  });

  it("embeds the evidence fields into the vitest run report without dropping results", () => {
    const report = { numTotalTests: 3, testResults: [{ name: "x" }] };
    const manifest = buildRunManifest({ ...validInput, dirty: true, dirtyFiles: [" M a.ts"] });
    const embedded = embedManifestInReport(report, manifest);
    expect(embedded.numTotalTests).toBe(3);
    expect(embedded.testResults).toHaveLength(1);
    for (const field of [
      "product",
      "gitSha",
      "dirty",
      "startedAt",
      "dockerImageDigest",
      "productVersion",
      "coverageSha",
      "policySha",
      "dirtyFiles"
    ]) {
      expect(embedded[field]).toEqual(manifest[field]);
    }
    expect(embedded).not.toHaveProperty("schemaVersion");
  });

  it("hashes file bytes with sha256", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-manifest-test-"));
    temporaries.push(dir);
    const file = path.join(dir, "artifact.json");
    fs.writeFileSync(file, '{"ok":true}\n');
    expect(sha256File(file)).toBe(
      crypto.createHash("sha256").update('{"ok":true}\n').digest("hex")
    );
  });
});
