import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordCleanup } from "../support/cleanup-journal.js";
import { StdioMcpClient, requireToolSuccess } from "../support/mcp-client.js";
import { ensureFixture, fixtureRequest, projectedValues } from "../support/rest-fixture.js";

/** Extract issue keys from a Jira search response, walking into the issues array. */
function extractIssueKeys(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  // Standard response: { issues: [{ key: "MCP-1" }, ...] }
  if (Array.isArray(d.issues)) {
    return d.issues.map((issue: any) => issue?.key).filter(Boolean) as string[];
  }
  // Fallback: deep scan for issue-like keys (MCP-NNN format)
  return (projectedValues(data, "key") as string[]).filter((k) => /^[A-Z]+-\d+$/.test(k));
}

const active = process.env.E2E_PRODUCT === "jira" ? describe : describe.skip;

active("jira-search-basic", () => {
  const runId = randomUUID().slice(0, 8);
  const projectKey = process.env.E2E_JIRA_PROJECT_KEY ?? "MCP";
  const summaryA = `MCP E2E search-A ${runId}`;
  const summaryB = `MCP E2E search-B ${runId}`;
  let client: StdioMcpClient;
  const issueKeys: string[] = [];

  beforeAll(async () => {
    // Idempotent project fixture.
    await ensureFixture(
      fixtureRequest("jira", "/rest/api/2/project", {
        method: "POST",
        body: {
          key: projectKey,
          name: "MCP E2E",
          projectTypeKey: "software",
          lead: process.env.ATLASSIAN_ADMIN_USERNAME || process.env.ATLASSIAN_USERNAME
        }
      }),
      [201, 400]
    );

    client = await StdioMcpClient.start("jira", ["--exposure-tier=max"]);

    // Create two searchable issues.
    for (const summary of [summaryA, summaryB]) {
      const created = requireToolSuccess(
        await client.callTool("jira_create_issue", {
          fields: {
            project: { key: projectKey },
            issuetype: { name: "Task" },
            summary,
            description: `created by local E2E ${runId}`
          }
        })
      );
      const key = projectedValues(created.data, "key")[0] as string;
      expect(key, JSON.stringify(created)).toBeTruthy();
      issueKeys.push(key);
      recordCleanup("jira", "issue", key, "created");
    }
  }, 60_000);

  afterAll(async () => {
    for (const key of issueKeys) {
      try {
        await fixtureRequest("jira", `/rest/api/2/issue/${key}`, { method: "DELETE" });
        recordCleanup("jira", "issue", key, "cleaned");
      } catch (error) {
        recordCleanup("jira", "issue", key, "cleanup-failed", { error: error });
      }
    }
    if (client) await client.close();
  });

  it("searches issues via GET (JQL)", async () => {
    const jql = `project = "${projectKey}" AND summary ~ "${runId}"`;
    const result = requireToolSuccess(
      await client.callTool("jira_search_issues", {
        jql,
        responseProfile: "standard"
      })
    );
    const keys = extractIssueKeys(result.data);
    // Must find exactly the two issues created for this run.
    expect(keys.sort()).toEqual([...issueKeys].sort());
  });

  it("searches issues via POST (jira.search.create)", async () => {
    const jql = `project = "${projectKey}" AND summary ~ "${runId}"`;
    const result = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.search.create",
        body: { jql },
        responseProfile: "standard"
      })
    );
    const keys = extractIssueKeys(result.data);
    expect(keys.sort()).toEqual([...issueKeys].sort());
  });
});
