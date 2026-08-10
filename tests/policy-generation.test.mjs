import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPolicy, parseSource, readRegistry, sourceSha256 } from "../rule/build-policy.mjs";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "rule", "source.md"), "utf8");

describe("exposure policy generation", () => {
  it("matches the fixed source and registry baseline", () => {
    const policy = buildPolicy(source, readRegistry());
    const registry = readRegistry();
    expect(registry).toHaveLength(1120);
    expect(Object.keys(policy.tiers)).toHaveLength(499);
    expect(policy.excluded).toHaveLength(621);
    expect(Object.keys(policy.tiers).filter((id) => id.startsWith("jira.")).length).toBe(175);
    expect(Object.keys(policy.tiers).filter((id) => id.startsWith("confluence.")).length).toBe(93);
    expect(Object.keys(policy.tiers).filter((id) => id.startsWith("bitbucket.")).length).toBe(231);
    expect(Object.values(policy.tiers).filter((tier) => tier === "read").length).toBe(152);
    expect(Object.values(policy.tiers).filter((tier) => tier === "safe").length).toBe(55);
    expect(Object.values(policy.tiers).filter((tier) => tier === "risky").length).toBe(30);
    expect(Object.values(policy.tiers).filter((tier) => tier === "max").length).toBe(262);
    expect(policy.sourceSha256).toBe(sourceSha256(source));
    expect(
      Object.keys(policy.tiers).every((operationId) =>
        ["read", "safe", "risky", "max"].includes(policy.tiers[operationId])
      )
    ).toBe(true);
  });

  it("rejects an operation placed in an ignored section", () => {
    const malformed = `${source}\n## 需要纳入\njira.users.get - GET /rest/api/2/user - misplaced\n`;
    expect(() => parseSource(malformed)).toThrow(/misplaced operation/);
  });

  it("rejects unknown product headings and malformed valid-section lines", () => {
    expect(() => parseSource(`${source}\n# Unknown\n`)).toThrow(/unknown product title/);
    expect(() => parseSource(source.replace("### read\n", "### read\n- malformed\n"))).toThrow(
      /unparseable content/
    );
  });

  it("rejects a source method/path mismatch", () => {
    const malformed = source.replace(
      "jira.component.get - GET /rest/api/2/component/{id}",
      "jira.component.get - POST /rest/api/2/component/{id}"
    );
    expect(() => buildPolicy(malformed, readRegistry())).toThrow(/registry mismatch/);
  });
});
