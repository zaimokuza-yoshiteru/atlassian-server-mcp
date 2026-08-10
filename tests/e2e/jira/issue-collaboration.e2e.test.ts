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
  reviewerCredentials
} from "../support/rest-fixture.js";

const active = process.env.E2E_PRODUCT === "jira" ? describe : describe.skip;

// ── jira-issue-collaboration ──
// 19 ops: comments (7), votes (3), watchers (3), worklogs (5), subtask.list (1).

active("jira-issue-collaboration", () => {
  const runId = randomUUID().slice(0, 8);
  const projectKey = process.env.E2E_JIRA_PROJECT_KEY ?? "MCP";
  let client: StdioMcpClient;
  let issueKey: string;
  let subtaskKey: string;

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

    // Shared issue fixture
    const summary = `MCP E2E collab ${runId}`;
    const created = requireToolSuccess(
      await client.callTool("jira_create_issue", {
        fields: {
          project: { key: projectKey },
          issuetype: { name: "Task" },
          summary,
          description: `collaboration fixture ${runId}`
        }
      })
    );
    issueKey = projectedValue(created.data, "key") as string;
    expect(issueKey, JSON.stringify(created)).toBeTruthy();
    recordCleanup("jira", "issue", issueKey, "created");

    // Subtask fixture for subtask.list
    const subCreated = requireToolSuccess(
      await client.callTool("jira_create_issue", {
        fields: {
          project: { key: projectKey },
          issuetype: { name: "Sub-task" },
          summary: `MCP E2E subtask ${runId}`,
          parent: { key: issueKey }
        }
      })
    );
    subtaskKey = projectedValue(subCreated.data, "key") as string;
    expect(subtaskKey, JSON.stringify(subCreated)).toBeTruthy();
    recordCleanup("jira", "issue", subtaskKey, "created");
  }, 60_000);

  afterAll(async () => {
    // Delete subtask first (child), then parent issue
    for (const key of [subtaskKey, issueKey]) {
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

  // ── it 1: comments (7 ops) ──

  it("comments lifecycle", async () => {
    // add — use jira_add_comment (named tool handles body wrapping)
    const commentBody = "test";
    const added = requireToolSuccess(
      await client.callTool("jira_add_comment", {
        issueKey: issueKey,
        body: commentBody
      })
    );
    const commentId = String(projectedValue(added.data, "id"));
    expect(commentId, JSON.stringify(added)).toBeTruthy();

    // list
    const list = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.comments.list",
        path: { issueKey },
        responseProfile: "standard"
      })
    );
    expect(containsValue(list.data, commentBody), JSON.stringify(list.data).slice(0, 500)).toBe(
      true
    );

    // get
    const get = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.comment.get",
        path: { issueIdOrKey: issueKey, id: commentId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(get.data, commentBody), JSON.stringify(get)).toBe(true);

    // update — body wrapped in { body: "text" }
    const updatedBody = `E2E comment ${runId} updated`;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.comments.update",
        path: { issueKey, commentId },
        body: { body: updatedBody }
      })
    );
    const reget = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.comment.get",
        path: { issueIdOrKey: issueKey, id: commentId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(reget.data, updatedBody), JSON.stringify(reget)).toBe(true);

    // pin — PUT with body: true (spec: boolean, required)
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.comment.pin",
        path: { issueIdOrKey: issueKey, id: commentId },
        body: true
      })
    );
    // pinned-comments.list
    const pinned = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.pinned-comments.list",
        path: { issueIdOrKey: issueKey },
        responseProfile: "standard"
      })
    );
    const pinnedIds = projectedValues(pinned.data, "id");
    expect(pinnedIds.map(String), JSON.stringify(pinned)).toContain(commentId);

    // unpin — PUT with body: false
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.comment.pin",
        path: { issueIdOrKey: issueKey, id: commentId },
        body: false
      })
    );
    const unpinned = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.pinned-comments.list",
        path: { issueIdOrKey: issueKey },
        responseProfile: "standard"
      })
    );
    const unpinnedIds = projectedValues(unpinned.data, "id");
    expect(unpinnedIds.map(String), JSON.stringify(unpinned)).not.toContain(commentId);

    // delete
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.comments.delete",
        path: { issueKey, commentId }
      })
    );
    const gone = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "jira.issue.comment.get",
        path: { issueIdOrKey: issueKey, id: commentId }
      },
      { expectError: true }
    );
    expect(gone.isError, JSON.stringify(gone)).toBe(true);
  });

  // ── it 2: votes (3 ops) ──
  // Jira DC: reporter cannot vote on their own issue. Create a second
  // issue in this it block with admin as non-reporter… but admin IS the
  // reporter of admin-created issues. Workaround: create issue via REST
  // fixture with reviewer as reporter, then admin can vote.

  it("votes lifecycle", async () => {
    const reviewer = reviewerCredentials("jira");
    // Create an issue with reviewer as reporter via REST fixture
    const created = await fixtureRequest("jira", "/rest/api/2/issue", {
      method: "POST",
      body: {
        fields: {
          project: { key: projectKey },
          issuetype: { name: "Task" },
          summary: `E2E vote test ${runId}`,
          reporter: { name: reviewer.username! },
          description: "vote test"
        }
      }
    });
    const voteIssueKey = created.data?.key as string;
    expect(voteIssueKey, JSON.stringify(created)).toBeTruthy();

    try {
      // Admin votes (not the reporter, so allowed)
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.issue.votes.create",
          path: { issueIdOrKey: voteIssueKey }
        })
      );
      const list = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.issue.votes.list",
          path: { issueIdOrKey: voteIssueKey },
          responseProfile: "standard"
        })
      );
      const votes = projectedValue(list.data, "votes") as number;
      expect(votes, JSON.stringify(list)).toBeGreaterThanOrEqual(1);

      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.issue.votes.delete",
          path: { issueIdOrKey: voteIssueKey }
        })
      );
      const after = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.issue.votes.list",
          path: { issueIdOrKey: voteIssueKey },
          responseProfile: "standard"
        })
      );
      expect(projectedValue(after.data, "votes"), JSON.stringify(after)).toBe(0);
    } finally {
      await fixtureRequest("jira", `/rest/api/2/issue/${voteIssueKey}`, { method: "DELETE" });
    }
  });

  // ── it 3: watchers (3 ops) ──

  it("watchers lifecycle", async () => {
    const reviewer = reviewerCredentials("jira");
    const watcherName = reviewer.username!;
    // Jira DC watchers.add body: string username, not { name: ... }
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.watchers.add",
        path: { issueKey },
        body: watcherName
      })
    );
    // list
    const list = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.watchers.list",
        path: { issueKey },
        responseProfile: "standard"
      })
    );
    const watcherNames = projectedValues(list.data, "name") as string[];
    expect(watcherNames, JSON.stringify(list)).toContain(watcherName);

    // delete
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.watchers.delete",
        path: { issueKey },
        query: { username: watcherName }
      })
    );
    const after = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.watchers.list",
        path: { issueKey },
        responseProfile: "standard"
      })
    );
    const afterNames = projectedValues(after.data, "name") as string[];
    expect(afterNames, JSON.stringify(after)).not.toContain(watcherName);
  });

  // ── it 4: worklogs (5 ops) ──

  it("worklogs lifecycle", async () => {
    // add
    const added = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.worklogs.add",
        path: { issueKey },
        body: { timeSpent: "1h 30m", comment: `E2E worklog ${runId}` }
      })
    );
    const worklogId = String(projectedValue(added.data, "id"));
    expect(worklogId, JSON.stringify(added)).toBeTruthy();

    // list
    const list = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.worklogs.list",
        path: { issueKey },
        responseProfile: "standard"
      })
    );
    expect(
      containsValue(list.data, `E2E worklog ${runId}`),
      JSON.stringify(list.data).slice(0, 500)
    ).toBe(true);

    // get
    const get = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.worklog.get",
        path: { issueIdOrKey: issueKey, id: worklogId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(get.data, `E2E worklog ${runId}`), JSON.stringify(get)).toBe(true);

    // update
    const updatedComment = `E2E worklog ${runId} updated`;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.worklog.update",
        path: { issueIdOrKey: issueKey, id: worklogId },
        body: { timeSpent: "2h", comment: updatedComment }
      })
    );
    const reget = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.worklog.get",
        path: { issueIdOrKey: issueKey, id: worklogId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(reget.data, updatedComment), JSON.stringify(reget)).toBe(true);

    // delete
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.worklog.delete",
        path: { issueIdOrKey: issueKey, id: worklogId }
      })
    );
    const gone = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "jira.issue.worklog.get",
        path: { issueIdOrKey: issueKey, id: worklogId }
      },
      { expectError: true }
    );
    expect(gone.isError, JSON.stringify(gone)).toBe(true);
  });

  // ── it 5: subtask.list (1 op) ──

  it("lists subtasks", async () => {
    const subs = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.subtask.list",
        path: { issueIdOrKey: issueKey },
        responseProfile: "standard"
      })
    );
    const subKeys = projectedValues(subs.data, "key") as string[];
    expect(subKeys, JSON.stringify(subs)).toContain(subtaskKey);
  });
});
