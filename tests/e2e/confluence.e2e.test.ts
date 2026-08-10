import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordCleanup } from "./support/cleanup-journal.js";
import { StdioMcpClient, requireToolSuccess } from "./support/mcp-client.js";
import {
  containsValue,
  ensureFixture,
  fixtureRequest,
  projectedValue,
  projectedValues
} from "./support/rest-fixture.js";

const active = process.env.E2E_PRODUCT === "confluence" ? describe : describe.skip;

// ── confluence-core-lifecycle ──
// 4 ops: content create / get / update / delete.

active("confluence-core-lifecycle", () => {
  const runId = randomUUID().slice(0, 8);
  const spaceKey = process.env.E2E_CONFLUENCE_SPACE_KEY ?? "MCP";
  const fileRoot = process.env.ATLASSIAN_FILE_ROOT!;
  const runFiles = join(fileRoot, `storage-${runId}`);
  let client: StdioMcpClient;
  let contentId: string | undefined;

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
  }, 60_000);

  afterAll(async () => {
    if (contentId) {
      try {
        await fixtureRequest("confluence", `/rest/api/content/${contentId}`, { method: "DELETE" });
        recordCleanup("confluence", "content", contentId, "cleaned");
      } catch (error) {
        recordCleanup("confluence", "content", contentId, "cleanup-failed", { error: error });
      }
    }
    if (client) await client.close();
    await rm(runFiles, { recursive: true, force: true });
  });

  it("creates, reads, updates, reads, deletes, then proves absence", async () => {
    const title = `MCP E2E ${runId}`;
    const created = requireToolSuccess(
      await client.callTool("confluence_create_content", {
        content: {
          type: "page",
          title,
          space: { key: spaceKey },
          body: { storage: { value: `<p>${runId}</p>`, representation: "storage" } }
        }
      })
    );
    const createdId = projectedValue(created.data, "id");
    contentId = createdId === undefined ? undefined : String(createdId);
    expect(contentId, JSON.stringify(created)).toBeTruthy();
    recordCleanup("confluence", "content", contentId!, "created");

    const read = requireToolSuccess(
      await client.callTool("confluence_get_content", {
        contentId: contentId!,
        expand: "body.storage,version",
        responseProfile: "standard"
      })
    );
    expect(containsValue(read.data, title)).toBe(true);

    const updatedTitle = `${title} updated`;
    requireToolSuccess(
      await client.callTool("confluence_update_content", {
        contentId: contentId!,
        content: {
          id: contentId,
          type: "page",
          title: updatedTitle,
          version: { number: 2 },
          body: { storage: { value: `<p>${runId} updated</p>`, representation: "storage" } }
        }
      })
    );
    const reread = requireToolSuccess(
      await client.callTool("confluence_get_content", {
        contentId: contentId!,
        expand: "body.storage,version",
        responseProfile: "standard"
      })
    );
    expect(containsValue(reread.data, updatedTitle)).toBe(true);

    requireToolSuccess(
      await client.callTool("confluence_delete_content", {
        contentId: contentId!
      })
    );
    recordCleanup("confluence", "content", contentId!, "cleaned");
    const gone = await client.callTool("confluence_get_content", { contentId: contentId! });
    expect(gone.isError).toBe(true);
    contentId = undefined;
  });

  // ── E3: storageValueFile with a ~1 MiB storage-format XHTML file ──
  // The file is generated into the ATLASSIAN_FILE_ROOT sandbox, injected as
  // body.storage.value by confluence_update_content, then read back through
  // MCP and byte-compared. Content is plain <p> blocks so Confluence stores
  // it verbatim without normalization.
  it("writes a 1 MiB storage XHTML file via storageValueFile and reads it back", async () => {
    const paragraph =
      "<p>Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor</p>\n";
    let storageValue = `<h1>E2E storageValueFile ${runId}</h1>\n`;
    while (Buffer.byteLength(storageValue, "utf8") < 1024 * 1024) storageValue += paragraph;
    // No trailing newline at the very end: Confluence trims it from the
    // stored value, which would break the byte-exact comparison.
    storageValue += `<p>E2E storageValueFile tail ${runId}</p>`;
    const storagePath = join(runFiles, "storage-value.xhtml");
    await writeFile(storagePath, storageValue);

    const title = `MCP E2E storage ${runId}`;
    const created = requireToolSuccess(
      await client.callTool("confluence_create_content", {
        content: {
          type: "page",
          title,
          space: { key: spaceKey },
          body: { storage: { value: `<p>${runId}</p>`, representation: "storage" } }
        }
      })
    );
    const createdId = projectedValue(created.data, "id");
    contentId = createdId === undefined ? undefined : String(createdId);
    expect(contentId, JSON.stringify(created)).toBeTruthy();
    recordCleanup("confluence", "content", contentId!, "created");

    requireToolSuccess(
      await client.callTool("confluence_update_content", {
        contentId: contentId!,
        content: { id: contentId, type: "page", title, version: { number: 2 } },
        storageValueFile: storagePath
      })
    );

    // The ~1 MiB read-back exceeds the per-call output budget, which would
    // shrink the response to an advice stub — so stream it to the sandbox
    // with outputPath and byte-compare the raw upstream JSON.
    const readbackPath = join(runFiles, "storage-readback.json");
    requireToolSuccess(
      await client.callTool("confluence_get_content", {
        contentId: contentId!,
        expand: "body.storage,version",
        outputPath: readbackPath
      })
    );
    const readback = JSON.parse(await readFile(readbackPath, "utf8")) as {
      body?: { storage?: { value?: unknown } };
    };
    expect(readback.body?.storage?.value).toBe(storageValue);

    requireToolSuccess(
      await client.callTool("confluence_delete_content", {
        contentId: contentId!
      })
    );
    recordCleanup("confluence", "content", contentId!, "cleaned");
    contentId = undefined;
  });
});

// ── confluence-attachment-lifecycle ──
// 4 ops: attachment upload / metadata / data.create / child.delete.

active("confluence-attachment-lifecycle", () => {
  const runId = randomUUID().slice(0, 8);
  const spaceKey = process.env.E2E_CONFLUENCE_SPACE_KEY ?? "MCP";
  const fileRoot = process.env.ATLASSIAN_FILE_ROOT!;
  const runFiles = join(fileRoot, runId);
  let client: StdioMcpClient;
  let contentId: string | undefined;
  let attachmentId: string | undefined;

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

    const title = `MCP E2E att ${runId}`;
    const created = requireToolSuccess(
      await client.callTool("confluence_create_content", {
        content: {
          type: "page",
          title,
          space: { key: spaceKey },
          body: { storage: { value: `<p>${runId}</p>`, representation: "storage" } }
        }
      })
    );
    const createdId = projectedValue(created.data, "id");
    contentId = createdId === undefined ? undefined : String(createdId);
    expect(contentId, JSON.stringify(created)).toBeTruthy();
    recordCleanup("confluence", "content", contentId!, "created");
  }, 60_000);

  afterAll(async () => {
    if (attachmentId && contentId) {
      try {
        await fixtureRequest(
          "confluence",
          `/rest/api/content/${contentId}/child/attachment/${attachmentId}`,
          { method: "DELETE" }
        );
        recordCleanup("confluence", "attachment", attachmentId, "cleaned");
      } catch (error) {
        recordCleanup("confluence", "attachment", attachmentId, "cleanup-failed", { error: error });
      }
    }
    if (contentId) {
      try {
        await fixtureRequest("confluence", `/rest/api/content/${contentId}`, { method: "DELETE" });
        recordCleanup("confluence", "content", contentId, "cleaned");
      } catch (error) {
        recordCleanup("confluence", "content", contentId, "cleanup-failed", { error: error });
      }
    }
    if (client) await client.close();
    await rm(runFiles, { recursive: true, force: true });
  });

  it("uploads, reads metadata, downloads, updates binary data, then deletes", async () => {
    const uploadPath = join(runFiles, "confluence-upload.txt");
    const updatedUploadPath = join(runFiles, "confluence-upload-v2.txt");
    const downloadPath = join(runFiles, "confluence-download.txt");
    const updatedDownloadPath = join(runFiles, "confluence-download-v2.txt");
    const attachmentBytes = Buffer.from(`confluence attachment ${runId}\n`, "utf8");
    const updatedAttachmentBytes = Buffer.from(`confluence attachment ${runId} updated\n`, "utf8");
    await writeFile(uploadPath, attachmentBytes);
    await writeFile(updatedUploadPath, updatedAttachmentBytes);

    const uploaded = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.attachments.upload",
        path: { contentId: contentId! },
        body: { files: [uploadPath] },
        responseProfile: "standard"
      })
    );
    const uploadedId = projectedValues(uploaded.data, "id").at(-1);
    attachmentId = uploadedId === undefined ? undefined : String(uploadedId);
    expect(attachmentId, JSON.stringify(uploaded)).toBeTruthy();
    recordCleanup("confluence", "attachment", attachmentId!, "created");

    const attachmentMetadata = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.attachments.metadata",
        path: { contentId: contentId! },
        responseProfile: "standard"
      })
    );
    expect(containsValue(attachmentMetadata.data, "confluence-upload.txt")).toBe(true);

    requireToolSuccess(
      await client.callTool("confluence_download_attachment", {
        attachmentId: attachmentId!,
        downloadPath
      })
    );
    expect(await readFile(downloadPath)).toEqual(attachmentBytes);

    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.attachments.content.child.data.create",
        path: { id: contentId!, attachmentId: attachmentId! },
        body: { files: [updatedUploadPath] },
        responseProfile: "standard"
      })
    );
    requireToolSuccess(
      await client.callTool("confluence_download_attachment", {
        attachmentId: attachmentId!,
        downloadPath: updatedDownloadPath
      })
    );
    expect(await readFile(updatedDownloadPath)).toEqual(updatedAttachmentBytes);

    requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "confluence.attachments.content.child.delete",
        path: { id: contentId!, attachmentId: attachmentId! }
      })
    );
    recordCleanup("confluence", "attachment", attachmentId!, "cleaned");
    attachmentId = undefined;
  });
});
