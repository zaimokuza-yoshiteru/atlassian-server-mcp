import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordCleanup } from "../support/cleanup-journal.js";
import { StdioMcpClient, requireToolSuccess } from "../support/mcp-client.js";
import { pollUntil } from "../support/poll.js";
import {
  adminBasicCredentials,
  containsValue,
  ensureFixture,
  fixtureRequest,
  projectedValue,
  pushBitbucketBranches
} from "../support/rest-fixture.js";
import { withRestoredState } from "../support/restore-state.js";

const active = process.env.E2E_PRODUCT === "bitbucket" ? describe : describe.skip;

// ── Self-contained 48×48 PNG for avatar-png.create (same pattern as Jira) ──
function buildAvatarPng(): Buffer {
  const w = 48,
    h = 48;
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  const raw = Buffer.allocUnsafe(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0;
    for (let x = 0; x < w; x++) {
      const off = y * (1 + w * 3) + 1 + x * 3;
      const c = (x + y) % 2 === 0 ? 255 : 0;
      raw[off] = c;
      raw[off + 1] = c;
      raw[off + 2] = c;
    }
  }
  const idat = namedChunk("IDAT", deflateSync(raw));
  const ihdr = namedChunk("IHDR", ihdrData);
  const iend = namedChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ihdr, idat, iend]);
}
function namedChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeB, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeB, data, crc]);
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) {
    c = (c >>> 8) ^ crcTable[(c ^ b) & 0xff]!;
  }
  return (c ^ 0xffffffff) >>> 0;
}
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

// ── B-A: 项目与仓库治理 (82 ops) ──
// projects(5) + project(51) + repositories(5) + permissions(1)
// + permission-management(10) + access-tokens(10)

active("bitbucket-project-repo-admin", () => {
  const runId = randomUUID().slice(0, 8);
  const PROJECT_KEY = `MCPBA${runId.slice(0, 4)}`.toUpperCase();
  const REPO1 = "repo-one";
  const REVIEWER_USER = "mcp-e2e-reviewer";
  const REVIEWER_GROUP = "e2e-reviewers";

  let client: StdioMcpClient;
  let runFiles: string;

  beforeAll(async () => {
    const fileRoot = process.env.ATLASSIAN_FILE_ROOT ?? join(tmpdir(), "atlassian-mcp-file-root");
    runFiles = join(fileRoot, `mcp-ba-${runId}`);
    await mkdir(runFiles, { recursive: true });

    // Create project via admin Basic REST (PAT can't create projects)
    await ensureFixture(
      fixtureRequest("bitbucket", "/rest/api/1.0/projects", {
        method: "POST",
        body: { key: PROJECT_KEY, name: `B-A Test ${runId}` }
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

    // Push README to REPO1 for files.raw / archive.list
    await pushBitbucketBranches(PROJECT_KEY, REPO1, runId);

    // Start MCP client (PAT Bearer — covers all project/repo-level ops)
    client = await StdioMcpClient.start("bitbucket", ["--exposure-tier=max"]);
  }, 120_000);

  afterAll(async () => {
    // Close MCP client first
    try {
      await client?.close();
    } catch {
      /* best-effort */
    }

    // Delete repo first (202 → poll 404), then project (no cascade)
    for (const slug of [REPO1]) {
      try {
        const del = await fixtureRequest(
          "bitbucket",
          `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${slug}`,
          { method: "DELETE" }
        );
        // Accept 202 (scheduled for deletion) or 404 (already gone)
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
  // 1. projects CRUD (5 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("projects CRUD", () => {
    it("list, get, update, create (Basic admin), and delete", async () => {
      // projects.list — paginated; requireToolSuccess verifies success
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.projects.list",
          responseProfile: "standard"
        })
      );

      // projects.get
      const get = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.projects.get",
          path: { projectKey: PROJECT_KEY }
        })
      );
      const gotKey = projectedValue(get.data, "key") as string;
      expect(gotKey, JSON.stringify(get)).toBe(PROJECT_KEY);

      // projects.update — rename project
      const updatedName = `B-A Test ${runId} Updated`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.projects.update",
          path: { projectKey: PROJECT_KEY },
          body: { name: updatedName }
        })
      );
      // Read back and assert the rename took effect
      const getUpdated = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.projects.get",
          path: { projectKey: PROJECT_KEY }
        })
      );
      expect(containsValue(getUpdated.data, updatedName), JSON.stringify(getUpdated)).toBe(true);

      // projects.create — Basic admin client (PAT ceiling: 401 on project creation)
      const basicClient = await StdioMcpClient.start(
        "bitbucket",
        ["--exposure-tier=max"],
        adminBasicCredentials()
      );
      const createKey = `MCPCR${runId.slice(0, 3)}`.toUpperCase();
      try {
        const created = requireToolSuccess(
          await basicClient.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.projects.create",
            body: { key: createKey, name: `B-A Created ${runId}` }
          })
        );
        const createdKey = projectedValue(created.data, "key") as string;
        expect(createdKey, JSON.stringify(created)).toBe(createKey);
        recordCleanup("bitbucket", "project", createKey, "created");

        // projects.delete — delete the created project
        requireToolSuccess(
          await basicClient.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.projects.delete",
            path: { projectKey: createKey }
          })
        );
        recordCleanup("bitbucket", "project", createKey, "cleaned");
        // Verify deleted
        const getDeleted = await basicClient.callTool(
          "atlassian_execute_operation",
          {
            operationId: "bitbucket.projects.get",
            path: { projectKey: createKey }
          },
          { expectError: true }
        );
        expect(getDeleted.isError, "project should be deleted").toBe(true);
      } finally {
        // Cleanup: delete if still exists
        try {
          await fixtureRequest("bitbucket", `/rest/api/1.0/projects/${createKey}`, {
            method: "DELETE"
          });
        } catch {
          /* already gone */
        }
        await basicClient.close();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. repositories CRUD (5 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("repositories CRUD", () => {
    it("list, get, create, update, delete", async () => {
      // repositories.list — paginated; requireToolSuccess verifies success
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repositories.list",
          responseProfile: "standard",
          path: { projectKey: PROJECT_KEY }
        })
      );

      // repositories.get
      const get = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repositories.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
        })
      );
      const gotSlug = projectedValue(get.data, "slug") as string;
      expect(gotSlug).toBe(REPO1);

      // repositories.create
      const newRepo = `tmp-repo-${runId.slice(0, 4)}`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repositories.create",
          path: { projectKey: PROJECT_KEY },
          body: { name: newRepo, scmId: "git" }
        })
      );
      recordCleanup("bitbucket", "repo", `${PROJECT_KEY}/${newRepo}`, "created");

      // repositories.update — Bitbucket derives slug from name when only
      // "name" is passed. Extract the new canonical slug from the response
      // to avoid 307 redirects (MCP client does not follow redirects).
      const renamedSlug = `${newRepo}-renamed`;
      const updated = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repositories.update",
          path: { projectKey: PROJECT_KEY, repositorySlug: newRepo },
          body: { name: renamedSlug }
        })
      );
      // Bitbucket may return the new slug in the response; fall back to
      // renamedSlug if not present.
      const canonicalSlug = (projectedValue(updated.data, "slug") as string) || renamedSlug;

      // Read back — verify rename took effect via the canonical slug
      const getRenamed = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repositories.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: canonicalSlug }
        })
      );
      expect(containsValue(getRenamed.data, renamedSlug), JSON.stringify(getRenamed)).toBe(true);

      // repositories.delete — use the canonical slug from the response
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repositories.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: canonicalSlug }
        })
      );
      // Delete returns 202 — verify the repo is gone (GET → 404)
      await pollUntil(
        async () =>
          client.callTool(
            "atlassian_execute_operation",
            {
              operationId: "bitbucket.repositories.get",
              path: { projectKey: PROJECT_KEY, repositorySlug: canonicalSlug }
            },
            { expectError: true }
          ),
        (r) => r.isError === true,
        { timeoutMs: 30000, intervalMs: 2000 }
      );
      // Fallback cleanup (best-effort)
      try {
        await fixtureRequest(
          "bitbucket",
          `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${canonicalSlug}`,
          { method: "DELETE" }
        );
      } catch {
        /* might not exist */
      }
      try {
        await fixtureRequest(
          "bitbucket",
          `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${newRepo}`,
          { method: "DELETE" }
        );
      } catch {
        /* might not exist */
      }
      recordCleanup("bitbucket", "repo", `${PROJECT_KEY}/${newRepo}`, "cleaned");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. project settings (auto-merge, auto-decline, change-author, hooks, pull-requests, settings-restriction, default-branch)
  // ═══════════════════════════════════════════════════════════════
  describe("project settings", () => {
    it("auto-merge list / update / delete (withRestoredState)", async () => {
      // Capture the original config before mutating so the restore callback
      // puts back the exact value (not a hardcoded one)
      const original = await (async () => {
        const r = await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.settings.auto-merge.list",
          path: { projectKey: PROJECT_KEY }
        });
        return r.isError ? null : ((r.structuredContent as any)?.data ?? r.structuredContent);
      })();

      await withRestoredState(
        async () => original,
        async (_orig) => {
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.project.settings.auto-merge.delete",
            path: { projectKey: PROJECT_KEY }
          });
        },
        async () => {
          // Mutate: enable auto-merge
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.settings.auto-merge.update",
              path: { projectKey: PROJECT_KEY },
              body: { enabled: true, restrictionAction: "NONE" }
            })
          );
          // Read back
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.settings.auto-merge.list",
              path: { projectKey: PROJECT_KEY }
            })
          );
          // DELETE
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.settings.auto-merge.delete",
              path: { projectKey: PROJECT_KEY }
            })
          );
        }
      );
    });

    it("auto-decline list / update → read back → delete", async () => {
      await withRestoredState(
        async () => {
          const r = await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.project.settings.auto-decline.list",
            path: { projectKey: PROJECT_KEY }
          });
          return r.isError ? null : (r.structuredContent as any)?.data;
        },
        async () => {
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.project.settings.auto-decline.delete",
            path: { projectKey: PROJECT_KEY }
          });
        },
        async () => {
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.settings.auto-decline.update",
              path: { projectKey: PROJECT_KEY },
              body: { enabled: true, inactivityWeeks: 4 }
            })
          );
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.settings.auto-decline.list",
              path: { projectKey: PROJECT_KEY }
            })
          );
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.settings.auto-decline.delete",
              path: { projectKey: PROJECT_KEY }
            })
          );
        }
      );
    });

    it("change-author list / update → read back → delete", async () => {
      await withRestoredState(
        async () => {
          const r = await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.project.settings.change-author.list",
            path: { projectKey: PROJECT_KEY }
          });
          return r.isError ? null : (r.structuredContent as any)?.data;
        },
        async () => {
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.project.settings.change-author.delete",
            path: { projectKey: PROJECT_KEY }
          });
        },
        async () => {
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.settings.change-author.update",
              path: { projectKey: PROJECT_KEY },
              body: { enabled: true, restrictionAction: "NONE" }
            })
          );
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.settings.change-author.list",
              path: { projectKey: PROJECT_KEY }
            })
          );
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.settings.change-author.delete",
              path: { projectKey: PROJECT_KEY }
            })
          );
        }
      );
    });

    it("hooks lifecycle: list → get → settings get → settings update → enabled toggle → enabled delete", async () => {
      // hooks.list — discover available hooks; use bundled hook key as fallback
      const list = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.settings.hooks.list",
          path: { projectKey: PROJECT_KEY }
        })
      );
      const hooks = (list.data as any)?.values ?? [];
      const hookKey =
        hooks.length > 0
          ? (hooks[0].details?.key as string)
          : "com.atlassian.bitbucket.server.bitbucket-bundled-hooks:force-push-hook";

      // hooks.get
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.settings.hooks.get",
          path: { projectKey: PROJECT_KEY, hookKey }
        })
      );

      // hooks.settings.get
      const settingsGet = await client.callTool("atlassian_execute_operation", {
        operationId: "bitbucket.project.settings.hooks.settings.get",
        path: { projectKey: PROJECT_KEY, hookKey }
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
              operationId: "bitbucket.project.settings.hooks.settings.update",
              path: { projectKey: PROJECT_KEY, hookKey },
              body: original
            });
          }
        },
        async () => {
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.settings.hooks.settings.update",
              path: { projectKey: PROJECT_KEY, hookKey },
              body: { stringValue: `B-A test ${runId}` }
            })
          );
        }
      );

      // hooks.enabled.update → hooks.enabled.delete (toggle), verify via re-list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.settings.hooks.enabled.update",
          path: { projectKey: PROJECT_KEY, hookKey }
        })
      );
      // Read back — hook should now appear in the enabled list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.settings.hooks.list",
          path: { projectKey: PROJECT_KEY }
        })
      );
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.settings.hooks.enabled.delete",
          path: { projectKey: PROJECT_KEY, hookKey }
        })
      );
    });

    it("pull-requests scm: get → create → read back → restore", async () => {
      const scmId = "git";
      // pull-requests.get — verify it returns valid data
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.settings.pull-requests.get",
          path: { projectKey: PROJECT_KEY, scmId }
        })
      );

      // pull-requests.create with withRestoredState — the API is idempotent
      // (POST overwrites the SCM config). Save original, mutate, read back, restore.
      await withRestoredState(
        async () => {
          const r = await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.project.settings.pull-requests.get",
            path: { projectKey: PROJECT_KEY, scmId }
          });
          return r.isError ? null : ((r.structuredContent as any)?.data ?? null);
        },
        async (original) => {
          if (original) {
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.settings.pull-requests.create",
              path: { projectKey: PROJECT_KEY, scmId },
              body: original
            });
          }
        },
        async () => {
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.settings.pull-requests.create",
              path: { projectKey: PROJECT_KEY, scmId },
              body: {
                mergeConfig: { defaultStrategy: { id: "no-ff" }, strategies: [{ id: "no-ff" }] }
              }
            })
          );
          // Read back to verify the change took effect
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.settings.pull-requests.get",
              path: { projectKey: PROJECT_KEY, scmId }
            })
          );
        }
      );
    });

    it("settings-restriction: list → create → list → all.list → delete → list", async () => {
      // create 前 — 基线不存在 restriction
      const before = await client.callTool(
        "atlassian_execute_operation",
        {
          operationId: "bitbucket.project.settings-restriction.list",
          path: { projectKey: PROJECT_KEY },
          query: { namespace: "branch-permissions", featureKey: "force-push", componentKey: "git" }
        },
        { expectError: true }
      );
      expect(before.isError, "no restriction should exist yet").toBe(true);

      // create restriction
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.settings-restriction.create",
          path: { projectKey: PROJECT_KEY },
          body: { namespace: "branch-permissions", featureKey: "force-push", componentKey: "git" }
        })
      );

      // create 后 list — 必须返回 restriction。
      // Bitbucket DC 10.4.1: GET settings-restriction 必须带 componentKey
      // 才能定位 restriction，不带时无论是否存在都返回 404（直连 REST 实测确认）。
      const after = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.settings-restriction.list",
          path: { projectKey: PROJECT_KEY },
          query: { namespace: "branch-permissions", featureKey: "force-push", componentKey: "git" },
          responseProfile: "standard"
        })
      );
      expect(containsValue(after.data, "force-push"), JSON.stringify(after)).toBe(true);

      // all.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.settings-restriction.all.list",
          path: { projectKey: PROJECT_KEY },
          query: { namespace: "branch-permissions", featureKey: "force-push" }
        })
      );

      // delete — also needs componentKey to target the restriction
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.settings-restriction.delete",
          path: { projectKey: PROJECT_KEY },
          query: { namespace: "branch-permissions", featureKey: "force-push", componentKey: "git" }
        })
      );

      // delete 后 list — 应返回 404（restriction 已删）
      const afterDel = await client.callTool(
        "atlassian_execute_operation",
        {
          operationId: "bitbucket.project.settings-restriction.list",
          path: { projectKey: PROJECT_KEY },
          query: { namespace: "branch-permissions", featureKey: "force-push", componentKey: "git" }
        },
        { expectError: true }
      );
      expect(afterDel.isError, "restriction should be gone after delete").toBe(true);
    });

    it("default-branch: get → update → read back → restore", async () => {
      // The fixture pushed `main` (default) and `feature/${runId}`.
      // Switch default branch to feature/${runId}, verify, then restore to original.
      await withRestoredState(
        async () => {
          const r = await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.project.repos.default-branch.list",
            path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
          });
          return r.isError
            ? "main"
            : (projectedValue((r.structuredContent as any)?.data, "displayId") ?? "main");
        },
        async (original) => {
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.project.repos.default-branch.update",
            path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
            body: { id: `refs/heads/${original}` }
          });
        },
        async () => {
          // Mutate: switch to feature/${runId}
          const targetBranch = `feature/${runId}`;
          requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.repos.default-branch.update",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
              body: { id: `refs/heads/${targetBranch}` }
            })
          );
          // Read back and verify the switch took effect.
          // Use standard profile so displayId is not omitted by compact truncation.
          const after = requireToolSuccess(
            await client.callTool("atlassian_execute_operation", {
              operationId: "bitbucket.project.repos.default-branch.list",
              path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
              responseProfile: "standard"
            })
          );
          expect(containsValue(after.data, targetBranch), JSON.stringify(after)).toBe(true);
        }
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. project permissions (12 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("project permissions", () => {
    it("user permission lifecycle: grant → list → revoke → verify gone", async () => {
      // Grant
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.permissions.users.update",
          path: { projectKey: PROJECT_KEY },
          query: { name: REVIEWER_USER, permission: "PROJECT_WRITE" }
        })
      );
      // List — must contain the granted user
      const list = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permissions.users",
          path: { projectKey: PROJECT_KEY },
          responseProfile: "standard"
        })
      );
      expect(containsValue(list.data, REVIEWER_USER), JSON.stringify(list)).toBe(true);
      // search.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.permissions.search.list",
          path: { projectKey: PROJECT_KEY },
          query: { filter: REVIEWER_USER }
        })
      );
      // Revoke
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.permissions.users.delete",
          path: { projectKey: PROJECT_KEY },
          query: { name: REVIEWER_USER }
        })
      );
      // List — must NOT contain the revoked user
      const after = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permissions.users",
          path: { projectKey: PROJECT_KEY },
          responseProfile: "standard"
        })
      );
      expect(containsValue(after.data, REVIEWER_USER), JSON.stringify(after)).toBe(false);
      // users.none.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.permissions.users.none.list",
          path: { projectKey: PROJECT_KEY },
          responseProfile: "standard"
        })
      );
    });

    it("group permission lifecycle: grant → list → revoke → verify gone", async () => {
      // Grant
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.permissions.groups.update",
          path: { projectKey: PROJECT_KEY },
          query: { name: REVIEWER_GROUP, permission: "PROJECT_READ" }
        })
      );
      // List — must contain the granted group
      const list = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.permissions.groups.list",
          path: { projectKey: PROJECT_KEY },
          responseProfile: "standard"
        })
      );
      expect(containsValue(list.data, REVIEWER_GROUP), JSON.stringify(list)).toBe(true);
      // groups.none.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.permissions.groups.none.list",
          path: { projectKey: PROJECT_KEY },
          responseProfile: "standard"
        })
      );
      // Revoke
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.permissions.groups.delete",
          path: { projectKey: PROJECT_KEY },
          query: { name: REVIEWER_GROUP }
        })
      );
      // List — must NOT contain the revoked group
      const after = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.permissions.groups.list",
          path: { projectKey: PROJECT_KEY },
          responseProfile: "standard"
        })
      );
      expect(containsValue(after.data, REVIEWER_GROUP), JSON.stringify(after)).toBe(false);
    });

    it("all permission: create → list → delete", async () => {
      // Grant PROJECT_READ to all authenticated users
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.permissions.all.create",
          path: { projectKey: PROJECT_KEY, permission: "PROJECT_READ" },
          query: { allow: "true" }
        })
      );
      // List — verify the all-users permission configuration is present.
      // Bitbucket returns a config object (possibly empty) rather than a
      // permission-name list; requireToolSuccess already confirms 2xx.
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.permissions.all.list",
          path: { projectKey: PROJECT_KEY, permission: "PROJECT_READ" }
        })
      );
      // permissions.delete — first grant REVIEWER_USER PROJECT_READ so the
      // delete has a real permission to revoke (not "delete air").
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.permissions.users.update",
          path: { projectKey: PROJECT_KEY },
          query: { name: REVIEWER_USER, permission: "PROJECT_READ" }
        })
      );
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.permissions.delete",
          path: { projectKey: PROJECT_KEY },
          query: { user: REVIEWER_USER }
        })
      );
      // Verify the delete took effect — REVIEWER_USER must not appear in the
      // permissions users list.
      const afterDel = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permissions.users",
          path: { projectKey: PROJECT_KEY },
          responseProfile: "standard"
        })
      );
      expect(containsValue(afterDel.data, REVIEWER_USER), JSON.stringify(afterDel)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. permission-management (10 ops — repo-level)
  // ═══════════════════════════════════════════════════════════════
  describe("permission-management (repo-level)", () => {
    it("repo user permission: grant → list → revoke → verify gone", async () => {
      // Grant
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permission-management.projects.repos.users.update",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { name: REVIEWER_USER, permission: "REPO_WRITE" }
        })
      );
      // List
      const list = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permission-management.projects.repos.users.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );
      expect(containsValue(list.data, REVIEWER_USER), JSON.stringify(list)).toBe(true);
      // search.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permission-management.projects.repos.search.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { filter: REVIEWER_USER }
        })
      );
      // Revoke
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permission-management.projects.repos.users.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { name: REVIEWER_USER }
        })
      );
      // List after revoke
      const after = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permission-management.projects.repos.users.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );
      expect(containsValue(after.data, REVIEWER_USER), JSON.stringify(after)).toBe(false);
      // users.none.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permission-management.projects.repos.users.none.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );
    });

    it("repo group permission: grant → list → revoke → verify gone", async () => {
      // Grant
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permission-management.projects.repos.groups.update",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { name: REVIEWER_GROUP, permission: "REPO_READ" }
        })
      );
      // List
      const list = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permission-management.projects.repos.groups.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );
      expect(containsValue(list.data, REVIEWER_GROUP), JSON.stringify(list)).toBe(true);
      // Revoke
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permission-management.projects.repos.groups.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { name: REVIEWER_GROUP }
        })
      );
      // List after revoke
      const after = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permission-management.projects.repos.groups.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );
      expect(containsValue(after.data, REVIEWER_GROUP), JSON.stringify(after)).toBe(false);
      // groups.none.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permission-management.projects.repos.groups.none.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );
      // projects.repos.delete — revoke all repo permissions for user
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.permission-management.projects.repos.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { user: REVIEWER_USER }
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. access-tokens (10 ops — Basic admin client)
  // ═══════════════════════════════════════════════════════════════
  describe("access-tokens", () => {
    let adminClient: StdioMcpClient;

    beforeAll(async () => {
      adminClient = await StdioMcpClient.start(
        "bitbucket",
        ["--exposure-tier=max"],
        adminBasicCredentials()
      );
    });

    afterAll(async () => {
      try {
        await adminClient?.close();
      } catch {
        /* best-effort */
      }
    });

    it("project-level token lifecycle", async () => {
      // PUT create
      const created = requireToolSuccess(
        await adminClient.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.access-tokens.projects.create",
          path: { projectKey: PROJECT_KEY },
          body: { name: `b-a-proj-${runId.slice(0, 4)}`, permissions: ["REPO_READ"] }
        })
      );
      const tokenId = projectedValue(created.data, "id") as string;
      expect(tokenId).toBeTruthy();
      // projects.get — list
      requireToolSuccess(
        await adminClient.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.access-tokens.projects.get",
          path: { projectKey: PROJECT_KEY },
          responseProfile: "standard"
        })
      );
      // projects.get.projectkey
      requireToolSuccess(
        await adminClient.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.access-tokens.projects.get.projectkey",
          path: { projectKey: PROJECT_KEY, tokenId }
        })
      );
      // POST update
      requireToolSuccess(
        await adminClient.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.access-tokens.projects.update",
          path: { projectKey: PROJECT_KEY, tokenId },
          body: { name: `b-a-proj-${runId.slice(0, 4)}-renamed`, permissions: ["REPO_READ"] }
        })
      );
      // DELETE
      requireToolSuccess(
        await adminClient.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.access-tokens.projects.delete",
          path: { projectKey: PROJECT_KEY, tokenId }
        })
      );
      // Verify 404
      const after = await adminClient.callTool(
        "atlassian_execute_operation",
        {
          operationId: "bitbucket.access-tokens.projects.get.projectkey",
          path: { projectKey: PROJECT_KEY, tokenId }
        },
        { expectError: true }
      );
      expect(after.isError, "deleted token should not be retrievable").toBe(true);
    });

    it("repo-level token lifecycle", async () => {
      // PUT create
      const created = requireToolSuccess(
        await adminClient.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.access-tokens.projects.repos.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          body: { name: `b-a-repo-${runId.slice(0, 4)}`, permissions: ["REPO_READ"] }
        })
      );
      const tokenId = projectedValue(created.data, "id") as string;
      expect(tokenId).toBeTruthy();
      // repos.get — list
      requireToolSuccess(
        await adminClient.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.access-tokens.projects.repos.get",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          responseProfile: "standard"
        })
      );
      // repos.get.projectkey
      requireToolSuccess(
        await adminClient.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.access-tokens.projects.repos.get.projectkey",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, tokenId }
        })
      );
      // repos.update
      requireToolSuccess(
        await adminClient.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.access-tokens.projects.repos.update",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, tokenId },
          body: { name: `b-a-repo-${runId.slice(0, 4)}-renamed`, permissions: ["REPO_READ"] }
        })
      );
      // repos.delete
      requireToolSuccess(
        await adminClient.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.access-tokens.projects.repos.delete",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, tokenId }
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. project webhooks (11 ops)
  // ═══════════════════════════════════════════════════════════════
  describe("project webhooks", () => {
    it("webhook lifecycle", async () => {
      const webhookUrl = `http://webhook-sink:8026/mcpba-${runId}`;
      // create
      const created = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.webhooks.create",
          path: { projectKey: PROJECT_KEY },
          body: {
            name: `B-A Webhook ${runId}`,
            url: webhookUrl,
            events: ["repo:refs_changed"],
            active: true
          }
        })
      );
      const webhookId = projectedValue(created.data, "id") as number;
      expect(webhookId).toBeTruthy();
      // get
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.webhooks.get",
          path: { projectKey: PROJECT_KEY, webhookId }
        })
      );
      // list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.webhooks.list",
          path: { projectKey: PROJECT_KEY },
          responseProfile: "standard"
        })
      );
      // update
      const updatedName = `B-A Webhook ${runId} Upd`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.webhooks.update",
          path: { projectKey: PROJECT_KEY, webhookId },
          body: { name: updatedName, url: webhookUrl, events: ["repo:refs_changed"], active: true }
        })
      );
      // Read back — verify name changed
      const getUpdated = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.webhooks.get",
          path: { projectKey: PROJECT_KEY, webhookId }
        })
      );
      expect(containsValue(getUpdated.data, updatedName), JSON.stringify(getUpdated)).toBe(true);
      // test.create — Bitbucket DC 10.4.1 服务端 bug：带 webhookId 调用恒 500
      // （直连 REST 复核确认）；带 url 参数变体返回 200。两种变体都覆盖。
      await client.callTool(
        "atlassian_execute_operation",
        {
          operationId: "bitbucket.project.webhooks.test.create",
          path: { projectKey: PROJECT_KEY },
          query: { webhookId: String(webhookId) },
          body: {}
        },
        { expectError: true }
      );
      // url 变体 — 不带 webhookId，端点返回 200 + request 回显
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.webhooks.test.create",
          path: { projectKey: PROJECT_KEY },
          query: { url: webhookUrl },
          body: {}
        })
      );
      // latest.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.webhooks.latest.list",
          path: { projectKey: PROJECT_KEY, webhookId }
        })
      );
      // statistics.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.webhooks.statistics.list",
          path: { projectKey: PROJECT_KEY, webhookId }
        })
      );
      // statistics.summary.get
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.webhooks.statistics.summary.get",
          path: { projectKey: PROJECT_KEY, webhookId }
        })
      );
      // delete
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.webhooks.delete",
          path: { projectKey: PROJECT_KEY, webhookId }
        })
      );
      // Verify deleted — GET should return 404
      const afterDel = await client.callTool(
        "atlassian_execute_operation",
        {
          operationId: "bitbucket.project.webhooks.get",
          path: { projectKey: PROJECT_KEY, webhookId }
        },
        { expectError: true }
      );
      expect(afterDel.isError, "webhook should not be retrievable after delete").toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. avatar + misc repo ops + binary lifecycle
  // ═══════════════════════════════════════════════════════════════
  describe("avatar and misc repo ops", () => {
    it("avatar-png lifecycle", async () => {
      const avatarPath = join(runFiles, "avatar.png");
      await writeFile(avatarPath, buildAvatarPng());
      const fileSize = buildAvatarPng().length;
      // create — multipart POST
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.avatar-png.create",
          path: { projectKey: PROJECT_KEY },
          query: { filename: "avatar.png", size: String(fileSize) },
          body: { files: [avatarPath] }
        })
      );
      // list — binary GET via downloadPath
      const avatarDownload = join(runFiles, "avatar-result.png");
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.avatar-png.list",
          path: { projectKey: PROJECT_KEY },
          downloadPath: avatarDownload
        })
      );
      // PNG magic byte assertion
      const bytes = readFileSync(avatarDownload);
      expect(bytes[0]).toBe(137);
      expect(bytes[1]).toBe(80);
      expect(bytes[2]).toBe(78);
      expect(bytes[3]).toBe(71);
    });

    it("misc repo reads: contributing, readme, related, recreate, forks", async () => {
      // contributing.list — CONTRIBUTING.md was pushed in the fixture
      const contrib = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.repos.contributing.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
        })
      );
      expect(containsValue(contrib.data, "Contributing"), JSON.stringify(contrib)).toBe(true);
      // readme.list — README.md was pushed, must succeed and contain runId
      const readme = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.repos.readme.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
        })
      );
      expect(containsValue(readme.data, runId), JSON.stringify(readme)).toBe(true);
      // related.list
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.repos.related.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
        })
      );
      // repos.create = FORK
      const forkSlug = `fork-${runId.slice(0, 4)}`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.repos.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          body: { name: forkSlug, project: { key: PROJECT_KEY } }
        })
      );
      recordCleanup("bitbucket", "repo", `${PROJECT_KEY}/${forkSlug}`, "created");
      try {
        // forks.list — after fork, assert fork slug appears
        const forks = requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "bitbucket.project.repos.forks.list",
            path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
          })
        );
        expect(containsValue(forks.data, forkSlug), JSON.stringify(forks)).toBe(true);
      } finally {
        try {
          await fixtureRequest(
            "bitbucket",
            `/rest/api/1.0/projects/${PROJECT_KEY}/repos/${forkSlug}`,
            { method: "DELETE" }
          );
          recordCleanup("bitbucket", "repo", `${PROJECT_KEY}/${forkSlug}`, "cleaned");
        } catch (error) {
          recordCleanup("bitbucket", "repo", `${PROJECT_KEY}/${forkSlug}`, "cleanup-failed", {
            error
          });
        }
      }
      // recreate.create — re-enables a repo. On a healthy repo this is a
      // no-op and returns 200. Exercise the op and verify it succeeds.
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.project.repos.recreate.create",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 }
        })
      );
    });

    it("binary lifecycle: files.raw + archive.list", async () => {
      // files.raw — download README.md
      const rawPath = join(runFiles, "raw-readme.md");
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.files.raw",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1, filePath: "README.md" },
          downloadPath: rawPath
        })
      );
      const rawContent = readFileSync(rawPath, "utf8");
      expect(rawContent.includes(runId), "files.raw should contain runId").toBe(true);
      // archive.list — download tgz
      const archivePath = join(runFiles, "repo-archive.tar.gz");
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.repository.projects.repos.archive.list",
          path: { projectKey: PROJECT_KEY, repositorySlug: REPO1 },
          query: { format: "tgz" },
          downloadPath: archivePath
        })
      );
      const archiveStat = await stat(archivePath);
      expect(archiveStat.size, "archive should be non-empty").toBeGreaterThan(0);
    });

    it("server.info — instance version", async () => {
      const info = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "bitbucket.server.info",
          responseProfile: "standard"
        })
      );
      const version = projectedValue(info.data, "version");
      expect(typeof version, JSON.stringify(info)).toBe("string");
      expect(String(version).length, JSON.stringify(info)).toBeGreaterThan(0);
    });
  });
});
