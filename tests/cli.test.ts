import { describe, expect, it } from "vitest";
import { loadConfig, validateCliOptions } from "../src/config.js";
import { formatExposureSummary } from "../src/exposure-summary.js";
import { POLICY_OPERATIONS } from "../src/operations/index.js";

const env: NodeJS.ProcessEnv = {
  JIRA_URL: "https://jira.example.test",
  JIRA_TOKEN: "secret-token"
};

describe("strict exposure CLI", () => {
  it("defaults to read and accepts all four tiers", () => {
    expect(loadConfig([], env).exposureTier).toBe("read");
    for (const tier of ["read", "safe", "risky", "max"] as const)
      expect(loadConfig([`--exposure-tier=${tier}`], env).exposureTier).toBe(tier);
  });
  it("rejects legacy, unknown, positional, duplicate and malformed options", () => {
    expect(() => validateCliOptions(["--allow-admin-operations"])).toThrow(/--exposure-tier=max/);
    expect(() => validateCliOptions(["--unknown"])).toThrow(/unknown option/);
    expect(() => validateCliOptions(["value"])).toThrow(/positional/);
    expect(() => validateCliOptions(["--exposure-tier=read", "--exposure-tier", "safe"])).toThrow(
      /once/
    );
    expect(() => validateCliOptions(["--max-output-bytes=1", "--max-output-bytes=2"])).toThrow(
      /once/
    );
    expect(() => validateCliOptions(["--force-include-ops="])).toThrow(/requires/);
    expect(() =>
      validateCliOptions(["--force-include-ops", "jira.issue.*,jira.project.*"])
    ).toThrow(/commas/);
    expect(() => validateCliOptions(["--tls-verify", "--no-tls-verify"])).toThrow(/together/);
  });
  it("allows repeated FORCE patterns in order and validates misspelled env", () => {
    expect(
      loadConfig(["--force-include-ops", "jira.issue.*", "--force-include-ops=jira.project.*"], env)
        .forceInclude
    ).toEqual(["jira.issue.*", "jira.project.*"]);
    expect(() =>
      loadConfig([], { ...env, ATLASSIAN_FORCE_INCLUDE_OPREATIONS: "jira.issue.*" })
    ).toThrow(/ATLASSIAN_FORCE_INCLUDE_OPERATIONS/);
  });
  it("validates help syntax before product configuration", () => {
    expect(() => validateCliOptions(["--help"])).not.toThrow();
    expect(() => validateCliOptions(["--help", "--unknown"])).toThrow(/unknown option/);
  });
  it("prints separate ordered include/exclude summaries using configured-product candidates", () => {
    const config = loadConfig(
      [
        "--force-include-ops=jira.issue.*",
        "--force-include-ops=jira.project.*",
        "--force-exclude-ops=jira.project.*"
      ],
      env
    );
    const summary = formatExposureSummary(config);
    expect(summary).toMatch(
      /^exposure tier=read; include=\[jira\.issue\.\*=\d+; jira\.project\.\*=\d+\]; exclude=\[jira\.project\.\*=\d+\]$/
    );
    expect(formatExposureSummary({ ...config, forceInclude: [], forceExclude: [] })).toBe(
      "exposure tier=read; include=none; exclude=none"
    );
    const all = formatExposureSummary(loadConfig(["--force-include-ops=**"], env));
    expect(all).toContain(
      `include=[**=${POLICY_OPERATIONS.filter((operation) => operation.product === "jira").length}]`
    );
  });
});
