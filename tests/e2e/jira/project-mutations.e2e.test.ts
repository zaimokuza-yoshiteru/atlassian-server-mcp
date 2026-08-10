import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordCleanup } from "../support/cleanup-journal.js";
import { pollUntil } from "../support/poll.js";
import { StdioMcpClient, requireToolSuccess } from "../support/mcp-client.js";
import {
  containsValue,
  ensureFixture,
  fixtureRequest,
  projectedValue,
  reviewerCredentials
} from "../support/rest-fixture.js";
import { withRestoredState } from "../support/restore-state.js";

const active = process.env.E2E_PRODUCT === "jira" ? describe : describe.skip;

// ── jira-project-mutations ──
// Project mutations covered here exclude the unsupported Jira avatar lifecycle;
// archive/restore, type, permission-scheme, and role operations remain covered.

active("jira-project-mutations", () => {
  const runId = randomUUID().slice(0, 8).toUpperCase();
  const projectKey = `M${runId}`;
  let client: StdioMcpClient;

  beforeAll(async () => {
    await ensureFixture(
      fixtureRequest("jira", "/rest/api/2/project", {
        method: "POST",
        body: {
          key: projectKey,
          name: `E2E J6 Mutations ${runId}`,
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

  // ── Archive / Restore (2 ops) ──
  it("archives and restores the project", async () => {
    // Archive the project
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.archive",
        path: { projectIdOrKey: projectKey }
      })
    );

    // Poll until project shows as archived
    await pollUntil(
      async () => {
        const r = requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "jira.projects.get",
            path: { projectKey },
            responseProfile: "standard"
          })
        );
        return projectedValue(r.data, "archived");
      },
      (archived) => archived === true,
      { timeoutMs: 60_000, intervalMs: 3_000 }
    );

    // Restore the project
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.restore",
        path: { projectIdOrKey: projectKey }
      })
    );

    // Poll until project is no longer archived
    await pollUntil(
      async () => {
        const r = requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "jira.projects.get",
            path: { projectKey },
            responseProfile: "standard"
          })
        );
        return projectedValue(r.data, "archived");
      },
      (archived) => archived === false || archived === undefined,
      { timeoutMs: 60_000, intervalMs: 3_000 }
    );
  });

  // ── Project type update (1 op, withRestoredState) ──
  it("updates project type with restore", async () => {
    const originalType = "software";
    const targetType = "business";

    await withRestoredState(
      async () => originalType,
      async (original) => {
        requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "jira.project.type.update",
            path: { projectIdOrKey: projectKey, newProjectTypeKey: original as string }
          })
        );
      },
      async () => {
        // Switch to business
        requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "jira.project.type.update",
            path: { projectIdOrKey: projectKey, newProjectTypeKey: targetType }
          })
        );
        // Verify the switch
        const get = requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "jira.projects.get",
            path: { projectKey },
            responseProfile: "standard"
          })
        );
        const ptk = projectedValue(get.data, "projectTypeKey");
        expect(ptk, JSON.stringify(get)).toBe(targetType);
      }
    );

    // Verify restored
    const restored = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.projects.get",
        path: { projectKey },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(restored.data, "projectTypeKey"), JSON.stringify(restored)).toBe(
      originalType
    );
  });

  // ── Permission scheme update (1 op, withRestoredState) ──
  it("updates project permission scheme with restore", async () => {
    // Discover current scheme
    const current = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.permissionscheme.list",
        path: { projectKeyOrId: projectKey },
        responseProfile: "standard"
      })
    );
    const currentSchemeId = String(projectedValue(current.data, "id"));
    expect(currentSchemeId, JSON.stringify(current)).toBeTruthy();

    // Find a different scheme via REST
    const allSchemes = await fixtureRequest("jira", "/rest/api/2/permissionscheme");
    const schemes = allSchemes.data?.permissionSchemes ?? allSchemes.data?.values ?? [];
    const otherScheme = (schemes as any[]).find((s: any) => String(s.id) !== currentSchemeId);
    if (!otherScheme) {
      throw new Error(
        "No alternative permission scheme found — e2e-prepare should have created one. " +
          "Run `pnpm e2e:prepare` or `node scripts/e2e-prepare.mjs jira` first."
      );
    }
    const otherSchemeId = String(otherScheme.id);

    await withRestoredState(
      async () => currentSchemeId,
      async (original) => {
        requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "jira.project.permissionscheme.update",
            path: { projectKeyOrId: projectKey },
            body: { id: Number(original) }
          })
        );
      },
      async () => {
        requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "jira.project.permissionscheme.update",
            path: { projectKeyOrId: projectKey },
            body: { id: Number(otherSchemeId) }
          })
        );
        // Verify
        const verify = requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "jira.project.permissionscheme.list",
            path: { projectKeyOrId: projectKey },
            responseProfile: "standard"
          })
        );
        expect(String(projectedValue(verify.data, "id")), JSON.stringify(verify)).toBe(
          otherSchemeId
        );
      }
    );
  });

  // ── Role mutations (3 ops) ──
  it("creates, updates, and deletes a project role actor", async () => {
    const reviewer = reviewerCredentials("jira");
    const reviewerUser = reviewer.username!;

    // Discover role IDs via REST fixture (MCP role.list may truncate with standard profile)
    const rolesResp = await fixtureRequest("jira", `/rest/api/2/project/${projectKey}/role`);
    const roleObj = rolesResp.data as Record<string, string>;
    const roleUrlEntries = Object.entries(roleObj);
    expect(roleUrlEntries.length, JSON.stringify(rolesResp.data)).toBeGreaterThan(0);

    // MCP role.list (verify it returns non-error)
    const roles = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.role.list",
        path: { projectIdOrKey: projectKey },
        responseProfile: "standard"
      })
    );
    expect(roles.data, JSON.stringify(roles)).toBeTruthy();

    // Pick "Users" role and extract numeric ID from URL
    const usersEntry = roleUrlEntries.find(([name]) => name === "Users") ?? roleUrlEntries[0]!;
    const numericRoleId = Number(usersEntry[1].split("/").pop()!);
    expect(numericRoleId, `Could not extract role ID from ${usersEntry[1]}`).toBeGreaterThan(0);

    // Add reviewer to the role
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.role.create",
        path: { projectIdOrKey: projectKey, id: numericRoleId },
        body: { user: [reviewerUser] }
      })
    );

    // Update — PUT setActors replaces the actor list via categorisedActors bean.
    // This exercises the replace-semantics path; the reviewer must still be present
    // after the update, verified by the get below.
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.project.role.update",
        path: { projectIdOrKey: projectKey, id: numericRoleId },
        body: { categorisedActors: { "atlassian-user-role-actor": [reviewerUser] } }
      })
    );

    try {
      // Verify reviewer is in the role
      const getAfterCreate = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.project.role.get",
          path: { projectIdOrKey: projectKey, id: numericRoleId },
          responseProfile: "standard"
        })
      );
      expect(containsValue(getAfterCreate.data, reviewerUser), JSON.stringify(getAfterCreate)).toBe(
        true
      );
    } finally {
      // Clean up: remove reviewer from the role
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.project.role.delete",
          path: { projectIdOrKey: projectKey, id: numericRoleId },
          query: { user: reviewerUser }
        })
      );

      // Verify reviewer is removed
      const getAfterDelete = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.project.role.get",
          path: { projectIdOrKey: projectKey, id: numericRoleId },
          responseProfile: "standard"
        })
      );
      const stillPresent = containsValue(getAfterDelete.data, reviewerUser);
      expect(
        stillPresent,
        `Reviewer should be removed from role, got: ${JSON.stringify(getAfterDelete)}`
      ).toBe(false);
    }
  });
});
