import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
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
  projectedValue,
  reviewerCredentials
} from "../support/rest-fixture.js";

const active = process.env.E2E_PRODUCT === "bitbucket" ? describe : describe.skip;

// ── B-C: Pull Request 全链路 (60 ops) ──
// pull-requests (42) + pullrequests (8) + default-tasks (10)
// Already automated (DON'T re-test): pullrequests.create/get/diff/approve/comments.add/merge

active("bitbucket-pull-request-lifecycle", () => {
  const runId = randomUUID().slice(0, 8);
  const PROJECT_KEY = `MCPBC${runId.slice(0, 4)}`.toUpperCase();
  const MAIN_REPO = "repo-main";
  const AM_REPO = "repo-am"; // dedicated auto-merge repo

  let client: StdioMcpClient;
  let reviewerClient: StdioMcpClient;
  let runFiles: string;
  let savedFileRoot: string | undefined;

  let fixtureCommits: string[] = [];
  let fixtureBranches: string[] = [];
  let amBranches: string[] = [];

  /** Shared OPEN PR on main repo (used by Groups 1-3) */
  let sharedPrId: number;
  let sharedPrVersion: number;

  /** Auto-merge repo PR id */
  let amPrId: number;

  /** Dedicated branches for merge/delete PRs (avoid source+target conflict) */
  let mergeBranch: string;
  let deleteBranch: string;
  let dtBranch: string;

  // Reviewer identity
  let reviewerUsername: string;
  let reviewerUserId: number;

  beforeAll(async () => {
    const fileRoot = process.env.ATLASSIAN_FILE_ROOT ?? join(tmpdir(), "atlassian-mcp-file-root");
    runFiles = join(fileRoot, `mcp-bc-${runId}`);
    await mkdir(runFiles, { recursive: true });

    // ── Create project ──
    await ensureFixture(
      fixtureRequest("bitbucket", "/rest/api/1.0/projects", {
        method: "POST",
        body: { key: PROJECT_KEY, name: `B-C Test ${runId}` }
      }),
      [201]
    );
    recordCleanup("bitbucket", "project", PROJECT_KEY, "created");

    // ── Create main repo + auto-merge repo ──
    for (const slug of [MAIN_REPO, AM_REPO]) {
      await ensureFixture(
        fixtureRequest("bitbucket", `/rest/api/1.0/projects/${PROJECT_KEY}/repos`, {
          method: "POST",
          body: { name: slug, scmId: "git" }
        }),
        [201]
      );
      recordCleanup("bitbucket", "repo", `${PROJECT_KEY}/${slug}`, "created");
    }

    // ── Git seed: main repo (3 commits + 2 branches) ──
    const mainSeed = await seedRepository(PROJECT_KEY, MAIN_REPO, {
      commits: [
        {
          message: "feat: initial commit",
          files: {
            "README.md": `# MCPBC ${runId}\n`,
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
            "README.md": `# MCPBC ${runId}\n\nUpdated with types.\n`
          }
        }
      ],
      branches: [`feature/one-${runId}`, `feature/two-${runId}`]
    });
    fixtureCommits = mainSeed.commits;
    fixtureBranches = mainSeed.branches;

    // Push divergent commits to feature branches so PRs are not empty
    for (const branch of fixtureBranches) {
      await seedRepository(PROJECT_KEY, MAIN_REPO, {
        commits: [
          {
            message: `Feature change ${branch} ${runId}`,
            files: { [`change-${branch.split("/").pop()}.txt`]: runId }
          }
        ],
        baseBranch: branch
      });
    }
    // Push dedicated branches for merge and delete PRs (avoids "only one
    // PR per source+target" conflict)
    mergeBranch = `feature/merge-${runId}`;
    deleteBranch = `feature/delete-${runId}`;
    dtBranch = `feature/dt-${runId}`;
    for (const branch of [mergeBranch, deleteBranch, dtBranch]) {
      await seedRepository(PROJECT_KEY, MAIN_REPO, {
        commits: [
          {
            message: `Setup ${branch} ${runId}`,
            files: { [`${branch.split("/").pop()}.txt`]: runId }
          }
        ],
        baseBranch: "main",
        branches: [branch]
      });
      await seedRepository(PROJECT_KEY, MAIN_REPO, {
        commits: [
          {
            message: `Unique change ${branch} ${runId}`,
            files: { [`unique-${branch.split("/").pop()}.txt`]: runId }
          }
        ],
        baseBranch: branch
      });
    }

    // ── Git seed: auto-merge repo (1 commit + 1 branch) ──
    const amSeed = await seedRepository(PROJECT_KEY, AM_REPO, {
      commits: [
        {
          message: "feat: AM repo initial",
          files: { "README.md": `# AM ${runId}\n`, "src/index.ts": "export const y = 2;\n" }
        }
      ],
      branches: [`feature/am-${runId}`]
    });
    amBranches = amSeed.branches;

    // Push a divergent commit to the auto-merge feature branch so the PR is not empty
    await seedRepository(PROJECT_KEY, AM_REPO, {
      commits: [{ message: `AM feature change ${runId}`, files: { "am-change.txt": runId } }],
      baseBranch: amBranches[0]
    });

    // ── Set default branches ──
    for (const slug of [MAIN_REPO, AM_REPO]) {
      await ensureFixture(
        fixtureRequest(
          "bitbucket",
          `/rest/api/latest/projects/${PROJECT_KEY}/repos/${slug}/branches/default`,
          { method: "PUT", body: { id: "refs/heads/main" } }
        ),
        [200, 204]
      );
    }

    // ── Auto-merge repo: enable auto-merge + configure merge check ──
    // Enable the auto-merge feature on the repo (required before merge check works)
    await ensureFixture(
      fixtureRequest(
        "bitbucket",
        `/rest/api/latest/projects/${PROJECT_KEY}/repos/${AM_REPO}/settings/auto-merge`,
        { method: "PUT", body: { enabled: true } }
      ),
      [200]
    );
    // Configure merge check: requiredApprovers:1 so autoMerge:true leaves a pending request
    await ensureFixture(
      fixtureRequest(
        "bitbucket",
        `/rest/api/latest/projects/${PROJECT_KEY}/repos/${AM_REPO}/settings/pull-requests`,
        { method: "POST", body: { requiredApprovers: 1 } }
      ),
      [200, 201]
    );

    // ── Create auto-merge repo PR via REST ──
    const amPrRes = await fixtureRequest(
      "bitbucket",
      `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${AM_REPO}/pull-requests`,
      {
        method: "POST",
        body: {
          title: `AM PR ${runId}`,
          fromRef: { id: `refs/heads/${amBranches[0]}` },
          toRef: { id: "refs/heads/main" }
        }
      }
    );
    amPrId = amPrRes.data.id as number;
    expect(amPrId, `AM PR create failed: ${amPrRes.text?.slice(0, 200)}`).toBeTruthy();

    // ── Create shared OPEN PR on main repo via REST ──
    const prRes = await fixtureRequest(
      "bitbucket",
      `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests`,
      {
        method: "POST",
        body: {
          title: `Shared PR ${runId}`,
          description: "Shared PR for B-C read/mutation ops",
          fromRef: { id: `refs/heads/${fixtureBranches[0]}` },
          toRef: { id: "refs/heads/main" }
        }
      }
    );
    sharedPrId = prRes.data.id as number;
    sharedPrVersion = prRes.data.version as number;
    expect(sharedPrId, `Shared PR create failed: ${prRes.text?.slice(0, 200)}`).toBeTruthy();
    expect(typeof sharedPrVersion).toBe("number");

    // ── Get reviewer identity & user ID ──
    const reviewerAuth = reviewerCredentials("bitbucket");
    reviewerUsername = reviewerAuth.username!;

    // Fetch reviewer's numeric user ID for reviewer-groups
    const userRes = await fixtureRequest(
      "bitbucket",
      `/rest/api/1.0/users?filter=${encodeURIComponent(reviewerUsername)}`
    );
    const reviewerUser = (userRes.data?.values ?? [])[0];
    reviewerUserId = reviewerUser?.id as number;
    expect(reviewerUserId, `Reviewer user not found: ${userRes.text?.slice(0, 200)}`).toBeTruthy();

    // Grant REPO_WRITE to reviewer so they can approve/participate/review
    await ensureFixture(
      fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/permissions/users`,
        { method: "PUT", query: { name: reviewerUsername, permission: "REPO_WRITE" } }
      ),
      [204]
    );
    // Also grant on auto-merge repo (approve for merge check bypass)
    await ensureFixture(
      fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${AM_REPO}/permissions/users`,
        { method: "PUT", query: { name: reviewerUsername, permission: "REPO_WRITE" } }
      ),
      [204]
    );

    // ── Start MCP clients ──
    savedFileRoot = process.env.ATLASSIAN_FILE_ROOT;
    process.env.ATLASSIAN_FILE_ROOT = fileRoot;

    // PAT admin client (default)
    client = await StdioMcpClient.start("bitbucket", ["--exposure-tier=max"]);
    // Reviewer client for approve/unapprove/participants/review ops.
    // review.delete is risky-tier; nothing here needs admin.
    reviewerClient = await StdioMcpClient.start(
      "bitbucket",
      ["--exposure-tier=risky"],
      reviewerAuth
    );
  }, 300_000);

  afterAll(async () => {
    try {
      await client?.close();
    } catch {
      /* best-effort */
    }
    try {
      await reviewerClient?.close();
    } catch {
      /* best-effort */
    }

    if (savedFileRoot === undefined) {
      delete process.env.ATLASSIAN_FILE_ROOT;
    } else {
      process.env.ATLASSIAN_FILE_ROOT = savedFileRoot;
    }

    // Sweep branch-permissions (residuals block git push)
    for (const slug of [MAIN_REPO, AM_REPO]) {
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
          `/rest/branch-permissions/latest/projects/${PROJECT_KEY}/repos/${slug}/restrictions`
        );
        for (const r of repoList.data?.values ?? []) {
          await fixtureRequest(
            "bitbucket",
            `/rest/branch-permissions/latest/projects/${PROJECT_KEY}/repos/${slug}/restrictions/${r.id}`,
            { method: "DELETE" }
          );
        }
      } catch {
        /* best-effort */
      }
    }

    // Delete repos (auto-merge repo first, then main)
    for (const slug of [AM_REPO, MAIN_REPO]) {
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

    // Delete project
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
  // Group 1: PR 读操作 + update (~12 ops) — 共享 OPEN PR
  // ═══════════════════════════════════════════════════════════════
  describe("PR read ops + update", () => {
    it("pullrequests.list, pullrequests.update, pull-requests.get (.patch), diff.get, diff-stats-summary.get, changes.list, commits.list, commit-message-suggestion.list, merge.list, merge-base.list, commits.pull-requests.list", async () => {
      // pullrequests.list — list PRs, should contain the shared PR
      const pl = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pullrequests.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO },
          responseProfile: "standard"
        })
      );
      expect(containsValue(pl.data, `Shared PR ${runId}`), JSON.stringify(pl)).toBe(true);

      // pullrequests.update — change title & description
      const newTitle = `Updated PR ${runId}`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pullrequests.update",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId },
          body: { title: newTitle, description: `Updated desc ${runId}`, version: sharedPrVersion }
        })
      );
      // Read back via standard profile to verify update
      const getUpdated = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pullrequests.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId },
          responseProfile: "standard"
        })
      );
      expect(containsValue(getUpdated.data, newTitle), JSON.stringify(getUpdated)).toBe(true);
      // Update version for subsequent ops
      const newVersion = projectedValue(getUpdated.data, "version") as number;
      if (typeof newVersion === "number") sharedPrVersion = newVersion;

      // pull-requests...get (.patch — responseKind:binary, accept:text/plain, same
      // fix as B-B's repository.patch.list). Download and assert content.
      const patchPath = join(runFiles, "pr.patch");
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId },
          downloadPath: patchPath
        })
      );
      const patchContent = readFileSync(patchPath, "utf8");
      expect(patchContent.includes("From "), "patch should start with From header").toBe(true);

      // diff.get — diff for a specific path (JSON response, not binary)
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.diff.get",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: MAIN_REPO,
            pullRequestId: sharedPrId,
            path: "README.md"
          }
        })
      );

      // diff-stats-summary.get
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId:
            "bitbucket.pull-requests.projects.repos.pull-requests.diff-stats-summary.get",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: MAIN_REPO,
            pullRequestId: sharedPrId,
            path: "README.md"
          }
        })
      );

      // changes.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.changes.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId }
        })
      );

      // commits.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.commits.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId }
        })
      );

      // commit-message-suggestion.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId:
            "bitbucket.pull-requests.projects.repos.pull-requests.commit-message-suggestion.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId }
        })
      );

      // merge.list — test if mergeable
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.merge.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId }
        })
      );

      // merge-base.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.merge-base.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId }
        })
      );

      // commits.pull-requests.list — PRs containing a specific commit
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.commits.pull-requests.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, commitId: fixtureCommits[2]! }
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Group 2: Comments + Blocker-comments (~9 ops) — 共享 OPEN PR
  // ═══════════════════════════════════════════════════════════════
  describe("comments + blocker-comments", () => {
    let commentId: string | undefined;
    let blockerCommentId: string | undefined;

    afterAll(async () => {
      if (commentId) {
        try {
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.pullrequests.comments.delete",
            path: {
              projectKey: PROJECT_KEY,
              repositorySlug: MAIN_REPO,
              pullRequestId: sharedPrId,
              commentId
            },
            query: { version: "0" }
          });
        } catch {
          /* best-effort */
        }
      }
      if (blockerCommentId) {
        try {
          await client.callTool("atlassian_execute_operation", {
            operationId:
              "bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.delete",
            path: {
              projectKey: PROJECT_KEY,
              repositorySlug: MAIN_REPO,
              pullRequestId: sharedPrId,
              commentId: blockerCommentId
            },
            query: { version: "0" }
          });
        } catch {
          /* best-effort */
        }
      }
    });

    it("1.0 API: comments.update → comments.delete + latest API: comments.list → comments.get → apply-suggestion", async () => {
      // Create a comment via REST with a suggestion block so apply-suggestion can be exercised.
      // (add is already automated, don't re-test via MCP)
      const commentText = `B-C comment ${runId}`;
      const created = await fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${sharedPrId}/comments`,
        { method: "POST", body: { text: commentText, anchor: { path: "README.md" } } }
      );
      commentId = String(created.data.id);
      const commentVersion = created.data.version as number;
      expect(commentId).toBeTruthy();

      // pullrequests.comments.update (1.0 API)
      const updatedText = `B-C updated ${runId}`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pullrequests.comments.update",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: MAIN_REPO,
            pullRequestId: sharedPrId,
            commentId
          },
          body: { text: updatedText, version: commentVersion }
        })
      );

      // latest API: comments.list — requires `path` query param
      const cl = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.comments.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId },
          query: { path: "README.md" },
          responseProfile: "standard"
        })
      );
      expect(containsValue(cl.data, updatedText), JSON.stringify(cl)).toBe(true);

      // comments.get (latest API)
      const cg = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.comments.get",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: MAIN_REPO,
            pullRequestId: sharedPrId,
            commentId
          }
        })
      );
      expect(containsValue(cg.data, commentId), JSON.stringify(cg)).toBe(true);

      // comments.apply-suggestion.create — reviewer posts a comment with a
      // ```suggestion block anchored to a diff line, then MCP applies it.
      // DC 10.4.1 uses "message" in body (NOT "commitMessage" — product bug).
      const reviewerAuth = reviewerCredentials("bitbucket");
      const authHeader = `Basic ${Buffer.from(`${reviewerAuth.username}:${reviewerAuth.password}`).toString("base64")}`;
      const sinkUrl = process.env.BITBUCKET_URL ?? "http://localhost:7990";

      // Post a comment with ```suggestion as the reviewer, anchored to an ADDED line
      // in a file that the feature branch created (avoids "iterative diff" error).
      const featureFile = `change-${fixtureBranches[0]!.split("/").pop()}.txt`;
      const suggestionText = "suggested replacement e2e";
      const suggestionComment = await fetch(
        `${sinkUrl}/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${sharedPrId}/comments`,
        {
          method: "POST",
          headers: {
            authorization: authHeader,
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            text: `\`\`\`suggestion\n${suggestionText}\n\`\`\``,
            anchor: {
              path: featureFile,
              srcPath: featureFile,
              line: 1,
              lineType: "ADDED",
              fileType: "TO"
            }
          })
        }
      );
      const suggData = (await suggestionComment.json()) as any;
      const suggestionCommentId = String(suggData.id);
      const suggVersion = suggData.version as number;
      expect(
        suggestionCommentId,
        `suggestion comment: HTTP ${suggestionComment.status} ${JSON.stringify(suggData).slice(0, 300)}`
      ).toBeTruthy();

      // MCP apply-suggestion with "message" field (DC 10.4.1 correct field name)
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId:
            "bitbucket.pull-requests.projects.repos.pull-requests.comments.apply-suggestion.create",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: MAIN_REPO,
            pullRequestId: sharedPrId,
            commentId: suggestionCommentId
          },
          body: {
            commentVersion: Number(suggVersion),
            pullRequestVersion: sharedPrVersion,
            suggestionIndex: 0,
            message: `apply-suggestion e2e ${runId}`
          }
        })
      );

      // Verify the suggestion was committed to the feature branch file
      const fileRes = await fetch(
        `${sinkUrl}/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/raw/${featureFile}?at=refs/heads/${fixtureBranches[0]}`,
        { headers: { authorization: authHeader } }
      );
      const fileContent = await fileRes.text();
      expect(
        fileContent.includes(suggestionText),
        `file should contain applied suggestion: ${fileContent.slice(0, 300)}`
      ).toBe(true);

      // pullrequests.comments.delete (1.0 API) — requires the current version.
      // Read it fresh: apply-suggestion pushed a commit, and Bitbucket may
      // asynchronously migrate comment anchors, which bumps comment versions.
      const currentComment = await fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${sharedPrId}/comments/${commentId}`
      );
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pullrequests.comments.delete",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: MAIN_REPO,
            pullRequestId: sharedPrId,
            commentId
          },
          query: { version: String(currentComment.data.version) }
        })
      );
      commentId = undefined;
    });

    it("blocker-comments CRUD: create → list → get → update → delete", async () => {
      // blocker-comments.create
      const bcText = `B-C blocker ${runId}`;
      const created = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId:
            "bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId },
          body: { text: bcText, severity: "BLOCKER" }
        })
      );
      const bcData = created.data as any;
      blockerCommentId = String(bcData?.id ?? projectedValue(created.data, "id"));
      expect(blockerCommentId, `blocker-comment create: ${JSON.stringify(created)}`).toBeTruthy();

      // blocker-comments.list
      const bcl = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId },
          responseProfile: "standard"
        })
      );
      expect(containsValue(bcl.data, blockerCommentId!), JSON.stringify(bcl)).toBe(true);

      // blocker-comments.get
      const bcg = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.get",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: MAIN_REPO,
            pullRequestId: sharedPrId,
            commentId: blockerCommentId!
          }
        })
      );
      expect(containsValue(bcg.data, blockerCommentId!), JSON.stringify(bcg)).toBe(true);

      // blocker-comments.update
      const bcUpdatedText = `B-C blocker updated ${runId}`;
      const bcUpdated = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId:
            "bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.update",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: MAIN_REPO,
            pullRequestId: sharedPrId,
            commentId: blockerCommentId!
          },
          body: { text: bcUpdatedText, version: (bcData?.version ?? 0) as number }
        })
      );
      const bcNewVersion = (bcUpdated.data as any)?.version ?? 1;

      // blocker-comments.delete — requires version query param (use post-update version)
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId:
            "bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.delete",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: MAIN_REPO,
            pullRequestId: sharedPrId,
            commentId: blockerCommentId!
          },
          query: { version: String(bcNewVersion) }
        })
      );
      // Verify deleted
      const afterDel = await client.callTool(
        "atlassian_execute_operation",
        {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.get",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: MAIN_REPO,
            pullRequestId: sharedPrId,
            commentId: blockerCommentId!
          }
        },
        { expectError: true }
      );
      expect(afterDel.isError, "deleted blocker-comment should not be retrievable").toBe(true);
      blockerCommentId = undefined;
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Group 3: Participants + Review + Watch (~10 ops) — 共享 OPEN PR
  // ═══════════════════════════════════════════════════════════════
  describe("participants + review + watch", () => {
    afterAll(async () => {
      // Best-effort: remove any leftover reviewer participant
      try {
        await client.callTool(
          "atlassian_execute_operation",
          {
            operationId: "bitbucket.pull-requests.projects.repos.pull-requests.participants.delete",
            path: {
              projectKey: PROJECT_KEY,
              repositorySlug: MAIN_REPO,
              pullRequestId: sharedPrId,
              userSlug: reviewerUsername
            }
          },
          { expectError: true }
        );
      } catch {
        /* best-effort */
      }
    });

    it("participants CRUD + repo participants.list", async () => {
      // participants.create — assign reviewer user as REVIEWER
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.participants.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId },
          body: { role: "REVIEWER", user: { name: reviewerUsername } }
        })
      );

      // participants.list — should contain reviewer
      const partList = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.participants.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId },
          responseProfile: "standard"
        })
      );
      expect(containsValue(partList.data, reviewerUsername), JSON.stringify(partList)).toBe(true);

      // participants.update — reviewer changes their own participant status
      requireToolSuccess(
        await reviewerClient.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.participants.update",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: MAIN_REPO,
            pullRequestId: sharedPrId,
            userSlug: reviewerUsername
          },
          body: { status: "NEEDS_WORK" }
        })
      );

      // participants.delete — remove participant (admin client)
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.participants.delete",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: MAIN_REPO,
            pullRequestId: sharedPrId,
            userSlug: reviewerUsername
          }
        })
      );

      // repo-level participants.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.participants.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO },
          responseProfile: "standard"
        })
      );
    });

    it("review lifecycle: list → update → delete (via reviewer client)", async () => {
      // review.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.review.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId }
        })
      );

      // Add reviewer as participant (required before they can start a review)
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.participants.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId },
          body: { role: "REVIEWER", user: { name: reviewerUsername } }
        })
      );

      // Reviewer posts a PENDING comment anchored to a diff line → starts a pending review.
      const reviewerAuth = reviewerCredentials("bitbucket");
      const authHeader = `Basic ${Buffer.from(`${reviewerAuth.username}:${reviewerAuth.password}`).toString("base64")}`;
      const sinkUrl = process.env.BITBUCKET_URL ?? "http://localhost:7990";
      const pendingRes = await fetch(
        `${sinkUrl}/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${sharedPrId}/comments`,
        {
          method: "POST",
          headers: {
            authorization: authHeader,
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            text: `B-C review start ${runId}`,
            state: "PENDING",
            anchor: {
              path: "README.md",
              srcPath: "README.md",
              line: 1,
              lineType: "CONTEXT",
              fileType: "TO",
              diffType: "COMMIT",
              fromHash: fixtureCommits[0],
              toHash: fixtureCommits[2]
            }
          })
        }
      );
      expect(
        pendingRes.status,
        `PENDING comment: ${await pendingRes.text().then((t: string) => t.slice(0, 200))}`
      ).toBe(201);

      // review.update — reviewer completes their review (PUT, not PATCH)
      const rvResult = requireToolSuccess(
        await reviewerClient.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.review.update",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId },
          body: { commentText: `B-C review complete ${runId}`, participantStatus: "APPROVED" },
          responseProfile: "standard"
        })
      );
      expect(
        containsValue(rvResult.data, "publishedCommentCount"),
        `review.update: ${JSON.stringify(rvResult)}`
      ).toBe(true);

      // Post another PENDING comment → creates a new draft review for delete to discard
      const pending2Res = await fetch(
        `${sinkUrl}/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${sharedPrId}/comments`,
        {
          method: "POST",
          headers: {
            authorization: authHeader,
            "content-type": "application/json",
            accept: "application/json"
          },
          body: JSON.stringify({
            text: `B-C review discard ${runId}`,
            state: "PENDING",
            anchor: {
              path: "README.md",
              srcPath: "README.md",
              line: 2,
              lineType: "CONTEXT",
              fileType: "TO",
              diffType: "COMMIT",
              fromHash: fixtureCommits[0],
              toHash: fixtureCommits[2]
            }
          })
        }
      );
      expect(
        pending2Res.status,
        `PENDING comment 2: ${await pending2Res.text().then((t: string) => t.slice(0, 200))}`
      ).toBe(201);

      // review.delete — reviewer discards the draft review
      requireToolSuccess(
        await reviewerClient.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.review.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId }
        })
      );

      // Clean up participant
      await client.callTool(
        "atlassian_execute_operation",
        {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.participants.delete",
          path: {
            projectKey: PROJECT_KEY,
            repositorySlug: MAIN_REPO,
            pullRequestId: sharedPrId,
            userSlug: reviewerUsername
          }
        },
        { expectError: true }
      );
    });

    it("watch → watch.delete", async () => {
      // watch
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.watch",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId }
        })
      );

      // watch.delete
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.watch.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: sharedPrId }
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Group 4: 状态变更 — Decline/Reopen + Unapprove (~4 ops) — 自建 PR
  // ═══════════════════════════════════════════════════════════════
  describe("state changes: unapprove + decline + reopen", () => {
    let statePrId: number;

    beforeAll(async () => {
      const res = await fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests`,
        {
          method: "POST",
          body: {
            title: `State PR ${runId}`,
            fromRef: { id: `refs/heads/${fixtureBranches[1]}` },
            toRef: { id: "refs/heads/main" }
          }
        }
      );
      statePrId = res.data.id as number;
    });

    afterAll(async () => {
      try {
        const getRes = await fixtureRequest(
          "bitbucket",
          `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${statePrId}`
        );
        const v = getRes.data?.version;
        if (v) {
          await fixtureRequest(
            "bitbucket",
            `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${statePrId}`,
            { method: "DELETE", body: { version: v } }
          );
        }
      } catch {
        /* best-effort */
      }
    });

    it("unapprove → decline → reopen", async () => {
      // Reviewer approves the PR via REST (admin-authored PR needs external approval).
      // The approve MCP op is already automated; we just need the approval state.
      const reviewerAuth = reviewerCredentials("bitbucket");
      const authHeader = `Basic ${Buffer.from(`${reviewerAuth.username}:${reviewerAuth.password}`).toString("base64")}`;
      const approveRes = await fetch(
        `${process.env.BITBUCKET_URL ?? "http://localhost:7990"}/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${statePrId}/approve`,
        { method: "POST", headers: { authorization: authHeader, accept: "application/json" } }
      );
      expect(
        approveRes.status,
        `reviewer approve: ${await approveRes.text().then((t) => t.slice(0, 200))}`
      ).toBe(200);

      // pullrequests.unapprove — reviewer removes their own approval.
      // Bitbucket prevents PR authors from unapproving their own PR;
      // the reviewer (who approved) must do it.
      const unapproveResult = requireToolSuccess(
        await reviewerClient.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pullrequests.unapprove",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: statePrId }
        })
      );
      expect(
        containsValue(unapproveResult, "UNAPPROVED"),
        `unapprove should return UNAPPROVED: ${JSON.stringify(unapproveResult)}`
      ).toBe(true);

      // Get current version for decline
      const getForDecline = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pullrequests.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: statePrId },
          responseProfile: "standard"
        })
      );
      const declineVersion = projectedValue(getForDecline.data, "version") as number;

      // pullrequests.decline — version in body
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pullrequests.decline",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: statePrId },
          body: { version: declineVersion }
        })
      );

      // Verify DECLINED
      const declined = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pullrequests.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: statePrId },
          responseProfile: "standard"
        })
      );
      expect(containsValue(declined.data, "DECLINED"), JSON.stringify(declined)).toBe(true);

      // Get version for reopen (bumped after decline)
      const reopenVersion = projectedValue(declined.data, "version") as number;

      // pullrequests.reopen — version in body
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pullrequests.reopen",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: statePrId },
          body: { version: reopenVersion }
        })
      );

      // Verify OPEN again
      const reopened = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pullrequests.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: statePrId },
          responseProfile: "standard"
        })
      );
      expect(containsValue(reopened.data, "OPEN"), JSON.stringify(reopened)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Group 5: Merge + Delete — 终结性操作 (独立 PR)
  // ═══════════════════════════════════════════════════════════════
  describe("merge + activities + delete", () => {
    let mergePrId: number;
    let deletePrId: number;

    beforeAll(async () => {
      const mr = await fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests`,
        {
          method: "POST",
          body: {
            title: `Merge PR ${runId}`,
            fromRef: { id: `refs/heads/${mergeBranch}` },
            toRef: { id: "refs/heads/main" }
          }
        }
      );
      mergePrId = mr.data.id as number;
      expect(mergePrId, `Merge PR create failed: ${mr.text?.slice(0, 200)}`).toBeTruthy();

      const dr = await fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests`,
        {
          method: "POST",
          body: {
            title: `Delete PR ${runId}`,
            fromRef: { id: `refs/heads/${deleteBranch}` },
            toRef: { id: "refs/heads/main" }
          }
        }
      );
      deletePrId = dr.data.id as number;
      expect(deletePrId, `Delete PR create failed: ${dr.text?.slice(0, 200)}`).toBeTruthy();
    });

    it("merge → activities on merged PR", async () => {
      // Merge via REST (MCP merge op is already automated, don't re-count)
      const getRes = await fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${mergePrId}`
      );
      const v = getRes.data?.version as number;
      const mergeRes = await fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${mergePrId}/merge`,
        { method: "POST", body: { version: v } }
      );
      expect(
        [200, 202].includes(mergeRes.status),
        `merge should succeed: HTTP ${mergeRes.status} ${mergeRes.text?.slice(0, 200)}`
      ).toBe(true);

      // Verify MERGED state via REST read-back
      const mergedGet = await fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${mergePrId}`
      );
      expect(
        mergedGet.data?.state === "MERGED" || mergeRes.status === 200,
        `PR should be MERGED: ${JSON.stringify(mergedGet.data)}`
      ).toBe(true);

      // pullrequests.activities — should work on merged PR
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pullrequests.activities",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: mergePrId },
          responseProfile: "standard"
        })
      );
    });

    it("pull-requests.delete — physical delete with version in body", async () => {
      const getRes = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pullrequests.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: deletePrId },
          responseProfile: "standard"
        })
      );
      const delVersion = projectedValue(getRes.data, "version") as number;
      expect(typeof delVersion, `should have version: ${JSON.stringify(getRes)}`).toBe("number");

      // pull-requests.delete — version MUST be in body (not query) per 10.4.1
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: deletePrId },
          body: { version: delVersion }
        })
      );

      // Verify physically deleted (GET → error/404)
      const afterDel = await client.callTool(
        "atlassian_execute_operation",
        {
          operationId: "bitbucket.pullrequests.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: deletePrId }
        },
        { expectError: true }
      );
      expect(afterDel.isError, "physically deleted PR should not be retrievable").toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Group 6: Auto-merge 三件套 (3 ops) — 独立 repo repo-am
  // ═══════════════════════════════════════════════════════════════
  describe("auto-merge trio on dedicated repo", () => {
    it("auto-merge lifecycle: request → list (pending) → create (tryAutoMerge) → delete (cancel)", async () => {
      // Get current version of auto-merge PR
      const getRes = await fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${AM_REPO}/pull-requests/${amPrId}`
      );
      const amVersion = getRes.data?.version as number;

      // Step 1: Request auto-merge via REST merge endpoint with autoMerge:true.
      // The requiredApprovers:1 merge check blocks immediate merge → pending auto-merge.
      const mergeResult = await fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${AM_REPO}/pull-requests/${amPrId}/merge`,
        { method: "POST", body: { autoMerge: true, version: amVersion } }
      );
      expect(
        [200, 202].includes(mergeResult.status),
        `auto-merge request should succeed: HTTP ${mergeResult.status}`
      ).toBe(true);

      // Step 2: auto-merge.list (GET) — verify auto-merge request exists (pending).
      // Must use requireToolSuccess: the merge check guarantees a pending request.
      const amList = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.auto-merge.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: AM_REPO, pullRequestId: amPrId }
        })
      );
      expect(amList, "auto-merge.list should return pending request data").toBeTruthy();

      // Step 3: auto-merge.create (POST) — tryAutoMerge
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.auto-merge.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: AM_REPO, pullRequestId: amPrId }
        })
      );

      // Step 4: auto-merge.delete (DELETE) — cancel auto-merge request
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.auto-merge.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: AM_REPO, pullRequestId: amPrId }
        })
      );

      // Verify cancelled — GET should now return 404 (no pending request)
      const afterCancel = await client.callTool(
        "atlassian_execute_operation",
        {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.auto-merge.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: AM_REPO, pullRequestId: amPrId }
        },
        { expectError: true }
      );
      expect(afterCancel.isError, "cancelled auto-merge should not be retrievable").toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Group 7: Default-tasks — Project 级 (5 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("default-tasks (project-level)", () => {
    let projectTaskId: string | undefined;
    let projectTaskId2: string | undefined;

    afterAll(async () => {
      try {
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.tasks.delete",
          path: { projectKey: PROJECT_KEY }
        });
      } catch {
        /* best-effort */
      }
    });

    it("tasks.list → create×2 → update → verify on PR → delete.projectkey → delete (all)", async () => {
      const matcher = { id: "**", type: { id: "PATTERN", name: "Pattern" } };

      // tasks.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.tasks.list",
          path: { projectKey: PROJECT_KEY },
          responseProfile: "standard"
        })
      );

      // tasks.create — MCP create with matchers, assert returned id
      const taskDesc = `B-C project task ${runId}`;
      const created = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.tasks.create",
          path: { projectKey: PROJECT_KEY },
          body: { description: taskDesc, sourceMatcher: matcher, targetMatcher: matcher }
        })
      );
      projectTaskId = String((created.data as any)?.id ?? projectedValue(created.data, "id"));
      expect(projectTaskId, `task create: ${JSON.stringify(created)}`).toBeTruthy();

      // Create second task (for individual delete test)
      const taskDesc2 = `B-C project task 2 ${runId}`;
      const created2 = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.tasks.create",
          path: { projectKey: PROJECT_KEY },
          body: { description: taskDesc2, sourceMatcher: matcher, targetMatcher: matcher }
        })
      );
      projectTaskId2 = String((created2.data as any)?.id ?? projectedValue(created2.data, "id"));
      expect(projectTaskId2, `task2 create: ${JSON.stringify(created2)}`).toBeTruthy();

      // tasks.update — change description of first task
      const updatedDesc = `B-C project task updated ${runId}`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.tasks.update",
          path: { projectKey: PROJECT_KEY, taskId: projectTaskId! },
          body: { description: updatedDesc, sourceMatcher: matcher, targetMatcher: matcher }
        })
      );

      // Verify on PR: enable requiredAllTasksComplete merge check, then
      // create a PR with unresolved default tasks. merge.list returns
      // canMerge:false with a veto mentioning "tasks" — proving the tasks
      // are attached to the PR.
      await ensureFixture(
        fixtureRequest(
          "bitbucket",
          `/rest/api/latest/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/settings/pull-requests`,
          { method: "POST", body: { requiredAllTasksComplete: true } }
        ),
        [200, 201]
      );

      const tmpPr = await fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests`,
        {
          method: "POST",
          body: {
            title: `DT Project ${runId}`,
            fromRef: { id: `refs/heads/${dtBranch}` },
            toRef: { id: "refs/heads/main" }
          }
        }
      );
      const tmpPrId = tmpPr.data.id as number;
      expect(tmpPrId, `DT project PR create: ${tmpPr.text?.slice(0, 200)}`).toBeTruthy();

      // merge.list on the new PR — must be blocked by unresolved tasks
      const mlRes = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.merge.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: tmpPrId },
          responseProfile: "standard"
        })
      );
      expect(
        containsValue(mlRes.data, "tasks"),
        `merge.list should veto on tasks: ${JSON.stringify(mlRes)}`
      ).toBe(true);

      // Delete the task definitions. Note: the veto on tmpPr does NOT clear —
      // default tasks are copied onto the PR as instances at creation, and DC
      // 10.4.1 exposes no REST endpoint to resolve PR task instances (verified
      // live). So there is no post-delete merge.list assertion here.
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.tasks.delete.projectkey",
          path: { projectKey: PROJECT_KEY, taskId: projectTaskId2! }
        })
      );
      projectTaskId2 = undefined;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.tasks.delete",
          path: { projectKey: PROJECT_KEY }
        })
      );
      projectTaskId = undefined;

      // Clean up temp PR
      try {
        const getTmp = await fixtureRequest(
          "bitbucket",
          `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${tmpPrId}`
        );
        const tv = getTmp.data?.version;
        if (tv) {
          await fixtureRequest(
            "bitbucket",
            `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${tmpPrId}`,
            { method: "DELETE", body: { version: tv } }
          );
        }
      } catch {
        /* best-effort */
      }

      // Verify all deleted
      const afterDel = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.tasks.list",
          path: { projectKey: PROJECT_KEY },
          responseProfile: "standard"
        })
      );
      expect(
        !containsValue(afterDel.data, updatedDesc),
        `all tasks should be deleted: ${JSON.stringify(afterDel)}`
      ).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Group 8: Default-tasks — Repo 级 (5 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("default-tasks (repo-level)", () => {
    let repoTaskId: string | undefined;
    let repoTaskId2: string | undefined;

    afterAll(async () => {
      try {
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.projects.repos.tasks.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO }
        });
      } catch {
        /* best-effort */
      }
    });

    it("tasks.list → create×2 → update → verify on PR → delete.projectkey → delete (all)", async () => {
      const matcher = { id: "**", type: { id: "PATTERN", name: "Pattern" } };

      // repo tasks.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.projects.repos.tasks.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO },
          responseProfile: "standard"
        })
      );

      // repo tasks.create — MCP create, assert id
      const taskDesc = `B-C repo task ${runId}`;
      const created = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.projects.repos.tasks.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO },
          body: { description: taskDesc, sourceMatcher: matcher, targetMatcher: matcher }
        })
      );
      repoTaskId = String((created.data as any)?.id ?? projectedValue(created.data, "id"));
      expect(repoTaskId, `repo task create: ${JSON.stringify(created)}`).toBeTruthy();

      // Second repo task (for individual delete)
      const taskDesc2 = `B-C repo task 2 ${runId}`;
      const created2 = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.projects.repos.tasks.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO },
          body: { description: taskDesc2, sourceMatcher: matcher, targetMatcher: matcher }
        })
      );
      repoTaskId2 = String((created2.data as any)?.id ?? projectedValue(created2.data, "id"));
      expect(repoTaskId2, `repo task2 create: ${JSON.stringify(created2)}`).toBeTruthy();

      // repo tasks.update
      const updatedDesc = `B-C repo task updated ${runId}`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.projects.repos.tasks.update",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, taskId: repoTaskId! },
          body: { description: updatedDesc, sourceMatcher: matcher, targetMatcher: matcher }
        })
      );

      // Verify on PR: merge check is already enabled from Group 7.
      // Create a PR with unresolved repo-level default tasks → merge.list
      // returns canMerge:false with "tasks" veto.
      const tmpPr = await fixtureRequest(
        "bitbucket",
        `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests`,
        {
          method: "POST",
          body: {
            title: `DT Repo ${runId}`,
            fromRef: { id: `refs/heads/${fixtureBranches[1]}` },
            toRef: { id: "refs/heads/main" }
          }
        }
      );
      const tmpPrId = tmpPr.data.id as number;
      expect(tmpPrId, `DT repo PR create: ${tmpPr.text?.slice(0, 200)}`).toBeTruthy();

      const mlRes = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.pull-requests.merge.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, pullRequestId: tmpPrId },
          responseProfile: "standard"
        })
      );
      expect(
        containsValue(mlRes.data, "tasks"),
        `merge.list should veto on tasks: ${JSON.stringify(mlRes)}`
      ).toBe(true);

      // Delete the task definitions. As in the project-level group, the veto
      // persists on tmpPr (task instances are copied at PR creation; no PR-task
      // REST endpoint on DC 10.4.1) — no post-delete merge.list assertion.
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.projects.repos.tasks.delete.projectkey",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, taskId: repoTaskId2! }
        })
      );
      repoTaskId2 = undefined;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.projects.repos.tasks.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO }
        })
      );
      repoTaskId = undefined;

      // Cleanup temp PR
      try {
        const getTmp = await fixtureRequest(
          "bitbucket",
          `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${tmpPrId}`
        );
        const tv = getTmp.data?.version;
        if (tv) {
          await fixtureRequest(
            "bitbucket",
            `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${MAIN_REPO}/pull-requests/${tmpPrId}/decline`,
            { method: "POST", body: { version: tv } }
          );
        }
      } catch {
        /* best-effort */
      }

      // Verify all deleted
      const afterDel = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.default-tasks.projects.repos.tasks.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO },
          responseProfile: "standard"
        })
      );
      expect(
        !containsValue(afterDel.data, updatedDesc),
        `all repo tasks should be deleted: ${JSON.stringify(afterDel)}`
      ).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Group 9: Reviewer-groups — Project 级 (5 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("reviewer-groups (project-level)", () => {
    let groupId: string | undefined;

    afterAll(async () => {
      if (groupId) {
        try {
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.pull-requests.projects.settings.reviewer-groups.delete",
            path: { projectKey: PROJECT_KEY, id: groupId }
          });
        } catch {
          /* best-effort */
        }
      }
    });

    it("list → create → get → update → delete", async () => {
      // list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.settings.reviewer-groups.list",
          path: { projectKey: PROJECT_KEY },
          responseProfile: "standard"
        })
      );

      // create — use reviewer's numeric user id
      const groupName = `bc-proj-rg-${runId.slice(0, 4)}`;
      const created = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.settings.reviewer-groups.create",
          path: { projectKey: PROJECT_KEY },
          body: {
            name: groupName,
            description: `B-C project RG ${runId}`,
            users: [{ id: reviewerUserId }]
          }
        })
      );
      groupId = String((created.data as any)?.id ?? projectedValue(created.data, "id"));
      expect(groupId, `RG create: ${JSON.stringify(created)}`).toBeTruthy();

      // get
      const get = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.settings.reviewer-groups.get",
          path: { projectKey: PROJECT_KEY, id: groupId! }
        })
      );
      expect(containsValue(get.data, groupName), JSON.stringify(get)).toBe(true);

      // update
      const updatedName = `${groupName}-upd`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.settings.reviewer-groups.update",
          path: { projectKey: PROJECT_KEY, id: groupId! },
          body: { name: updatedName, description: `Updated ${runId}` }
        })
      );
      const getUpdated = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.settings.reviewer-groups.get",
          path: { projectKey: PROJECT_KEY, id: groupId! }
        })
      );
      expect(containsValue(getUpdated.data, updatedName), JSON.stringify(getUpdated)).toBe(true);

      // delete
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.settings.reviewer-groups.delete",
          path: { projectKey: PROJECT_KEY, id: groupId! }
        })
      );
      groupId = undefined;
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Group 10: Reviewer-groups — Repo 级 (6 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("reviewer-groups (repo-level)", () => {
    let groupId: string | undefined;

    afterAll(async () => {
      if (groupId) {
        try {
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.pull-requests.projects.repos.settings.reviewer-groups.delete",
            path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, id: groupId }
          });
        } catch {
          /* best-effort */
        }
      }
    });

    it("list → create → get → update → users.list → delete", async () => {
      // list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.settings.reviewer-groups.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO },
          responseProfile: "standard"
        })
      );

      // create — use reviewer's numeric user id
      const groupName = `bc-repo-rg-${runId.slice(0, 4)}`;
      const created = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.settings.reviewer-groups.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO },
          body: {
            name: groupName,
            description: `B-C repo RG ${runId}`,
            users: [{ id: reviewerUserId }]
          }
        })
      );
      groupId = String((created.data as any)?.id ?? projectedValue(created.data, "id"));
      expect(groupId, `repo RG create: ${JSON.stringify(created)}`).toBeTruthy();

      // get
      const get = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.settings.reviewer-groups.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, id: groupId! }
        })
      );
      expect(containsValue(get.data, groupName), JSON.stringify(get)).toBe(true);

      // update
      const updatedName = `${groupName}-upd`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.settings.reviewer-groups.update",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, id: groupId! },
          body: { name: updatedName, description: `Updated ${runId}` }
        })
      );

      // users.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.settings.reviewer-groups.users.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, id: groupId! }
        })
      );

      // delete
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.pull-requests.projects.repos.settings.reviewer-groups.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: MAIN_REPO, id: groupId! }
        })
      );
      groupId = undefined;
    });
  });
});
