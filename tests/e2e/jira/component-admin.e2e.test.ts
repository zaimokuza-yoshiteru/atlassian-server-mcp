import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordCleanup } from "../support/cleanup-journal.js";
import { StdioMcpClient, requireToolSuccess } from "../support/mcp-client.js";
import {
  containsValue,
  ensureFixture,
  fixtureRequest,
  projectedValue
} from "../support/rest-fixture.js";

const active = process.env.E2E_PRODUCT === "jira" ? describe : describe.skip;

// ── jira-component-admin ──
// 5 ops: component CRUD (4) + relatedIssueCounts (1).

active("jira-component-admin", () => {
  const runId = randomUUID().slice(0, 8).toUpperCase(); // Jira keys require [A-Z][A-Z]+
  const projectKey = `E${runId}`; // max 10 chars in Jira
  let client: StdioMcpClient;
  let componentId: string | undefined;

  beforeAll(async () => {
    // Self-contained disposable project — never touch MCP project
    await ensureFixture(
      fixtureRequest("jira", "/rest/api/2/project", {
        method: "POST",
        body: {
          key: projectKey,
          name: `E2E J6 Component ${runId}`,
          projectTypeKey: "software",
          lead: process.env.ATLASSIAN_ADMIN_USERNAME || process.env.ATLASSIAN_USERNAME
        }
      }),
      [201, 400]
    );
    recordCleanup("jira", "project", projectKey, "created");

    client = await StdioMcpClient.start("jira", ["--exposure-tier=max"]);
  }, 60_000);

  afterAll(async () => {
    if (client) await client.close();
    try {
      await fixtureRequest("jira", `/rest/api/2/project/${projectKey}`, { method: "DELETE" });
      recordCleanup("jira", "project", projectKey, "cleaned");
    } catch (e) {
      recordCleanup("jira", "project", projectKey, "cleanup-failed", { error: e });
      throw e; // material fixture
    }
  });

  it("component lifecycle: create → get → relatedIssueCounts → update → delete", async () => {
    const compName = `e2e-comp-${runId}`;

    // ── Create ──
    const created = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.component.create",
        body: { name: compName, project: projectKey, description: "E2E disposable component" }
      })
    );
    componentId = String(projectedValue(created.data, "id"));
    expect(componentId, JSON.stringify(created)).toBeTruthy();
    recordCleanup("jira", "component", componentId, "created");
    expect(containsValue(created.data, compName), JSON.stringify(created)).toBe(true);

    // ── Get ──
    const get = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.component.get",
        path: { id: componentId },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(get.data, "name"), JSON.stringify(get)).toBe(compName);
    expect(projectedValue(get.data, "description"), JSON.stringify(get)).toBe(
      "E2E disposable component"
    );

    // ── Related issue counts ──
    const counts = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.component.relatedissuecounts.list",
        path: { id: componentId },
        responseProfile: "standard"
      })
    );
    const issueCount = projectedValue(counts.data, "issueCount");
    expect(typeof issueCount, JSON.stringify(counts)).toBe("number");

    // ── Update ──
    const updatedName = `${compName}-updated`;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.component.update",
        path: { id: componentId },
        body: { name: updatedName, description: "Updated description" }
      })
    );
    const afterUpdate = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.component.get",
        path: { id: componentId },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(afterUpdate.data, "name"), JSON.stringify(afterUpdate)).toBe(updatedName);

    // ── Delete ──
    const deletedId = componentId;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.component.delete",
        path: { id: deletedId }
      })
    );
    recordCleanup("jira", "component", deletedId, "cleaned");
    componentId = undefined;

    // ── Verify deletion ──
    const gone = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "jira.component.get",
        path: { id: deletedId },
        responseProfile: "standard"
      },
      { expectError: true }
    );
    expect(gone.isError, JSON.stringify(gone)).toBe(true);
  });
});
