import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { McpServer } from "@modelcontextprotocol/server";
import { MAX_STORAGE_VALUE_BYTES } from "../src/file-transfer.js";
import { AtlassianService } from "../src/service.js";
import { registerTools } from "../src/tools.js";
import { resolveConfluenceStorageBody } from "../src/tools-products.js";
import type { ProductConfig, ServerConfig } from "../src/types.js";

const STORAGE_XHTML = "<p>Hello <strong>storage</strong> format</p>";

const tempDirs: string[] = [];
const services: AtlassianService[] = [];

async function tempRoot(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "storage-value-file-"));
  tempDirs.push(dir);
  return dir;
}

function productConfig(fileRoot: string | undefined): ProductConfig {
  return {
    product: "confluence",
    baseUrl: new URL("http://127.0.0.1/confluence"),
    token: "confluence-token",
    tlsVerify: false,
    ...(fileRoot ? { fileRoot } : {})
  };
}

afterEach(async () => {
  await Promise.all(services.splice(0).map((service) => service.close()));
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("resolveConfluenceStorageBody", () => {
  it("fills body.storage.value with the file content and fixes representation to storage", async () => {
    const root = await tempRoot();
    const file = join(root, "page.xhtml");
    await writeFile(file, STORAGE_XHTML);
    const body = await resolveConfluenceStorageBody(
      productConfig(root),
      { type: "page", title: "T", space: { key: "DS" } },
      file,
      "confluence_create_content"
    );
    expect(body).toEqual({
      type: "page",
      title: "T",
      space: { key: "DS" },
      body: { storage: { value: STORAGE_XHTML, representation: "storage" } }
    });
  });

  it("forces representation back to storage when the caller set another one", async () => {
    const root = await tempRoot();
    const file = join(root, "page.xhtml");
    await writeFile(file, STORAGE_XHTML);
    const body = await resolveConfluenceStorageBody(
      productConfig(root),
      { type: "page", body: { storage: { representation: "wiki" } } },
      file,
      "confluence_update_content"
    );
    expect(body).toEqual({
      type: "page",
      body: { storage: { value: STORAGE_XHTML, representation: "storage" } }
    });
  });

  it("returns the content unchanged when storageValueFile is not given", async () => {
    const content = { type: "page", body: { storage: { value: "<p>x</p>" } } };
    expect(await resolveConfluenceStorageBody(undefined, content, undefined, "tool")).toBe(content);
  });

  it("rejects mutual use with an inline body.storage.value (structured error)", async () => {
    const root = await tempRoot();
    const file = join(root, "page.xhtml");
    await writeFile(file, STORAGE_XHTML);
    await expect(
      resolveConfluenceStorageBody(
        productConfig(root),
        { type: "page", body: { storage: { value: "<p>inline</p>" } } },
        file,
        "confluence_create_content"
      )
    ).rejects.toThrow(/mutually exclusive/);
  });

  it("rejects paths escaping the file root", async () => {
    const root = await tempRoot();
    const outside = join(await tempRoot(), "outside.xhtml");
    await writeFile(outside, STORAGE_XHTML);
    await expect(
      resolveConfluenceStorageBody(productConfig(root), { type: "page" }, outside, "tool")
    ).rejects.toThrow(/file root/);
  });

  it("rejects files exceeding the 10 MiB limit before reading them", async () => {
    const root = await tempRoot();
    const file = join(root, "huge.xhtml");
    await writeFile(file, Buffer.alloc(MAX_STORAGE_VALUE_BYTES + 1, 120));
    await expect(
      resolveConfluenceStorageBody(productConfig(root), { type: "page" }, file, "tool")
    ).rejects.toThrow(/exceeding the \d+-byte limit/);
  });

  it("rejects non-regular files and missing file roots", async () => {
    const root = await tempRoot();
    const dir = join(root, "a-directory");
    await mkdir(dir);
    await expect(
      resolveConfluenceStorageBody(productConfig(root), { type: "page" }, dir, "tool")
    ).rejects.toThrow(/regular file/);
    const file = join(root, "page.xhtml");
    await writeFile(file, STORAGE_XHTML);
    await expect(
      resolveConfluenceStorageBody(productConfig(undefined), { type: "page" }, file, "tool")
    ).rejects.toThrow(/FILE_ROOT/);
  });
});

describe("confluence_create_content storageValueFile error contract", () => {
  it("surfaces the mutual-exclusion violation as a structured isError tool result", async () => {
    const root = await tempRoot();
    const config: ServerConfig = {
      products: { confluence: productConfig(root) },
      exposureTier: "safe",
      forceInclude: [],
      forceExclude: [],
      maxOutputBytes: 65_536,
      cursorTtlSeconds: 900,
      maxDownloadBytes: 104_857_600,
      tlsVerify: false
    };
    const service = new AtlassianService(config);
    services.push(service);
    const callbacks = new Map<string, (input: unknown) => Promise<Record<string, unknown>>>();
    const server = {
      registerTool(name: string, _config: Record<string, unknown>, callback: never): void {
        callbacks.set(name, callback);
      }
    } as unknown as McpServer;
    registerTools(server, service);
    const create = callbacks.get("confluence_create_content");
    expect(create).toBeDefined();
    const outcome = (await create!({
      content: { type: "page", body: { storage: { value: "<p>inline</p>" } } },
      storageValueFile: join(root, "page.xhtml")
    })) as { isError?: boolean; content: Array<{ text: string }> };
    expect(outcome.isError).toBe(true);
    expect(outcome.content[0]!.text).toMatch(/mutually exclusive/);
  });
});
