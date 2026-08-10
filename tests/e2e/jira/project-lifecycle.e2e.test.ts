import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordCleanup } from "../support/cleanup-journal.js";
import { StdioMcpClient, requireToolSuccess } from "../support/mcp-client.js";
import {
  containsValue,
  ensureFixture,
  fixtureRequest,
  projectedValue,
  projectedValues
} from "../support/rest-fixture.js";

const active = process.env.E2E_PRODUCT === "jira" ? describe : describe.skip;

// ── jira-project-lifecycle ──
// 19 ops: projects CRUD (5), scheme lists (3), role reads (2), type reads (3),
// statuses/securitylevel/workflowscheme lists (3), components/versions lists (3).

active("jira-project-lifecycle", () => {
  const runId = randomUUID().slice(0, 8).toUpperCase();
  const projectKey = `E${runId}`;
  let client: StdioMcpClient;
  beforeAll(async () => {
    // Create the disposable test-bed project
    await ensureFixture(
      fixtureRequest("jira", "/rest/api/2/project", {
        method: "POST",
        body: {
          key: projectKey,
          name: `E2E J6 Lifecycle ${runId}`,
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

  // ── Project CRUD (5 ops) ──
  it("project CRUD: create → get → list → update → delete a second disposable project", async () => {
    const secondKey = `X${runId}`;

    // Create a second project via MCP
    const created = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.projects.create",
        body: {
          key: secondKey,
          name: `E2E J6 CRUD ${runId}`,
          projectTypeKey: "software",
          lead: process.env.ATLASSIAN_ADMIN_USERNAME || process.env.ATLASSIAN_USERNAME
        }
      })
    );
    expect(containsValue(created.data, secondKey), JSON.stringify(created)).toBe(true);
    recordCleanup("jira", "project", secondKey, "created");

    // Get the second project
    const get = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.projects.get",
        path: { projectKey: secondKey },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(get.data, "key"), JSON.stringify(get)).toBe(secondKey);
    expect(projectedValue(get.data, "name"), JSON.stringify(get)).toBe(`E2E J6 CRUD ${runId}`);

    // List projects — should contain both test-bed and the second project
    const list = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.projects.list",
        responseProfile: "standard"
      })
    );
    const keys = projectedValues(list.data, "key") as string[];
    expect(keys, JSON.stringify(list)).toContain(projectKey);
    expect(keys, JSON.stringify(list)).toContain(secondKey);

    // Update the second project
    const newName = `E2E J6 CRUD ${runId} UPD`;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.projects.update",
        path: { projectKey: secondKey },
        body: { name: newName, description: "Updated by E2E" }
      })
    );
    const afterUpdate = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.projects.get",
        path: { projectKey: secondKey },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(afterUpdate.data, "name"), JSON.stringify(afterUpdate)).toBe(newName);

    // Delete the second project via MCP
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.projects.delete",
        path: { projectKey: secondKey }
      })
    );
    recordCleanup("jira", "project", secondKey, "cleaned");

    // Verify deletion
    const gone = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "jira.projects.get",
        path: { projectKey: secondKey },
        responseProfile: "standard"
      },
      { expectError: true }
    );
    expect(gone.isError, JSON.stringify(gone)).toBe(true);
  });

  // ── Scheme read-only lists (6 ops) ──
  it("lists project schemes and security configuration", async () => {
    // Issue security level scheme (new project without security config returns 404)
    const isls = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "jira.project.issuesecuritylevelscheme.list",
        path: { projectKeyOrId: projectKey },
        responseProfile: "standard"
      },
      { expectError: true }
    );
    // 404 is valid error-contract evidence — new projects have no security scheme
    if (isls.isError) {
      const err = (isls.structuredContent as any)?.error;
      expect(err?.status, JSON.stringify(isls)).toBe(404);
    } else {
      expect((isls as any).data, JSON.stringify(isls)).toBeTruthy();
    }

    // Notification scheme (new project without explicit scheme returns 404)
    const ns = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "jira.project.notificationscheme.list",
        path: { projectKeyOrId: projectKey },
        responseProfile: "standard"
      },
      { expectError: true }
    );
    if (ns.isError) {
      const nsErr = (ns.structuredContent as any)?.error;
      expect(nsErr?.status, JSON.stringify(ns)).toBe(404);
    } else {
      expect((ns as any).data, JSON.stringify(ns)).toBeTruthy();
    }

    // Permission scheme
    const ps = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.permissionscheme.list",
        path: { projectKeyOrId: projectKey },
        responseProfile: "standard"
      })
    );
    const schemeId = projectedValue(ps.data, "id");
    expect(schemeId, JSON.stringify(ps)).toBeTruthy();

    // Security levels
    const sl = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.securitylevel.list",
        path: { projectKeyOrId: projectKey },
        responseProfile: "standard"
      })
    );
    expect(Array.isArray(sl.data) || sl.data !== null, JSON.stringify(sl)).toBe(true);

    // Statuses
    const statuses = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.statuses.list",
        path: { projectIdOrKey: projectKey },
        responseProfile: "standard"
      })
    );
    expect(statuses.data, JSON.stringify(statuses)).toBeTruthy();

    // Workflow scheme
    const ws = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.workflowscheme.list",
        path: { projectKeyOrId: projectKey },
        responseProfile: "standard"
      })
    );
    expect(ws.data, JSON.stringify(ws)).toBeTruthy();
  });

  // ── Role read-only ops (2 ops) ──
  it("lists and gets project roles", async () => {
    // Use REST fixture to discover role IDs (MCP role.list response is large and may truncate)
    const rolesResp = await fixtureRequest("jira", `/rest/api/2/project/${projectKey}/role`);
    const roleObj = rolesResp.data as Record<string, string>;
    const roleUrlEntries = Object.entries(roleObj);
    expect(roleUrlEntries.length, JSON.stringify(rolesResp.data)).toBeGreaterThan(0);

    // role.list via MCP (verify it returns a non-error response)
    const roles = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.role.list",
        path: { projectIdOrKey: projectKey },
        responseProfile: "standard"
      })
    );
    expect(roles.data, JSON.stringify(roles)).toBeTruthy();

    // Extract numeric role ID from a URL value
    const [roleName, roleUrl] = roleUrlEntries[0]!;
    const roleIdFromUrl = roleUrl.split("/").pop()!;
    expect(roleIdFromUrl, `Could not extract role ID from ${roleUrl}`).toMatch(/^\d+$/);

    // Get specific role via MCP
    const role = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.role.get",
        path: { projectIdOrKey: projectKey, id: Number(roleIdFromUrl) },
        responseProfile: "standard"
      })
    );
    const gotRoleName = projectedValue(role.data, "name");
    expect(gotRoleName, JSON.stringify(role)).toBeTruthy();
    expect(String(gotRoleName), JSON.stringify(role)).toBe(roleName);
  });

  // ── Type read-only ops (3 ops) ──
  it("lists and gets project types", async () => {
    // List all types
    const types = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.type.list",
        responseProfile: "standard"
      })
    );
    const typeList = types.data as any[];
    expect(Array.isArray(typeList) && typeList.length > 0, JSON.stringify(types)).toBe(true);
    const firstTypeKey =
      (typeList[0] as any).key ?? (typeList[0] as any).formattedKey ?? "software";

    // Get specific type
    const type = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.type.get",
        path: { projectTypeKey: firstTypeKey },
        responseProfile: "standard"
      })
    );
    expect(
      projectedValue(type.data, "key") ?? projectedValue(type.data, "formattedKey"),
      JSON.stringify(type)
    ).toBeTruthy();
  });

  // ── Project resource listings (3 ops) ──
  it("lists project components and versions (empty for new project)", async () => {
    // Components list (new project = empty)
    const components = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.components.list",
        path: { projectIdOrKey: projectKey },
        responseProfile: "standard"
      })
    );
    expect(Array.isArray(components.data), JSON.stringify(components)).toBe(true);

    // Versions list (paginated)
    const verList = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.version.list",
        path: { projectIdOrKey: projectKey },
        responseProfile: "standard"
      })
    );
    expect(verList.data, JSON.stringify(verList)).toBeTruthy();

    // Versions list (non-paginated)
    const versions = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.versions.list",
        path: { projectIdOrKey: projectKey },
        responseProfile: "standard"
      })
    );
    expect(Array.isArray(versions.data), JSON.stringify(versions)).toBe(true);
  });
});
