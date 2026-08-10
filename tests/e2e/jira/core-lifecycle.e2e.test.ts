import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
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

// ── jira-attachment-lifecycle ──
// Self-contained describe: creates its own project fixture, client, and issue,
// then exercises the attachment upload → metadata → download → delete loop.
// Declared first so vitest (serial) runs it before jira-core-lifecycle's
// delete-issue test, since the attachment suite borrows no state from core-lifecycle.

active("jira-attachment-lifecycle", () => {
  const runId = randomUUID().slice(0, 8);
  const projectKey = process.env.E2E_JIRA_PROJECT_KEY ?? "MCP";
  const fileRoot = process.env.ATLASSIAN_FILE_ROOT!;
  const runFiles = join(fileRoot, `attachment-${runId}`);
  let client: StdioMcpClient;
  let issueKey: string;

  beforeAll(async () => {
    await mkdir(runFiles, { recursive: true });
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

    const summary = `MCP E2E attach ${runId}`;
    const created = requireToolSuccess(
      await client.callTool("jira_create_issue", {
        fields: {
          project: { key: projectKey },
          issuetype: { name: "Task" },
          summary,
          description: `attachment lifecycle ${runId}`
        }
      })
    );
    issueKey = projectedValue(created.data, "key") as string;
    expect(issueKey, JSON.stringify(created)).toBeTruthy();
    recordCleanup("jira", "issue", issueKey, "created");
  });

  afterAll(async () => {
    if (issueKey) {
      try {
        await fixtureRequest("jira", `/rest/api/2/issue/${issueKey}`, { method: "DELETE" });
        recordCleanup("jira", "issue", issueKey, "cleaned");
      } catch (error) {
        recordCleanup("jira", "issue", issueKey, "cleanup-failed", { error: error });
      }
    }
    if (client) await client.close();
    await rm(runFiles, { recursive: true, force: true });
  });

  it("uploads, reads metadata, downloads, then deletes an attachment", async () => {
    const uploadPath = join(runFiles, "jira-upload.txt");
    const downloadPath = join(runFiles, "jira-download.txt");
    const attachmentBytes = Buffer.from(`jira attachment ${runId}\n`, "utf8");
    await writeFile(uploadPath, attachmentBytes);

    const uploaded = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.attachments.upload",
        path: { issueKey },
        body: { files: [uploadPath] },
        responseProfile: "standard"
      })
    );
    const uploadedId = projectedValues(uploaded.data, "id")[0];
    const attachmentId = uploadedId === undefined ? undefined : String(uploadedId);
    expect(attachmentId, JSON.stringify(uploaded)).toBeTruthy();
    recordCleanup("jira", "attachment", attachmentId!, "created");

    try {
      const attachmentMetadata = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.issue.attachments.metadata",
          path: { attachmentId: attachmentId! },
          responseProfile: "standard"
        })
      );
      expect(containsValue(attachmentMetadata.data, "jira-upload.txt")).toBe(true);

      requireToolSuccess(
        await client.callTool("jira_download_attachment", {
          attachmentId: attachmentId!,
          downloadPath
        })
      );
      expect(await readFile(downloadPath)).toEqual(attachmentBytes);

      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "jira.attachment.delete",
          path: { id: attachmentId! }
        })
      );
      recordCleanup("jira", "attachment", attachmentId!, "cleaned");
      const gone = await client.callTool(
        "atlassian_execute_operation",
        {
          operationId: "jira.issue.attachments.metadata",
          path: { attachmentId: attachmentId! }
        },
        { expectError: true }
      );
      expect(gone.isError).toBe(true);
    } finally {
      if (attachmentId) {
        try {
          await fixtureRequest("jira", `/rest/api/2/attachment/${attachmentId}`, {
            method: "DELETE"
          });
          recordCleanup("jira", "attachment", attachmentId, "cleaned");
        } catch (error) {
          recordCleanup("jira", "attachment", attachmentId, "cleanup-failed", { error: error });
        }
      }
    }
  });
});

// ── jira-core-lifecycle ──
// Self-contained describe: issue CRUD + notify. Declared after attachment
// lifecycle so both suites can coexist without ordering side-effects.

active("jira-core-lifecycle", () => {
  const runId = randomUUID().slice(0, 8);
  const projectKey = process.env.E2E_JIRA_PROJECT_KEY ?? "MCP";
  const summary = `MCP E2E ${runId}`;
  let client: StdioMcpClient;
  let issueKey: string;

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
    issueKey = projectedValue(created.data, "key") as string;
    expect(issueKey, JSON.stringify(created)).toBeTruthy();
    recordCleanup("jira", "issue", issueKey, "created");
  });

  afterAll(async () => {
    if (issueKey) {
      try {
        await fixtureRequest("jira", `/rest/api/2/issue/${issueKey}`, { method: "DELETE" });
        recordCleanup("jira", "issue", issueKey, "cleaned");
      } catch (error) {
        recordCleanup("jira", "issue", issueKey, "cleanup-failed", { error: error });
      }
    }
    if (client) await client.close();
  });

  it("reads create metadata", async () => {
    const metadata = requireToolSuccess(
      await client.callTool("jira_get_create_metadata", {
        projectIdOrKey: projectKey,
        responseProfile: "compact"
      })
    );
    expect(metadata.meta).toMatchObject({ responseProfile: "standard" });
  });

  it("reads the created issue", async () => {
    const read = requireToolSuccess(
      await client.callTool("jira_get_issue", {
        issueKey,
        responseProfile: "standard"
      })
    );
    expect(containsValue(read.data, summary)).toBe(true);
  });

  it("notifies on the issue and verifies mailpit delivery", async () => {
    // Notify the reviewer (a different user) — Jira 11 rejects self-notification.
    const reviewer = reviewerCredentials("jira");
    const recipient = reviewer.username ?? "mcp-e2e-reviewer";
    // The mail is delivered to the user's email address, not their username.
    const recipientEmail = process.env.E2E_REVIEWER_EMAIL ?? "mcp-e2e@163.com";
    const result = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.notify",
        path: { issueIdOrKey: issueKey },
        body: {
          subject: `MCP E2E notification ${runId}`,
          textBody: `Issue ${issueKey} was created by the MCP E2E scenario.`,
          to: { users: [{ name: recipient }] }
        }
      })
    );
    // Jira returns 204 No Content on success — structuredContent may be absent.
    expect(result).toBeDefined();

    // Verify the email landed in mailpit. The Jira mail queue is async;
    // use a generous timeout to avoid flaky failures.
    const mailpitUrl = process.env.MAILPIT_API_URL ?? "http://localhost:8025/api/v1";
    interface MailpitMessage {
      Subject?: string;
      To?: Array<{ Address?: string }>;
    }
    const matching: MailpitMessage[] = await pollUntil(
      async () => {
        const response = await fetch(`${mailpitUrl}/search?query=${encodeURIComponent(runId)}`);
        if (!response.ok) return [] as MailpitMessage[];
        const data = (await response.json()) as { messages?: MailpitMessage[] };
        return (data.messages ?? []).filter((m) => m.Subject?.includes(runId) ?? false);
      },
      (msgs) => msgs.length > 0,
      { timeoutMs: 150_000, intervalMs: 5_000 }
    );
    expect(matching.length).toBeGreaterThan(0);
    const delivered = matching[0]!;
    expect(delivered.Subject).toContain(runId);
    expect(delivered.To?.some((r) => r.Address?.includes(recipientEmail))).toBe(true);
  });

  it("updates and re-reads the issue", async () => {
    const updatedSummary = `${summary} updated`;
    requireToolSuccess(
      await client.callTool("jira_update_issue", {
        issueKey,
        fields: { summary: updatedSummary }
      })
    );
    const reread = requireToolSuccess(
      await client.callTool("jira_get_issue", {
        issueKey,
        responseProfile: "standard"
      })
    );
    expect(containsValue(reread.data, updatedSummary)).toBe(true);
  });

  it("deletes the issue and proves absence", async () => {
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue.delete",
        path: { issueKey }
      })
    );
    recordCleanup("jira", "issue", issueKey, "cleaned");
    const gone = await client.callTool("jira_get_issue", { issueKey });
    expect(gone.isError).toBe(true);
    issueKey = undefined as unknown as string; // prevent afterAll double-delete
  });
});
