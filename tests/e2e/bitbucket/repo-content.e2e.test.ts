import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordCleanup } from "../support/cleanup-journal.js";
import { seedRepository } from "../support/git-fixture.js";
import { StdioMcpClient, requireToolSuccess } from "../support/mcp-client.js";
import { pollUntil } from "../support/poll.js";
import {
  containsValue,
  ensureFixture,
  fixtureRequest,
  projectedValue
} from "../support/rest-fixture.js";
import { withRestoredState } from "../support/restore-state.js";
import { clearWebhooks, waitForWebhook } from "../support/webhook-sink.js";

const active = process.env.E2E_PRODUCT === "bitbucket" ? describe : describe.skip;

// ── B-B: 仓库内容、构建与 webhook (86 ops) ──
// repository (66) + commits (2) + branches (1) + files (1)
// + builds-and-deployments (6) + webhooks (2) + branch-permissions (8)

active("bitbucket-repo-content", () => {
  const runId = randomUUID().slice(0, 8);
  const PROJECT_KEY = `MCPBB${runId.slice(0, 4)}`.toUpperCase();
  const REPO1 = "repo-main";

  let client: StdioMcpClient;
  let runFiles: string;
  /** commit SHAs from the git fixture (oldest → newest) */
  let fixtureCommits: string[] = [];
  /** branch names from the git fixture (excluding main) */
  let fixtureBranches: string[] = [];
  /** saved FILE_ROOT env var to restore in afterAll */
  let savedFileRoot: string | undefined;

  beforeAll(async () => {
    const fileRoot = process.env.ATLASSIAN_FILE_ROOT ?? join(tmpdir(), "atlassian-mcp-file-root");
    runFiles = join(fileRoot, `mcp-bb-${runId}`);
    await mkdir(runFiles, { recursive: true });

    // Create project via admin Basic REST (PAT can't create projects)
    await ensureFixture(
      fixtureRequest("bitbucket", "/rest/api/1.0/projects", {
        method: "POST",
        body: { key: PROJECT_KEY, name: `B-B Test ${runId}` }
      }),
      [201]
    );
    recordCleanup("bitbucket", "project", PROJECT_KEY, "created");

    // Create repo
    await ensureFixture(
      fixtureRequest("bitbucket", `/rest/api/1.0/projects/${PROJECT_KEY}/repos`, {
        method: "POST",
        body: { name: REPO1, scmId: "git" }
      }),
      [201]
    );
    recordCleanup("bitbucket", "repo", `${PROJECT_KEY}/${REPO1}`, "created");

    // Seed with git fixture: 3 commits + 2 branches (multi-file changes per commit)
    const seed = await seedRepository(PROJECT_KEY, REPO1, {
      commits: [
        {
          message: "feat: initial commit",
          files: {
            "README.md": `# MCPBB ${runId}\n`,
            "src/index.ts": "export const x = 1;\n"
          }
        },
        {
          message: "feat: add util",
          files: {
            "src/util.ts": "export const add = (a: number, b: number) => a + b;\n",
            "src/index.ts": "export const x = 1;\nexport { add } from './util';\n"
          }
        },
        {
          message: "feat: add types",
          files: {
            "src/types.ts": "export type T = { id: number };\n",
            "README.md": `# MCPBB ${runId}\n\nUpdated with types.\n`
          }
        }
      ],
      branches: [`feature/one-${runId}`, `feature/two-${runId}`]
    });
    fixtureCommits = seed.commits;
    fixtureBranches = seed.branches;

    // Set default branch to "main" — empty repos created via REST don't have
    // a default branch until one is explicitly configured. Without this, many
    // endpoints return 404 "No default branch is defined".
    await ensureFixture(
      fixtureRequest(
        "bitbucket",
        `/rest/api/latest/projects/${PROJECT_KEY}/repos/${REPO1}/branches/default`,
        { method: "PUT", body: { id: "refs/heads/main" } }
      ),
      [200, 204]
    );

    // FILE_ROOT must be set for MCP server multipart/download operations.
    // Save the original value to restore in afterAll.
    savedFileRoot = process.env.ATLASSIAN_FILE_ROOT;
    process.env.ATLASSIAN_FILE_ROOT = fileRoot;

    // Start MCP client (PAT Bearer — covers all project/repo-level ops)
    client = await StdioMcpClient.start("bitbucket", ["--exposure-tier=max"]);
  }, 180_000);

  afterAll(async () => {
    // Close MCP client first
    try {
      await client?.close();
    } catch {
      /* best-effort */
    }

    // Restore FILE_ROOT env var (avoid breaking subsequent suites)
    if (savedFileRoot === undefined) {
      delete process.env.ATLASSIAN_FILE_ROOT;
    } else {
      process.env.ATLASSIAN_FILE_ROOT = savedFileRoot;
    }

    // ── Step 0: sweep branch-permissions (residuals block git push) ──
    // Project-level
    try {
      const projList = await fixtureRequest(
        "bitbucket",
        `/rest/branch-permissions/latest/projects/${PROJECT_KEY}/restrictions`
      );
      for (const r of projList.data?.values ?? []) {
        await fixtureRequest(
          "bitbucket",
          `/rest/branch-permissions/latest/projects/${PROJECT_KEY}/restrictions/${r.id}`,
          { method: "DELETE" }
        );
      }
    } catch {
      /* best-effort */
    }
    // Repo-level
    try {
      const repoList = await fixtureRequest(
        "bitbucket",
        `/rest/branch-permissions/latest/projects/${PROJECT_KEY}/repos/${REPO1}/restrictions`
      );
      for (const r of repoList.data?.values ?? []) {
        await fixtureRequest(
          "bitbucket",
          `/rest/branch-permissions/latest/projects/${PROJECT_KEY}/repos/${REPO1}/restrictions/${r.id}`,
          { method: "DELETE" }
        );
      }
    } catch {
      /* best-effort */
    }

    // ── Step 1: delete repo(s) first (project has no cascade) ──
    for (const slug of [REPO1]) {
      try {
        const del = await fixtureRequest(
          "bitbucket",
          `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${slug}`,
          { method: "DELETE" }
        );
        if (![202, 204, 404].includes(del.status)) {
          throw new Error(`Repo delete HTTP ${del.status}: ${del.text.slice(0, 200)}`);
        }
        await pollUntil(
          async () =>
            fixtureRequest("bitbucket", `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${slug}`),
          (r) => r.status === 404,
          { timeoutMs: 30000, intervalMs: 2000 }
        );
        recordCleanup("bitbucket", "repo", `${PROJECT_KEY}/${slug}`, "cleaned");
      } catch (error) {
        recordCleanup("bitbucket", "repo", `${PROJECT_KEY}/${slug}`, "cleanup-failed", { error });
      }
    }

    // ── Step 2: delete project ──
    try {
      const dp = await fixtureRequest("bitbucket", `/rest/api/1.0/projects/${PROJECT_KEY}`, {
        method: "DELETE"
      });
      if (![204, 404].includes(dp.status)) {
        throw new Error(`Project delete HTTP ${dp.status}: ${dp.text.slice(0, 200)}`);
      }
      recordCleanup("bitbucket", "project", PROJECT_KEY, "cleaned");
    } catch (error) {
      recordCleanup("bitbucket", "project", PROJECT_KEY, "cleanup-failed", { error });
    }

    try {
      await rm(runFiles, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }, 120_000);

  // ═══════════════════════════════════════════════════════════════
  // 1. branches + commits (3 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("branches + commits", () => {
    it("branches.list, commits.list, commits.get", async () => {
      // branches.list — paginated; should contain the fixture branches
      const bl = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.branches.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );
      expect(containsValue(bl.data, fixtureBranches[0]!), JSON.stringify(bl)).toBe(true);

      // commits.list — paginated
      const cl = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.commits.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );
      // The latest commit should appear (short SHA prefix)
      expect(containsValue(cl.data, fixtureCommits[2]!.slice(0, 7)), JSON.stringify(cl)).toBe(true);

      // commits.get — fetch the middle commit
      const cg = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.commits.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, commitId: fixtureCommits[1]! }
        })
      );
      const gotId = projectedValue(cg.data, "id") as string;
      expect(gotId).toBe(fixtureCommits[1]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. files.browse (1 op)
  // ═══════════════════════════════════════════════════════════════
  describe("files.browse", () => {
    it("files.browse", async () => {
      // files.browse — assert file content at HEAD
      const fb = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.files.browse",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, filePath: "src/index.ts" },
          query: { at: "refs/heads/main" },
          responseProfile: "standard"
        })
      );
      expect(containsValue(fb.data, "export const x"), JSON.stringify(fb)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. repository browse + files + last-modified (6 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("repository browse + files + last-modified", () => {
    it("browse.list, browse.update, files.get, files.list, last-modified.get, last-modified.list", async () => {
      // browse.list — list repo root at HEAD
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.browse.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );

      // browse.update — multipart PUT with multipartField:"content" (fixed).
      // The multipart constructor supports `fields` for extra form fields
      // (message, branch, sourceCommitId — see src/http.ts:509).
      const browseFilePath = join(runFiles, "browse-new-readme.md");
      const browseContent = `# MCPBB ${runId}\n\nUpdated via browse.update\n`;
      await writeFile(browseFilePath, browseContent);
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.browse.update",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, path: "README.md" },
          body: {
            files: [browseFilePath],
            fields: {
              message: `browse.update test ${runId}`,
              branch: "main",
              sourceCommitId: fixtureCommits[2]
            }
          }
        })
      );
      // Read back via files.browse to verify content changed
      const fb2 = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.files.browse",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, filePath: "README.md" },
          query: { at: "refs/heads/main" },
          responseProfile: "standard"
        })
      );
      expect(containsValue(fb2.data, "browse.update"), JSON.stringify(fb2)).toBe(true);

      // files.get — list directory contents at a specific path
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.files.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, path: "src" },
          query: { at: fixtureCommits[2] }
        })
      );

      // files.list — list files at the repo root
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.files.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { at: fixtureCommits[2] }
        })
      );

      // last-modified.get — requires a DIRECTORY path, not a file
      const lmGet = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.last-modified.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, path: "src" },
          query: { at: fixtureCommits[2] },
          responseProfile: "standard"
        })
      );
      expect(containsValue(lmGet.data, "index.ts"), JSON.stringify(lmGet)).toBe(true);

      // last-modified.list
      const lmlRes = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.last-modified.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { at: fixtureCommits[2] },
          responseProfile: "standard"
        })
      );
      expect(containsValue(lmlRes.data, "README.md"), JSON.stringify(lmlRes)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. repository changes + diff + patch (4 ops — diff.list excluded by exposure policy)
  // ═══════════════════════════════════════════════════════════════
  describe("repository changes + diff + patch", () => {
    it("changes.list, diff.get, patch.list", async () => {
      // changes.list — changes since a commit
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.changes.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { since: fixtureCommits[0], until: fixtureCommits[2] }
        })
      );

      // diff.get — single file diff at a commit
      const dg = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.diff.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, path: "README.md" },
          query: { since: fixtureCommits[0], until: fixtureCommits[2] },
          responseProfile: "standard"
        })
      );
      expect(containsValue(dg.data, "diff"), JSON.stringify(dg)).toBe(true);

      // changes.list — with path (changed files at a commit)
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.commits.changes.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, commitId: fixtureCommits[1]! }
        })
      );

      // patch.list — binary response (responseKind fixed to binary, accept: text/plain).
      // Download the patch and assert it contains the From header and a commit SHA.
      const patchPath = join(runFiles, "repo.patch");
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.patch.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { since: fixtureCommits[0], until: fixtureCommits[1] },
          downloadPath: patchPath
        })
      );
      const patchContent = readFileSync(patchPath, "utf8");
      expect(patchContent.includes("From "), "patch should start with From header").toBe(true);
      expect(patchContent.includes(fixtureCommits[1]!), "patch should contain commit SHA").toBe(
        true
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. commits sub-resources: comments, diff, diff-stats-summary, merge-base, watch (9 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("commits sub-resources", () => {
    let commitCommentId: string | undefined;

    afterAll(async () => {
      // Best-effort cleanup of any remaining commit comment
      if (commitCommentId) {
        try {
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.repository.projects.repos.commits.comments.delete",
            path: {
              projectKey: PROJECT_KEY,
              repositorySlug: REPO1,
              commitId: fixtureCommits[2]!,
              commentId: commitCommentId
            }
          });
        } catch {
          /* best-effort */
        }
      }
    });

    it("commits.comments CRUD, diff.get, diff-stats-summary.get, merge-base.list, watch", async () => {
      // Create a commit comment via REST (no MCP create op for commit comments).
      // 实测结论：commit 评论通过 body.anchor.path 关联文件（顶层 path 会被忽略），
      // path 过滤列表可查到。DC 10.4.1 实测。
      const commentText = `B-B commit comment ${runId}`;
      const commentRes = await fixtureRequest(
        "bitbucket",
        `/rest/api/latest/projects/${PROJECT_KEY}/repos/${REPO1}/commits/${fixtureCommits[2]}/comments`,
        { method: "POST", body: { text: commentText, anchor: { path: "README.md" } } }
      );
      const createdComment = commentRes.data;
      expect(commentRes.status, `create comment failed: ${commentRes.text.slice(0, 200)}`).toBe(
        201
      );
      commitCommentId = String(createdComment.id);
      expect(commitCommentId).toBeTruthy();

      // commits.comments.list — Bitbucket mandates a `path` query parameter;
      // body.anchor.path 关联后 path 过滤列表可查到。
      const cl = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.commits.comments.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, commitId: fixtureCommits[2]! },
          query: { path: "README.md" },
          responseProfile: "standard"
        })
      );
      expect(
        containsValue(cl.data, commentText),
        `list should contain comment text: ${JSON.stringify(cl)}`
      ).toBe(true);

      // commits.comments.get
      const cg = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.commits.comments.get",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: REPO1,
            commitId: fixtureCommits[2]!,
            commentId: commitCommentId
          }
        })
      );
      expect(containsValue(cg.data, commitCommentId), JSON.stringify(cg)).toBe(true);

      // commits.comments.update
      const updatedText = `B-B updated ${runId}`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.commits.comments.update",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: REPO1,
            commitId: fixtureCommits[2]!,
            commentId: commitCommentId
          },
          body: { text: updatedText, version: createdComment.version ?? 0 }
        })
      );
      // Read back and verify — use standard profile to include text
      const cu = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.commits.comments.get",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: REPO1,
            commitId: fixtureCommits[2]!,
            commentId: commitCommentId
          },
          responseProfile: "standard"
        })
      );
      expect(containsValue(cu.data, updatedText), JSON.stringify(cu)).toBe(true);

      // commits.comments.delete — requires version query param (updated to 1)
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.commits.comments.delete",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: REPO1,
            commitId: fixtureCommits[2]!,
            commentId: commitCommentId
          },
          query: { version: "1" }
        })
      );
      commitCommentId = undefined;
      // Verify deleted
      const afterDel = await client.callTool(
        "atlassian_execute_operation",
        {
          operationId: "bitbucket.repository.projects.repos.commits.comments.get",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: REPO1,
            commitId: fixtureCommits[2]!,
            commentId: String(createdComment.id)
          }
        },
        { expectError: true }
      );
      expect(afterDel.isError, "deleted comment should not be retrievable").toBe(true);

      // commits.diff.get — diff for a specific file in a commit.
      // Use commit[2] which changed README.md. Require standard profile
      // to include $.diffs which is omitted in compact mode.
      const diff = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.commits.diff.get",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: REPO1,
            commitId: fixtureCommits[2]!,
            path: "README.md"
          },
          responseProfile: "standard"
        })
      );
      expect(containsValue(diff.data, "diff"), JSON.stringify(diff)).toBe(true);

      // commits.diff-stats-summary.get — use simple path to avoid 302
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.commits.diff-stats-summary.get",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: REPO1,
            commitId: fixtureCommits[2]!,
            path: "README.md"
          }
        })
      );

      // commits.merge-base.list — c1 is ancestor of c3, merge-base = c1
      const mbRes = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.commits.merge-base.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, commitId: fixtureCommits[2]! },
          query: { otherCommitId: fixtureCommits[0] }
        })
      );
      const mergeBaseId = projectedValue(mbRes.data, "id") as string;
      expect(
        mergeBaseId,
        `merge-base should be ${fixtureCommits[0]}: ${JSON.stringify(mbRes)}`
      ).toBe(fixtureCommits[0]);

      // commits.watch
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.commits.watch",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, commitId: fixtureCommits[2]! }
        })
      );

      // commits.watch.delete — unwatch
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.commits.watch.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, commitId: fixtureCommits[2]! }
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. repository compare.* (4 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("repository compare", () => {
    it("compare.changes, compare.commits, compare.diff-path, compare.diff-stats-summary-path", async () => {
      const from = fixtureCommits[0]!;
      const to = fixtureCommits[2]!;

      // compare.changes.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.compare.changes.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { from, to }
        })
      );

      // compare.commits.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.compare.commits.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { from, to }
        })
      );

      // compare.diff-path.list — path param is appended to URL directly
      // (no leading / needed since the URL template is .../compare/diff{path})
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.compare.diff-path.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, path: "README.md" },
          query: { from, to }
        })
      );

      // compare.diff-stats-summary-path.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.compare.diff-stats-summary-path.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, path: "README.md" },
          query: { from, to }
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. repository labels (3 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("repository labels", () => {
    const LABEL_NAME = `bb-label-${runId.slice(0, 4)}`;

    it("labels.create, labels.list, labels.delete", async () => {
      // labels.create
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.labels.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          body: { name: LABEL_NAME }
        })
      );

      // labels.list — must contain the label
      const ll = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.labels.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );
      expect(containsValue(ll.data, LABEL_NAME), JSON.stringify(ll)).toBe(true);

      // labels.delete
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.labels.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, labelName: LABEL_NAME }
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. repository tags (3 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("repository tags", () => {
    const TAG_NAME = `v1.0-${runId.slice(0, 4)}`;

    it("tags.create, tags.get, tags.list", async () => {
      // tags.create — tag the latest commit
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.tags.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          body: { name: TAG_NAME, startPoint: fixtureCommits[2], message: `Tag ${runId}` }
        })
      );

      // tags.get
      const tg = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.tags.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, name: TAG_NAME }
        })
      );
      expect(containsValue(tg.data, TAG_NAME), JSON.stringify(tg)).toBe(true);

      // tags.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.tags.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. ref-change-activities (2 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("ref-change-activities", () => {
    it("ref-change-activities.list, ref-change-activities.branches.list", async () => {
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.ref-change-activities.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );

      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.ref-change-activities.branches.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. branches.create (1 op)
  // ═══════════════════════════════════════════════════════════════
  describe("branches.create", () => {
    it("branches.create", async () => {
      const newBranch = `bb-create-${runId.slice(0, 4)}`;
      // branches.create via /rest/api/latest/.../branches
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.branches.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          body: { name: newBranch, startPoint: fixtureCommits[2] }
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 12. builds-and-deployments (6 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("builds-and-deployments", () => {
    const BUILD_KEY = `bb-build-${runId.slice(0, 4)}`;
    const DEPLOY_KEY = `bb-deploy-${runId.slice(0, 4)}`;

    afterAll(async () => {
      // Best-effort cleanup
      try {
        await fixtureRequest(
          "bitbucket",
          `/rest/api/latest/projects/${PROJECT_KEY}/repos/${REPO1}/commits/${fixtureCommits[2]}/builds?key=${BUILD_KEY}`,
          { method: "DELETE" }
        );
      } catch {
        /* best-effort */
      }
      try {
        await fixtureRequest(
          "bitbucket",
          `/rest/api/latest/projects/${PROJECT_KEY}/repos/${REPO1}/commits/${fixtureCommits[2]}/deployments?key=${DEPLOY_KEY}`,
          { method: "DELETE" }
        );
      } catch {
        /* best-effort */
      }
    });

    it("build status lifecycle: create → list → delete", async () => {
      // builds.create — POST build status
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.builds-and-deployments.projects.repos.commits.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, commitId: fixtureCommits[2]! },
          body: {
            key: BUILD_KEY,
            state: "SUCCESSFUL",
            name: `B-B Build ${runId}`,
            url: "https://example.com/build"
          }
        })
      );

      // builds.list — GET by key
      const bl = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.builds-and-deployments.projects.repos.commits.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, commitId: fixtureCommits[2]! },
          query: { key: BUILD_KEY }
        })
      );
      expect(containsValue(bl.data, BUILD_KEY), JSON.stringify(bl)).toBe(true);

      // builds.delete
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.builds-and-deployments.projects.repos.commits.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, commitId: fixtureCommits[2]! },
          query: { key: BUILD_KEY }
        })
      );
    });

    it("deployment lifecycle: create → list → delete", async () => {
      // deployments.create — POST deployment
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.builds-and-deployments.projects.repos.commits.create.projectkey",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, commitId: fixtureCommits[2]! },
          body: {
            deploymentSequenceNumber: 1,
            description: `B-B deploy ${runId}`,
            displayName: `Deploy ${runId}`,
            environment: { key: "test", displayName: "Test", name: "Test", type: "DEVELOPMENT" },
            key: DEPLOY_KEY,
            state: "SUCCESSFUL",
            url: "https://example.com/deploy"
          }
        })
      );

      // deployments.list — requires key, environmentKey, and deploymentSequenceNumber
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.builds-and-deployments.projects.repos.commits.list.projectkey",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, commitId: fixtureCommits[2]! },
          query: { key: DEPLOY_KEY, environmentKey: "test", deploymentSequenceNumber: "1" }
        })
      );

      // deployments.delete
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.builds-and-deployments.projects.repos.commits.delete.projectkey",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, commitId: fixtureCommits[2]! },
          query: { key: DEPLOY_KEY, environmentKey: "test", deploymentSequenceNumber: "1" }
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 13. repository-level webhooks (latest API) (8 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("repository webhooks (latest API)", () => {
    let webhookId: number | undefined;

    afterAll(async () => {
      if (webhookId) {
        try {
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.repository.projects.repos.webhooks.delete",
            path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, webhookId }
          });
        } catch {
          /* best-effort */
        }
      }
    });

    it("webhook lifecycle: test → create → get → update → latest → search → statistics → delete", async () => {
      const webhookUrl = `http://webhook-sink:8026/mcpbb-${runId}`;

      // webhooks.test.create — webhookId variant returns 500 (DC 10.4.1 bug)
      // Url variant returns 200
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.webhooks.test.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { url: webhookUrl },
          body: {}
        })
      );

      // webhooks.create (via latest API — note: this is the repository.projects.repos.webhooks.*)
      // The latest API webhook create uses PUT with a webhookId or POST? Check ops...
      // bitbucket.repository.projects.repos.webhooks.test.create exists but
      // there's no explicit latest-API create op — only update/test/delete/get/list/search/statistics.
      // The create is covered by bitbucket.webhooks.create (1.0 API) in the next describe.
      // For the latest-API ops, create a webhook via REST first to provide an id for get/update/delete.
      const created = await fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${REPO1}/webhooks`,
        {
          method: "POST",
          body: {
            name: `B-B WH ${runId}`,
            url: webhookUrl,
            events: ["repo:refs_changed"],
            active: true
          }
        }
      );
      webhookId = created.data?.id as number;
      expect(webhookId, `webhook create failed: ${created.text.slice(0, 200)}`).toBeTruthy();

      // webhooks.get
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.webhooks.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, webhookId }
        })
      );

      // webhooks.update
      const updatedName = `B-B WH ${runId} Upd`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.webhooks.update",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, webhookId },
          body: { name: updatedName, url: webhookUrl, events: ["repo:refs_changed"], active: true }
        })
      );
      const getUpdated = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.webhooks.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, webhookId }
        })
      );
      expect(containsValue(getUpdated.data, updatedName), JSON.stringify(getUpdated)).toBe(true);

      // webhooks.latest.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.webhooks.latest.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, webhookId }
        })
      );

      // webhooks.search.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.webhooks.search.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { event: "repo:refs_changed" }
        })
      );

      // webhooks.statistics.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.webhooks.statistics.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, webhookId }
        })
      );

      // webhooks.statistics.summary.get
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.webhooks.statistics.summary.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, webhookId }
        })
      );

      // webhooks.delete
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.webhooks.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, webhookId }
        })
      );
      // Verify deleted
      const afterDel = await client.callTool(
        "atlassian_execute_operation",
        {
          operationId: "bitbucket.repository.projects.repos.webhooks.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, webhookId }
        },
        { expectError: true }
      );
      expect(afterDel.isError, "webhook should not be retrievable after delete").toBe(true);
      webhookId = undefined;
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 14. 1.0-API webhooks (2 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("webhooks (1.0 API)", () => {
    let wh1Id: number | undefined;

    afterAll(async () => {
      if (wh1Id) {
        try {
          await fixtureRequest(
            "bitbucket",
            `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${REPO1}/webhooks/${wh1Id}`,
            { method: "DELETE" }
          );
        } catch {
          /* best-effort */
        }
      }
    });

    it("webhooks.create, webhooks.list", async () => {
      const hookUrl = `http://webhook-sink:8026/mcpbb-1-${runId}`;

      // webhooks.create
      const created = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.webhooks.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          body: {
            name: `B-B 1.0 WH ${runId}`,
            url: hookUrl,
            events: ["repo:refs_changed"],
            active: true
          }
        })
      );
      wh1Id = projectedValue(created.data, "id") as number;
      expect(wh1Id).toBeTruthy();

      // webhooks.list
      const wl = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.webhooks.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );
      expect(containsValue(wl.data, hookUrl), JSON.stringify(wl)).toBe(true);

      // E2E verification: clear sink, push a commit, wait for delivery.
      // This section runs before branch-permissions, so the push won't be blocked.
      await clearWebhooks();
      await seedRepository(PROJECT_KEY, REPO1, {
        commits: [{ message: `webhook-sink test ${runId}`, files: { "sink-test.txt": runId } }]
      });
      const delivery = await waitForWebhook(
        (req) => req.path === `/mcpbb-1-${runId}` && req.body.includes("repo:refs_changed"),
        { timeoutMs: 30_000, intervalMs: 2_000 }
      );
      expect(
        delivery.body.includes("repo:refs_changed"),
        "webhook should deliver repo:refs_changed"
      ).toBe(true);

      // Cleanup
      await fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${REPO1}/webhooks/${wh1Id}`,
        { method: "DELETE" }
      );
      wh1Id = undefined;
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 15. repository settings — auto-decline, auto-merge, change-author (9 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("repository settings — auto-decline, auto-merge, change-author", () => {
    it("auto-merge list / update / delete (withRestoredState)", async () => {
      const original = await (async () => {
        const r = await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.settings.auto-merge.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
        });
        return r.isError ? null : ((r.structuredContent as any)?.data ?? r.structuredContent);
      })();

      await withRestoredState(
        async () => original,
        async (_orig) => {
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.repository.projects.repos.settings.auto-merge.delete",
            path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
          });
        },
        async () => {
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.repository.projects.repos.settings.auto-merge.update",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
              body: { enabled: true, restrictionAction: "NONE" }
            })
          );
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.repository.projects.repos.settings.auto-merge.list",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
            })
          );
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.repository.projects.repos.settings.auto-merge.delete",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
            })
          );
        }
      );
    });

    it("auto-decline list / update → read back → delete", async () => {
      await withRestoredState(
        async () => {
          const r = await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.repository.projects.repos.settings.auto-decline.list",
            path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
          });
          return r.isError ? null : (r.structuredContent as any)?.data;
        },
        async () => {
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.repository.projects.repos.settings.auto-decline.delete",
            path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
          });
        },
        async () => {
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.repository.projects.repos.settings.auto-decline.update",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
              body: { enabled: true, inactivityWeeks: 4 }
            })
          );
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.repository.projects.repos.settings.auto-decline.list",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
            })
          );
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.repository.projects.repos.settings.auto-decline.delete",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
            })
          );
        }
      );
    });

    it("change-author list / update → read back → delete", async () => {
      await withRestoredState(
        async () => {
          const r = await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.repository.projects.repos.settings.change-author.list",
            path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
          });
          return r.isError ? null : (r.structuredContent as any)?.data;
        },
        async () => {
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.repository.projects.repos.settings.change-author.delete",
            path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
          });
        },
        async () => {
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.repository.projects.repos.settings.change-author.update",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
              body: { enabled: true, restrictionAction: "NONE" }
            })
          );
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.repository.projects.repos.settings.change-author.list",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
            })
          );
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.repository.projects.repos.settings.change-author.delete",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
            })
          );
        }
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 16. repository settings — hooks + pull-requests (8 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("repository settings — hooks + pull-requests", () => {
    it("hooks lifecycle: list → get → settings get → settings update → enabled toggle → enabled delete", async () => {
      // hooks.list — discover available hooks
      const list = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.settings.hooks.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
        })
      );
      const hooks = (list.data as any)?.values ?? [];
      const hookKey: string =
        hooks.length > 0
          ? (hooks[0].details?.key as string)
          : "com.atlassian.bitbucket.server.bitbucket-bundled-hooks:force-push-hook";

      // hooks.get
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.settings.hooks.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, hookKey }
        })
      );

      // hooks.settings.get
      const settingsGet = await client.callTool("atlassian_execute_operation", {
        operationId: "bitbucket.repository.projects.repos.settings.hooks.settings.get",
        path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, hookKey }
      });

      // hooks.settings.update — withRestoredState
      const settingsData = settingsGet.isError
        ? null
        : (settingsGet.structuredContent as any)?.data;
      await withRestoredState(
        async () => settingsData,
        async (original) => {
          if (original) {
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.repository.projects.repos.settings.hooks.settings.update",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, hookKey },
              body: original
            });
          }
        },
        async () => {
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.repository.projects.repos.settings.hooks.settings.update",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, hookKey },
              body: { stringValue: `B-B test ${runId}` }
            })
          );
        }
      );

      // hooks.enabled.update → hooks.enabled.delete (toggle)
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.settings.hooks.enabled.update",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, hookKey }
        })
      );
      // Read back
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.settings.hooks.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
        })
      );
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.settings.hooks.enabled.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, hookKey }
        })
      );

      // hooks.delete — remove hook config entirely (repo will be deleted anyway)
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.settings.hooks.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, hookKey }
        })
      );
    });

    it("pull-requests settings: get → create → read back → restore", async () => {
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.settings.pull-requests.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
        })
      );

      await withRestoredState(
        async () => {
          const r = await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.repository.projects.repos.settings.pull-requests.list",
            path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
          });
          return r.isError ? null : ((r.structuredContent as any)?.data ?? null);
        },
        async (original) => {
          if (original) {
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.repository.projects.repos.settings.pull-requests.create",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
              body: original
            });
          }
        },
        async () => {
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.repository.projects.repos.settings.pull-requests.create",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
              body: {
                mergeConfig: { defaultStrategy: { id: "no-ff" }, strategies: [{ id: "no-ff" }] }
              }
            })
          );
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.repository.projects.repos.settings.pull-requests.list",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
            })
          );
        }
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 17. branch-permissions (8 ops — project-level + repo-level)
  // ⚠️ CRITICAL: must delete ALL restrictions after testing.
  // Residual restrictions block subsequent git pushes.
  // ═══════════════════════════════════════════════════════════════
  describe("branch-permissions", () => {
    let projectRestrictionId: string | undefined;
    let repoRestrictionId: string | undefined;

    afterAll(async () => {
      // Delete repo-level restriction first (more specific)
      if (repoRestrictionId) {
        try {
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.branch-permissions.projects.repos.restrictions.delete",
            path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, id: repoRestrictionId }
          });
          await pollUntil(
            async () =>
              client.callTool(
                "atlassian_execute_operation",
                {
                  operationId: "bitbucket.branch-permissions.projects.repos.restrictions.get",
                  path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, id: repoRestrictionId! }
                },
                { expectError: true }
              ),
            (r) => r.isError === true,
            { timeoutMs: 15000, intervalMs: 1000 }
          );
        } catch {
          /* best-effort */
        }
      }
      // Delete project-level restriction
      if (projectRestrictionId) {
        try {
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.branch-permissions.restrictions.delete",
            path: { projectKey: PROJECT_KEY, id: projectRestrictionId }
          });
          await pollUntil(
            async () =>
              client.callTool(
                "atlassian_execute_operation",
                {
                  operationId: "bitbucket.branch-permissions.restrictions.get",
                  path: { projectKey: PROJECT_KEY, id: projectRestrictionId! }
                },
                { expectError: true }
              ),
            (r) => r.isError === true,
            { timeoutMs: 15000, intervalMs: 1000 }
          );
        } catch {
          /* best-effort */
        }
      }
      // Best-effort REST sweep for any leaked restrictions
      try {
        const projList = await fixtureRequest(
          "bitbucket",
          `/rest/branch-permissions/latest/projects/${PROJECT_KEY}/restrictions`
        );
        for (const r of projList.data?.values ?? []) {
          await fixtureRequest(
            "bitbucket",
            `/rest/branch-permissions/latest/projects/${PROJECT_KEY}/restrictions/${r.id}`,
            { method: "DELETE" }
          );
        }
      } catch {
        /* best-effort */
      }
      try {
        const repoList = await fixtureRequest(
          "bitbucket",
          `/rest/branch-permissions/latest/projects/${PROJECT_KEY}/repos/${REPO1}/restrictions`
        );
        for (const r of repoList.data?.values ?? []) {
          await fixtureRequest(
            "bitbucket",
            `/rest/branch-permissions/latest/projects/${PROJECT_KEY}/repos/${REPO1}/restrictions/${r.id}`,
            { method: "DELETE" }
          );
        }
      } catch {
        /* best-effort */
      }
    });

    it("project-level restrictions: create → list → get → delete", async () => {
      // restrictions.list — should be empty initially (or contain only our test data)
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.branch-permissions.restrictions.list",
          path: { projectKey: PROJECT_KEY },
          responseProfile: "standard"
        })
      );

      // restrictions.create
      const created = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.branch-permissions.restrictions.create",
          path: { projectKey: PROJECT_KEY },
          body: {
            type: "read-only",
            matcher: {
              id: "**",
              displayId: "**",
              type: { id: "PATTERN", name: "Pattern" },
              active: true
            },
            users: [],
            groups: []
          }
        })
      );
      // Bitbucket create returns the restriction array or single object
      const createdData = Array.isArray(created.data) ? (created.data as any[])[0] : created.data;
      projectRestrictionId = String((createdData as any)?.id ?? projectedValue(created.data, "id"));
      expect(projectRestrictionId, `create response: ${JSON.stringify(created)}`).toBeTruthy();

      // restrictions.list — must contain the new restriction
      const list = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.branch-permissions.restrictions.list",
          path: { projectKey: PROJECT_KEY },
          responseProfile: "standard"
        })
      );
      expect(containsValue(list.data, projectRestrictionId!), JSON.stringify(list)).toBe(true);

      // restrictions.get
      const get = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.branch-permissions.restrictions.get",
          path: { projectKey: PROJECT_KEY, id: projectRestrictionId! }
        })
      );
      expect(containsValue(get.data, projectRestrictionId!), JSON.stringify(get)).toBe(true);

      // restrictions.delete
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.branch-permissions.restrictions.delete",
          path: { projectKey: PROJECT_KEY, id: projectRestrictionId! }
        })
      );

      // Verify deleted (poll)
      await pollUntil(
        async () =>
          client.callTool(
            "atlassian_execute_operation",
            {
              operationId: "bitbucket.branch-permissions.restrictions.get",
              path: { projectKey: PROJECT_KEY, id: projectRestrictionId! }
            },
            { expectError: true }
          ),
        (r) => r.isError === true,
        { timeoutMs: 15000, intervalMs: 1000 }
      );
      projectRestrictionId = undefined;
    });

    it("repo-level restrictions: create → list → get → delete", async () => {
      // restrictions.list — should be empty initially
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.branch-permissions.projects.repos.restrictions.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );

      // restrictions.create
      const created = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.branch-permissions.projects.repos.restrictions.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          body: {
            type: "pull-request-only",
            matcher: {
              id: "refs/heads/main",
              displayId: "main",
              type: { id: "BRANCH", name: "Branch" },
              active: true
            },
            users: [],
            groups: []
          }
        })
      );
      const createdData = Array.isArray(created.data) ? (created.data as any[])[0] : created.data;
      repoRestrictionId = String((createdData as any)?.id ?? projectedValue(created.data, "id"));
      expect(repoRestrictionId, `create response: ${JSON.stringify(created)}`).toBeTruthy();

      // restrictions.list — must contain the new restriction
      const list = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.branch-permissions.projects.repos.restrictions.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );
      expect(containsValue(list.data, repoRestrictionId!), JSON.stringify(list)).toBe(true);

      // restrictions.get
      const get = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.branch-permissions.projects.repos.restrictions.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, id: repoRestrictionId! }
        })
      );
      expect(containsValue(get.data, repoRestrictionId!), JSON.stringify(get)).toBe(true);

      // restrictions.delete
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.branch-permissions.projects.repos.restrictions.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, id: repoRestrictionId! }
        })
      );

      // Verify deleted (poll)
      await pollUntil(
        async () =>
          client.callTool(
            "atlassian_execute_operation",
            {
              operationId: "bitbucket.branch-permissions.projects.repos.restrictions.get",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, id: repoRestrictionId! }
            },
            { expectError: true }
          ),
        (r) => r.isError === true,
        { timeoutMs: 15000, intervalMs: 1000 }
      );
      repoRestrictionId = undefined;
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 18. repository watch (2 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("repository watch", () => {
    it("watch, watch.delete", async () => {
      // watch — watch the entire repo
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.watch",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
        })
      );

      // watch.delete — unwatch
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.watch.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
        })
      );
    });
  });
});
