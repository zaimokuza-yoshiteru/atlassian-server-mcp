import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalizeSpec, extractEmbeddedSpec, loadSpec } from "../scripts/lib/spec-loader.mjs";

describe("spec loader", () => {
  it("canonicalizes object keys recursively while preserving array order", () => {
    expect(canonicalizeSpec({ z: { b: 2, a: 1 }, a: [{ z: 3, a: 4 }, 5] })).toBe(
      `{\n  "a": [\n    {\n      "a": 4,\n      "z": 3\n    },\n    5\n  ],\n  "z": {\n    "a": 1,\n    "b": 2\n  }\n}\n`
    );
  });
  it("extracts the embedded OpenAPI object without parsing surrounding HTML", () => {
    const html = '<script>"schema":{"openapi":"3.0.1","paths":{}}</script>';
    expect(JSON.parse(extractEmbeddedSpec(html))).toEqual({ openapi: "3.0.1", paths: {} });
  });

  it("loads an existing cache in offline mode", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "atlassian-spec-loader-"));
    fs.writeFileSync(
      path.join(directory, "jira.json"),
      JSON.stringify({ openapi: "3.0.1", info: { title: "Jira", version: "1" }, paths: {} })
    );
    await expect(loadSpec("jira", { cacheDir: directory, offline: true })).resolves.toMatchObject({
      openapi: "3.0.1"
    });
  });

  it("fails closed when an offline cache is missing", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "atlassian-spec-loader-"));
    await expect(loadSpec("jira", { cacheDir: directory, offline: true })).rejects.toThrow(
      "spec cache missing for jira"
    );
  });

  it("requires explicit refresh before any network access and never writes the candidate cache", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "atlassian-spec-loader-"));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          schema: {
            openapi: "3.0.1",
            info: { title: "Jira Software Data Center REST API Reference", version: "11.3.8" },
            paths: {}
          }
        }),
        { headers: { "content-type": "text/html" } }
      );
    try {
      await expect(loadSpec("jira", { cacheDir: directory })).rejects.toThrow("explicit --refresh");
      await expect(loadSpec("jira", { cacheDir: directory, refresh: true })).resolves.toMatchObject(
        { openapi: "3.0.1" }
      );
      expect(fs.existsSync(path.join(directory, "jira.json"))).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("aborts a refresh request at the configured timeout", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "atlassian-spec-loader-"));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_url, options) =>
      await new Promise((_, reject) => {
        options.signal.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true
        });
      });
    try {
      await expect(
        loadSpec("bitbucket", { cacheDir: directory, refresh: true, timeoutMs: 1 })
      ).rejects.toThrow("aborted");
      expect(fs.readdirSync(directory)).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
