import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { StdioMcpClient, requireToolSuccess } from "../support/mcp-client.js";
import {
  ensureFixture,
  fixtureRequest,
  projectedValue,
  projectedValues,
  reviewerCredentials
} from "../support/rest-fixture.js";

const active = process.env.E2E_PRODUCT === "jira" ? describe : describe.skip;

// ── jira-search-users ──
// 7 read-only ops: users.get/users.search, user.assignable.*, user.viewissue.*,
// search.error.lookup.list, issue.picker.list.

active("jira-search-users", () => {
  const runId = randomUUID().slice(0, 8);
  const projectKey = process.env.E2E_JIRA_PROJECT_KEY ?? "MCP";
  let client: StdioMcpClient;

  beforeAll(async () => {
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
  });

  afterAll(async () => {
    if (client) await client.close();
  });

  // ── it 1: users.search ──

  it("searches users", async () => {
    const reviewer = reviewerCredentials("jira");
    // The query param name is "query" (user picker style), not "username"
    const result = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.users.search",
        query: { query: reviewer.username! },
        responseProfile: "standard"
      })
    );
    const names = projectedValues(result.data, "name") as string[];
    expect(names.length, JSON.stringify(result)).toBeGreaterThan(0);
    expect(names, JSON.stringify(result)).toContain(reviewer.username!);
  });

  it("gets a user by username", async () => {
    const reviewer = reviewerCredentials("jira");
    const result = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.users.get",
        query: { username: reviewer.username },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(result.data, "name"), JSON.stringify(result)).toBe(reviewer.username);
  });

  // ── it 2: assignable users ──

  it("searches assignable users", async () => {
    const s1 = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.user.assignable.search.list",
        query: { project: projectKey },
        responseProfile: "standard"
      })
    );
    const names1 = projectedValues(s1.data, "name") as string[];
    expect(names1.length, JSON.stringify(s1)).toBeGreaterThan(0);

    const s2 = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.user.assignable.multiprojectsearch.list",
        query: { projectKeys: projectKey },
        responseProfile: "standard"
      })
    );
    const names2 = projectedValues(s2.data, "name") as string[];
    expect(names2.length, JSON.stringify(s2)).toBeGreaterThan(0);
  });

  // ── it 3: viewissue users ──

  it("searches viewissue users", async () => {
    // username param is de facto required in Jira DC 11.3.5 ("searchName must not be null")
    const adminUser =
      process.env.ATLASSIAN_ADMIN_USERNAME || process.env.ATLASSIAN_USERNAME || "admin";
    const created = requireToolSuccess(
      await client.callTool("jira_create_issue", {
        fields: {
          project: { key: projectKey },
          issuetype: { name: "Task" },
          summary: `E2E viewissue probe ${runId}`
        }
      })
    );
    const issueKey = projectedValue(created.data, "key") as string;
    try {
      const result = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.user.viewissue.search.list",
          query: { issueKey, username: adminUser },
          responseProfile: "standard"
        })
      );
      const names = projectedValues(result.data, "name") as string[];
      expect(names.length, JSON.stringify(result)).toBeGreaterThan(0);
    } finally {
      await fixtureRequest("jira", `/rest/api/2/issue/${issueKey}`, { method: "DELETE" });
    }
  });

  // ── it 4: search error lookup ──

  it("looks up search errors", async () => {
    // Trigger a JQL error to populate the error log, then look up error records.
    const badJql = "projectZZZ = MCP";
    const bad = await client.callTool("jira_search_issues", {
      jql: badJql
    });
    expect(bad.isError, JSON.stringify(bad)).toBe(true);

    const result = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.search.error.lookup.list",
        responseProfile: "standard"
      })
    );
    // Jira DC may or may not retain search-error records depending on internal
    // error-log configuration. Accept either null (no records) or an array.
    const errors = projectedValues(result.data, "value");
    if (errors.length > 0) {
      expect(
        errors.some((e) => typeof e === "string" && e.includes("projectZZZ")),
        JSON.stringify(errors)
      ).toBe(true);
    }
    // The endpoint itself succeeded — that is the coverage evidence.
  });

  // ── it 5: issue picker ──

  it("picks issues", async () => {
    // The issue picker returns sections[{id, label, issues}].
    // Results depend on background indexing; assert the endpoint returns
    // valid structural data (non-error, at least 1 section returned).
    const result = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.picker.list",
        query: { query: "MCP" },
        responseProfile: "standard"
      })
    );
    // The standard-profile response has $fragment entries for each section.
    // Assert the response is non-empty and the page reports returned items.
    expect((result.page as any)?.returned, JSON.stringify(result)).toBeGreaterThan(0);
  });
});
