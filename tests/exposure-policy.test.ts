import { describe, expect, it } from "vitest";
import { policyRequiredTier, resolveExposure, validatePatterns } from "../src/exposure-policy.js";
import { allowsTier, matchOperationPattern, tierFromArgs } from "../src/permissions.js";
import type { RegisteredOperation } from "../src/types.js";

const operation: RegisteredOperation = {
  operationId: "jira.issue.create",
  product: "jira",
  summary: "create",
  method: "POST",
  path: "/rest/api/2/issue",
  responseKind: "json",
  tags: [],
  scope: "issue",
  dataKind: "mutation",
  destructive: false
};

describe("exposure policy primitives", () => {
  it("uses cumulative four-tier ordering", () => {
    expect(allowsTier("read", "safe")).toBe(false);
    expect(allowsTier("max", "risky")).toBe(true);
    expect(tierFromArgs(["--exposure-tier=max"])).toBe("max");
    expect(() => tierFromArgs(["--exposure-tier", "read", "--exposure-tier=safe"])).toThrow(/once/);
  });

  it("matches strict segment globs", () => {
    expect(matchOperationPattern("jira.issue.*", "jira.issue.create")).toBe(true);
    expect(matchOperationPattern("jira.*.create", "jira.issue.create")).toBe(true);
    expect(matchOperationPattern("jira.issue.*", "jira.issue.comments.add")).toBe(false);
    expect(matchOperationPattern("jira.**", "jira.issue.comments.add")).toBe(true);
    expect(() => matchOperationPattern("jira.issue.cr*", operation.operationId)).toThrow(/invalid/);
  });

  it("applies fail-closed and FORCE precedence", () => {
    expect(
      resolveExposure({ ...operation, operationId: "jira.server.info" }, { tier: "read" })
    ).toMatchObject({ exposed: true, forced: false, reason: "tier-allowed" });
    expect(resolveExposure(operation, { tier: "read" })).toMatchObject({
      exposed: false,
      forced: false,
      reason: "tier-denied",
      requiredTier: "safe"
    });
    expect(
      resolveExposure(operation, { tier: "read", forceInclude: ["jira.issue.create"] })
    ).toMatchObject({
      exposed: true,
      forced: true,
      requiredTier: "safe",
      reason: "force-included",
      matchedPattern: "jira.issue.create"
    });
    expect(
      resolveExposure(operation, {
        tier: "max",
        forceInclude: ["jira.issue.create"],
        forceExclude: ["jira.issue.*"]
      })
    ).toMatchObject({
      exposed: false,
      forced: false,
      reason: "force-excluded",
      matchedPattern: "jira.issue.*"
    });
    expect(
      resolveExposure(
        { ...operation, operationId: "bitbucket.access-tokens.users.get", product: "bitbucket" },
        { tier: "max", forceInclude: ["bitbucket.access-tokens.users.get"] }
      )
    ).toMatchObject({ exposed: false, forced: false, reason: "permanently-excluded" });
    expect(resolveExposure(undefined, { tier: "max" })).toMatchObject({
      exposed: false,
      forced: false,
      reason: "unknown-operation"
    });
    expect(
      resolveExposure(
        { ...operation, operationId: "jira.synthetic.unknown", method: "GET" },
        { tier: "max", forceInclude: ["jira.**"], configuredProducts: new Set(["jira"]) }
      )
    ).toMatchObject({ exposed: false, forced: false, reason: "unknown-operation" });
    expect(() =>
      policyRequiredTier({ ...operation, operationId: "jira.synthetic.unknown" })
    ).toThrow(/not in exposure policy/);
    expect(
      resolveExposure({ ...operation, unsupportedReason: "not supported" }, { tier: "max" })
    ).toMatchObject({ exposed: false, forced: false, reason: "unsupported-operation" });
    expect(
      resolveExposure(operation, { tier: "max", configuredProducts: new Set(["confluence"]) })
    ).toMatchObject({ exposed: false, forced: false, reason: "product-not-configured" });
  });

  it("rejects zero-match patterns against the configured candidate set", () => {
    expect(() => validatePatterns(["jira.missing.*"], [operation.operationId])).toThrow(
      /jira\.missing/
    );
  });
});
