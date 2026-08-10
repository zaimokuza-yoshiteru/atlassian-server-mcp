import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordCleanup } from "../support/cleanup-journal.js";
import { StdioMcpClient, requireToolSuccess } from "../support/mcp-client.js";
import {
  containsValue,
  ensureFixture,
  fixtureRequest,
  projectedValue,
  projectedValues,
  resolveDashboard
} from "../support/rest-fixture.js";
import { withRestoredState } from "../support/restore-state.js";

const active = process.env.E2E_PRODUCT === "jira" ? describe : describe.skip;

// ── jira-filters-dashboards ──
// 20 ops: filter CRUD (4), filter columns (3), filter permissions (4),
// filter favourite (1), default share scope (2), dashboard (6).

active("jira-filters-dashboards", () => {
  const runId = randomUUID().slice(0, 8);
  const projectKey = process.env.E2E_JIRA_PROJECT_KEY ?? "MCP";
  const propKey = `e2e-prop-${runId}`;
  let client: StdioMcpClient;
  let filterId: string | undefined;
  let numericProjectId: string;
  let dashboardId: string;
  let itemId: string;

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

    // Resolve numeric project ID for filter permissions
    const projResp = await fixtureRequest("jira", `/rest/api/2/project/${projectKey}`);
    const rawProjectId = projResp.data?.id;
    if (rawProjectId === undefined || rawProjectId === null) {
      throw new Error(
        `Cannot resolve numeric project ID for ${projectKey}: ` +
          `REST response has no .data.id (status ${projResp.status})`
      );
    }
    numericProjectId = String(rawProjectId);

    client = await StdioMcpClient.start("jira", ["--exposure-tier=max"]);

    const filterName = `MCP E2E filter ${runId}`;
    const created = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.create",
        body: {
          name: filterName,
          jql: "project = MCP",
          description: "E2E disposable filter",
          favourite: true
        }
      })
    );
    filterId = String(projectedValue(created.data, "id"));
    expect(filterId, JSON.stringify(created)).toBeTruthy();
    recordCleanup("jira", "filter", filterId, "created");

    // Resolve the system-default dashboard for item-properties operations.
    // Jira DC does not support dashboard creation or gadget listing via REST.
    const dash = await resolveDashboard();
    dashboardId = dash.id;
    itemId = dash.itemId;
  }, 60_000);

  afterAll(async () => {
    if (filterId) {
      try {
        const deleted = await fixtureRequest("jira", `/rest/api/2/filter/${filterId}`, {
          method: "DELETE"
        });
        if ([200, 204].includes(deleted.status)) {
          recordCleanup("jira", "filter", filterId, "cleaned");
        } else {
          throw new Error(`Filter delete returned HTTP ${deleted.status}`);
        }
      } catch (error) {
        recordCleanup("jira", "filter", filterId, "cleanup-failed", { error: error });
        throw error;
      }
    }
    // Sweep any e2e-prop-* residue on the dashboard item. The dashboard
    // lifecycle it block deletes its own property in the happy path, but a
    // crash between PUT and DELETE leaves a permanent residue on the shared
    // system dashboard (confirmed on the real instance: e2e-prop-9b7616e4).
    if (dashboardId && itemId) {
      try {
        const list = await fixtureRequest(
          "jira",
          `/rest/api/2/dashboard/${dashboardId}/items/${itemId}/properties`
        );
        const keys: string[] = list.data?.keys?.map((k: { key: string }) => k.key) ?? [];
        for (const key of keys) {
          if (!key.startsWith("e2e-prop-")) continue;
          try {
            await fixtureRequest(
              "jira",
              `/rest/api/2/dashboard/${dashboardId}/items/${itemId}/properties/${key}`,
              { method: "DELETE" }
            );
          } catch {
            recordCleanup(
              "jira",
              "dashboard-property",
              `${dashboardId}/${itemId}/${key}`,
              "cleanup-failed"
            );
          }
        }
      } catch {
        // Properties list itself may fail — not worth failing the suite over.
      }
    }
    if (client) await client.close();
  });

  // ── it 1: filter CRUD (4 ops) ──

  it("filter CRUD lifecycle", async () => {
    // create — already done in beforeAll, just verify via get
    const get = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.get",
        path: { id: filterId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(get.data, runId), JSON.stringify(get)).toBe(true);
    expect(containsValue(get.data, "project = MCP"), JSON.stringify(get)).toBe(true);

    // update — PUT requires full body (name + jql)
    const updatedName = `MCP E2E filter ${runId} v2`;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.update",
        path: { id: filterId },
        body: { name: updatedName, jql: "project = MCP ORDER BY created" }
      })
    );
    const reget = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.get",
        path: { id: filterId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(reget.data, updatedName), JSON.stringify(reget)).toBe(true);
  });

  // ── it 2: filter columns (3 ops) ──
  // Jira DC 11.3.5: GET /filter/{id}/columns returns 404, but PUT
  // (body: { columns: [...] }) and DELETE both work.

  it("filter columns lifecycle", async () => {
    // list — may return error in Jira DC; exercise the call regardless
    const listResult = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "jira.filter.columns.list",
        path: { id: filterId },
        responseProfile: "standard"
      },
      { expectError: true }
    );
    // Jira DC 11.3.5 returns 404 for GET columns; that is valid error-contract evidence
    expect(listResult.isError, JSON.stringify(listResult)).toBe(true);

    // update — set specific columns (use valid Jira column field names)
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.columns.update",
        path: { id: filterId },
        body: { columns: ["issuetype", "issuekey", "summary"] }
      })
    );

    // delete — reset columns to default
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.columns.delete",
        path: { id: filterId }
      })
    );
  });

  // ── it 3: filter permissions (4 ops) ──

  it("filter permissions lifecycle", async () => {
    // create — share with MCP project using numeric project ID
    const created = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.permission.create",
        path: { id: filterId },
        body: { type: "project", projectId: numericProjectId }
      })
    );
    // compact profile returns an array, not an object
    const permId = projectedValues(created.data, "id")[0];
    expect(permId, JSON.stringify(created)).toBeTruthy();

    // list
    const list = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.permission.list",
        path: { id: filterId },
        responseProfile: "standard"
      })
    );
    const permIds = projectedValues(list.data, "id");
    expect(permIds.length, JSON.stringify(list)).toBeGreaterThan(0);

    // get
    const get = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.permission.get",
        path: { id: filterId, permissionId: String(permId) },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(get.data, "id"), JSON.stringify(get)).toBeTruthy();

    // delete — param name is "permission-id" (dash) in registry
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.permission.delete",
        path: { id: filterId, "permission-id": String(permId) }
      })
    );
    const after = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.permission.list",
        path: { id: filterId },
        responseProfile: "standard"
      })
    );
    const afterIds = projectedValues(after.data, "id");
    expect(afterIds.map(String), JSON.stringify(after)).not.toContain(String(permId));
  });

  // ── it 4: filter favourite (2 ops) ──
  // Jira DC: favourite can only be set at creation time; PUT update ignores
  // the favourite field. The filter was created with favourite:true in beforeAll.

  it("filter favourite", async () => {
    // favourite.list — must contain the filter created with favourite:true
    const favs = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.favourite.list",
        responseProfile: "standard"
      })
    );
    const favIds = projectedValues(favs.data, "id");
    expect(favIds.map(String), JSON.stringify(favs)).toContain(filterId);
  });

  // ── it 5: default share scope (2 ops) — withRestoredState ──

  it("default share scope lifecycle", async () => {
    const list = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.defaultsharescope.list",
        responseProfile: "standard"
      })
    );
    const originalScope = projectedValue(list.data, "scope") as string;
    expect(originalScope, JSON.stringify(list)).toBeTruthy();

    await withRestoredState(
      async () => originalScope,
      async (original) => {
        requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "jira.filter.defaultsharescope.update",
            body: { scope: original as string }
          })
        );
      },
      async () => {
        requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "jira.filter.defaultsharescope.update",
            body: { scope: "AUTHENTICATED" }
          })
        );
        const verify = requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "jira.filter.defaultsharescope.list",
            responseProfile: "standard"
          })
        );
        expect(projectedValue(verify.data, "scope"), JSON.stringify(verify)).toBe("AUTHENTICATED");
      }
    );

    const restored = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.defaultsharescope.list",
        responseProfile: "standard"
      })
    );
    expect(projectedValue(restored.data, "scope"), JSON.stringify(restored)).toBe(originalScope);
  });

  // ── it 6: dashboard lifecycle (6 ops) ──

  it("dashboard lifecycle", async () => {
    // list
    const list = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.dashboard.list",
        responseProfile: "standard"
      })
    );
    const dashIds = projectedValues(list.data, "id");
    expect(dashIds.map(String), JSON.stringify(list)).toContain(dashboardId);

    // get
    const get = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.dashboard.get",
        path: { id: dashboardId },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(get.data, "name"), JSON.stringify(get)).toBeTruthy();

    // items.properties.update — body is the raw property value (JSON string literal).
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.dashboard.items.properties.update",
        path: { dashboardId, itemId, propertyKey: propKey },
        body: `E2E ${runId}`
      })
    );

    // Verify via MCP (get.dashboardid)
    const single = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.dashboard.items.properties.get.dashboardid",
        path: { dashboardId, itemId, propertyKey: propKey },
        responseProfile: "standard"
      })
    );
    expect(containsValue(single.data, `E2E ${runId}`), JSON.stringify(single)).toBe(true);

    // list properties
    const keysResult = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.dashboard.items.properties.get",
        path: { dashboardId, itemId },
        responseProfile: "standard"
      })
    );
    const keys = projectedValues(keysResult.data, "key") as string[];
    expect(keys, JSON.stringify(keysResult)).toContain(propKey);

    // delete
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.dashboard.items.properties.delete",
        path: { dashboardId, itemId, propertyKey: propKey }
      })
    );
    const gone = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.dashboard.items.properties.get",
        path: { dashboardId, itemId },
        responseProfile: "standard"
      })
    );
    const goneKeys = projectedValues(gone.data, "key") as string[];
    expect(goneKeys, JSON.stringify(gone)).not.toContain(propKey);
  });

  // ── it 7: filter delete ──

  it("deletes the filter", async () => {
    expect(filterId, "filter must exist before delete").toBeDefined();
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.filter.delete",
        path: { id: filterId! }
      })
    );
    recordCleanup("jira", "filter", filterId!, "cleaned");
    const gone = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "jira.filter.get",
        path: { id: filterId! }
      },
      { expectError: true }
    );
    expect(gone.isError, JSON.stringify(gone)).toBe(true);
    filterId = undefined;
  });
});
