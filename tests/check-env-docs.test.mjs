import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CONFIG_FILE,
  DOC_FILES,
  TYPES_FILE,
  checkEnvDocs,
  extractCodeEnvKeys,
  extractDocEnvKeys,
  extractProductPrefixes
} from "../scripts/check-env-docs.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TYPES_FIXTURE = 'export const PRODUCTS = ["jira", "confluence"] as const;';

const CONFIG_FIXTURE = `
const urlName = \`\${prefix}_URL\`;
const rawUrl = env[urlName];
const token = env[\`\${prefix}_TOKEN\`]?.trim();
const username = env.ATLASSIAN_USERNAME?.trim();
const tlsVerify = parseTlsVerify(env.ATLASSIAN_TLS_VERIFY);
const proxy = env.ATLASSIAN_PROXY?.trim() || env.HTTPS_PROXY?.trim() || env.https_proxy?.trim();
const bypass = env.NO_PROXY?.trim() || env.no_proxy?.trim();
for (const [name, value] of [
  ["ATLASSIAN_FORCE_INCLUDE_OPREATIONS", env.ATLASSIAN_FORCE_INCLUDE_OPREATIONS]
]) {
  if (value?.trim()) throw new Error("misspelled");
}
`;

describe("extractProductPrefixes", () => {
  it("derives uppercased prefixes from the PRODUCTS array", () => {
    expect(extractProductPrefixes(TYPES_FIXTURE)).toEqual(["JIRA", "CONFLUENCE"]);
  });

  it("fails loudly when PRODUCTS cannot be located", () => {
    expect(() => extractProductPrefixes("const x = 1;")).toThrow(/PRODUCTS/);
  });
});

describe("extractCodeEnvKeys", () => {
  it("collects literal env reads and expands per-product template keys", () => {
    const keys = extractCodeEnvKeys(CONFIG_FIXTURE, TYPES_FIXTURE);
    expect(keys).toEqual(
      new Set([
        "JIRA_URL",
        "JIRA_TOKEN",
        "CONFLUENCE_URL",
        "CONFLUENCE_TOKEN",
        "ATLASSIAN_USERNAME",
        "ATLASSIAN_TLS_VERIFY",
        "ATLASSIAN_PROXY",
        "HTTPS_PROXY",
        "https_proxy",
        "NO_PROXY",
        "no_proxy"
      ])
    );
  });

  it("excludes the deliberate misspelling rejection traps", () => {
    const keys = extractCodeEnvKeys(CONFIG_FIXTURE, TYPES_FIXTURE);
    expect(keys.has("ATLASSIAN_FORCE_INCLUDE_OPREATIONS")).toBe(false);
  });
});

describe("extractDocEnvKeys", () => {
  it("collects documented variable names including proxy conventions", () => {
    const keys = extractDocEnvKeys(
      "Set `JIRA_URL` and `JIRA_TOKEN`, or ATLASSIAN_USERNAME plus " +
        "ATLASSIAN_PASSWORD. Proxy: HTTPS_PROXY, NO_PROXY, https_proxy, no_proxy."
    );
    expect(keys).toEqual(
      new Set([
        "JIRA_URL",
        "JIRA_TOKEN",
        "ATLASSIAN_USERNAME",
        "ATLASSIAN_PASSWORD",
        "HTTPS_PROXY",
        "NO_PROXY",
        "https_proxy",
        "no_proxy"
      ])
    );
  });
});

describe("checkEnvDocs", () => {
  const codeKeys = new Set(["JIRA_URL", "ATLASSIAN_TLS_VERIFY", "ATLASSIAN_FILE_ROOT"]);

  it("flags a documented variable the code never reads as a failure", () => {
    const { unknown, undocumented } = checkEnvDocs(codeKeys, [
      { file: "doc.md", keys: new Set(["JIRA_URL", "JIRA_ULR"]) }
    ]);
    expect(unknown).toEqual([{ file: "doc.md", key: "JIRA_ULR" }]);
    expect(undocumented).toEqual(["ATLASSIAN_FILE_ROOT", "ATLASSIAN_TLS_VERIFY"]);
  });

  it("treats an undocumented code variable as warning-only", () => {
    const { unknown, undocumented } = checkEnvDocs(codeKeys, [
      { file: "doc.md", keys: new Set(["JIRA_URL", "ATLASSIAN_TLS_VERIFY"]) }
    ]);
    expect(unknown).toEqual([]);
    expect(undocumented).toEqual(["ATLASSIAN_FILE_ROOT"]);
  });

  it("fails on the misspelled OPREATIONS variant in docs", () => {
    const { unknown } = checkEnvDocs(new Set(["ATLASSIAN_FORCE_INCLUDE_OPERATIONS"]), [
      { file: "doc.md", keys: new Set(["ATLASSIAN_FORCE_INCLUDE_OPREATIONS"]) }
    ]);
    expect(unknown).toEqual([{ file: "doc.md", key: "ATLASSIAN_FORCE_INCLUDE_OPREATIONS" }]);
  });
});

describe("repository check", () => {
  it("every variable documented in the wiki reference pages exists in the code", () => {
    const codeKeys = extractCodeEnvKeys(
      fs.readFileSync(path.join(ROOT, CONFIG_FILE), "utf8"),
      fs.readFileSync(path.join(ROOT, TYPES_FILE), "utf8")
    );
    // Spot-check the keys the whole mechanism exists for.
    for (const key of [
      "JIRA_URL",
      "CONFLUENCE_TOKEN",
      "BITBUCKET_CA_FILE",
      "ATLASSIAN_EXPOSURE_TIER",
      "ATLASSIAN_FORCE_INCLUDE_OPERATIONS"
    ]) {
      expect(codeKeys.has(key), `${key} must be extracted from the code`).toBe(true);
    }
    const docEntries = DOC_FILES.map((file) => ({
      file,
      keys: extractDocEnvKeys(fs.readFileSync(path.join(ROOT, file), "utf8"))
    }));
    const { unknown } = checkEnvDocs(codeKeys, docEntries);
    expect(unknown).toEqual([]);
  });
});
