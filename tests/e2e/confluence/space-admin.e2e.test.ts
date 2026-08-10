import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordCleanup } from "../support/cleanup-journal.js";
import { StdioMcpClient, requireToolSuccess } from "../support/mcp-client.js";
import { pollUntil } from "../support/poll.js";
import { containsValue, fixtureRequest, projectedValue } from "../support/rest-fixture.js";

const active = process.env.E2E_PRODUCT === "confluence" ? describe : describe.skip;

// ── confluence-space-admin (C-B) ──
// 41 ops: space lifecycle (25) + permissions & appearance (16).

active("confluence-space-admin", () => {
  const runId = randomUUID().slice(0, 8);
  // space key: E2ESA + runId, ≤10 uppercase chars
  const spaceKey = `E2ESA${runId}`.slice(0, 10).toUpperCase();
  let client: StdioMcpClient;
  let spacePageId: string | undefined;

  beforeAll(async () => {
    client = await StdioMcpClient.start("confluence", ["--exposure-tier=max"]);

    // Create disposable space via MCP (covers spaces.create)
    const created = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.spaces.create",
        body: { key: spaceKey, name: `C-B Test ${runId}` }
      })
    );
    const createdKey = projectedValue(created.data, "key") as string;
    expect(createdKey, JSON.stringify(created)).toBe(spaceKey);
    recordCleanup("confluence", "space", spaceKey, "created");

    // Create a page in the space
    const pageCreated = requireToolSuccess(
      await client.callTool("confluence_create_content", {
        content: {
          type: "page",
          title: `C-B Page ${runId}`,
          space: { key: spaceKey },
          body: {
            storage: {
              value: `<p>Space admin test ${runId}</p>`,
              representation: "storage"
            }
          }
        }
      })
    );
    spacePageId = String(projectedValue(pageCreated.data, "id"));
    expect(spacePageId, JSON.stringify(pageCreated)).toBeTruthy();
    recordCleanup("confluence", "content", spacePageId, "created");

    // Add 2 global labels to the page for space-label.* tests
    const label1 = `cbl1-${runId}`;
    const label2 = `cbl2-${runId}`;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.content.labels.add",
        path: { contentId: spacePageId },
        body: [
          { prefix: "global", name: label1 },
          { prefix: "global", name: label2 }
        ]
      })
    );

    // Poll until labels appear in space-label.list (async index, ~15s)
    await pollUntil(
      async () => {
        const r = await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.space-label.list",
          path: { spaceKey },
          responseProfile: "standard"
        });
        return r;
      },
      (r) => {
        if (r.isError) return false;
        const data = r.structuredContent?.data;
        return containsValue(data, label1) && containsValue(data, label2);
      },
      { timeoutMs: 30000, intervalMs: 3000 }
    );
  }, 90_000);

  afterAll(async () => {
    // Space delete cascades all content; accept 202 (long task)
    if (spaceKey) {
      try {
        await fixtureRequest("confluence", `/rest/api/space/${spaceKey}`, {
          method: "DELETE"
        });
        recordCleanup("confluence", "space", spaceKey, "cleaned");
      } catch (error) {
        recordCleanup("confluence", "space", spaceKey, "cleanup-failed", {
          error: error
        });
      }
    }
    if (client) await client.close();
  });

  // ── it 1: space lifecycle (25 ops: 5.1) ──

  it("space lifecycle", async () => {
    // spaces.get
    const spaceGet = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.spaces.get",
        path: { spaceKey },
        responseProfile: "standard"
      })
    );
    expect(
      containsValue(spaceGet.data, spaceKey),
      JSON.stringify(spaceGet.data).slice(0, 500)
    ).toBe(true);

    // spaces.list — filter by spaceKey
    const spaceList = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.spaces.list",
        query: { spaceKeySingle: spaceKey },
        responseProfile: "standard"
      })
    );
    expect(
      containsValue(spaceList.data, spaceKey),
      JSON.stringify(spaceList.data).slice(0, 500)
    ).toBe(true);

    // spaces.update — change name, then revert
    const newName = `C-B Updated ${runId}`;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.spaces.update",
        path: { spaceKey },
        body: { name: newName }
      })
    );
    const spaceGetUpdated = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.spaces.get",
        path: { spaceKey },
        responseProfile: "standard"
      })
    );
    expect(
      containsValue(spaceGetUpdated.data, newName),
      JSON.stringify(spaceGetUpdated.data).slice(0, 500)
    ).toBe(true);
    // Revert name
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.spaces.update",
        path: { spaceKey },
        body: { name: `C-B Test ${runId}` }
      })
    );

    // space.archive — archive then verify not in status=current
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space.archive",
        path: { spaceKey }
      })
    );
    const archivedList = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.spaces.list",
        query: { status: "current", spaceKeySingle: spaceKey },
        responseProfile: "standard"
      })
    );
    const archivedReturned = (archivedList as any).page?.returned ?? 0;
    expect(archivedReturned, "archived space should not appear in status=current").toBe(0);

    // space.restore
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space.restore",
        path: { spaceKey }
      })
    );
    const restoredList = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.spaces.list",
        query: { status: "current", spaceKeySingle: spaceKey },
        responseProfile: "standard"
      })
    );
    expect(
      (restoredList as any).page?.returned ?? 0,
      "restored space should appear in status=current"
    ).toBeGreaterThanOrEqual(1);

    // space.trash.list / space.trash.delete — create page, trash it, purge
    const trashPageCreated = requireToolSuccess(
      await client.callTool("confluence_create_content", {
        content: {
          type: "page",
          title: `Trash Me ${runId}`,
          space: { key: spaceKey },
          body: {
            storage: {
              value: `<p>trash test</p>`,
              representation: "storage"
            }
          }
        }
      })
    );
    const trashPageId = String(projectedValue(trashPageCreated.data, "id"));
    expect(trashPageId, JSON.stringify(trashPageCreated)).toBeTruthy();

    // Move to trash via MCP content.delete
    requireToolSuccess(
      await client.callTool("confluence_delete_content", {
        contentId: trashPageId
      })
    );

    // space.trash.list — assert trashed page found
    const trashList = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space.trash.list",
        path: { spaceKey },
        responseProfile: "standard"
      })
    );
    const trashReturned = (trashList as any).page?.returned ?? 0;
    expect(trashReturned, JSON.stringify(trashList).slice(0, 500)).toBeGreaterThanOrEqual(1);

    // space.trash.delete — purge (DC returns 204 synchronously per the spec)
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space.trash.delete",
        path: { spaceKey }
      })
    );
    // Verify via raw REST: the MCP $fragment encoding makes page.returned
    // unreliable for trash size. Poll (rather than assert once) to tolerate
    // any indexing lag before the trash listing reflects the purge.
    await pollUntil(
      async () => {
        return fixtureRequest("confluence", `/rest/api/space/${spaceKey}/trash?limit=5`);
      },
      (r) => r.data?.size === 0,
      { timeoutMs: 30000, intervalMs: 2000 }
    );

    // space.content.list
    const spaceContentList = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space.content.list",
        path: { spaceKey },
        responseProfile: "standard"
      })
    );
    expect(
      (spaceContentList as any).page?.returned ?? 0,
      JSON.stringify(spaceContentList).slice(0, 500)
    ).toBeGreaterThanOrEqual(1);

    // space.content.get (type=page)
    const spaceContentGet = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space.content.get",
        path: { spaceKey, type: "page" },
        responseProfile: "standard"
      })
    );
    expect(
      (spaceContentGet as any).page?.returned ?? 0,
      JSON.stringify(spaceContentGet).slice(0, 500)
    ).toBeGreaterThanOrEqual(1);

    // space.personal.create — admin permission required
    const personalCreated = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space.personal.create",
        body: {}
      })
    );
    const personalKey = projectedValue(personalCreated.data, "key") as string;
    expect(personalKey, JSON.stringify(personalCreated)).toBeTruthy();
    if (personalKey) {
      await fixtureRequest("confluence", `/rest/api/space/${personalKey}`, {
        method: "DELETE"
      });
      recordCleanup("confluence", "space", personalKey, "cleaned");
    }

    // space.private.create
    const privateCreated = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space.private.create",
        body: { key: `PRIV${runId}`.slice(0, 10).toUpperCase(), name: `Private ${runId}` }
      })
    );
    const privateKey = projectedValue(privateCreated.data, "key") as string;
    expect(privateKey, JSON.stringify(privateCreated)).toBeTruthy();
    if (privateKey) {
      await fixtureRequest("confluence", `/rest/api/space/${privateKey}`, {
        method: "DELETE"
      });
      recordCleanup("confluence", "space", privateKey, "cleaned");
    }

    // space-label.list (labels already present from beforeAll polling)
    const spaceLabels = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space-label.list",
        path: { spaceKey },
        responseProfile: "standard"
      })
    );
    const label1Name = `cbl1-${runId}`;
    const label2Name = `cbl2-${runId}`;
    expect(
      containsValue(spaceLabels.data, label1Name),
      JSON.stringify(spaceLabels.data).slice(0, 500)
    ).toBe(true);

    // space-label.popular.list
    const popularLabels = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space-label.popular.list",
        path: { spaceKey },
        responseProfile: "standard"
      })
    );
    expect(
      containsValue(popularLabels.data, label1Name),
      JSON.stringify(popularLabels.data).slice(0, 500)
    ).toBe(true);

    // space-label.recent.list
    const recentLabels = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space-label.recent.list",
        path: { spaceKey },
        responseProfile: "standard"
      })
    );
    expect(
      containsValue(recentLabels.data, label1Name),
      JSON.stringify(recentLabels.data).slice(0, 500)
    ).toBe(true);

    // space-label.related.list — related to label1
    const relatedLabels = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space-label.related.list",
        path: { spaceKey, labelName: label1Name },
        responseProfile: "standard"
      })
    );
    // label2 is on the same content as label1 → should be related
    expect(
      containsValue(relatedLabels.data, label2Name),
      JSON.stringify(relatedLabels.data).slice(0, 500)
    ).toBe(true);

    // space-property.create
    const propKey = `sp-${runId}`;
    const propValue = { active: true, note: runId };
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space-property.create",
        path: { spaceKey },
        body: { key: propKey, value: propValue }
      })
    );

    // space-property.get
    const spGet = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space-property.get",
        path: { spaceKey, key: propKey },
        responseProfile: "standard"
      })
    );
    expect(containsValue(spGet.data, propKey), JSON.stringify(spGet.data).slice(0, 500)).toBe(true);

    // space-property.list
    const spList = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space-property.list",
        path: { spaceKey },
        responseProfile: "standard"
      })
    );
    expect(containsValue(spList.data, propKey), JSON.stringify(spList.data).slice(0, 500)).toBe(
      true
    );

    // space-property.update — GET id+version via fixture REST (same as content-property)
    const propCurrentResp = await fixtureRequest(
      "confluence",
      `/rest/api/space/${spaceKey}/property/${propKey}?expand=version`
    );
    const propId = (propCurrentResp.data as any)?.id as string;
    const propCurVersion = (propCurrentResp.data as any)?.version?.number ?? 1;
    const updatedPropValue = { active: false, note: `updated-${runId}` };
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space-property.update",
        path: { spaceKey, key: propKey },
        body: {
          id: propId,
          value: updatedPropValue,
          version: { number: propCurVersion + 1 }
        }
      })
    );

    // space-property.delete
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space-property.delete",
        path: { spaceKey, key: propKey }
      })
    );
    const spGone = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "confluence.space-property.get",
        path: { spaceKey, key: propKey }
      },
      { expectError: true }
    );
    expect(spGone.isError, JSON.stringify(spGone)).toBe(true);

    // space-property.create.spacekey (POST to /space/{key}/property/{key})
    const propKey2 = `sp2-${runId}`;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space-property.create.spacekey",
        path: { spaceKey, key: propKey2 },
        body: { value: { temp: true } }
      })
    );
    // Clean up
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.space-property.delete",
        path: { spaceKey, key: propKey2 }
      })
    );

    // category.space.create / delete
    const catName = `cat-${runId}`;
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.category.space.create",
        path: { spaceKey, labelName: catName }
      })
    );
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.category.space.delete",
        path: { spaceKey, categoryName: catName }
      })
    );

    // spaces.delete — last, since it destroys the space.  accept 202.
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.spaces.delete",
        path: { spaceKey }
      })
    );
    recordCleanup("confluence", "space", spaceKey, "cleaned");
    // Verify deletion (DC delete returns 202 async; pollUntil gone)
    await pollUntil(
      async () => {
        return client.callTool(
          "atlassian_execute_operation",
          {
            operationId: "confluence.spaces.get",
            path: { spaceKey }
          },
          { expectError: true }
        );
      },
      (r) => r.isError === true,
      { timeoutMs: 30000, intervalMs: 2000 }
    );
  });

  // ── it 2: space permissions & appearance (16 ops: 5.2) ──
  // NOTE: it-1 deletes the space, so it-2 creates its own disposable space.

  it("space permissions and appearance", async () => {
    const permSpaceKey = `E2ESP${runId}`.slice(0, 10).toUpperCase();

    // Create a fresh space for permission tests
    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.spaces.create",
        body: { key: permSpaceKey, name: `C-B Perm ${runId}` }
      })
    );
    recordCleanup("confluence", "space", permSpaceKey, "created");

    try {
      // space-permissions.list
      const permList = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.space-permissions.list",
          path: { spaceKey: permSpaceKey },
          responseProfile: "standard"
        })
      );
      expect(permList.data).toBeTruthy();

      // space-permissions.create — spec form with subjects; full-replacement
      // semantics require preserving admin's administer+read to avoid 400.
      const adminKey = (await fixtureRequest("confluence", "/rest/api/user/current")).data
        ?.userKey as string;
      const reviewerKey = (
        await fixtureRequest("confluence", "/rest/api/user?username=mcp-e2e-reviewer")
      ).data?.userKey as string;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.space-permissions.create",
          path: { spaceKey: permSpaceKey },
          body: [
            {
              userKey: adminKey,
              operations: [
                { operationKey: "read", targetType: "space" },
                { operationKey: "administer", targetType: "space" }
              ]
            },
            {
              userKey: reviewerKey,
              operations: [{ operationKey: "read", targetType: "space" }]
            }
          ]
        })
      );
      const permListAfter = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.space-permissions.list",
          path: { spaceKey: permSpaceKey },
          responseProfile: "standard"
        })
      );
      // Assert reviewer actually appears in permissions list
      expect(
        containsValue(permListAfter.data, reviewerKey),
        JSON.stringify(permListAfter.data).slice(0, 500)
      ).toBe(true);

      // space-permissions.user.grant / get / revoke — grant reviewer
      // reviewerKey already resolved above for space-permissions.create
      // user.grant: subject is in URL, body is flat [{operationKey,targetType}]
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.space-permissions.user.grant",
          path: { spaceKey: permSpaceKey, userKey: reviewerKey },
          body: [{ operationKey: "read", targetType: "space" }]
        })
      );
      try {
        const userPermGet = requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "confluence.space-permissions.user.get",
            path: { spaceKey: permSpaceKey, userKey: reviewerKey },
            responseProfile: "standard"
          })
        );
        // Assert reviewer actually got the permission
        expect(
          containsValue(userPermGet.data, reviewerKey),
          JSON.stringify(userPermGet.data).slice(0, 500)
        ).toBe(true);
      } finally {
        const revokeResp = await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.space-permissions.user.revoke",
          path: { spaceKey: permSpaceKey, userKey: reviewerKey },
          body: []
        });
        expect(
          revokeResp.isError !== true,
          `user.revoke must succeed: ${JSON.stringify(revokeResp).slice(0, 300)}`
        ).toBe(true);
      }

      // space-permissions.group.grant / get / revoke — grant e2e-reviewers
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.space-permissions.group.grant",
          path: { spaceKey: permSpaceKey, groupName: "e2e-reviewers" },
          body: [{ groupName: "e2e-reviewers", operationKey: "read", targetType: "space" }]
        })
      );
      try {
        const groupPermGet = requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "confluence.space-permissions.group.get",
            path: { spaceKey: permSpaceKey, groupName: "e2e-reviewers" },
            responseProfile: "standard"
          })
        );
        expect(
          containsValue(groupPermGet.data, "e2e-reviewers"),
          JSON.stringify(groupPermGet.data).slice(0, 500)
        ).toBe(true);
      } finally {
        const revokeResp = await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.space-permissions.group.revoke",
          path: { spaceKey: permSpaceKey, groupName: "e2e-reviewers" },
          body: []
        });
        expect(
          revokeResp.isError !== true,
          `group.revoke must succeed: ${JSON.stringify(revokeResp).slice(0, 300)}`
        ).toBe(true);
      }

      // space-permissions.anonymous.list
      const anonList = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.space-permissions.anonymous.list",
          path: { spaceKey: permSpaceKey },
          responseProfile: "standard"
        })
      );
      expect(anonList.data).toBeTruthy();

      // space-permissions.anonymous.grant / revoke
      let anonGranted = false;
      try {
        requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "confluence.space-permissions.anonymous.grant",
            path: { spaceKey: permSpaceKey },
            body: [{ operationKey: "read", targetType: "space" }]
          })
        );
        anonGranted = true;

        const anonListAfter = requireToolSuccess(
          await client.callTool("atlassian_execute_operation", {
            operationId: "confluence.space-permissions.anonymous.list",
            path: { spaceKey: permSpaceKey },
            responseProfile: "standard"
          })
        );
        expect(
          containsValue(anonListAfter.data, "read"),
          JSON.stringify(anonListAfter.data).slice(0, 500)
        ).toBe(true);
      } finally {
        if (anonGranted) {
          const revokeResp = await client.callTool("atlassian_execute_operation", {
            operationId: "confluence.space-permissions.anonymous.revoke",
            path: { spaceKey: permSpaceKey },
            body: []
          });
          // 铁律 4: anonymous revoke failure = batch failure
          expect(
            revokeResp.isError !== true,
            `anonymous.revoke MUST succeed — accident-level residual: ${JSON.stringify(revokeResp).slice(0, 300)}`
          ).toBe(true);
        }
      }

      // spacecolorscheme.color-scheme.list
      const csList = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.spacecolorscheme.space.color-scheme.list",
          path: { spaceKey: permSpaceKey },
          responseProfile: "standard"
        })
      );
      expect(csList.data).toBeTruthy();

      // spacecolorscheme.color-scheme.update — GET full scheme via fixture
      // REST (MCP response uses $fragment which hides actual fields), modify
      // topBarColor, PUT through MCP, verify, then reset.
      const csCurrentResp = await fixtureRequest(
        "confluence",
        `/rest/api/space/${permSpaceKey}/color-scheme`
      );
      const csData = csCurrentResp.data as any;
      const testColor = "#FF0000";
      csData.colorSchemeModelLight.topBarColor = testColor;
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.spacecolorscheme.space.color-scheme.update",
          path: { spaceKey: permSpaceKey },
          body: csData
        })
      );
      const csUpdated = await fixtureRequest(
        "confluence",
        `/rest/api/space/${permSpaceKey}/color-scheme`
      );
      expect(
        csUpdated.data?.colorSchemeModelLight?.topBarColor,
        JSON.stringify(csUpdated.data).slice(0, 500)
      ).toBe(testColor);

      // spacecolorscheme.color-scheme.reset
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.spacecolorscheme.space.color-scheme.reset",
          path: { spaceKey: permSpaceKey }
        })
      );

      // spacecolorscheme.color-scheme.type.list
      const csTypeList = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.spacecolorscheme.space.color-scheme.type.list",
          path: { spaceKey: permSpaceKey },
          responseProfile: "standard"
        })
      );
      expect(csTypeList.data).toBeTruthy();

      // spacecolorscheme.color-scheme.type.update — valid values: global/custom
      const newType = "custom";
      requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.spacecolorscheme.space.color-scheme.type.update",
          path: { spaceKey: permSpaceKey },
          body: { type: newType }
        })
      );
      const csTypeUpdated = requireToolSuccess(
        await client.callTool("atlassian_execute_operation", {
          operationId: "confluence.spacecolorscheme.space.color-scheme.type.list",
          path: { spaceKey: permSpaceKey },
          responseProfile: "standard"
        })
      );
      expect(
        containsValue(csTypeUpdated.data, newType),
        JSON.stringify(csTypeUpdated.data).slice(0, 500)
      ).toBe(true);

      // Reset type to global
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.spacecolorscheme.space.color-scheme.type.update",
        path: { spaceKey: permSpaceKey },
        body: { type: "global" }
      });
    } finally {
      // Clean up permission test space
      await fixtureRequest("confluence", `/rest/api/space/${permSpaceKey}`, {
        method: "DELETE"
      }).catch(() => {});
      recordCleanup("confluence", "space", permSpaceKey, "cleaned");
    }
  });

  it("server.info — instance version (applinks manifest)", async () => {
    const info = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.server.info",
        responseProfile: "standard"
      })
    );
    const version = projectedValue(info.data, "version");
    expect(typeof version, JSON.stringify(info)).toBe("string");
    expect(String(version).length, JSON.stringify(info)).toBeGreaterThan(0);
  });
});
