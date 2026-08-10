import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { recordCleanup } from "./support/cleanup-journal.js";
import { StdioMcpClient, requireToolSuccess } from "./support/mcp-client.js";
import {
  adminBasicCredentials,
  containsValue,
  ensureFixture,
  fixtureRequest,
  projectedValue,
  pushBitbucketBranches,
  reviewerCredentials
} from "./support/rest-fixture.js";

const active = process.env.E2E_PRODUCT === "bitbucket" ? describe : describe.skip;

active("bitbucket-pr-lifecycle", () => {
  it("creates fixtures, opens/reads/comments/merges a PR, then cleans the project", async () => {
    const runId = randomUUID().slice(0, 8);
    const projectKey = `E${runId.slice(0, 5)}`.toUpperCase();
    const repositorySlug = `repo-${runId}`;
    const fileRoot = process.env.ATLASSIAN_FILE_ROOT!;
    const runFiles = join(fileRoot, runId);
    await mkdir(runFiles, { recursive: true });
    await ensureFixture(
      fixtureRequest("bitbucket", "/rest/api/1.0/projects", {
        method: "POST",
        body: { key: projectKey, name: `MCP E2E ${runId}` }
      }),
      [201]
    );
    recordCleanup("bitbucket", "project", projectKey, "created");
    try {
      await ensureFixture(
        fixtureRequest("bitbucket", `/rest/api/1.0/projects/${projectKey}/repos`, {
          method: "POST",
          body: { name: repositorySlug, scmId: "git", forkable: false }
        }),
        [201]
      );
      const reviewerAuth = reviewerCredentials("bitbucket");
      if (!reviewerAuth.username) throw new Error("Prepared reviewer has no username");
      await ensureFixture(
        fixtureRequest(
          "bitbucket",
          `/rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/permissions/users`,
          { method: "PUT", query: { name: reviewerAuth.username, permission: "REPO_WRITE" } }
        ),
        [204]
      );
      await pushBitbucketBranches(projectKey, repositorySlug, runId);
      await ensureFixture(
        fixtureRequest(
          "bitbucket",
          `/rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/branches/default`,
          {
            method: "PUT",
            body: { id: "refs/heads/main" }
          }
        ),
        [204]
      );

      const client = await StdioMcpClient.start(
        "bitbucket",
        ["--exposure-tier=max"],
        adminBasicCredentials()
      );
      try {
        const created = requireToolSuccess(
          await client.callTool("bitbucket_create_pull_request", {
            projectKey,
            repositorySlug,
            pullRequest: {
              title: `MCP E2E ${runId}`,
              description: "created through MCP",
              fromRef: { id: `refs/heads/feature/${runId}` },
              toRef: { id: "refs/heads/main" }
            }
          })
        );
        const rawPullRequestId = projectedValue(created.data, "id");
        const pullRequestId = Number(rawPullRequestId);
        expect(Number.isInteger(pullRequestId) && pullRequestId > 0, JSON.stringify(created)).toBe(
          true
        );

        const read = requireToolSuccess(
          await client.callTool("bitbucket_get_pull_request", {
            projectKey,
            repositorySlug,
            pullRequestId
          })
        );
        expect(containsValue(read.data, runId)).toBe(true);

        requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.pullrequests.diff",
            path: { projectKey, repositorySlug, pullRequestId },
            downloadPath: join(runFiles, "pull-request.diff")
          })
        );
        expect((await readFile(join(runFiles, "pull-request.diff"))).toString("utf8")).toContain(
          runId
        );

        const rawPath = join(runFiles, "README.raw");
        await client
          .callTool("atlassian_execute_operation", {
            operationId: "bitbucket.files.raw",
            path: { projectKey, repositorySlug, filePath: "README.md" },
            query: { at: "main" },
            downloadPath: rawPath
          })
          .then((result) => requireToolSuccess(result));
        expect((await readFile(rawPath)).toString("utf8")).toContain(`# MCP E2E ${runId}`);

        const archivePath = join(runFiles, "repository.tar.gz");
        requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.repository.projects.repos.archive.list",
            path: { projectKey, repositorySlug },
            query: { at: "main", format: "tgz" },
            downloadPath: archivePath
          })
        );
        expect((await readFile(archivePath)).byteLength).toBeGreaterThan(0);

        requireToolSuccess(
          await client.callTool("bitbucket_add_pull_request_comment", {
            projectKey,
            repositorySlug,
            pullRequestId,
            text: `reviewed by E2E ${runId}`
          })
        );
        const reread = requireToolSuccess(
          await client.callTool("bitbucket_get_pull_request", {
            projectKey,
            repositorySlug,
            pullRequestId,
            responseProfile: "standard"
          })
        );
        const version = projectedValue(reread.data, "version");
        expect(typeof version, JSON.stringify(reread)).toBe("number");

        const reviewer = await StdioMcpClient.start(
          "bitbucket",
          ["--exposure-tier=safe"],
          reviewerAuth
        );
        try {
          requireToolSuccess(
            await reviewer.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.pullrequests.approve",
              path: { projectKey, repositorySlug, pullRequestId }
            })
          );
        } finally {
          await reviewer.close();
        }

        requireToolSuccess(
          await client.callTool("bitbucket_merge_pull_request", {
            projectKey,
            repositorySlug,
            pullRequestId,
            version: Number(version)
          })
        );
        const merged = requireToolSuccess(
          await client.callTool("bitbucket_get_pull_request", {
            projectKey,
            repositorySlug,
            pullRequestId,
            responseProfile: "standard"
          })
        );
        expect(containsValue(merged.data, "MERGED")).toBe(true);
      } finally {
        await client.close();
      }
    } finally {
      try {
        // Bitbucket refuses to delete a project while repositories remain.
        // Remove the disposable repository first, then its parent project.
        await ensureFixture(
          fixtureRequest(
            "bitbucket",
            `/rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}`,
            { method: "DELETE" }
          ),
          [202, 204, 404]
        );
        await ensureFixture(
          fixtureRequest("bitbucket", `/rest/api/1.0/projects/${projectKey}`, {
            method: "DELETE"
          }),
          [202, 204, 404]
        );
        recordCleanup("bitbucket", "project", projectKey, "cleaned");
      } catch (error) {
        recordCleanup("bitbucket", "project", projectKey, "cleanup-failed", { error: error });
        throw error;
      }
      await rm(runFiles, { recursive: true, force: true });
    }
  });
});
