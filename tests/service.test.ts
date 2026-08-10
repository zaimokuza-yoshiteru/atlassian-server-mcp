import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AtlassianService } from "../src/service.js";
import type { ServerConfig } from "../src/types.js";

let server: Server;
let origin: string;
let seenAuthorization = "";
let seenSearch = "";
let jiraVersion = "11.3.0";

beforeEach(async () => {
  jiraVersion = "11.3.0";
  server = createServer((request, response) => {
    seenAuthorization = String(request.headers.authorization ?? "");
    const url = new URL(request.url ?? "/", "http://localhost");
    seenSearch = url.search;
    response.setHeader("content-type", "application/json");

    if (url.pathname === "/jira/rest/api/2/search") {
      response.end(
        JSON.stringify({
          issues: [
            {
              id: "1",
              key: "ABC-1",
              fields: {
                summary: "Example",
                customfield_10001: "hidden"
              }
            }
          ],
          total: 1
        })
      );
      return;
    }
    if (url.pathname === "/jira/rest/agile/1.0/sprint/1") {
      response.end(JSON.stringify({ id: 1, name: "Sprint 1", state: "active" }));
      return;
    }
    if (
      url.pathname === "/jira/rest/api/2/serverInfo" ||
      url.pathname === "/rest/api/2/serverInfo"
    ) {
      response.end(JSON.stringify({ version: jiraVersion }));
      return;
    }
    if (url.pathname === "/confluence/rest/api/space") {
      response.end(JSON.stringify({ results: [], size: 0 }));
      return;
    }
    if (url.pathname === "/confluence/rest/applinks/1.0/manifest") {
      response.end(JSON.stringify({ version: "10.2.0" }));
      return;
    }
    if (url.pathname === "/bitbucket/rest/api/1.0/application-properties") {
      response.end(JSON.stringify({ version: "10.2.0" }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ message: "not found" }));
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  origin = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

function config(
  overrides: Partial<Pick<ServerConfig, "exposureTier" | "forceInclude" | "forceExclude">> = {}
): ServerConfig {
  return {
    products: {
      jira: {
        product: "jira",
        baseUrl: new URL(`${origin}/jira`),
        token: "jira-token",
        tlsVerify: false
      },
      confluence: {
        product: "confluence",
        baseUrl: new URL(`${origin}/confluence`),
        token: "confluence-token",
        tlsVerify: false
      },
      bitbucket: {
        product: "bitbucket",
        baseUrl: new URL(`${origin}/bitbucket`),
        token: "bitbucket-token",
        tlsVerify: false
      }
    },
    exposureTier: "read",
    forceInclude: [],
    forceExclude: [],
    maxOutputBytes: 65_536,
    cursorTtlSeconds: 900,
    maxDownloadBytes: 104_857_600,
    tlsVerify: false,
    ...overrides
  };
}

describe("Atlassian service", () => {
  it("computes enabled operations from tier and FORCE without network access", () => {
    const read = new AtlassianService(config({ exposureTier: "read" }));
    const safe = new AtlassianService(config({ exposureTier: "safe" }));
    const forced = new AtlassianService(
      config({ exposureTier: "read", forceInclude: ["jira.issue.create"] })
    );
    const excluded = new AtlassianService(
      config({ exposureTier: "max", forceExclude: ["jira.issue.create"] })
    );
    expect(safe.enabledOperations.length).toBeGreaterThan(read.enabledOperations.length);
    expect(
      forced.enabledOperations.some((operation) => operation.operationId === "jira.issue.create")
    ).toBe(true);
    expect(
      excluded.enabledOperations.some((operation) => operation.operationId === "jira.issue.create")
    ).toBe(false);
  });
  it("executes a registered operation with auth and upstream pagination", async () => {
    const service = new AtlassianService(config());
    const response = await service.execute({
      operationId: "jira.issue.search",
      query: { jql: "project = ABC" },
      pageSize: 7
    });
    await service.close();

    expect(seenAuthorization).toBe("Bearer jira-token");
    expect(seenSearch).toContain("jql=project+%3D+ABC");
    expect(seenSearch).toContain("startAt=0");
    expect(seenSearch).toContain("maxResults=7");
    expect(response.data).toEqual([
      {
        id: "1",
        key: "ABC-1",
        fields: { summary: "Example" }
      }
    ]);
    expect(response.meta.omittedPaths).toContain("$[0].fields.customfield_10001");
  });

  it("reports all three products without exposing tokens", async () => {
    const service = new AtlassianService(config());
    const info = await service.assertConnected();
    await service.close();

    expect(info).toHaveLength(3);
    expect(info.every((item) => item.reachable)).toBe(true);
    expect(JSON.stringify(info)).not.toContain("jira-token");
  });

  it("blocks disabled mutation tiers before making an HTTP request", async () => {
    const service = new AtlassianService(config());
    await expect(
      service.execute({
        operationId: "jira.issue.delete",
        path: { issueKey: "ABC-1" }
      })
    ).rejects.toThrow(/requires risky tier/);
    await service.close();
  });

  describe("sprint update operations require the risky tier", () => {
    const sprintUpdateOps = ["jira.agile.sprints.update", "jira.agile.sprints.update.partial"];

    it("rejects both operations at the safe tier before making an HTTP request", async () => {
      const service = new AtlassianService(config({ exposureTier: "safe" }));
      for (const operationId of sprintUpdateOps) {
        await expect(
          service.execute({
            operationId,
            path: { sprintId: 1 },
            body: { name: "Sprint 1" }
          })
        ).rejects.toThrow(/requires risky tier/);
      }
      await service.close();
    });

    it("passes the policy gate at the risky tier and reaches the upstream", async () => {
      const service = new AtlassianService(config({ exposureTier: "risky" }));
      const response = await service.execute({
        operationId: "jira.agile.sprints.update",
        path: { sprintId: 1 },
        body: { name: "Sprint 1" }
      });
      await service.close();
      expect(response.data).toEqual({
        $fragment: [
          { path: "$.id", value: 1 },
          { path: "$.name", value: "Sprint 1" },
          { path: "$.state", value: "active" }
        ]
      });
    });

    it("reports requiredTier risky for both operations in discover output", () => {
      const service = new AtlassianService(config({ exposureTier: "risky" }));
      const page = service.discoverOperations({
        query: "jira.agile.sprints.update",
        pageSize: 100
      });
      const items = page.data as Array<Record<string, unknown>>;
      const byId = new Map(items.map((item) => [String(item.operationId), item]));
      for (const operationId of sprintUpdateOps) {
        expect(byId.get(operationId)).toMatchObject({ requiredTier: "risky" });
      }
    });
  });

  it("exposes operations only for configured products", async () => {
    const jiraOnly = config();
    delete jiraOnly.products.confluence;
    delete jiraOnly.products.bitbucket;
    const service = new AtlassianService(jiraOnly);

    expect(service.configuredProducts).toEqual(["jira"]);
    expect(JSON.stringify(service.discoverOperations({ pageSize: 100 }))).not.toContain(
      '"product":"confluence"'
    );
    expect(() => service.describeOperation("confluence.content.get")).toThrow(
      /Product confluence is not configured/
    );
    await service.close();
  });

  it("keeps discover/describe output English-only and never projects summaryZh", async () => {
    const CJK = /[㐀-䶿一-鿿豈-﫿]/;
    const service = new AtlassianService(config({ exposureTier: "max" }));
    let cursor: string | undefined;
    let seen = 0;
    do {
      const page = service.discoverOperations({ pageSize: 100, cursor });
      const items = page.data as Array<Record<string, unknown>>;
      for (const item of items) {
        expect(item).not.toHaveProperty("summaryZh");
        expect(String(item.summary)).not.toMatch(CJK);
        seen++;
      }
      cursor = page.page.nextCursor;
    } while (cursor);
    expect(seen).toBeGreaterThan(0);

    // jira.issue.archive has a preserved Chinese description (summaryZh) in the
    // registry; describe must not surface it.
    const described = service.describeOperation("jira.issue.archive");
    expect(described).not.toHaveProperty("summaryZh");
    expect(String(described.summary)).not.toMatch(CJK);
    await service.close();
  });

  it("uses the configured product in unfiltered discovery metadata", async () => {
    const bitbucketOnly = config();
    delete bitbucketOnly.products.jira;
    delete bitbucketOnly.products.confluence;
    const service = new AtlassianService(bitbucketOnly);

    expect(service.discoverOperations({ pageSize: 1 }).meta.product).toBe("bitbucket");
    await service.close();
  });

  it("builds correct request URLs for root-path base URLs", async () => {
    const rootConfig = config();
    rootConfig.products.jira = {
      ...rootConfig.products.jira!,
      baseUrl: new URL(origin)
    };
    const service = new AtlassianService(rootConfig);
    const response = await service.execute({
      operationId: "jira.server.info",
      responseProfile: "full"
    });
    await service.close();

    const leaves = (response.data as { $fragment: { path: string; value: unknown }[] }).$fragment;
    expect(leaves).toContainEqual({ path: "$.version", value: "11.3.0" });
  });

  it("rejects downloadPath on non-binary operations", async () => {
    const service = new AtlassianService(config());
    await expect(
      service.execute({
        operationId: "jira.issue.get",
        path: { issueKey: "ABC-1" },
        downloadPath: "/tmp/issue.json"
      })
    ).rejects.toThrow(/only supported for binary downloads/);
    await service.close();
  });

  it("reports versions outside the tested baseline without rejecting them", async () => {
    jiraVersion = "12.0.0";
    const service = new AtlassianService(config());
    const info = await service.assertConnected();
    expect(info.find((product) => product.product === "jira")?.version).toBe("12.0.0");
    await service.close();
  });
});
