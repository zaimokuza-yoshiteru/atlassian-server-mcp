import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordCleanup } from "../support/cleanup-journal.js";
import { StdioMcpClient, requireToolSuccess } from "../support/mcp-client.js";
import { pollUntil } from "../support/poll.js";
import {
  adminBasicCredentials,
  containsValue,
  createDisposableUser,
  deleteDisposableUser,
  ensureFixture,
  fixtureRequest,
  projectedValue,
  projectedValues
} from "../support/rest-fixture.js";

const active = process.env.E2E_PRODUCT === "confluence" ? describe : describe.skip;

// ── confluence-content-collaboration (C-A) ──
// 43 ops: content read surface (12), properties & derived (14),
// attachments / watch / users (17).

active("confluence-content-collaboration", () => {
  const runId = randomUUID().slice(0, 8);
  const spaceKey = process.env.E2E_CONFLUENCE_SPACE_KEY ?? "MCP";
  const fileRoot = process.env.ATLASSIAN_FILE_ROOT!;
  const runFiles = join(fileRoot, runId);
  let client: StdioMcpClient;
  let parentPageId: string;
  let childPageId: string;

  beforeAll(async () => {
    await mkdir(runFiles, { recursive: true });
    await ensureFixture(
      fixtureRequest("confluence", "/rest/api/space", {
        method: "POST",
        body: { key: spaceKey, name: "MCP E2E" }
      }),
      [200, 201, 400, 403, 409]
    );

    client = await StdioMcpClient.start("confluence", ["--exposure-tier=max"]);

    // Create parent page (includes a TOC macro for history.macro.id.get probe)
    const parentTitle = `C-A Parent ${runId}`;
    const parentCreated = requireToolSuccess(
      await client.callTool("confluence_create_content", {
        content: {
          type: "page",
          title: parentTitle,
          space: { key: spaceKey },
          body: {
            storage: {
              value: `<p>Parent page ${runId}</p><ac:structured-macro ac:name="toc" ac:schema-version="1"><ac:parameter ac:name="maxLevel">3</ac:parameter></ac:structured-macro>`,
              representation: "storage"
            }
          }
        }
      })
    );
    parentPageId = String(projectedValue(parentCreated.data, "id"));
    expect(parentPageId, JSON.stringify(parentCreated)).toBeTruthy();
    recordCleanup("confluence", "content", parentPageId, "created");

    // Create child page under parent
    const childTitle = `C-A Child ${runId}`;
    const childCreated = requireToolSuccess(
      await client.callTool("confluence_create_content", {
        content: {
          type: "page",
          title: childTitle,
          space: { key: spaceKey },
          ancestors: [{ id: parentPageId }],
          body: {
            storage: {
              value: `<p>Child page ${runId}</p>`,
              representation: "storage"
            }
          }
        }
      })
    );
    childPageId = String(projectedValue(childCreated.data, "id"));
    expect(childPageId, JSON.stringify(childCreated)).toBeTruthy();
    recordCleanup("confluence", "content", childPageId, "created");

    // Add footer comment to parent page
    const commentCreated = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content.create",
        body: {
          type: "comment",
          container: { id: parentPageId, type: "page" },
          body: {
            storage: {
              value: `<p>Footer comment ${runId}</p>`,
              representation: "storage"
            }
          }
        }
      })
    );
    const commentIdVal = String(projectedValue(commentCreated.data, "id"));
    expect(commentIdVal, JSON.stringify(commentCreated)).toBeTruthy();
    recordCleanup("confluence", "content", commentIdVal, "created");
  }, 60_000);

  afterAll(async () => {
    // Delete children first, then parent
    for (const id of [childPageId, parentPageId]) {
      if (id) {
        try {
          await fixtureRequest("confluence", `/rest/api/content/${id}`, {
            method: "DELETE"
          });
          recordCleanup("confluence", "content", id, "cleaned");
        } catch (error) {
          recordCleanup("confluence", "content", id, "cleanup-failed", {
            error: error
          });
        }
      }
    }
    if (client) await client.close();
    await rm(runFiles, { recursive: true, force: true });
  });

  // ── it 1: content read surface (12 ops: 4.1) ──

  it("content read surface", async () => {
    // content.children.list — $fragment encoding hides inline content; verify via
    // pagination metadata (page.returned) rather than specific IDs.
    const children = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content.children.list",
        path: { contentId: parentPageId },
        responseProfile: "standard"
      })
    );
    expect(
      (children as any).page?.returned ?? 0,
      JSON.stringify(children).slice(0, 500)
    ).toBeGreaterThanOrEqual(1);

    // content.comments.list — body.storage not expanded by default; verify
    // via pagination metadata rather than comment body content.
    const comments = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content.comments.list",
        path: { contentId: parentPageId },
        responseProfile: "standard"
      })
    );
    expect(
      (comments as any).page?.returned ?? 0,
      JSON.stringify(comments).slice(0, 500)
    ).toBeGreaterThanOrEqual(1);

    // content.list — filter by spaceKey + title
    const list = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content.list",
        query: { spaceKey, title: `C-A Parent ${runId}` },
        responseProfile: "standard"
      })
    );
    expect(
      containsValue(list.data, `C-A Parent ${runId}`),
      JSON.stringify(list.data).slice(0, 500)
    ).toBe(true);

    // content.history
    const history = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content.history",
        path: { contentId: parentPageId },
        responseProfile: "standard"
      })
    );
    expect(projectedValue(history.data, "latest")).toBe(true);

    // content.labels.add
    const labelName = `e2e-label-${runId}`;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content.labels.add",
        path: { contentId: parentPageId },
        body: [{ prefix: "global", name: labelName }]
      })
    );

    // content.labels.list
    const labels = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content.labels.list",
        path: { contentId: parentPageId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(labels.data, labelName), JSON.stringify(labels.data).slice(0, 500)).toBe(
      true
    );

    // content.labels.delete (query param variant)
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content.labels.delete",
        path: { contentId: parentPageId },
        query: { name: labelName }
      })
    );
    const labelsAfter = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content.labels.list",
        path: { contentId: parentPageId },
        responseProfile: "standard"
      })
    );
    expect(
      containsValue(labelsAfter.data, labelName),
      JSON.stringify(labelsAfter.data).slice(0, 500)
    ).toBe(false);

    // content-labels.delete (path param variant: DELETE /content/{id}/label/{label})
    const label2 = `e2e-label2-${runId}`;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content.labels.add",
        path: { contentId: parentPageId },
        body: [{ prefix: "global", name: label2 }]
      })
    );
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content-labels.delete",
        path: { id: parentPageId, label: label2 }
      })
    );

    // content.versions.list — update page to create v2, then list versions (experimental path)
    const updatedTitle = `C-A Parent ${runId} v2`;
    requireToolSuccess(
      await client.callTool("confluence_update_content", {
        contentId: parentPageId,
        content: {
          id: parentPageId,
          type: "page",
          title: updatedTitle,
          version: { number: 2 },
          body: {
            storage: {
              // TOC macro with explicit ac:macro-id — Confluence does not
              // auto-assign one for REST-created content, and without it the
              // history.macro.id.get probe below can never take its 200 path.
              value: `<p>Updated ${runId}</p><ac:structured-macro ac:name="toc" ac:schema-version="1" ac:macro-id="e2e-macro-${runId}"><ac:parameter ac:name="maxLevel">3</ac:parameter></ac:structured-macro>`,
              representation: "storage"
            }
          }
        }
      })
    );
    const versions = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content.versions.list",
        path: { id: parentPageId },
        query: { limit: 10 },
        responseProfile: "standard"
      })
    );
    expect(
      containsValue(versions.data, '"number":2'),
      JSON.stringify(versions.data).slice(0, 500)
    ).toBe(true);

    // content-version.delete — delete v1
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content-version.delete",
        path: { id: parentPageId, versionNumber: 1 }
      })
    );
    const versionsAfter = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content.versions.list",
        path: { id: parentPageId },
        query: { limit: 10 },
        responseProfile: "standard"
      })
    );
    expect(
      containsValue(versionsAfter.data, '"number":1'),
      JSON.stringify(versionsAfter.data).slice(0, 500)
    ).toBe(false);

    // content.restrictions.list
    const restrictionsList = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content.restrictions.list",
        path: { contentId: parentPageId },
        responseProfile: "standard"
      })
    );
    expect(restrictionsList.data).toBeTruthy();

    // content.restrictions.update — restrict "read" to current admin only;
    // DC requires including the current user to avoid self-lockout.
    const viewerKeyResp = await fixtureRequest("confluence", `/rest/api/user/current`);
    const viewerUserKey = (viewerKeyResp.data as any)?.userKey as string;

    try {
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.content.restrictions.update",
          path: { contentId: parentPageId },
          body: [
            {
              operation: "read",
              restrictions: {
                user: [{ userKey: viewerUserKey }]
              }
            }
          ]
        })
      );

      // Verify restriction blocks a user NOT in the whitelist.
      const { username: restrictedUser, password: restrictedPw } = await createDisposableUser(
        "confluence",
        runId
      );
      try {
        const restrictedClient = await StdioMcpClient.start(
          "confluence",
          ["--exposure-tier=safe"],
          { username: restrictedUser, password: restrictedPw }
        );
        try {
          const blockedGet = await restrictedClient.callTool(
            "confluence_get_content",
            {
              contentId: parentPageId,
              responseProfile: "standard"
            },
            { expectError: true }
          );
          expect(
            blockedGet.isError,
            `restriction should block non-whitelisted user, got: ${JSON.stringify(blockedGet).slice(0, 500)}`
          ).toBe(true);
        } finally {
          await restrictedClient.close();
        }
      } finally {
        await deleteDisposableUser("confluence", restrictedUser);
      }

      // content-restrictions.byoperation.get — during active restriction
      const byOp = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.content-restrictions.byoperation.get",
          path: { id: parentPageId, operationKey: "read" },
          responseProfile: "standard"
        })
      );
      expect(byOp.data).toBeTruthy();

      // content-restrictions.relevantviewrestrictions.list — during active restriction
      const relView = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.content-restrictions.relevantviewrestrictions.list",
          path: { id: parentPageId },
          responseProfile: "standard"
        })
      );
      expect(relView.data).toBeTruthy();
    } finally {
      // Restore: remove all restrictions. 恢复失败 = 测试失败（铁律 4）。
      // DC 10.2.11: PUT with empty user/group lists clears restrictions;
      // empty array [] returns an error.
      const restoreResp = await fixtureRequest(
        "confluence",
        `/rest/api/content/${parentPageId}/restriction`,
        {
          method: "PUT",
          body: [
            { operation: "read", restrictions: { user: [], group: [] } },
            { operation: "update", restrictions: { user: [], group: [] } }
          ]
        }
      );
      expect(
        restoreResp.status,
        `restriction restore failed: ${restoreResp.status} ${restoreResp.text?.slice(0, 200)}`
      ).toBe(200);
    }
  });

  // ── it 2: properties & derived (14 ops: 4.2) ──

  it("properties and derived", async () => {
    const propKey = `e2e-prop-${runId}`;
    const propValue = { score: 42, note: runId };

    // content-property.create (POST /content/{id}/property with body containing key)
    const created = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content-property.create",
        path: { id: parentPageId },
        body: { key: propKey, value: propValue }
      })
    );
    expect(containsValue(created.data, propKey), JSON.stringify(created)).toBe(true);

    // content-property.get
    const propGet = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content-property.get",
        path: { id: parentPageId, key: propKey },
        responseProfile: "standard"
      })
    );
    expect(containsValue(propGet.data, propKey), JSON.stringify(propGet).slice(0, 500)).toBe(true);

    // content-property.list
    const propList = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content-property.list",
        path: { id: parentPageId },
        responseProfile: "standard"
      })
    );
    expect(containsValue(propList.data, propKey), JSON.stringify(propList.data).slice(0, 500)).toBe(
      true
    );

    // content-property.update — body must include id + version.number (upsert
    // semantics: version.number=1 creates if absent). GET current state via
    // fixture REST (MCP response uses $fragment which hides id/version fields),
    // then PUT through MCP with id + version.number = currentVersion + 1.
    const updatedValue = { score: 99, note: `updated-${runId}` };
    const propCurrentResp = await fixtureRequest(
      "confluence",
      `/rest/api/content/${parentPageId}/property/${propKey}?expand=version`
    );
    const propId = (propCurrentResp.data as any)?.id as string;
    const currentVersion = (propCurrentResp.data as any)?.version?.number ?? 1;
    expect(propId, JSON.stringify(propCurrentResp)).toBeTruthy();
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content-property.update",
        path: { id: parentPageId, key: propKey },
        body: {
          id: propId,
          value: updatedValue,
          version: { number: currentVersion + 1 }
        }
      })
    );

    // content-property.delete
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content-property.delete",
        path: { id: parentPageId, key: propKey }
      })
    );
    const propGone = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "confluence.content-property.get",
        path: { id: parentPageId, key: propKey }
      },
      { expectError: true }
    );
    expect(propGone.isError, JSON.stringify(propGone)).toBe(true);

    // content-property.create.id (POST /content/{id}/property/{key} with body containing value)
    const propKey2 = `e2e-prop2-${runId}`;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content-property.create.id",
        path: { id: parentPageId, key: propKey2 },
        body: { value: propValue }
      })
    );
    // Clean up
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content-property.delete",
        path: { id: parentPageId, key: propKey2 }
      })
    );

    // content-descendant.list
    const descendants = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content-descendant.list",
        path: { id: parentPageId },
        responseProfile: "standard"
      })
    );
    expect(descendants.data).toBeTruthy();

    // content-descendant.get — spec: only type=comment is supported
    // ("Currently the only supported descendants are comment descendants
    // of non-comment Content").  Fixture has a footer comment on the
    // parent page from beforeAll.
    const descPageResult = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content-descendant.get",
        path: { id: parentPageId, type: "comment" },
        responseProfile: "standard"
      })
    );
    expect(
      (descPageResult as any).page?.returned ?? 0,
      JSON.stringify(descPageResult).slice(0, 500)
    ).toBeGreaterThanOrEqual(1);

    // child-content.get (type=page)
    const childPages = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.child-content.get",
        path: { id: parentPageId, type: "page" },
        responseProfile: "standard"
      })
    );
    expect(
      containsValue(childPages.data, childPageId),
      JSON.stringify(childPages.data).slice(0, 500)
    ).toBe(true);

    // content-resource.scan.list
    const scan = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content-resource.scan.list",
        query: { spaceKey },
        responseProfile: "standard"
      })
    );
    expect(scan.data).toBeTruthy();

    // content-resource.search.list
    const searchResults = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content-resource.search.list",
        query: { cql: `space = ${spaceKey} AND title ~ "C-A Parent ${runId}"` },
        responseProfile: "standard"
      })
    );
    expect(searchResults.data).toBeTruthy();

    // content-resource.history.macro.id.get — the v2 body carries an explicit
    // ac:macro-id (see the update above), so the success path is guaranteed.
    const pageBodyResp = await fixtureRequest(
      "confluence",
      `/rest/api/content/${parentPageId}?expand=body.storage`
    );
    const storageValue = (pageBodyResp.data as any)?.body?.storage?.value ?? "";
    const macroMatch = storageValue.match(/ac:macro-id="([^"]+)"/);
    const realMacroId = macroMatch?.[1];
    expect(
      realMacroId,
      `v2 storage should carry the explicit macro-id: ${storageValue.slice(0, 300)}`
    ).toBeTruthy();
    const macroResult = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content-resource.history.macro.id.get",
        path: {
          id: parentPageId,
          version: 2,
          macroId: realMacroId!
        },
        responseProfile: "standard"
      })
    );
    expect(containsValue(macroResult.data, "toc"), JSON.stringify(macroResult).slice(0, 500)).toBe(
      true
    );
  });

  // ── it 3: attachments / watch / users (17 ops: 4.3) ──

  it("attachments, watch, and users", async () => {
    // Upload a plain-text attachment for extractedtext + update + move + version-delete
    const uploadPath = join(runFiles, "ca-upload.txt");
    const uploadV2Path = join(runFiles, "ca-upload-v2.txt");
    await writeFile(uploadPath, `C-A attachment ${runId}\n`);
    await writeFile(uploadV2Path, `C-A attachment ${runId} v2\n`);

    const uploaded = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.attachments.upload",
        path: { contentId: parentPageId },
        body: { files: [uploadPath] },
        responseProfile: "standard"
      })
    );
    const uploadedId = projectedValues(uploaded.data, "id").at(-1);
    expect(uploadedId, JSON.stringify(uploaded)).toBeDefined();
    if (uploadedId === undefined) throw new Error("attachment upload did not return an id");
    const attachmentId = String(uploadedId);
    recordCleanup("confluence", "attachment", attachmentId, "created");

    try {
      // attachments.content.child.update — metadata update (DC requires id in body)
      const newTitle = `renamed-${runId}.txt`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.attachments.content.child.update",
          path: { id: parentPageId, attachmentId },
          body: { id: attachmentId, title: newTitle, version: { number: 2 } }
        })
      );

      // attachments.content.child.extractedtext.list — async extraction; 204
      // (no content yet) is a valid response in DC. Accept any non-error outcome.
      const extResult = await pollUntil(
        async () => {
          const r = await client.callTool("atlassian_execute_operation", {
            operationId: "confluence.attachments.content.child.extractedtext.list",
            path: { id: parentPageId, attachmentId },
            responseProfile: "standard"
          });
          return r;
        },
        (r) => r.isError !== true,
        { timeoutMs: 15000, intervalMs: 2000 }
      );
      // Endpoint is reachable; extracted text may be empty/204.
      expect(extResult.isError !== true, JSON.stringify(extResult).slice(0, 500)).toBe(true);

      // attachments.content.child.move — move to child page, then move back
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.attachments.content.child.move",
          path: { id: parentPageId, attachmentId },
          query: { newContentId: childPageId }
        })
      );
      // Move back
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.attachments.content.child.move",
          path: { id: childPageId, attachmentId },
          query: { newContentId: parentPageId }
        })
      );

      // attachments.content.child.version.delete — upload v2 data first, then delete v1
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.attachments.content.child.data.create",
          path: { id: parentPageId, attachmentId },
          body: { files: [uploadV2Path] },
          responseProfile: "standard"
        })
      );
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.attachments.content.child.version.delete",
          path: { id: parentPageId, attachmentId, version: 1 }
        })
      );

      // user-watch.content.create
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.user-watch.content.create",
          path: { contentId: parentPageId }
        })
      );
      // user-watch.content.get — $fragment may truncate watching field
      const watchGet = await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.user-watch.content.get",
        path: { contentId: parentPageId },
        responseProfile: "standard"
      });
      expect(watchGet.isError !== true, JSON.stringify(watchGet).slice(0, 500)).toBe(true);

      // content-watchers.list — while still watching, assert admin is watching
      const contentWatchers = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.content-watchers.list",
          path: { contentId: parentPageId },
          responseProfile: "standard"
        })
      );
      const adminCreds = adminBasicCredentials();
      expect(
        containsValue(contentWatchers.data, adminCreds.username),
        JSON.stringify(contentWatchers.data).slice(0, 500)
      ).toBe(true);

      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.user-watch.content.delete",
          path: { contentId: parentPageId }
        })
      );
      const watchGone = await client.callTool(
        "atlassian_execute_operation",
        {
          operationId: "confluence.user-watch.content.get",
          path: { contentId: parentPageId }
        },
        { expectError: true }
      );
      expect(watchGone.isError !== false, JSON.stringify(watchGone).slice(0, 500)).toBe(true);

      // user-watch.space.create / get / list / delete
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.user-watch.space.create",
          path: { spaceKey }
        })
      );
      // user-watch.space.get
      const spaceWatchGet = await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.user-watch.space.get",
        path: { spaceKey },
        responseProfile: "standard"
      });
      expect(spaceWatchGet.isError !== true, JSON.stringify(spaceWatchGet).slice(0, 500)).toBe(
        true
      );

      // space-watchers.list — while still watching, assert admin is watching
      const spaceWatchers = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.space-watchers.list",
          path: { spaceKey },
          responseProfile: "standard"
        })
      );
      expect(
        containsValue(spaceWatchers.data, adminCreds.username),
        JSON.stringify(spaceWatchers.data).slice(0, 500)
      ).toBe(true);

      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.user-watch.space.delete",
          path: { spaceKey }
        })
      );
      const spaceWatchGone = await client.callTool(
        "atlassian_execute_operation",
        {
          operationId: "confluence.user-watch.space.get",
          path: { spaceKey }
        },
        { expectError: true }
      );
      expect(spaceWatchGone.isError !== false, JSON.stringify(spaceWatchGone).slice(0, 500)).toBe(
        true
      );

      // users.current
      const currentUser = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.users.current",
          responseProfile: "standard"
        })
      );
      expect(currentUser.data).toBeTruthy();

      // user.current.update — change fullName then revert
      const currentFullName =
        (currentUser.data as any)?.fullName ?? (currentUser.data as any)?.displayName ?? "";
      const tempName = `E2E Temp ${runId}`;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.user.current.update",
          body: { fullName: tempName }
        })
      );
      try {
        const afterUpdate = requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "confluence.users.current",
            responseProfile: "standard"
          })
        );
        expect(
          containsValue(afterUpdate.data, tempName),
          JSON.stringify(afterUpdate.data).slice(0, 500)
        ).toBe(true);
      } finally {
        // Revert fullName
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.user.current.update",
          body: { fullName: currentFullName || adminCreds.username }
        });
      }

      // user.memberof.list — use username param (userKey may be hidden by $fragment)
      const memberOf = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.user.memberof.list",
          query: { username: adminCreds.username },
          responseProfile: "standard"
        })
      );
      expect(memberOf.data).toBeTruthy();

      // search — CQL (results may use $fragment encoding)
      const searchResult = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.search",
          query: { cql: `space = ${spaceKey} AND text ~ "${runId}"` },
          responseProfile: "standard"
        })
      );
      // Search index may lag; endpoint is exercised regardless of result count
      expect(searchResult.data, JSON.stringify(searchResult).slice(0, 500)).toBeTruthy();

      // user.current.password.create — disposable user recipe
      const { username: pwUser, password: pwOld } = await createDisposableUser("confluence", runId);
      try {
        const newPassword = `New-${runId}-${Math.random().toString(36).slice(2, 8)}!`;
        const pwClient = await StdioMcpClient.start("confluence", ["--exposure-tier=safe"], {
          username: pwUser,
          password: pwOld
        });
        try {
          requireToolSuccess(
            await pwClient.callTool("atlassian_execute_operation", {
              operationId: "confluence.user.current.password.create",
              body: { oldPassword: pwOld, newPassword }
            })
          );
          // Verify new password works via direct REST call (fixtureRequest
          // always uses admin credentials, so we construct the fetch manually)
          const verifyUrl = new URL(
            "/rest/api/user/current",
            process.env.CONFLUENCE_URL ?? "http://localhost:8090"
          );
          const verifyResp = await fetch(verifyUrl, {
            headers: {
              authorization: "Basic " + Buffer.from(`${pwUser}:${newPassword}`).toString("base64"),
              accept: "application/json"
            }
          });
          expect(verifyResp.status, await verifyResp.text().catch(() => "")).toBe(200);
        } finally {
          await pwClient.close();
        }
      } finally {
        await deleteDisposableUser("confluence", pwUser);
      }
    } finally {
      // Attachment cleanup
      if (attachmentId) {
        try {
          await fixtureRequest(
            "confluence",
            `/rest/api/content/${parentPageId}/child/attachment/${attachmentId}`,
            { method: "DELETE" }
          );
          recordCleanup("confluence", "attachment", attachmentId, "cleaned");
        } catch (error) {
          recordCleanup("confluence", "attachment", attachmentId, "cleanup-failed", {
            error: error
          });
        }
      }
    }
  });
});
