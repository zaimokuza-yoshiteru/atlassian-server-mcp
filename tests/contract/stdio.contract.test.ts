import { createServer, type Server } from "node:http";
import { unlinkSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { StdioMcpClient } from "../e2e/support/mcp-client.js";
import { TOOL_DEFINITIONS } from "../../src/tools.js";

let server: Server | undefined;
let client: StdioMcpClient | undefined;

afterEach(async () => {
  await client?.close();
  client = undefined;
  if (server?.listening)
    await new Promise<void>((resolve, reject) =>
      server!.close((error) => (error ? reject(error) : resolve()))
    );
  server = undefined;
  delete process.env.JIRA_URL;
  delete process.env.JIRA_TOKEN;
  delete process.env.CONFLUENCE_URL;
  delete process.env.CONFLUENCE_TOKEN;
  delete process.env.BITBUCKET_URL;
  delete process.env.BITBUCKET_TOKEN;
  delete process.env.ATLASSIAN_FILE_ROOT;
});

describe("built stdio MCP contract", () => {
  it("maps a typed tool to the expected upstream request and returns structured data", async () => {
    let observedUrl = "";
    let observedAuthorization = "";
    server = createServer((request, response) => {
      observedUrl = request.url ?? "";
      observedAuthorization = request.headers.authorization ?? "";
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({ issues: [{ key: "MCP-1", fields: { summary: "contract" } }], total: 1 })
      );
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No mock port");
    process.env.JIRA_URL = `http://127.0.0.1:${address.port}`;
    process.env.JIRA_TOKEN = "contract-token";

    client = await StdioMcpClient.start("jira");
    expect(client.initializeResult.instructions).toEqual(
      expect.stringContaining("atlassian_discover_operations")
    );
    expect(client.initializeResult.instructions).toEqual(
      expect.stringContaining("atlassian_describe_operation")
    );
    expect(client.initializeResult.instructions).toEqual(
      expect.stringContaining("exposure tier and FORCE")
    );
    expect(client.initializeResult.instructions).toEqual(
      expect.stringContaining("annotations are client hints")
    );
    expect(client.initializeResult.instructions).toEqual(
      expect.stringContaining("Before mutations")
    );
    expect(client.initializeResult.instructions).toEqual(expect.stringContaining("timeout or 5xx"));
    const listed = await client.listTools();
    const searchTool = listed.tools.find((tool) => tool.name === "jira_search_issues");
    const searchDefinition = TOOL_DEFINITIONS.jira_search_issues!;
    expect(searchTool).toMatchObject({
      title: searchDefinition.title,
      description: searchDefinition.description,
      annotations: searchDefinition.annotations
    });
    expect(searchTool?.inputSchema).toBeDefined();
    expect(searchTool?.outputSchema).toBeDefined();
    const result = await client.callTool("jira_search_issues", {
      jql: "project = MCP",
      pageSize: 10,
      responseProfile: "standard"
    });
    expect(result.isError, JSON.stringify(result)).not.toBe(true);
    expect(JSON.stringify(result.structuredContent)).toContain("MCP-1");
    expect(observedUrl).toContain("/rest/api/2/search?");
    expect(new URL(`http://contract.test${observedUrl}`).searchParams.get("jql")).toBe(
      "project = MCP"
    );
    expect(observedAuthorization).toBe("Bearer contract-token");
  });

  it("preserves sanitized Atlassian field errors through built MCP", async () => {
    server = createServer((_request, response) => {
      response.statusCode = 400;
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          errors: { summary: "Field is required" },
          password: "must-not-leak"
        })
      );
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No mock port");
    process.env.JIRA_URL = `http://127.0.0.1:${address.port}`;
    process.env.JIRA_TOKEN = "contract-token";

    client = await StdioMcpClient.start("jira", ["--exposure-tier=safe"]);
    const result = await client.callTool("jira_create_issue", {
      fields: { project: { key: "MCP" }, issuetype: { name: "Task" } }
    });
    expect(result.isError).toBe(true);
    expect(result.structuredContent?.error).toMatchObject({
      fieldErrors: [{ field: "summary", message: "Field is required" }]
    });
    expect(JSON.stringify(result)).not.toContain("must-not-leak");
  });

  it("validates projected and compact discover responses through the SDK", async () => {
    server = createServer((_request, response) => {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({}));
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No mock port");
    process.env.JIRA_URL = `http://127.0.0.1:${address.port}`;
    process.env.JIRA_TOKEN = "contract-token";
    client = await StdioMcpClient.start("jira");
    const projected = await client.callTool("atlassian_discover_operations", {
      product: "jira",
      fields: ["operationId"]
    });
    expect(projected.isError).not.toBe(true);
    const compact = await client.callTool("atlassian_discover_operations", {
      product: "jira",
      responseProfile: "compact"
    });
    expect(compact.isError).not.toBe(true);
  });

  it("permanently excludes the 5 Bitbucket attachment operations (fail-closed)", async () => {
    // Bitbucket 10.4.1 exposes no REST endpoint to create attachments, so
    // these 5 CRUD/metadata ops are permanently excluded from the exposure
    // policy: invisible in discover, rejected fail-closed on execute.
    const excluded = [
      "bitbucket.repository.projects.repos.attachments.delete",
      "bitbucket.repository.projects.repos.attachments.get",
      "bitbucket.repository.projects.repos.attachments.metadata.delete",
      "bitbucket.repository.projects.repos.attachments.metadata.list",
      "bitbucket.repository.projects.repos.attachments.metadata.update"
    ];
    process.env.BITBUCKET_URL = "http://127.0.0.1:9";
    process.env.BITBUCKET_TOKEN = "contract-token";
    client = await StdioMcpClient.start("bitbucket", ["--exposure-tier=max"]);
    const discovered = await client.callTool("atlassian_discover_operations", {
      product: "bitbucket",
      fields: ["operationId"]
    });
    expect(discovered.isError).not.toBe(true);
    for (const operationId of excluded) {
      expect(JSON.stringify(discovered)).not.toContain(operationId);
      const result = await client.callTool("atlassian_execute_operation", { operationId });
      expect(result.isError, JSON.stringify(result)).toBe(true);
      expect(JSON.stringify(result)).toContain("not in exposure policy");
      expect(JSON.stringify(result)).toContain(operationId);
    }
  });

  it.each([
    [
      "jira",
      "jira_download_attachment",
      "/rest/api/2/attachment/100",
      { content: "/rest/api/2/attachment/content/100" }
    ],
    [
      "confluence",
      "confluence_download_attachment",
      "/rest/api/content/100",
      { _links: { download: "/download/attachments/100/file.bin" } }
    ]
  ])(
    "validates %s named download metadata through the SDK",
    async (product, tool, metadataPath, metadata) => {
      server = createServer((request, response) => {
        response.setHeader("content-type", "application/json");
        if (request.url?.startsWith(metadataPath)) response.end(JSON.stringify(metadata));
        else {
          response.setHeader("content-type", "application/octet-stream");
          response.setHeader("content-length", "4");
          response.end("data");
        }
      });
      await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("No mock port");
      process.env[`${product.toUpperCase()}_URL`] = `http://127.0.0.1:${address.port}`;
      process.env[`${product.toUpperCase()}_TOKEN`] = "contract-token";
      process.env.ATLASSIAN_FILE_ROOT = "/tmp";
      client = await StdioMcpClient.start(product as "jira" | "confluence");
      const downloadPath = `/tmp/mcp-contract-${product}-attachment.bin`;
      try {
        unlinkSync(downloadPath);
      } catch {
        /* absent */
      }
      const result = await client.callTool(tool, { attachmentId: "100", downloadPath });
      expect(result.isError, JSON.stringify(result)).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        data: { mediaType: "application/octet-stream", size: 4 }
      });
    }
  );
});
