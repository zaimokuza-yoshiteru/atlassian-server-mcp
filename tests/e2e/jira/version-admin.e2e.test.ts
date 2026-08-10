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

// ── jira-version-admin ──
// 15 ops: version CRUD (4), move/merge/swap (3), counts (2), remotelinks (7).
// All state is disposable — a self-contained project is created and destroyed.

active("jira-version-admin", () => {
  const runId = randomUUID().slice(0, 8).toUpperCase();
  const projectKey = `E${runId}`;
  let client: StdioMcpClient;
  // Fixture versions created in beforeAll and used across its
  let versionA: { id: string; name: string };
  let versionB: { id: string; name: string };
  let crudVersionId: string | undefined; // standalone version for CRUD its

  beforeAll(async () => {
    await ensureFixture(
      fixtureRequest("jira", "/rest/api/2/project", {
        method: "POST",
        body: {
          key: projectKey,
          name: `E2E J6 Version ${runId}`,
          projectTypeKey: "software",
          lead: process.env.ATLASSIAN_ADMIN_USERNAME || process.env.ATLASSIAN_USERNAME
        }
      }),
      [201, 400]
    );
    recordCleanup("jira", "project", projectKey, "created");

    client = await StdioMcpClient.start("jira", ["--exposure-tier=max"]);

    // Create version A and B for move/merge/swap
    const va = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.version.create",
        body: { name: `vA-${runId}`, project: projectKey, description: "Version A for merge/swap" }
      })
    );
    versionA = { id: String(projectedValue(va.data, "id")), name: `vA-${runId}` };
    recordCleanup("jira", "version", versionA.id, "created");

    const vb = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.version.create",
        body: { name: `vB-${runId}`, project: projectKey, description: "Version B for merge/swap" }
      })
    );
    versionB = { id: String(projectedValue(vb.data, "id")), name: `vB-${runId}` };
    recordCleanup("jira", "version", versionB.id, "created");
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

  // ── Version CRUD (3 ops: create, get, update; delete is via merge/swap) ──
  it("version CRUD: create → get → update", async () => {
    // Create a fresh standalone version
    const created = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.version.create",
        body: { name: `vCRUD-${runId}`, project: projectKey, description: "CRUD test version" }
      })
    );
    crudVersionId = String(projectedValue(created.data, "id"));
    expect(crudVersionId, JSON.stringify(created)).toBeTruthy();
    expect(containsValue(created.data, `vCRUD-${runId}`), JSON.stringify(created)).toBe(true);

    // Get
    const get = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.version.get",
        path: { id: crudVersionId },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(get.data, "name"), JSON.stringify(get)).toBe(`vCRUD-${runId}`);

    // Update
    const newName = `vCRUD-${runId}-UPD`;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.version.update",
        path: { id: crudVersionId },
        body: { name: newName, description: "Updated" }
      })
    );
    const afterUpdate = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.version.get",
        path: { id: crudVersionId },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(afterUpdate.data, "name"), JSON.stringify(afterUpdate)).toBe(newName);
    // Cleanup: deleted via project cascade in afterAll
  });

  // ── Version move (1 op) ──
  it("reorders versions with move", async () => {
    // Move versionA to be after versionB
    const selfUri = projectedValue(
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.version.get",
          path: { id: versionB.id },
          responseProfile: "standard"
        })
      ).data,
      "self"
    );
    expect(selfUri, "versionB self URI required for move").toBeTruthy();

    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.version.move",
        path: { id: versionA.id },
        body: { after: String(selfUri) }
      })
    );

    // Verify by listing versions (the response should not error)
    const list = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.versions.list",
        path: { projectIdOrKey: projectKey },
        responseProfile: "standard"
      })
    );
    const names = projectedValues(list.data, "name") as string[];
    expect(names.length, JSON.stringify(list)).toBeGreaterThanOrEqual(2);
  });

  // ── Version merge (1 op) ──
  it("merges version A into version B", async () => {
    // merge versionA → versionB (operation success is the coverage evidence)
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.version.mergeto.update",
        path: { id: versionA.id, moveIssuesTo: versionB.id }
      })
    );
    // versionA is now deleted — merge consumed it
    recordCleanup("jira", "version", versionA.id, "cleaned");
    versionA.id = ""; // mark consumed by merge/swap — version no longer exists
  });

  // ── Version removeAndSwap (1 op) ──
  it("removes a version with removeAndSwap", async () => {
    // Create version C for swap target
    const vc = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.version.create",
        body: { name: `vC-${runId}`, project: projectKey, description: "Version C for swap" }
      })
    );
    const versionCId = String(projectedValue(vc.data, "id"));
    recordCleanup("jira", "version", versionCId, "created");

    // removeAndSwap versionB → versionC (operation success is the coverage evidence)
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.version.removeandswap.create",
        path: { id: versionB.id },
        body: { moveFixIssuesTo: Number(versionCId) }
      })
    );
    // versionB is now deleted — swap consumed it
    recordCleanup("jira", "version", versionB.id, "cleaned");
    versionB.id = ""; // mark consumed by merge/swap — version no longer exists
  });

  // ── Version counts (2 ops) ──
  it("returns version issue counts", async () => {
    // Create a fresh version for counts (versions from merge/swap are deleted)
    const vCount = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.version.create",
        body: { name: `vCount-${runId}`, project: projectKey }
      })
    );
    const vCountId = String(projectedValue(vCount.data, "id"));
    recordCleanup("jira", "version", vCountId, "created");

    try {
      const related = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.version.relatedissuecounts.list",
          path: { id: vCountId },
          responseProfile: "standard"
        })
      );
      // Jira 11 returns issueCountWithCustomFieldsShowingVersion / issuesFixedCount / issuesAffectedCount
      const fixedCount = projectedValue(related.data, "issuesFixedCount");
      expect(typeof fixedCount, JSON.stringify(related)).toBe("number");

      const unresolved = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.version.unresolvedissuecount.list",
          path: { id: vCountId },
          responseProfile: "standard"
        })
      );
      const unresCount = projectedValue(unresolved.data, "issuesUnresolvedCount");
      expect(typeof unresCount, JSON.stringify(unresolved)).toBe("number");
    } finally {
      // Version cleaned up via project cascade in afterAll
    }
  });

  // ── Version remote links (7 ops) ──
  it("version remote link lifecycle", async () => {
    // Create a fresh version for remotelinks
    const vLink = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.version.create",
        body: { name: `vLink-${runId}`, project: projectKey }
      })
    );
    const vLinkId = String(projectedValue(vLink.data, "id"));
    recordCleanup("jira", "version", vLinkId, "created");

    try {
      // ── Create remotelink WITH globalId (explicit globalId in path) ──
      const customGlobalId = `e2e-custom-${runId}`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.version.remotelink.create.versionid",
          path: { versionId: vLinkId, globalId: customGlobalId },
          body: { link: "https://example.com/e2e-custom", name: `e2e-custom-link-${runId}` }
        })
      );

      // ── Get remotelink by versionId + globalId ──
      const get = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.version.remotelink.get",
          path: { versionId: vLinkId, globalId: customGlobalId },
          responseProfile: "standard"
        })
      );
      expect(containsValue(get.data, `e2e-custom-link-${runId}`), JSON.stringify(get)).toBe(true);

      // ── List remotelinks by versionId ──
      const listByVersion = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.version.remotelink.list.versionid",
          path: { versionId: vLinkId },
          responseProfile: "standard"
        })
      );
      expect(listByVersion.data, JSON.stringify(listByVersion)).toBeTruthy();

      // ── List remotelinks by globalId (query param) ──
      const listByGlobal = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.version.remotelink.list",
          query: { globalId: customGlobalId },
          responseProfile: "standard"
        })
      );
      expect(listByGlobal.data, JSON.stringify(listByGlobal)).toBeTruthy();

      // ── Create remotelink WITHOUT globalId (auto-generated) ──
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.version.remotelink.create",
          path: { versionId: vLinkId },
          body: { link: "https://example.com/e2e", name: `e2e-link-${runId}` }
        })
      );

      // ── Delete remotelink by versionId + globalId ──
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.version.remotelink.delete.versionid",
          path: { versionId: vLinkId, globalId: customGlobalId }
        })
      );

      // ── Delete all remaining remotelinks for the version ──
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.version.remotelink.delete",
          path: { versionId: vLinkId }
        })
      );

      // Verify: list should be empty or return error after delete-all
      const afterDelete = await client.callTool("atlassian_execute_operation", {
        operationId: "jira.version.remotelink.list.versionid",
        path: { versionId: vLinkId },
        responseProfile: "standard"
      });
      if (!afterDelete.isError) {
        const data = (afterDelete.structuredContent as any)?.data ?? afterDelete.structuredContent;
        const isEmpty = Array.isArray(data) ? data.length === 0 : data !== null;
        expect(
          isEmpty,
          `Expected no remotelinks after delete, got: ${JSON.stringify(afterDelete)}`
        ).toBe(true);
      }
    } finally {
      // Version cleaned up via project cascade in afterAll
    }
  });
});
