import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";

let child: ChildProcessWithoutNullStreams | undefined;

afterEach(() => {
  child?.kill("SIGTERM");
  child = undefined;
});

describe("stdio MCP transport", () => {
  it("initializes and lists tools without stdout log contamination", async () => {
    child = spawn(process.execPath, ["--import", "tsx", "src/cli.ts"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        JIRA_URL: "http://127.0.0.1:1/jira",
        CONFLUENCE_URL: "http://127.0.0.1:1/confluence",
        BITBUCKET_URL: "http://127.0.0.1:1/bitbucket",
        JIRA_TOKEN: "test",
        CONFLUENCE_TOKEN: "test",
        BITBUCKET_TOKEN: "test"
      },
      stdio: ["pipe", "pipe", "pipe"]
    });

    const messages = collectJsonLines(child);
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "stdio-test", version: "1.0.0" }
        }
      })}\n`
    );
    const initialized = await messages.waitForId(1);
    expect(initialized.result).toBeTruthy();

    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized"
      })}\n`
    );
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {}
      })}\n`
    );
    const listed = await messages.waitForId(2);
    const tools = (listed.result as { tools?: Array<{ name: string }> } | undefined)?.tools;
    expect(tools?.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "atlassian_discover_operations",
        "jira_search_issues",
        "jira_download_attachment",
        "jira_get_create_metadata",
        "jira_get_edit_metadata",
        "confluence_search",
        "confluence_download_attachment",
        "bitbucket_list_pull_requests"
      ])
    );
    expect(messages.invalidLines).toEqual([]);
  }, 10_000);

  it("registers typed tools only for configured products", async () => {
    child = spawn(process.execPath, ["--import", "tsx", "src/cli.ts", "--skip-startup-check"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        JIRA_URL: "http://127.0.0.1:1/jira",
        JIRA_TOKEN: "test",
        CONFLUENCE_URL: "",
        CONFLUENCE_TOKEN: "",
        BITBUCKET_URL: "",
        BITBUCKET_TOKEN: ""
      },
      stdio: ["pipe", "pipe", "pipe"]
    });

    const messages = collectJsonLines(child);
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "stdio-test", version: "1.0.0" }
        }
      })}\n`
    );
    await messages.waitForId(1);
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`
    );
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`
    );

    const listed = await messages.waitForId(2);
    const names = ((listed.result as { tools?: Array<{ name: string }> })?.tools ?? []).map(
      (tool) => tool.name
    );
    expect(names).toContain("jira_search_issues");
    expect(names.some((name) => name.startsWith("confluence_"))).toBe(false);
    expect(names.some((name) => name.startsWith("bitbucket_"))).toBe(false);
  }, 10_000);

  it("returns structured field errors and preserves Jira metadata through MCP", async () => {
    const upstream = createServer((request, response) => {
      if (request.url?.includes("/issue/createmeta/PROJ/issuetypes/10001")) {
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            values: [
              {
                fieldId: "customfield_10042",
                name: "Environment",
                required: true,
                schema: { type: "string" },
                allowedValues: ["dev", "prod"]
              }
            ],
            total: 1,
            startAt: 0,
            maxResults: 25
          })
        );
        return;
      }
      response.statusCode = 400;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ errors: { summary: "Field is required" } }));
    });
    await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
    const address = upstream.address();
    if (!address || typeof address === "string") throw new Error("No test port");

    try {
      child = spawn(process.execPath, ["--import", "tsx", "src/cli.ts", "--skip-startup-check"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          JIRA_URL: `http://127.0.0.1:${address.port}`,
          JIRA_TOKEN: "test",
          CONFLUENCE_URL: "",
          CONFLUENCE_TOKEN: "",
          BITBUCKET_URL: "",
          BITBUCKET_TOKEN: ""
        },
        stdio: ["pipe", "pipe", "pipe"]
      });
      const messages = collectJsonLines(child);
      child.stdin.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities: {},
            clientInfo: { name: "stdio-test", version: "1.0.0" }
          }
        })}\n`
      );
      await messages.waitForId(1);
      child.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`
      );
      child.stdin.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "jira_get_issue", arguments: { issueKey: "BAD-1" } }
        })}\n`
      );

      const called = await messages.waitForId(2);
      const result = called.result as {
        isError?: boolean;
        structuredContent?: { error?: { fieldErrors?: unknown } };
      };
      expect(result.isError).toBe(true);
      expect(result.structuredContent?.error?.fieldErrors).toEqual([
        { field: "summary", message: "Field is required" }
      ]);

      child.stdin.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "jira_get_create_metadata",
            arguments: {
              projectIdOrKey: "PROJ",
              issueTypeId: "10001",
              responseProfile: "compact"
            }
          }
        })}\n`
      );
      const metadataCall = await messages.waitForId(3);
      const metadata = metadataCall.result as {
        structuredContent?: { data?: unknown; meta?: { responseProfile?: string } };
      };
      expect(metadata.structuredContent?.meta?.responseProfile).toBe("standard");
      expect(JSON.stringify(metadata.structuredContent?.data)).toContain("customfield_10042");
      expect(JSON.stringify(metadata.structuredContent?.data)).toContain("allowedValues");
    } finally {
      await new Promise<void>((resolve, reject) =>
        upstream.close((error) => (error ? reject(error) : resolve()))
      );
    }
  }, 10_000);
});

function collectJsonLines(process: ChildProcessWithoutNullStreams): {
  invalidLines: string[];
  waitForId: (id: number) => Promise<Record<string, unknown>>;
} {
  let buffer = "";
  const invalidLines: string[] = [];
  const received = new Map<number, Record<string, unknown>>();
  const waiters = new Map<number, (message: Record<string, unknown>) => void>();

  process.stdout.setEncoding("utf8");
  process.stdout.on("data", (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) {
        try {
          const message = JSON.parse(line) as Record<string, unknown>;
          const id = typeof message.id === "number" ? message.id : undefined;
          if (id !== undefined) {
            received.set(id, message);
            waiters.get(id)?.(message);
            waiters.delete(id);
          }
        } catch {
          invalidLines.push(line);
        }
      }
      newline = buffer.indexOf("\n");
    }
  });

  return {
    invalidLines,
    waitForId: (id) => {
      const existing = received.get(id);
      if (existing) return Promise.resolve(existing);
      return new Promise<Record<string, unknown>>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error(`Timed out waiting for JSON-RPC id ${id}`)),
          5000
        );
        waiters.set(id, (message) => {
          clearTimeout(timeout);
          resolve(message);
        });
      });
    }
  };
}
