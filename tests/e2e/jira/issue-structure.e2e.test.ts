import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordCleanup } from "../support/cleanup-journal.js";
import { StdioMcpClient, requireToolSuccess } from "../support/mcp-client.js";
import { pollUntil } from "../support/poll.js";
import {
  containsValue,
  ensureFixture,
  fixtureRequest,
  projectedValue,
  projectedValues,
  reviewerCredentials
} from "../support/rest-fixture.js";

const active = process.env.E2E_PRODUCT === "jira" ? describe : describe.skip;

// ── jira-issue-structure ──
// 17 ops: createmeta.issuetypes.get + editmeta.list (2), bulk (1),
// assignee.update (1), transitions (2), remotelink (6),
// archive + archive.issueidorkey + restore (3), subtask.move (2).

active("jira-issue-structure", () => {
  const runId = randomUUID().slice(0, 8);
  const projectKey = process.env.E2E_JIRA_PROJECT_KEY ?? "MCP";
  const adminUsername = process.env.ATLASSIAN_ADMIN_USERNAME || process.env.ATLASSIAN_USERNAME;
  let client: StdioMcpClient;
  let sharedIssue: string;
  let archiveIssueA: string;
  let archiveIssueB: string;
  let parentIssue: string;
  let subtask1: string;
  let subtask2: string;

  beforeAll(async () => {
    await ensureFixture(
      fixtureRequest("jira", "/rest/api/2/project", {
        method: "POST",
        body: {
          key: projectKey,
          name: "MCP E2E",
          projectTypeKey: "software",
          lead: adminUsername
        }
      }),
      [201, 400]
    );

    client = await StdioMcpClient.start("jira", ["--exposure-tier=max"]);

    // Shared issue — used by metadata, assignee, remotelinks, archive.issueidorkey
    const created = requireToolSuccess(
      await client.callTool("jira_create_issue", {
        fields: {
          project: { key: projectKey },
          issuetype: { name: "Task" },
          summary: `MCP E2E structure shared ${runId}`,
          description: `J3 shared fixture ${runId}`
        }
      })
    );
    sharedIssue = projectedValue(created.data, "key") as string;
    expect(sharedIssue, JSON.stringify(created)).toBeTruthy();
    recordCleanup("jira", "issue", sharedIssue, "created");

    // Archive pair — dedicated issues for archive (POST bulk)
    const archA = requireToolSuccess(
      await client.callTool("jira_create_issue", {
        fields: {
          project: { key: projectKey },
          issuetype: { name: "Task" },
          summary: `MCP E2E archive A ${runId}`,
          description: `J3 archive fixture A ${runId}`
        }
      })
    );
    archiveIssueA = projectedValue(archA.data, "key") as string;
    expect(archiveIssueA, JSON.stringify(archA)).toBeTruthy();
    recordCleanup("jira", "issue", archiveIssueA, "created");

    const archB = requireToolSuccess(
      await client.callTool("jira_create_issue", {
        fields: {
          project: { key: projectKey },
          issuetype: { name: "Task" },
          summary: `MCP E2E archive B ${runId}`,
          description: `J3 archive fixture B ${runId}`
        }
      })
    );
    archiveIssueB = projectedValue(archB.data, "key") as string;
    expect(archiveIssueB, JSON.stringify(archB)).toBeTruthy();
    recordCleanup("jira", "issue", archiveIssueB, "created");

    // Parent issue for subtask.move — holds 2 subtasks
    const parent = requireToolSuccess(
      await client.callTool("jira_create_issue", {
        fields: {
          project: { key: projectKey },
          issuetype: { name: "Task" },
          summary: `MCP E2E subtask parent ${runId}`,
          description: `J3 subtask parent ${runId}`
        }
      })
    );
    parentIssue = projectedValue(parent.data, "key") as string;
    expect(parentIssue, JSON.stringify(parent)).toBeTruthy();
    recordCleanup("jira", "issue", parentIssue, "created");

    // Two subtasks under parentIssue for reordering
    const sub1 = requireToolSuccess(
      await client.callTool("jira_create_issue", {
        fields: {
          project: { key: projectKey },
          issuetype: { name: "Sub-task" },
          summary: `MCP E2E subtask 1 ${runId}`,
          parent: { key: parentIssue }
        }
      })
    );
    subtask1 = projectedValue(sub1.data, "key") as string;
    expect(subtask1, JSON.stringify(sub1)).toBeTruthy();
    recordCleanup("jira", "issue", subtask1, "created");

    const sub2 = requireToolSuccess(
      await client.callTool("jira_create_issue", {
        fields: {
          project: { key: projectKey },
          issuetype: { name: "Sub-task" },
          summary: `MCP E2E subtask 2 ${runId}`,
          parent: { key: parentIssue }
        }
      })
    );
    subtask2 = projectedValue(sub2.data, "key") as string;
    expect(subtask2, JSON.stringify(sub2)).toBeTruthy();
    recordCleanup("jira", "issue", subtask2, "created");
  }, 60_000);

  afterAll(async () => {
    // Defensive: ensure any archived issues are restored before delete
    for (const key of [archiveIssueA, archiveIssueB, sharedIssue]) {
      if (key) {
        try {
          await fixtureRequest("jira", `/rest/api/2/issue/${key}/restore`, { method: "PUT" });
        } catch {
          // Already restored or never archived — ignore 400/404
        }
      }
    }
    // Delete child-first
    for (const key of [
      subtask1,
      subtask2,
      parentIssue,
      sharedIssue,
      archiveIssueA,
      archiveIssueB
    ]) {
      if (key) {
        try {
          await fixtureRequest("jira", `/rest/api/2/issue/${key}`, { method: "DELETE" });
          recordCleanup("jira", "issue", key, "cleaned");
        } catch (error) {
          recordCleanup("jira", "issue", key, "cleanup-failed", { error: error });
          throw error;
        }
      }
    }
    if (client) await client.close();
  });

  // ── it 1: create + edit metadata (2 ops) ──

  it("reads create and edit metadata", async () => {
    // Resolve the numeric issueTypeId from the shared issue via $fragment projection
    const issueResp = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.get",
        path: { issueKey: sharedIssue },
        query: { fields: "issuetype" },
        responseProfile: "standard"
      })
    );
    // $fragment uses exact dotted paths like $.fields.issuetype.id
    const issueTypeId = String(projectedValue(issueResp.data, "fields.issuetype.id"));
    expect(issueTypeId, JSON.stringify(issueResp).slice(0, 500)).toBeTruthy();
    expect(issueTypeId, JSON.stringify(issueResp).slice(0, 500)).not.toBe("undefined");

    // createmeta.issuetypes.get — only J3 op with pagination (jiraPage("values"))
    const createmeta = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.createmeta.issuetypes.get",
        path: { projectIdOrKey: projectKey, issueTypeId },
        responseProfile: "standard"
      })
    );
    // Assert response contains field metadata
    const values = projectedValue(createmeta.data, "values");
    expect(values, JSON.stringify(createmeta).slice(0, 500)).toBeTruthy();

    // editmeta.list
    const editmeta = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.editmeta.list",
        path: { issueIdOrKey: sharedIssue },
        responseProfile: "standard"
      })
    );
    // editmeta returns fields as top-level keys in the response; use containsValue for structural check
    expect(containsValue(editmeta.data, "summary"), JSON.stringify(editmeta).slice(0, 500)).toBe(
      true
    );
  });

  // ── it 2: bulk create (1 op) ──

  it("bulk creates issues", async () => {
    const bulkResp = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.bulk",
        body: {
          issueUpdates: [
            {
              fields: {
                project: { key: projectKey },
                issuetype: { name: "Task" },
                summary: `MCP E2E bulk A ${runId}`,
                description: `J3 bulk fixture A ${runId}`
              }
            },
            {
              fields: {
                project: { key: projectKey },
                issuetype: { name: "Task" },
                summary: `MCP E2E bulk B ${runId}`,
                description: `J3 bulk fixture B ${runId}`
              }
            }
          ]
        },
        responseProfile: "standard"
      })
    );
    // $fragment has paths like $.issues[0].key — use projectedValues which matches suffix .key
    const bulkKeys = projectedValues(bulkResp.data, "key") as string[];
    expect(bulkKeys.length, JSON.stringify(bulkResp).slice(0, 500)).toBe(2);

    // Verify no errors in the response
    // $.errors fragment is present even on success (value is empty array)
    const errors = projectedValue(bulkResp.data, "errors") as unknown[];
    expect(errors?.length ?? 0, JSON.stringify(bulkResp).slice(0, 500)).toBe(0);

    for (const k of bulkKeys) {
      recordCleanup("jira", "issue", k, "created");
    }

    // Clean up bulk issues in finally
    try {
      // Verify both exist
      for (const k of bulkKeys) {
        const getResp = requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "jira.issue.get",
            path: { issueKey: k },
            responseProfile: "standard"
          })
        );
        expect(projectedValue(getResp.data, "key"), JSON.stringify(getResp)).toBe(k);
      }
    } finally {
      for (const k of bulkKeys) {
        try {
          await fixtureRequest("jira", `/rest/api/2/issue/${k}`, { method: "DELETE" });
          recordCleanup("jira", "issue", k, "cleaned");
        } catch (error) {
          recordCleanup("jira", "issue", k, "cleanup-failed", { error: error });
        }
      }
    }
  });

  // ── it 3: assignee update (1 op) ──

  it("updates assignee", async () => {
    const reviewer = reviewerCredentials("jira");
    const reviewerName = reviewer.username!;

    // Assign to reviewer
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.assignee.update",
        path: { issueIdOrKey: sharedIssue },
        body: { name: reviewerName }
      })
    );

    // Verify assignee via $fragment: path is $.fields.assignee.name
    const afterAssign = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.get",
        path: { issueKey: sharedIssue },
        query: { fields: "assignee" },
        responseProfile: "standard"
      })
    );
    const assigneeName = projectedValue(afterAssign.data, "fields.assignee.name");
    expect(assigneeName, JSON.stringify(afterAssign).slice(0, 500)).toBe(reviewerName);

    // Restore to admin
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.assignee.update",
        path: { issueIdOrKey: sharedIssue },
        body: { name: adminUsername }
      })
    );

    // Verify restored
    const afterRestore = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.get",
        path: { issueKey: sharedIssue },
        query: { fields: "assignee" },
        responseProfile: "standard"
      })
    );
    const restoredName = projectedValue(afterRestore.data, "fields.assignee.name");
    expect(restoredName, JSON.stringify(afterRestore).slice(0, 500)).toBe(adminUsername);
  });

  // ── it 4: transitions lifecycle (2 ops) ──
  // Uses a dedicated per-it issue to avoid contaminating sharedIssue's workflow state.

  it("transitions lifecycle", async () => {
    // Create a fresh issue for transitions
    const tCreated = requireToolSuccess(
      await client.callTool("jira_create_issue", {
        fields: {
          project: { key: projectKey },
          issuetype: { name: "Task" },
          summary: `MCP E2E transition ${runId}`,
          description: `J3 transition fixture ${runId}`
        }
      })
    );
    const transitionIssue = projectedValue(tCreated.data, "key") as string;
    expect(transitionIssue, JSON.stringify(tCreated)).toBeTruthy();
    recordCleanup("jira", "issue", transitionIssue, "created");

    try {
      // Use fixtureRequest to discover available transitions (consistent with how
      // project fixtures use REST for setup). The MCP $fragment projection makes
      // it hard to pair transition IDs with names, so we use REST to find the ID.
      const fixtureTransitions = await fixtureRequest(
        "jira",
        `/rest/api/2/issue/${transitionIssue}/transitions`
      );
      const transitions = fixtureTransitions.data?.transitions as
        Array<Record<string, unknown>> | undefined;
      expect(transitions?.length, JSON.stringify(fixtureTransitions).slice(0, 500)).toBeGreaterThan(
        0
      );
      const transitionId = String(transitions![0]!.id);
      expect(transitionId, JSON.stringify(fixtureTransitions).slice(0, 500)).toBeTruthy();

      // transitions.list — exercise the MCP operation, verify it returns data
      const listResp = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.issue.transitions.list",
          path: { issueKey: transitionIssue },
          responseProfile: "standard"
        })
      );
      expect(
        containsValue(listResp.data, "transitions"),
        JSON.stringify(listResp).slice(0, 500)
      ).toBe(true);

      // transitions.perform via MCP
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.issue.transitions.perform",
          path: { issueKey: transitionIssue },
          body: { transition: { id: transitionId } }
        })
      );

      // Verify state changed
      const afterTransition = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.issue.get",
          path: { issueKey: transitionIssue },
          query: { fields: "status" },
          responseProfile: "standard"
        })
      );
      const statusName = projectedValue(afterTransition.data, "fields.status.name");
      expect(statusName, JSON.stringify(afterTransition).slice(0, 500)).toBeTruthy();
      // State should have changed from the initial "To Do"
      expect(statusName, JSON.stringify(afterTransition).slice(0, 500)).not.toBe("To Do");
    } finally {
      try {
        await fixtureRequest("jira", `/rest/api/2/issue/${transitionIssue}`, { method: "DELETE" });
      } catch (error) {
        recordCleanup("jira", "issue", transitionIssue, "cleanup-failed", { error: error });
      }
    }
  });

  // ── it 5: remotelinks lifecycle (6 ops) ──

  it("remotelinks lifecycle", async () => {
    const globalId = `e2e-j3-${runId}`;
    const linkUrl = `https://e2e.test/j3-${runId}`;
    const linkTitle = `E2E link ${runId}`;

    // 1. Create
    const created = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.remotelink.create",
        path: { issueIdOrKey: sharedIssue },
        body: {
          object: { url: linkUrl, title: linkTitle },
          globalId,
          relationship: "tests"
        }
      })
    );
    // $fragment path: $.id
    const linkId1 = String(projectedValue(created.data, "id"));
    expect(linkId1, JSON.stringify(created)).toBeTruthy();

    // 2. List — assert our title is present
    const list1 = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.remotelink.list",
        path: { issueIdOrKey: sharedIssue },
        responseProfile: "standard"
      })
    );
    // $fragment paths end with .title for each remotelink
    const titles1 = projectedValues(list1.data, "title") as string[];
    expect(titles1, JSON.stringify(list1).slice(0, 500)).toContain(linkTitle);

    // 3. Get by linkId
    const getResp = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.remotelink.get",
        path: { issueIdOrKey: sharedIssue, linkId: linkId1 },
        responseProfile: "standard"
      })
    );
    // $fragment path: $.object.title
    const objTitle = projectedValue(getResp.data, "object.title");
    expect(objTitle, JSON.stringify(getResp)).toBe(linkTitle);

    // 4. Update
    const updatedTitle = `${linkTitle} updated`;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.remotelink.update",
        path: { issueIdOrKey: sharedIssue, linkId: linkId1 },
        body: {
          object: { url: linkUrl, title: updatedTitle },
          globalId
        }
      })
    );
    const reget = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.remotelink.get",
        path: { issueIdOrKey: sharedIssue, linkId: linkId1 },
        responseProfile: "standard"
      })
    );
    const updatedObj = projectedValue(reget.data, "object.title");
    expect(updatedObj, JSON.stringify(reget)).toBe(updatedTitle);

    // 5. Delete by globalId (remotelink.delete — globalId is a REQUIRED query param)
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.remotelink.delete",
        path: { issueIdOrKey: sharedIssue },
        query: { globalId }
      })
    );
    const listAfterGlobalDelete = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.remotelink.list",
        path: { issueIdOrKey: sharedIssue },
        responseProfile: "standard"
      })
    );
    const titlesAfter = projectedValues(listAfterGlobalDelete.data, "title") as string[];
    expect(titlesAfter, JSON.stringify(listAfterGlobalDelete).slice(0, 500)).not.toContain(
      updatedTitle
    );

    // 6. Re-create with same globalId (upsert semantics) → test delete by linkId
    const recreated = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.remotelink.create",
        path: { issueIdOrKey: sharedIssue },
        body: {
          object: { url: linkUrl, title: linkTitle },
          globalId,
          relationship: "tests"
        }
      })
    );
    const linkId2 = String(projectedValue(recreated.data, "id"));
    expect(linkId2, JSON.stringify(recreated)).toBeTruthy();

    // 7. Delete by linkId (remotelink.delete.issueidorkey — linkId is a path param)
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.remotelink.delete.issueidorkey",
        path: { issueIdOrKey: sharedIssue, linkId: linkId2 }
      })
    );
    const listFinal = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.remotelink.list",
        path: { issueIdOrKey: sharedIssue },
        responseProfile: "standard"
      })
    );
    const finalTitles = projectedValues(listFinal.data, "title") as string[];
    expect(finalTitles, JSON.stringify(listFinal).slice(0, 500)).not.toContain(linkTitle);
  });

  // ── it 6: archive and restore (3 ops) ──

  it("archives and restores issues", async () => {
    // Part A: Single archive via archive.issueidorkey on sharedIssue
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.archive.issueidorkey",
        path: { issueIdOrKey: sharedIssue }
      })
    );

    // Poll until sharedIssue is archived
    // Jira 11.3.5 signals archived state via fields.archiveddate (date string
    // when archived; absent/null when not). There is no "archived" boolean.
    await pollUntil(
      async () => {
        const resp = await fixtureRequest("jira", `/rest/api/2/issue/${sharedIssue}`);
        return typeof resp.data?.fields?.archiveddate === "string";
      },
      (archived) => archived === true,
      { timeoutMs: 150_000, intervalMs: 5_000 }
    );

    // Verify archived via MCP get issue
    const afterArchive = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.get",
        path: { issueKey: sharedIssue },
        responseProfile: "standard"
      })
    );
    // $fragment path: $.fields.archiveddate
    const archivedDate = projectedValue(afterArchive.data, "fields.archiveddate");
    expect(archivedDate, JSON.stringify(afterArchive).slice(0, 500)).toBeTruthy();

    // Restore sharedIssue
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.restore",
        path: { issueIdOrKey: sharedIssue }
      })
    );

    // Poll until sharedIssue is unarchived (archiveddate goes away)
    await pollUntil(
      async () => {
        const resp = await fixtureRequest("jira", `/rest/api/2/issue/${sharedIssue}`);
        return resp.data?.fields?.archiveddate == null;
      },
      (unarchived) => unarchived === true,
      { timeoutMs: 150_000, intervalMs: 5_000 }
    );

    // Part B: Bulk archive via archive (POST) on archiveIssueA + archiveIssueB.
    // Jira DC 11.3.5 expects a bare array body: ["KEY-1", "KEY-2"].
    // (Cloud uses PUT + {issueIdsOrKeys: [...]} — DC differs.)
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.archive",
        body: [archiveIssueA, archiveIssueB]
      })
    );

    // Poll until both are archived (check archiveddate field, not "archived")
    for (const key of [archiveIssueA, archiveIssueB]) {
      await pollUntil(
        async () => {
          const resp = await fixtureRequest("jira", `/rest/api/2/issue/${key}`);
          return typeof resp.data?.fields?.archiveddate === "string";
        },
        (archived) => archived === true,
        { timeoutMs: 150_000, intervalMs: 5_000 }
      );
    }

    // Restore both
    for (const key of [archiveIssueA, archiveIssueB]) {
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.issue.restore",
          path: { issueIdOrKey: key }
        })
      );
    }

    // Poll until both are unarchived
    for (const key of [archiveIssueA, archiveIssueB]) {
      await pollUntil(
        async () => {
          const resp = await fixtureRequest("jira", `/rest/api/2/issue/${key}`);
          return resp.data?.fields?.archiveddate == null;
        },
        (unarchived) => unarchived === true,
        { timeoutMs: 150_000, intervalMs: 5_000 }
      );
    }
  });

  // ── it 7: subtask move (2 ops) ──

  it("reorders subtasks", async () => {
    // Capture pre-move order via subtask.list.
    // subtask.list returns a raw array of issue objects (not $fragment).
    // We extract keys from the top-level array only, avoiding nested key
    // fields like $.statusCategory.key that projectedValues would also match.
    const before = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.subtask.list",
        path: { issueIdOrKey: parentIssue },
        responseProfile: "standard"
      })
    );
    const beforeList = Array.isArray(before.data)
      ? (before.data as Array<Record<string, unknown>>)
      : [];
    const beforeKeys = beforeList.map((i) => i.key as string);
    expect(beforeKeys.length, JSON.stringify(before).slice(0, 500)).toBe(2);
    // Verify our two subtasks are present
    expect(beforeKeys, JSON.stringify(before)).toContain(subtask1);
    expect(beforeKeys, JSON.stringify(before)).toContain(subtask2);

    // move.list — check available positions
    const moveList1 = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.subtask.move.list",
        path: { issueIdOrKey: parentIssue },
        responseProfile: "compact"
      })
    );
    expect(moveList1.data, JSON.stringify(moveList1)).toBeTruthy();

    // move — swap positions (original: 0, current: 1)
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.subtask.move",
        path: { issueIdOrKey: parentIssue },
        body: { original: 0, current: 1 }
      })
    );

    // move.list again — verify the operation succeeded (reordering happened)
    const moveList2 = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.subtask.move.list",
        path: { issueIdOrKey: parentIssue },
        responseProfile: "compact"
      })
    );
    expect(moveList2.data, JSON.stringify(moveList2)).toBeTruthy();

    // Verify the order actually changed by comparing subtask positions
    const after = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.subtask.list",
        path: { issueIdOrKey: parentIssue },
        responseProfile: "standard"
      })
    );
    const afterList = Array.isArray(after.data)
      ? (after.data as Array<Record<string, unknown>>)
      : [];
    const afterKeys = afterList.map((i) => i.key as string);
    // Both subtasks still present
    expect(afterKeys.length, JSON.stringify(after).slice(0, 500)).toBe(2);
    expect(afterKeys, JSON.stringify(after)).toContain(subtask1);
    expect(afterKeys, JSON.stringify(after)).toContain(subtask2);
    // Order changed: subtask2 swapped from position 1 to position 0
    expect(
      afterKeys,
      `expected [${subtask2}, ${subtask1}], got: ${JSON.stringify(afterKeys)}`
    ).toEqual([subtask2, subtask1]);
  });
});
