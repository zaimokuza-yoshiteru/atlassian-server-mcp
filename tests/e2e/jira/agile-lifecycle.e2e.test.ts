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

// ── jira-agile-lifecycle ──
// 39 ops: board reads (15), epic reads/updates (8), issue estimation/rank (4),
// sprint lifecycle (9), board create/delete (3).
// Fixtures: a disposable software project + JQL filter + scrum board are
// created per run (the dc-setup shared E2EAGILE fixture is NOT required).
// DC 11.3.5 behaviors verified against the live baseline:
// - project creation needs the scrum template (bare REST projects lack
//   Epic/Story issue types);
// - sprints.swap takes "sprintToSwapWith" (not the older "sprintToSwap");
// - the global epic-none issue list is instance-wide and paginated, so it is
//   JQL-scoped to the disposable project.

active("jira-agile-lifecycle", () => {
  const runId = randomUUID().slice(0, 8).toUpperCase();
  const projectKey = `A${runId}`;
  let client: StdioMcpClient;
  let filterId: number;
  let boardId: number;
  let epicKey = "";
  let epicId = 0;
  let storyKey = "";
  let story2Key = "";

  async function createIssue(
    summary: string,
    issueType: string
  ): Promise<{ key: string; id: number }> {
    const body = (extraFields: Record<string, unknown>) => ({
      fields: {
        project: { key: projectKey },
        summary,
        issuetype: { name: issueType },
        ...extraFields
      }
    });
    let response = await fixtureRequest("jira", "/rest/api/2/issue", {
      method: "POST",
      body: body({})
    });
    if (response.status === 400 && issueType === "Epic") {
      // The "Epic Name" custom field id varies by instance.
      const fields = await fixtureRequest("jira", "/rest/api/2/field");
      const epicNameField = (fields.data ?? []).find(
        (field: { name?: string }) => field.name === "Epic Name"
      );
      if (epicNameField) {
        response = await fixtureRequest("jira", "/rest/api/2/issue", {
          method: "POST",
          body: body({ [epicNameField.id]: summary })
        });
      }
    }
    if (!response.data?.key) {
      throw new Error(
        `${issueType} fixture creation failed with HTTP ${response.status}: ${response.text.slice(0, 300)}`
      );
    }
    return { key: response.data.key as string, id: Number(response.data.id) };
  }

  beforeAll(async () => {
    // projectTemplateKey is required: a bare REST-created project gets a
    // minimal issue-type scheme (Task/Sub-task only), so Epic and Story
    // creation would fail. The scrum template assigns the full scheme.
    await ensureFixture(
      fixtureRequest("jira", "/rest/api/2/project", {
        method: "POST",
        body: {
          key: projectKey,
          name: `E2E Agile ${runId}`,
          projectTypeKey: "software",
          projectTemplateKey: "com.pyxis.greenhopper.jira:gh-scrum-template",
          lead: process.env.ATLASSIAN_ADMIN_USERNAME || process.env.ATLASSIAN_USERNAME
        }
      }),
      [201, 400]
    );
    recordCleanup("jira", "project", projectKey, "created");

    const filter = await fixtureRequest("jira", "/rest/api/2/filter", {
      method: "POST",
      body: {
        name: `E2E Agile ${runId}`,
        jql: `project = ${projectKey} ORDER BY Rank ASC`,
        favourite: false
      }
    });
    if (!filter.data?.id) {
      throw new Error(
        `filter fixture failed with HTTP ${filter.status}: ${filter.text.slice(0, 300)}`
      );
    }
    filterId = filter.data.id as number;
    recordCleanup("jira", "filter", String(filterId), "created");

    ({ key: epicKey, id: epicId } = await createIssue(`E2E Agile Epic ${runId}`, "Epic"));
    ({ key: storyKey } = await createIssue(`E2E Agile Story ${runId}`, "Story"));
    ({ key: story2Key } = await createIssue(`E2E Agile Story 2 ${runId}`, "Story"));

    // risky tier includes read + safe + the board/sprint delete operations.
    client = await StdioMcpClient.start("jira", ["--exposure-tier=risky"]);

    // Board creation through the MCP server doubles as jira.agile.boards.create coverage.
    const board = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.create",
        body: { name: `E2E Agile Board ${runId}`, type: "scrum", filterId },
        responseProfile: "standard"
      })
    );
    const createdBoardId = Number(projectedValue(board.data, "id"));
    expect(Number.isInteger(createdBoardId), JSON.stringify(board)).toBe(true);
    boardId = createdBoardId;
  }, 120_000);

  afterAll(async () => {
    if (client) await client.close();
    if (boardId) {
      await fixtureRequest("jira", `/rest/agile/1.0/board/${boardId}`, { method: "DELETE" }).catch(
        () => {}
      );
    }
    try {
      await fixtureRequest("jira", `/rest/api/2/filter/${filterId}`, { method: "DELETE" });
      recordCleanup("jira", "filter", String(filterId), "cleaned");
    } catch (e) {
      recordCleanup("jira", "filter", String(filterId), "cleanup-failed", { error: e });
    }
    try {
      await fixtureRequest("jira", `/rest/api/2/project/${projectKey}`, { method: "DELETE" });
      recordCleanup("jira", "project", projectKey, "cleaned");
    } catch (e) {
      recordCleanup("jira", "project", projectKey, "cleanup-failed", { error: e });
      throw e; // material fixture
    }
  });

  // ── Board read surface (15 ops) ──
  it("board reads: list/get/configuration/projects/versions/properties/refined-velocity/epics/backlog/issues", async () => {
    const list = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.list",
        responseProfile: "standard"
      })
    );
    expect(containsValue(list.data, String(boardId)), JSON.stringify(list)).toBe(true);

    const get = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.get",
        path: { boardId },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(get.data, "name"), JSON.stringify(get)).toBe(`E2E Agile Board ${runId}`);

    const configuration = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.configuration.get",
        path: { boardId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(configuration.data, String(filterId)), JSON.stringify(configuration)).toBe(
      true
    );

    const projects = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.projects.list",
        path: { boardId },
        responseProfile: "standard"
      })
    );
    expect(projectedValues(projects.data, "key"), JSON.stringify(projects)).toContain(projectKey);

    // New project: no versions — an empty page is valid success evidence.
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.versions.list",
        path: { boardId }
      })
    );

    // Seed one board entity property via fixture, then read it through MCP.
    await ensureFixture(
      fixtureRequest("jira", `/rest/agile/1.0/board/${boardId}/properties/e2e-prop`, {
        method: "PUT",
        body: { e2e: runId }
      }),
      [200, 201]
    );
    const properties = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.properties.list",
        path: { boardId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(properties.data, "e2e-prop"), JSON.stringify(properties)).toBe(true);
    const property = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.properties.get",
        path: { boardId, propertyKey: "e2e-prop" },
        responseProfile: "standard"
      })
    );
    expect(containsValue(property.data, runId), JSON.stringify(property)).toBe(true);

    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.settings.refined-velocity.get",
        path: { boardId }
      })
    );

    const epics = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.epics.list",
        path: { boardId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(epics.data, epicKey), JSON.stringify(epics)).toBe(true);

    const backlog = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.backlog.list",
        path: { boardId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(backlog.data, storyKey), JSON.stringify(backlog)).toBe(true);

    const issues = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.issues.list",
        path: { boardId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(issues.data, storyKey), JSON.stringify(issues)).toBe(true);
  });

  // ── Sprint write lifecycle (9 ops): create → move issue → estimate → rank →
  // update → complete → delete ──
  it("sprint lifecycle: create, move issue, estimate, rank, update, complete, delete", async () => {
    const created = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.sprints.create",
        body: { name: `E2E Sprint ${runId}`, originBoardId: boardId },
        responseProfile: "standard"
      })
    );
    const sprintId = Number(projectedValue(created.data, "id"));
    expect(Number.isInteger(sprintId), JSON.stringify(created)).toBe(true);

    const boardSprints = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.sprints.list",
        path: { boardId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(boardSprints.data, String(sprintId)), JSON.stringify(boardSprints)).toBe(
      true
    );

    const sprint = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.sprints.get",
        path: { sprintId },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(sprint.data, "name"), JSON.stringify(sprint)).toBe(`E2E Sprint ${runId}`);

    // Sprint entity property (fixture-seeded) read back through MCP.
    await ensureFixture(
      fixtureRequest("jira", `/rest/agile/1.0/sprint/${sprintId}/properties/e2e-prop`, {
        method: "PUT",
        body: { e2e: runId }
      }),
      [200, 201]
    );
    const sprintProperties = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.sprints.properties.list",
        path: { sprintId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(sprintProperties.data, "e2e-prop"), JSON.stringify(sprintProperties)).toBe(
      true
    );
    const sprintProperty = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.sprints.properties.get",
        path: { sprintId, propertyKey: "e2e-prop" },
        responseProfile: "standard"
      })
    );
    expect(containsValue(sprintProperty.data, runId), JSON.stringify(sprintProperty)).toBe(true);

    // Move the story into the sprint.
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.sprints.issues.move",
        path: { sprintId },
        body: { issues: [storyKey] }
      })
    );
    const sprintIssues = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.sprints.issues",
        path: { sprintId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(sprintIssues.data, storyKey), JSON.stringify(sprintIssues)).toBe(true);
    const boardSprintIssues = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.sprints.issues.list",
        path: { boardId, sprintId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(boardSprintIssues.data, storyKey), JSON.stringify(boardSprintIssues)).toBe(
      true
    );

    // Story-point estimation for the board.
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.issues.estimation.update",
        path: { issueIdOrKey: storyKey },
        query: { boardId: String(boardId) },
        body: { value: 5 }
      })
    );
    const estimation = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.issues.estimation.get",
        path: { issueIdOrKey: storyKey },
        query: { boardId: String(boardId) },
        responseProfile: "standard"
      })
    );
    expect(containsValue(estimation.data, "5"), JSON.stringify(estimation)).toBe(true);

    // Rank story2 after story.
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.issues.rank",
        body: { issues: [story2Key], rankAfterIssue: storyKey }
      })
    );

    // Partial update (rename), then full update.
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.sprints.update.partial",
        path: { sprintId },
        body: { name: `E2E Sprint ${runId} REN` }
      })
    );
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.sprints.update",
        path: { sprintId },
        body: { name: `E2E Sprint ${runId} FULL`, originBoardId: boardId, state: "future" }
      })
    );
    const renamed = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.sprints.get",
        path: { sprintId },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(renamed.data, "name"), JSON.stringify(renamed)).toBe(
      `E2E Sprint ${runId} FULL`
    );

    // Swap positions with a second sprint.
    const second = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.sprints.create",
        body: { name: `E2E Sprint 2 ${runId}`, originBoardId: boardId },
        responseProfile: "standard"
      })
    );
    const secondSprintId = Number(projectedValue(second.data, "id"));
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.sprints.swap",
        path: { sprintId },
        // DC 11.3.5 SprintSwapBean: "swap" / "sprintToSwapWith" — the
        // "sprintToSwap" field name from older docs is rejected with 400.
        body: { sprintToSwapWith: secondSprintId }
      })
    );

    // Complete the sprint (start then close), then delete it. DC requires a
    // startDate when transitioning a sprint to active.
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.sprints.update.partial",
        path: { sprintId },
        body: {
          state: "active",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      })
    );
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.sprints.update.partial",
        path: { sprintId },
        body: { state: "closed" }
      })
    );
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.sprints.delete",
        path: { sprintId }
      })
    );
    const gone = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "jira.agile.sprints.get",
        path: { sprintId },
        responseProfile: "standard"
      },
      { expectError: true }
    );
    expect(gone.isError, JSON.stringify(gone)).toBe(true);

    // The second sprint cleans up with the board; move story2 back to the backlog.
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.backlog.issues.move",
        body: { issues: [story2Key] }
      })
    );
    const backlog = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.backlog.list",
        path: { boardId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(backlog.data, story2Key), JSON.stringify(backlog)).toBe(true);
  });

  // ── Epic operations (9 ops) ──
  it("epic operations: get, update, move issues in/out, rank, agile issue read", async () => {
    const epic = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.epics.get",
        path: { epicIdOrKey: epicKey },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(epic.data, "key"), JSON.stringify(epic)).toBe(epicKey);

    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.epics.update",
        path: { epicIdOrKey: epicKey },
        body: { name: `E2E Agile Epic ${runId} UPD` }
      })
    );

    // Story starts outside any epic. The global epic-none endpoint lists
    // issues across the whole instance (paginated), so scope it with JQL to
    // keep the membership assertion deterministic.
    const noneBefore = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.epics.none.issues.list",
        query: { jql: `project = ${projectKey}` },
        responseProfile: "standard"
      })
    );
    expect(containsValue(noneBefore.data, storyKey), JSON.stringify(noneBefore)).toBe(true);
    const boardNoneBefore = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.epics.none.issues.list",
        path: { boardId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(boardNoneBefore.data, storyKey), JSON.stringify(boardNoneBefore)).toBe(
      true
    );

    // Move the story into the epic and read it back both ways.
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.epics.issues.move",
        path: { epicIdOrKey: epicKey },
        body: { issues: [storyKey] }
      })
    );
    const epicIssues = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.epics.issues.list",
        path: { epicIdOrKey: epicKey },
        responseProfile: "standard"
      })
    );
    expect(containsValue(epicIssues.data, storyKey), JSON.stringify(epicIssues)).toBe(true);
    const boardEpicIssues = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.epics.issues.list",
        path: { boardId, epicId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(boardEpicIssues.data, storyKey), JSON.stringify(boardEpicIssues)).toBe(
      true
    );

    // Remove it again from any epic.
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.epics.none.issues.move",
        body: { issues: [storyKey] }
      })
    );
    const noneAfter = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.epics.none.issues.list",
        query: { jql: `project = ${projectKey}` },
        responseProfile: "standard"
      })
    );
    expect(containsValue(noneAfter.data, storyKey), JSON.stringify(noneAfter)).toBe(true);

    // Rank the epic against a second disposable epic.
    const { key: epic2Key } = await createIssue(`E2E Agile Epic 2 ${runId}`, "Epic");
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.epics.rank",
        path: { epicIdOrKey: epicKey },
        body: { rankAfterEpic: epic2Key }
      })
    );

    // Agile issue read (with Agile fields).
    const agileIssue = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.issues.get",
        path: { issueIdOrKey: storyKey },
        responseProfile: "standard"
      })
    );
    expect(containsValue(agileIssue.data, storyKey), JSON.stringify(agileIssue)).toBe(true);
  });

  // ── Board delete (1 op + create reuse) ──
  it("board delete: create a disposable board, delete it, verify 404", async () => {
    const filter = await fixtureRequest("jira", "/rest/api/2/filter", {
      method: "POST",
      body: {
        name: `E2E Agile Del ${runId}`,
        jql: `project = ${projectKey} ORDER BY Rank ASC`,
        favourite: false
      }
    });
    const deleteFilterId = filter.data?.id as number;
    recordCleanup("jira", "filter", String(deleteFilterId), "created");

    const board = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.create",
        body: { name: `E2E Agile Board Del ${runId}`, type: "scrum", filterId: deleteFilterId },
        responseProfile: "standard"
      })
    );
    const deleteBoardId = Number(projectedValue(board.data, "id"));
    expect(Number.isInteger(deleteBoardId), JSON.stringify(board)).toBe(true);

    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.agile.boards.delete",
        path: { boardId: deleteBoardId }
      })
    );
    const gone = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "jira.agile.boards.get",
        path: { boardId: deleteBoardId },
        responseProfile: "standard"
      },
      { expectError: true }
    );
    expect(gone.isError, JSON.stringify(gone)).toBe(true);

    await fixtureRequest("jira", `/rest/api/2/filter/${deleteFilterId}`, { method: "DELETE" });
    recordCleanup("jira", "filter", String(deleteFilterId), "cleaned");
  });
});
