import { afterEach, describe, expect, it } from "vitest";
import type { McpServer } from "@modelcontextprotocol/server";
import { AtlassianService } from "../src/service.js";
import { registerTools, TOOL_DEFINITIONS } from "../src/tools.js";
import type { ServerConfig } from "../src/types.js";

const services: AtlassianService[] = [];

afterEach(async () => {
  await Promise.all(services.splice(0).map((service) => service.close()));
});

function config(
  exposureTier: ServerConfig["exposureTier"] = "read",
  products: Array<"jira" | "confluence" | "bitbucket"> = ["jira", "confluence", "bitbucket"],
  forceInclude: string[] = [],
  forceExclude: string[] = []
): ServerConfig {
  const productConfig = (product: "jira" | "confluence" | "bitbucket") => ({
    product,
    baseUrl: new URL(`http://127.0.0.1/${product}`),
    token: `${product}-token`,
    tlsVerify: false
  });
  return {
    products: Object.fromEntries(
      products.map((product) => [product, productConfig(product)])
    ) as ServerConfig["products"],
    exposureTier,
    forceInclude,
    forceExclude,
    maxOutputBytes: 65_536,
    cursorTtlSeconds: 900,
    maxDownloadBytes: 104_857_600,
    tlsVerify: false
  };
}

function registeredTools(
  service: AtlassianService
): Array<{ name: string; config: Record<string, unknown> }> {
  const records: Array<{ name: string; config: Record<string, unknown> }> = [];
  const server = {
    registerTool(name: string, config: Record<string, unknown>): void {
      records.push({ name, config });
    }
  } as unknown as McpServer;
  registerTools(server, service);
  return records;
}

function registeredNames(service: AtlassianService): string[] {
  return registeredTools(service).map(({ name }) => name);
}

function serviceFor(...args: Parameters<typeof config>): AtlassianService {
  const service = new AtlassianService(config(...args));
  services.push(service);
  return service;
}

describe("typed tool conditional registration", () => {
  it("keeps core tools and read-only Jira tools at the read tier", () => {
    const names = registeredNames(serviceFor("read", ["jira"]));
    expect(names).toContain("atlassian_execute_operation");
    expect(names).toContain("jira_search_issues");
    expect(names).not.toContain("jira_create_issue");
    expect(names).not.toContain("confluence_search");
  });

  it("registers a mutation only when its dependency is enabled", () => {
    expect(registeredNames(serviceFor("read", ["jira"], ["jira.issue.create"]))).toContain(
      "jira_create_issue"
    );
    expect(registeredNames(serviceFor("max", ["jira"], [], ["jira.issue.search"]))).not.toContain(
      "jira_search_issues"
    );
  });

  it("uses intersection semantics for multi-operation metadata", () => {
    const names = registeredNames(
      serviceFor(
        "read",
        ["jira"],
        [],
        ["jira.issue.createmeta.issuetypes.list", "jira.issue.createmeta.issuetypes.get"]
      )
    );
    expect(names).not.toContain("jira_get_create_metadata");
  });

  it("keeps the definition table in sync with every registered tool", () => {
    const service = serviceFor("max");
    const names = registeredNames(service);
    expect(new Set(names)).toEqual(new Set(Object.keys(TOOL_DEFINITIONS)));
    for (const definition of Object.values(TOOL_DEFINITIONS)) {
      expect(definition.title).toEqual(expect.any(String));
      expect(definition.description).toEqual(expect.any(String));
      expect(definition.annotations).toMatchObject({
        readOnlyHint: expect.any(Boolean),
        destructiveHint: expect.any(Boolean),
        idempotentHint: expect.any(Boolean),
        openWorldHint: expect.any(Boolean)
      });
    }
  });

  it("derives the expected registration set from dependencies", () => {
    const service = serviceFor("read", ["jira"]);
    const enabled = new Set(service.enabledOperations.map((operation) => operation.operationId));
    const names = new Set(registeredNames(service));
    for (const [name, definition] of Object.entries(TOOL_DEFINITIONS)) {
      const expected =
        definition.registration === "always" ||
        definition.dependencies.some((dependency) => enabled.has(dependency));
      expect(names.has(name)).toBe(expected);
    }
  });

  it("publishes complete metadata and output schemas for every registered tool", () => {
    const service = serviceFor("max");
    for (const { name, config } of registeredTools(service)) {
      const definition = TOOL_DEFINITIONS[name]!;
      expect(config.title).toBe(definition.title);
      expect(config.description).toBe(definition.description);
      expect(config.annotations).toEqual(definition.annotations);
      expect(config.inputSchema).toBeDefined();
      expect(config.outputSchema).toBe(definition.outputSchema);
    }
  });
});
