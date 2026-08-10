import { describe, expect, it } from "vitest";
import {
  describeResponseSchema,
  discoverResponseSchema,
  downloadResponseSchema,
  executeResponseSchema,
  operationPublicSchema,
  serverInfoResponseSchema
} from "../src/schemas.js";

const operation = {
  operationId: "jira.issue.search",
  product: "jira",
  summary: "Search issues",
  method: "GET",
  path: "/rest/api/2/search",
  requiredTier: "read",
  forced: false,
  exposureReason: "tier-allowed",
  scope: "issue",
  dataKind: "resource",
  destructive: false,
  responseKind: "json",
  pagination: "jira",
  versions: ["11.3"],
  tags: ["issue"],
  requestBody: false
};
const envelope = (data: unknown) => ({
  data,
  page: { mode: "items", returned: 1, hasMore: false },
  meta: {
    product: "jira",
    operationId: "jira.issue.search",
    responseProfile: "standard",
    responseBytes: 100,
    truncated: false
  }
});
const error = {
  error: { kind: "validation", message: "next action: inspect the operation description" }
};

describe("MCP output schema contracts", () => {
  it("parses success and error for discover", () => {
    expect(discoverResponseSchema.safeParse(envelope([operation])).success).toBe(true);
    expect(discoverResponseSchema.safeParse(error).success).toBe(true);
  });
  it("parses success and error for describe", () => {
    expect(describeResponseSchema.safeParse(operation).success).toBe(true);
    expect(describeResponseSchema.safeParse(error).success).toBe(true);
  });
  it("parses success and error for execute/typed", () => {
    expect(executeResponseSchema.safeParse(envelope({ issues: [] })).success).toBe(true);
    expect(executeResponseSchema.safeParse(error).success).toBe(true);
  });
  it("parses success and error for server-info", () => {
    const info = {
      exposureTier: "read",
      configuredProducts: ["jira"],
      maxOutputBytes: 65536,
      maxDownloadBytes: 104857600,
      cursorTtlSeconds: 900,
      products: [
        {
          product: "jira",
          baseUrl: "https://jira.example",
          authMode: "token",
          tlsVerify: true,
          reachable: true,
          version: "11.3.5"
        }
      ]
    };
    expect(serverInfoResponseSchema.safeParse(info).success).toBe(true);
    expect(serverInfoResponseSchema.safeParse(error).success).toBe(true);
  });
  it("parses success and error for downloads", () => {
    expect(
      downloadResponseSchema.safeParse(
        envelope({
          fileName: "attachment.bin",
          mediaType: "application/octet-stream",
          size: 12,
          sourceUrl: "https://jira.example/download/1",
          savedPath: "/tmp/attachment.bin"
        })
      ).success
    ).toBe(true);
    expect(downloadResponseSchema.safeParse(error).success).toBe(true);
  });
  it("rejects secrets, incomplete envelopes, and malformed operation data", () => {
    expect(
      serverInfoResponseSchema.safeParse({
        exposureTier: "read",
        configuredProducts: [],
        maxOutputBytes: 1,
        maxDownloadBytes: 1,
        cursorTtlSeconds: 1,
        products: [
          {
            product: "jira",
            baseUrl: "x",
            authMode: "token",
            tlsVerify: true,
            reachable: true,
            token: "leak"
          }
        ]
      }).success
    ).toBe(false);
    expect(
      downloadResponseSchema.safeParse({
        error: { kind: "mcp_error", message: "x", topSecret: "leak" }
      }).success
    ).toBe(false);
    expect(
      downloadResponseSchema.safeParse({
        error: {
          kind: "mcp_error",
          message: "x",
          fieldErrors: [{ field: "x", message: "y", token: "leak" }]
        }
      }).success
    ).toBe(false);
    expect(executeResponseSchema.safeParse({ data: {} }).success).toBe(false);
    expect(operationPublicSchema.safeParse({ ...operation, method: "TRACE" }).success).toBe(false);
  });
});
