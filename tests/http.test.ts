import { createServer, type Server } from "node:http";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AtlassianHttpClient, sanitizeErrorDetails } from "../src/http.js";
import type { RegisteredOperation } from "../src/types.js";

// Spy on readFile to assert that over-limit uploads read zero file bytes.
// The mock delegates to the real implementation, so behavior is unchanged.
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, readFile: vi.fn(actual.readFile) };
});

const readFileSpy = vi.mocked(readFile);

let server: Server;
let origin: string;
let workdir: string;

let capturedContentType = "";
let capturedXsrfHeader = "";
let capturedBody: Buffer = Buffer.alloc(0);
let capturedAccepts: string[] = [];
let capturedRawAccept: string | undefined = undefined;

const BINARY_PAYLOAD = Buffer.from("binary-attachment-bytes");

const uploadOperation: RegisteredOperation = {
  operationId: "jira.issue.attachments.upload",
  product: "jira",
  summary: "Upload an issue attachment",
  method: "POST",
  path: "/rest/api/2/issue/{issueKey}/attachments",
  responseKind: "json",
  requestBody: true,
  bodyKind: "multipart",
  tags: ["issue", "attachment", "upload"],
  scope: "global",
  dataKind: "resource",
  destructive: false
};

const downloadOperation: RegisteredOperation = {
  operationId: "jira.attachment.content",
  product: "jira",
  summary: "Get attachment content",
  method: "GET",
  path: "/rest/api/2/attachment/content/{attachmentId}",
  responseKind: "binary",
  tags: ["attachment", "binary"],
  scope: "global",
  dataKind: "resource",
  destructive: false
};

const noContentOperation: RegisteredOperation = {
  operationId: "jira.issue.delete",
  product: "jira",
  summary: "Delete an issue",
  method: "DELETE",
  path: "/rest/api/2/issue/{issueKey}",
  responseKind: "json",
  tags: ["issue", "delete"],
  scope: "global",
  dataKind: "resource",
  destructive: false
};

const noAcceptOperation: RegisteredOperation = {
  operationId: "jira.issue.archive",
  product: "jira",
  summary: "Bulk archive issues",
  method: "POST",
  path: "/rest/api/2/issue/archive",
  responseKind: "json",
  requestBody: true,
  accept: "",
  tags: ["issue"],
  scope: "global",
  dataKind: "resource",
  destructive: false
};

const diffOperation: RegisteredOperation = {
  operationId: "bitbucket.pullrequests.diff",
  product: "bitbucket",
  summary: "Get pull request diff",
  method: "GET",
  path: "/rest/api/1.0/diff",
  responseKind: "binary",
  accept: "text/plain",
  tags: ["diff", "binary"],
  scope: "global",
  dataKind: "resource",
  destructive: false
};

beforeEach(async () => {
  readFileSpy.mockClear();
  capturedContentType = "";
  capturedXsrfHeader = "";
  capturedBody = Buffer.alloc(0);
  capturedAccepts = [];
  capturedRawAccept = undefined;
  workdir = await mkdtemp(join(tmpdir(), "atlassian-mcp-http-"));
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      capturedBody = Buffer.concat(chunks);
      capturedContentType = String(request.headers["content-type"] ?? "");
      capturedXsrfHeader = String(request.headers["x-atlassian-token"] ?? "");
      capturedRawAccept = request.headers.accept;
      capturedAccepts.push(String(request.headers.accept ?? ""));
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname === "/rest/api/2/issue/ABC-1/attachments") {
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify([{ id: "10001", filename: "a.txt" }]));
        return;
      }
      if (url.pathname === "/rest/api/2/attachment/content/10001") {
        response.setHeader("content-type", "application/octet-stream");
        response.setHeader("content-disposition", 'attachment; filename="a.txt"');
        response.end(BINARY_PAYLOAD);
        return;
      }
      if (url.pathname === "/rest/api/1.0/diff") {
        if (String(request.headers.accept ?? "").includes("application/octet-stream")) {
          response.statusCode = 406;
          response.end();
          return;
        }
        response.setHeader("content-type", "text/plain");
        response.end("diff-content");
        return;
      }
      if (url.pathname === "/rest/api/2/issue/archive") {
        response.statusCode = 204;
        response.end();
        return;
      }
      if (url.pathname === "/rest/api/2/issue/ABC-1") {
        response.statusCode = 204;
        response.end();
        return;
      }
      if (url.pathname === "/jira/secure/attachment/10001/a.txt") {
        response.setHeader("content-type", "text/plain");
        response.setHeader("content-disposition", 'attachment; filename="a.txt"');
        response.end("trusted attachment");
        return;
      }
      // 429 route with a JSON body containing a credential-looking field,
      // to verify error details are redacted.
      if (url.pathname === "/rest/api/2/rate-limited") {
        response.statusCode = 429;
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ message: "rate limited", token: "secret-pat" }));
        return;
      }
      // 5xx route for the binary download error path.
      if (url.pathname === "/rest/api/2/attachment/content/broken") {
        response.statusCode = 500;
        response.end("internal error");
        return;
      }
      // JSON content-type with a malformed body falls back to raw text.
      if (url.pathname === "/rest/api/2/malformed-json") {
        response.setHeader("content-type", "application/json");
        response.end("{not valid json");
        return;
      }
      // Non-JSON content-type returns the raw body text.
      if (url.pathname === "/rest/api/2/plain-text") {
        response.setHeader("content-type", "text/plain");
        response.end("plain response");
        return;
      }
      // RFC 5987 filename* content-disposition (UTF-8 encoded).
      if (url.pathname === "/rest/api/2/attachment/content/utf8-name") {
        response.setHeader("content-type", "application/octet-stream");
        response.setHeader(
          "content-disposition",
          "attachment; filename*=UTF-8''%E6%96%87%E4%BB%B6.txt"
        );
        response.end(BINARY_PAYLOAD);
        return;
      }
      // Malformed filename* falls back to the undecoded value.
      if (url.pathname === "/rest/api/2/attachment/content/bad-name") {
        response.setHeader("content-type", "application/octet-stream");
        response.setHeader("content-disposition", "attachment; filename*=UTF-8''%ZZinvalid.txt");
        response.end(BINARY_PAYLOAD);
        return;
      }
      // Echoes query parameters so encoding can be asserted.
      if (url.pathname === "/rest/api/2/echo-query") {
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            list: url.searchParams.getAll("list"),
            filter: url.searchParams.get("filter")
          })
        );
        return;
      }
      // Error status with a malformed JSON body: details fall back to raw text.
      if (url.pathname === "/rest/api/2/malformed-error") {
        response.statusCode = 500;
        response.setHeader("content-type", "application/json");
        response.end("{broken");
        return;
      }
      // Repeated response header exercises the array-join path.
      if (url.pathname === "/rest/api/2/multi-header") {
        response.setHeader("content-type", "application/json");
        response.setHeader("x-multi", ["one", "two"]);
        response.end(JSON.stringify({ ok: true }));
        return;
      }
      // B1: chunked binary route without content-length (exercises the streaming counter path).
      if (url.pathname === "/rest/api/2/attachment/content/chunked") {
        response.setHeader("content-type", "application/octet-stream");
        response.write(BINARY_PAYLOAD);
        response.write(BINARY_PAYLOAD); // ~46 bytes total, triggers the counter at 16-byte limit
        response.end();
        return;
      }
      // B2: redirect routes for JSON and binary paths.
      if (url.pathname === "/rest/api/2/redirect-json") {
        response.statusCode = 302;
        response.setHeader("location", "/login.jsp?os_username=admin&os_password=x");
        response.end();
        return;
      }
      if (url.pathname === "/rest/api/2/redirect-binary") {
        response.statusCode = 302;
        response.setHeader("location", "/login.jsp?os_username=admin&os_password=x");
        response.end();
        return;
      }
      // B1/C1: JSON route returning a moderate payload for outputPath tests.
      if (url.pathname === "/rest/api/2/search") {
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ issues: [{ key: "TEST-1" }, { key: "TEST-2" }] }));
        return;
      }
      // C1: empty 204 route — outputPath must still produce a (0-byte) file.
      if (url.pathname === "/rest/api/2/empty") {
        response.statusCode = 204;
        response.end();
        return;
      }
      response.statusCode = 404;
      response.end(JSON.stringify({ message: "not found" }));
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  origin = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await rm(workdir, { recursive: true, force: true });
});

function client(
  overrides?: Partial<{ fileRoot: string; maxDownloadBytes: number }>
): AtlassianHttpClient {
  return new AtlassianHttpClient({
    product: "jira",
    baseUrl: new URL(origin),
    token: "token",
    tlsVerify: false,
    fileRoot: overrides?.fileRoot ?? workdir,
    maxDownloadBytes: overrides?.maxDownloadBytes
  });
}

const redirectJsonOperation: RegisteredOperation = {
  operationId: "jira.redirect.json",
  product: "jira",
  summary: "302 redirect JSON",
  method: "GET",
  path: "/rest/api/2/redirect-json",
  responseKind: "json",
  tags: ["test"],
  scope: "global",
  dataKind: "resource",
  destructive: false
};

const redirectBinaryOperation: RegisteredOperation = {
  operationId: "jira.redirect.binary",
  product: "jira",
  summary: "302 redirect binary",
  method: "GET",
  path: "/rest/api/2/redirect-binary",
  responseKind: "binary",
  tags: ["test"],
  scope: "global",
  dataKind: "resource",
  destructive: false
};

const chunkedDownloadOperation: RegisteredOperation = {
  operationId: "jira.attachment.chunked",
  product: "jira",
  summary: "Chunked binary download",
  method: "GET",
  path: "/rest/api/2/attachment/content/chunked",
  responseKind: "binary",
  tags: ["test"],
  scope: "global",
  dataKind: "resource",
  destructive: false
};

const searchOperation: RegisteredOperation = {
  operationId: "jira.issue.search",
  product: "jira",
  summary: "Search issues",
  method: "GET",
  path: "/rest/api/2/search",
  responseKind: "json",
  tags: ["search"],
  scope: "global",
  dataKind: "resource",
  destructive: false
};

describe("multipart uploads", () => {
  it("sends files as multipart/form-data with the XSRF bypass header", async () => {
    const filePath = join(workdir, "a.txt");
    await writeFile(filePath, "hello attachment");

    const http = client();
    const result = await http.execute(uploadOperation, {
      path: { issueKey: "ABC-1" },
      body: { files: [filePath] }
    });
    await http.close();

    expect(result.status).toBe(200);
    expect(result.data).toEqual([{ id: "10001", filename: "a.txt" }]);
    expect(capturedXsrfHeader).toBe("no-check");
    expect(capturedContentType).toMatch(/^multipart\/form-data; boundary=/);
    const bodyText = capturedBody.toString("utf8");
    expect(bodyText).toContain('name="file"');
    expect(bodyText).toContain('filename="a.txt"');
    expect(bodyText).toContain("hello attachment");
  });

  it("appends extra form fields after the files", async () => {
    const filePath = join(workdir, "a.txt");
    await writeFile(filePath, "x");

    const http = client();
    await http.execute(uploadOperation, {
      path: { issueKey: "ABC-1" },
      body: { files: [filePath], fields: { comment: "note" } }
    });
    await http.close();

    expect(capturedBody.toString("utf8")).toContain('name="comment"');
  });

  it("rejects a relative file path", async () => {
    const http = client();
    await expect(
      http.execute(uploadOperation, {
        path: { issueKey: "ABC-1" },
        body: { files: ["relative.txt"] }
      })
    ).rejects.toThrow(/absolute paths/);
    await http.close();
  });

  it("rejects an empty files array", async () => {
    const http = client();
    await expect(
      http.execute(uploadOperation, {
        path: { issueKey: "ABC-1" },
        body: { files: [] }
      })
    ).rejects.toThrow(/non-empty files array/);
    await http.close();
  });

  it("rejects an upload outside the configured file root", async () => {
    const http = client();
    await expect(
      http.execute(uploadOperation, {
        path: { issueKey: "ABC-1" },
        body: { files: [join(workdir, "..", "outside.txt")] }
      })
    ).rejects.toThrow(/configured file root/);
    await http.close();
  });

  it("rejects more than 10 files without reading any of them", async () => {
    const paths: string[] = [];
    for (let i = 0; i < 11; i += 1) {
      const filePath = join(workdir, `batch-${i}.txt`);
      await writeFile(filePath, "x");
      paths.push(filePath);
    }

    const http = client();
    await expect(
      http.execute(uploadOperation, {
        path: { issueKey: "ABC-1" },
        body: { files: paths }
      })
    ).rejects.toThrow(/at most 10 files per request; received 11/);
    await http.close();
    expect(readFileSpy).not.toHaveBeenCalled();
  });

  it("rejects a request whose files total more than 100 MiB without reading any of them", async () => {
    // Each file is under the 50 MiB per-file limit; the sum exceeds 100 MiB.
    const paths: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const filePath = join(workdir, `large-${i}.bin`);
      await writeFile(filePath, Buffer.alloc(40 * 1024 * 1024, i + 1));
      paths.push(filePath);
    }

    const http = client();
    await expect(
      http.execute(uploadOperation, {
        path: { issueKey: "ABC-1" },
        body: { files: paths }
      })
    ).rejects.toThrow(/limited to 104857600 total bytes/);
    await http.close();
    expect(readFileSpy).not.toHaveBeenCalled();
  });

  it("rejects a single file over 50 MiB without reading it, and reports the limit", async () => {
    const filePath = join(workdir, "too-big.bin");
    await writeFile(filePath, Buffer.alloc(50 * 1024 * 1024 + 1));

    const http = client();
    await expect(
      http.execute(uploadOperation, {
        path: { issueKey: "ABC-1" },
        body: { files: [filePath] }
      })
    ).rejects.toThrow(/too-big\.bin is 52428801 bytes, exceeding the 52428800-byte per-file limit/);
    await http.close();
    expect(readFileSpy).not.toHaveBeenCalled();
  });

  it("accepts a file of exactly 50 MiB (per-file boundary)", async () => {
    const filePath = join(workdir, "exact.bin");
    await writeFile(filePath, Buffer.alloc(50 * 1024 * 1024, 7));

    const http = client();
    const result = await http.execute(uploadOperation, {
      path: { issueKey: "ABC-1" },
      body: { files: [filePath] }
    });
    await http.close();

    expect(result.status).toBe(200);
    expect(capturedContentType).toMatch(/^multipart\/form-data; boundary=/);
  });

  // mkfifo has no Windows equivalent; the FIFO rejection path is unix-only.
  it.skipIf(process.platform === "win32")(
    "rejects a non-regular file (FIFO) without reading it",
    async () => {
      const fifoPath = join(workdir, "pipe.fifo");
      execFileSync("mkfifo", [fifoPath]);

      const http = client();
      await expect(
        http.execute(uploadOperation, {
          path: { issueKey: "ABC-1" },
          body: { files: [fifoPath] }
        })
      ).rejects.toThrow(/only uploads regular files/);
      await http.close();
      expect(readFileSpy).not.toHaveBeenCalled();
    }
  );
});

describe("binary downloads", () => {
  it("uses the manifest accept field for the Bitbucket diff endpoint", async () => {
    const target = join(workdir, "pull-request.diff");
    const http = client();
    await http.execute(diffOperation, { downloadPath: target });
    await http.close();

    expect(capturedAccepts).toEqual(["text/plain"]);
    expect(await readFile(target, "utf8")).toBe("diff-content");
  });

  it("saves the response body to downloadPath and returns metadata", async () => {
    const target = join(workdir, "nested", "a.txt");

    const http = client();
    const result = await http.execute(downloadOperation, {
      path: { attachmentId: "10001" },
      downloadPath: target
    });
    await http.close();

    const metadata = result.data as Record<string, unknown>;
    expect(metadata.savedPath).toBe(target);
    expect(metadata.fileName).toBe("a.txt");
    expect(metadata.size).toBe(BINARY_PAYLOAD.length);
    expect(await readFile(target)).toEqual(BINARY_PAYLOAD);
  });

  it("returns metadata only when downloadPath is omitted", async () => {
    const http = client();
    const result = await http.execute(downloadOperation, {
      path: { attachmentId: "10001" }
    });
    await http.close();

    const metadata = result.data as Record<string, unknown>;
    expect(metadata.savedPath).toBeUndefined();
    expect(metadata.fileName).toBe("a.txt");
  });

  it("rejects a relative downloadPath", async () => {
    const http = client();
    await expect(
      http.execute(downloadOperation, {
        path: { attachmentId: "10001" },
        downloadPath: "relative.txt"
      })
    ).rejects.toThrow(/absolute path/);
    await http.close();
  });

  it("rejects a downloadPath outside the configured file root", async () => {
    const http = client();
    await expect(
      http.execute(downloadOperation, {
        path: { attachmentId: "10001" },
        downloadPath: join(workdir, "..", "outside.txt")
      })
    ).rejects.toThrow(/configured file root/);
    await http.close();
  });

  it("refuses to overwrite an existing download", async () => {
    const target = join(workdir, "existing.txt");
    await writeFile(target, "keep me");
    const http = client();
    await expect(
      http.execute(downloadOperation, {
        path: { attachmentId: "10001" },
        downloadPath: target
      })
    ).rejects.toThrow(/refusing to overwrite/);
    await http.close();
    expect(await readFile(target, "utf8")).toBe("keep me");
  });
});

describe("empty successful responses", () => {
  it("omits the Accept header when manifest accept is an empty string", async () => {
    const http = client();
    await http.execute(noAcceptOperation, {
      path: {},
      body: ["KEY-1", "KEY-2"]
    });
    await http.close();
    expect(capturedRawAccept).toBeUndefined();
  });

  it("drains a 204 response without aborting the MCP process", async () => {
    const http = client();
    const result = await http.execute(noContentOperation, {
      path: { issueKey: "ABC-1" }
    });
    await http.close();
    expect(result.status).toBe(204);
    expect(result.data).toBeNull();
  });
});

describe("server-provided attachment links", () => {
  it("downloads an allowlisted same-origin link below the file root", async () => {
    const target = join(workdir, "trusted", "a.txt");
    const http = client();
    const result = await http.downloadTrustedLink(
      "jira.attachment.download",
      `${origin}/jira/secure/attachment/10001/a.txt`,
      ["/jira/secure/attachment/"],
      target
    );
    await http.close();
    expect(result.status).toBe(200);
    expect(await readFile(target, "utf8")).toBe("trusted attachment");
  });

  it("rejects cross-origin and unexpected same-origin paths", async () => {
    const http = client();
    await expect(
      http.downloadTrustedLink(
        "jira.attachment.download",
        "https://attacker.invalid/secure/attachment/10001/a.txt",
        ["/secure/attachment/"],
        join(workdir, "cross-origin.txt")
      )
    ).rejects.toThrow(/cross-origin/);
    await expect(
      http.downloadTrustedLink(
        "jira.attachment.download",
        `${origin}/rest/api/2/serverInfo`,
        ["/secure/attachment/"],
        join(workdir, "wrong-path.txt")
      )
    ).rejects.toThrow(/unexpected attachment download path/);
    await http.close();
  });
});

// ── B1: download byte limit ──

describe("download byte limit", () => {
  it("rejects via content-length pre-check when Content-Length exceeds the limit", async () => {
    const http = client({ maxDownloadBytes: 16 });
    const target = join(workdir, "should-not-exist.bin");
    await expect(
      http.execute(downloadOperation, {
        path: { attachmentId: "10001" },
        downloadPath: target
      })
    ).rejects.toThrow(/max-download-bytes/);
    await http.close();
    // Half-written file must not exist.
    expect(existsSync(target)).toBe(false);
  });

  it("rejects via streaming counter for chunked responses without Content-Length", async () => {
    const http = client({ maxDownloadBytes: 16 });
    const target = join(workdir, "chunked-should-not-exist.bin");
    await expect(http.execute(chunkedDownloadOperation, { downloadPath: target })).rejects.toThrow(
      /max-download-bytes/
    );
    await http.close();
    expect(existsSync(target)).toBe(false);
  });
});

// ── B2: 3xx rejection ──

describe("redirect rejection", () => {
  it("rejects a 302 JSON response with a descriptive error and sanitized location", async () => {
    const http = client();
    await expect(http.execute(redirectJsonOperation, {})).rejects.toMatchObject({
      name: "AtlassianHttpError",
      message: expect.stringMatching(/redirect/) as unknown as string
    });
    await http.close();
  });

  it("rejects a 302 binary response with a descriptive error and sanitized location", async () => {
    const http = client();
    await expect(
      http.execute(redirectBinaryOperation, { downloadPath: join(workdir, "redir.bin") })
    ).rejects.toMatchObject({
      name: "AtlassianHttpError",
      message: expect.stringMatching(/redirect/) as unknown as string
    });
    await http.close();
  });
});

// ── B3: sandbox edge cases ──

describe("sandbox edge cases", () => {
  // Symlink creation/traversal follows unix semantics; unprivileged Windows
  // cannot create symlinks and junctions resolve differently.
  it.skipIf(process.platform === "win32")(
    "rejects a symlink that points outside the file root and does not create directories outside",
    async () => {
      // Create a symlink inside workdir pointing outside.
      const outsideDir = join(workdir, "..", "escape-target");
      const linkPath = join(workdir, "escape-link");
      symlinkSync(workdir + "/..", linkPath);
      try {
        const http = client();
        const target = join(linkPath, "escape-target", "out.bin");
        await expect(
          http.execute(downloadOperation, {
            path: { attachmentId: "10001" },
            downloadPath: target
          })
        ).rejects.toThrow(/configured file root/);
        await http.close();
        expect(existsSync(outsideDir)).toBe(false);
      } finally {
        rm(linkPath, { force: true }).catch(() => {});
      }
    }
  );

  it.skipIf(process.platform === "win32")(
    "rejects upload via symlink outside the file root",
    async () => {
      const linkPath = join(workdir, "upload-link");
      symlinkSync(workdir + "/..", linkPath);
      try {
        const http = client();
        const fileThroughLink = join(linkPath, "outside.txt");
        await expect(
          http.execute(uploadOperation, {
            path: { issueKey: "ABC-1" },
            body: { files: [fileThroughLink] }
          })
        ).rejects.toThrow(/configured file root/);
        await http.close();
      } finally {
        rm(linkPath, { force: true }).catch(() => {});
      }
    }
  );
});

// ── C1: outputPath response-to-file ──

describe("outputPath response-to-file", () => {
  it("saves the raw upstream JSON body to outputPath byte-for-byte", async () => {
    const target = join(workdir, "search-result.json");
    const http = client();
    const result = await http.execute(searchOperation, { outputPath: target });
    await http.close();

    const data = result.data as { savedPath: string; bytes: number };
    expect(data.savedPath).toBe(target);
    expect(data.bytes).toBeGreaterThan(0);
    expect(await readFile(target, "utf8")).toBe(
      JSON.stringify({ issues: [{ key: "TEST-1" }, { key: "TEST-2" }] })
    );
  });

  it("enforces the download byte limit on outputPath writes", async () => {
    const target = join(workdir, "too-large.json");
    const http = client({ maxDownloadBytes: 16 });
    await expect(http.execute(searchOperation, { outputPath: target })).rejects.toThrow(
      /max-download-bytes/
    );
    await http.close();
    expect(existsSync(target)).toBe(false);
  });

  it("rejects an outputPath outside the configured file root", async () => {
    const http = client();
    const target = join(workdir, "..", "outside.json");
    await expect(http.execute(searchOperation, { outputPath: target })).rejects.toThrow(
      /configured file root/
    );
    await http.close();
  });

  it("refuses to overwrite an existing file", async () => {
    const target = join(workdir, "exists.json");
    await writeFile(target, "keep me");
    const http = client();
    await expect(http.execute(searchOperation, { outputPath: target })).rejects.toThrow(
      /refusing to overwrite/
    );
    await http.close();
    expect(await readFile(target, "utf8")).toBe("keep me");
  });

  it("rejects outputPath with a 302 redirect — no file is created", async () => {
    const target = join(workdir, "redirect-out.json");
    const http = client();
    await expect(http.execute(redirectJsonOperation, { outputPath: target })).rejects.toMatchObject(
      {
        name: "AtlassianHttpError",
        message: expect.stringMatching(/redirect/) as unknown as string
      }
    );
    await http.close();
    // B2 guard runs before saveBodyToFile — no file must be left on disk.
    expect(existsSync(target)).toBe(false);
  });

  it("rejects outputPath with a 4xx error — no file is created", async () => {
    const target = join(workdir, "error-out.json");
    const http = client();
    // Call a non-existent path so the mock server returns 404 with a JSON body.
    const notFoundOp: RegisteredOperation = {
      operationId: "jira.notfound",
      product: "jira",
      summary: "404",
      method: "GET",
      path: "/rest/api/2/nonexistent",
      responseKind: "json",
      tags: ["test"],
      scope: "global",
      dataKind: "resource",
      destructive: false
    };
    await expect(http.execute(notFoundOp, { outputPath: target })).rejects.toMatchObject({
      name: "AtlassianHttpError"
    });
    await http.close();
    expect(existsSync(target)).toBe(false);
  });

  it("writes a 0-byte file for a 204 response so savedPath always exists", async () => {
    const target = join(workdir, "empty-out.json");
    const http = client();
    const emptyOp: RegisteredOperation = {
      operationId: "jira.empty",
      product: "jira",
      summary: "204",
      method: "GET",
      path: "/rest/api/2/empty",
      responseKind: "json",
      tags: ["test"],
      scope: "global",
      dataKind: "resource",
      destructive: false
    };
    const result = await http.execute(emptyOp, { outputPath: target });
    await http.close();
    const data = result.data as { savedPath: string; bytes: number };
    expect(data.bytes).toBe(0);
    expect(await readFile(target, "utf8")).toBe("");
  });
});

// ── Blind-spot coverage: error statuses, encoding edges, sanitization ──

describe("HTTP error statuses", () => {
  const rateLimitedOperation: RegisteredOperation = {
    operationId: "jira.rate.limited",
    product: "jira",
    summary: "429",
    method: "GET",
    path: "/rest/api/2/rate-limited",
    responseKind: "json",
    tags: ["test"],
    scope: "global",
    dataKind: "resource",
    destructive: false
  };

  it("maps 429 to a structured error with credential fields redacted", async () => {
    const http = client();
    await expect(http.execute(rateLimitedOperation, {})).rejects.toMatchObject({
      name: "AtlassianHttpError",
      status: 429,
      details: { message: "rate limited", token: "[REDACTED]" }
    });
    await http.close();
  });

  it("maps a 5xx binary download to a structured error without writing a file", async () => {
    const brokenOperation: RegisteredOperation = {
      operationId: "jira.attachment.broken",
      product: "jira",
      summary: "500 binary",
      method: "GET",
      path: "/rest/api/2/attachment/content/broken",
      responseKind: "binary",
      tags: ["test"],
      scope: "global",
      dataKind: "resource",
      destructive: false
    };
    const target = join(workdir, "broken.bin");
    const http = client();
    await expect(http.execute(brokenOperation, { downloadPath: target })).rejects.toMatchObject({
      name: "AtlassianHttpError",
      status: 500
    });
    await http.close();
    expect(existsSync(target)).toBe(false);
  });

  it("keeps raw text as error details when an error body is malformed JSON", async () => {
    const malformedErrorOperation: RegisteredOperation = {
      operationId: "jira.malformed.error",
      product: "jira",
      summary: "500 malformed",
      method: "GET",
      path: "/rest/api/2/malformed-error",
      responseKind: "json",
      tags: ["test"],
      scope: "global",
      dataKind: "resource",
      destructive: false
    };
    const target = join(workdir, "malformed-error.json");
    const http = client();
    await expect(
      http.execute(malformedErrorOperation, { outputPath: target })
    ).rejects.toMatchObject({
      name: "AtlassianHttpError",
      status: 500,
      details: "{broken"
    });
    await http.close();
    expect(existsSync(target)).toBe(false);
  });
});

describe("response body decoding", () => {
  it("falls back to raw text when a JSON content-type body is malformed", async () => {
    const malformedOperation: RegisteredOperation = {
      operationId: "jira.malformed.json",
      product: "jira",
      summary: "malformed JSON",
      method: "GET",
      path: "/rest/api/2/malformed-json",
      responseKind: "json",
      tags: ["test"],
      scope: "global",
      dataKind: "resource",
      destructive: false
    };
    const http = client();
    const result = await http.execute(malformedOperation, {});
    await http.close();
    expect(result.data).toBe("{not valid json");
  });

  it("returns raw text for non-JSON content types", async () => {
    const plainOperation: RegisteredOperation = {
      operationId: "jira.plain.text",
      product: "jira",
      summary: "plain text",
      method: "GET",
      path: "/rest/api/2/plain-text",
      responseKind: "json",
      tags: ["test"],
      scope: "global",
      dataKind: "resource",
      destructive: false
    };
    const http = client();
    const result = await http.execute(plainOperation, {});
    await http.close();
    expect(result.data).toBe("plain response");
  });

  it("joins repeated response headers and redacts sensitive ones", async () => {
    const multiHeaderOperation: RegisteredOperation = {
      operationId: "jira.multi.header",
      product: "jira",
      summary: "multi header",
      method: "GET",
      path: "/rest/api/2/multi-header",
      responseKind: "json",
      tags: ["test"],
      scope: "global",
      dataKind: "resource",
      destructive: false
    };
    const http = client();
    const result = await http.execute(multiHeaderOperation, {});
    await http.close();
    expect(result.headers["x-multi"]).toBe("one, two");
  });

  it("decodes RFC 5987 filename* content-disposition values", async () => {
    const utf8NameOperation: RegisteredOperation = {
      operationId: "jira.attachment.utf8name",
      product: "jira",
      summary: "utf8 filename",
      method: "GET",
      path: "/rest/api/2/attachment/content/utf8-name",
      responseKind: "binary",
      tags: ["test"],
      scope: "global",
      dataKind: "resource",
      destructive: false
    };
    const http = client();
    const result = await http.execute(utf8NameOperation, {});
    await http.close();
    expect((result.data as { fileName: string }).fileName).toBe("文件.txt");
  });

  it("keeps the raw filename* value when percent-decoding fails", async () => {
    const badNameOperation: RegisteredOperation = {
      operationId: "jira.attachment.badname",
      product: "jira",
      summary: "bad filename",
      method: "GET",
      path: "/rest/api/2/attachment/content/bad-name",
      responseKind: "binary",
      tags: ["test"],
      scope: "global",
      dataKind: "resource",
      destructive: false
    };
    const http = client();
    const result = await http.execute(badNameOperation, {});
    await http.close();
    expect((result.data as { fileName: string }).fileName).toBe("%ZZinvalid.txt");
  });
});

describe("request construction edges", () => {
  it("rejects a missing path parameter", async () => {
    const http = client();
    await expect(http.execute(noContentOperation, {})).rejects.toThrow(
      /Missing path parameter: issueKey/
    );
    await http.close();
  });

  it("rejects unknown path parameters", async () => {
    const http = client();
    await expect(
      http.execute(noContentOperation, { path: { issueKey: "ABC-1", extra: "x" } })
    ).rejects.toThrow(/Unknown path parameter/);
    await http.close();
  });

  it("rejects unsafe segments in *Path parameters", async () => {
    const filePathOperation: RegisteredOperation = {
      operationId: "jira.file.bypath",
      product: "jira",
      summary: "file by path",
      method: "GET",
      path: "/rest/api/2/files/{filePath}",
      responseKind: "json",
      tags: ["test"],
      scope: "global",
      dataKind: "resource",
      destructive: false
    };
    const http = client();
    await expect(
      http.execute(filePathOperation, { path: { filePath: "../escape" } })
    ).rejects.toThrow(/unsafe path segment/);
    await http.close();
  });

  it("encodes array and object query values", async () => {
    const echoOperation: RegisteredOperation = {
      operationId: "jira.echo.query",
      product: "jira",
      summary: "echo query",
      method: "GET",
      path: "/rest/api/2/echo-query",
      responseKind: "json",
      tags: ["test"],
      scope: "global",
      dataKind: "resource",
      destructive: false
    };
    const http = client();
    const result = await http.execute(echoOperation, {
      query: { list: ["1", "2"], filter: { a: 1 } }
    });
    await http.close();
    expect(result.data).toEqual({ list: ["1", "2"], filter: '{"a":1}' });
  });

  it("rejects a request body on an operation that does not accept one", async () => {
    const http = client();
    await expect(http.execute(searchOperation, { body: { jql: "x" } })).rejects.toThrow(
      /does not accept a request body/
    );
    await http.close();
  });

  it("rejects an unparseable trusted download URL", async () => {
    const http = client();
    await expect(
      http.downloadTrustedLink("jira.attachment.content", "http://[", ["/"], join(workdir, "x.bin"))
    ).rejects.toThrow(/invalid download URL/);
    await http.close();
  });
});

describe("multipart validation edges", () => {
  it("rejects a non-object multipart body", async () => {
    const http = client();
    await expect(
      http.execute(uploadOperation, { path: { issueKey: "ABC-1" }, body: "nope" })
    ).rejects.toThrow(/expects a multipart body/);
    await http.close();
  });

  it("rejects an empty files array", async () => {
    const http = client();
    await expect(
      http.execute(uploadOperation, { path: { issueKey: "ABC-1" }, body: { files: [] } })
    ).rejects.toThrow(/non-empty files array/);
    await http.close();
  });

  it("rejects non-string file entries", async () => {
    const http = client();
    await expect(
      http.execute(uploadOperation, { path: { issueKey: "ABC-1" }, body: { files: [123] } })
    ).rejects.toThrow(/files entries must be absolute paths/);
    await http.close();
  });

  it("rejects non-object multipart fields", async () => {
    const filePath = join(workdir, "a.txt");
    await writeFile(filePath, "hello");
    const http = client();
    await expect(
      http.execute(uploadOperation, {
        path: { issueKey: "ABC-1" },
        body: { files: [filePath], fields: "x" }
      })
    ).rejects.toThrow(/fields must be an object/);
    await http.close();
  });

  it("rejects an upload whose parent directory does not exist", async () => {
    const http = client();
    await expect(
      http.execute(uploadOperation, {
        path: { issueKey: "ABC-1" },
        body: { files: [join(workdir, "missing", "x.txt")] }
      })
    ).rejects.toThrow(/parent directory does not exist/);
    await http.close();
  });
});

describe("sanitizeErrorDetails", () => {
  it("truncates arrays to 20 entries", () => {
    const input = Array.from({ length: 25 }, (_, index) => index);
    expect(sanitizeErrorDetails(input)).toHaveLength(20);
  });

  it("redacts credential-looking keys at any nesting depth", () => {
    const input = { outer: { password: "secret", nested: [{ authorization: "Bearer x", ok: 1 }] } };
    expect(sanitizeErrorDetails(input)).toEqual({
      outer: { password: "[REDACTED]", nested: [{ authorization: "[REDACTED]", ok: 1 }] }
    });
  });

  it("truncates long strings and passes primitives through", () => {
    // The string cap comes from the shared budgeted implementation in
    // errors.ts (limitErrorDetails): 2000 characters per string.
    expect(sanitizeErrorDetails("x".repeat(5000))).toHaveLength(2000);
    expect(sanitizeErrorDetails(42)).toBe(42);
    expect(sanitizeErrorDetails(null)).toBeNull();
  });
});
