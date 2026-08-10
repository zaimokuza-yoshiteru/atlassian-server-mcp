// File transfer: multipart uploads, binary/outputPath downloads, and the
// file-root sandbox that keeps every read/write under the configured root.
import { createWriteStream } from "node:fs";
import { lstat, mkdir, readFile, realpath, stat, unlink } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { Blob } from "node:buffer";
import { FormData, type request } from "undici";
import { AtlassianHttpError } from "./http-error.js";
import type { HttpResult, RegisteredOperation, ProductConfig } from "./types.js";

// Upload limits for multipart attachment requests. Files are read fully into
// memory, so the caps keep a single request within a sane Node memory budget
// while covering typical Data Center attachment batches:
// - 50 MiB per file: matches the common Jira DC attachment size default.
// - 10 files / 100 MiB total per request: comfortably covers batch uploads
//   (e.g. a handful of log bundles) without letting a large batch OOM the
//   process.
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_UPLOAD_FILES = 10;
const MAX_UPLOAD_TOTAL_BYTES = 100 * 1024 * 1024;
const DEFAULT_MAX_DOWNLOAD_BYTES = 104_857_600; // 100 MB — matches config.ts default
// storageValueFile limit for Confluence page bodies. Storage-format pages are
// typically tens to a few hundred KB; 10 MiB covers oversized pages while
// keeping the value (a JSON string inside the request body) within a sane
// memory and request-size budget.
export const MAX_STORAGE_VALUE_BYTES = 10 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".txt": "text/plain",
  ".json": "application/json",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
  ".zip": "application/zip"
};

function contentDispositionFilename(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(value)?.[1];
  if (utf8) {
    try {
      return decodeURIComponent(utf8);
    } catch {
      return utf8;
    }
  }
  return /filename="?([^";]+)"?/i.exec(value)?.[1];
}

type UndiciResponse = Awaited<ReturnType<typeof request>>;

export async function consumeBinaryResponse(
  response: UndiciResponse,
  safeHeaders: Record<string, string>,
  config: ProductConfig,
  operationId: string,
  sourceUrl: URL,
  downloadPath?: string
): Promise<HttpResult> {
  // Redirect guard for binary downloads: a session-expired instance may
  // redirect the request to a login page, which would otherwise write HTML
  // to the downloadPath file.
  if (response.statusCode >= 300 && response.statusCode < 400) {
    await response.body.dump();
    let safeLocation = "";
    try {
      const location = String(response.headers.location ?? "");
      if (location)
        safeLocation = new URL(location, sourceUrl).origin + new URL(location, sourceUrl).pathname;
    } catch {
      /* malformed location — omit it */
    }
    throw new AtlassianHttpError(
      config.product,
      operationId,
      response.statusCode,
      `${operationId} failed with HTTP ${response.statusCode}: upstream returned a redirect` +
        (safeLocation ? ` to ${safeLocation}` : "") +
        ". This usually means the session expired or the instance redirected to a login page; " +
        "this client does not follow redirects. Check credentials and instance state."
    );
  }
  if (response.statusCode >= 400) {
    await response.body.dump();
    throw new AtlassianHttpError(
      config.product,
      operationId,
      response.statusCode,
      `${operationId} failed with HTTP ${response.statusCode}`
    );
  }
  const metadata: Record<string, unknown> = {
    fileName: contentDispositionFilename(safeHeaders["content-disposition"]),
    mediaType: safeHeaders["content-type"] ?? "application/octet-stream",
    size: safeHeaders["content-length"] ? Number(safeHeaders["content-length"]) : undefined,
    // Never expose query parameters (which may contain signed download tokens)
    // in the public metadata.
    sourceUrl: sourceUrl.origin + sourceUrl.pathname
  };
  if (downloadPath === undefined) {
    await response.body.dump();
    return { status: response.statusCode, headers: safeHeaders, data: metadata };
  }

  const target = await safeFilePath(config.fileRoot, downloadPath, "downloadPath", true);
  const parent = await realpath(dirname(target));
  if (!(await isWithinRoot(config.fileRoot, parent))) {
    await response.body.dump();
    throw new Error("downloadPath parent escapes the configured file root");
  }
  const bytes = await saveBodyToFile(response, config, operationId, target);
  metadata.savedPath = downloadPath;
  metadata.size = bytes;
  return { status: response.statusCode, headers: safeHeaders, data: metadata };
}

function downloadLimitError(operationId: string, limit: number): Error {
  return new Error(
    `${operationId} response exceeds the ${limit}-byte download limit set by --max-download-bytes ` +
      `(env ATLASSIAN_MAX_DOWNLOAD_BYTES). Raise the limit to allow larger responses.`
  );
}

export async function saveBodyToFile(
  response: UndiciResponse,
  config: ProductConfig,
  operationId: string,
  target: string
): Promise<number> {
  const limit = config.maxDownloadBytes ?? DEFAULT_MAX_DOWNLOAD_BYTES;
  // Fast-fail: known content-length exceeding the limit.
  const contentLength = response.headers["content-length"]
    ? Number(response.headers["content-length"])
    : undefined;
  if (contentLength !== undefined && contentLength > limit) {
    await response.body.dump();
    throw downloadLimitError(operationId, limit);
  }
  // Refuse to overwrite an existing file.
  await lstat(target)
    .then(async () => {
      await response.body.dump();
      throw new Error("target file already exists; refusing to overwrite it");
    })
    .catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    });
  // Counting transform: trips the pipeline once bytes exceed the limit.
  let received = 0;
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length;
      if (received > limit) {
        callback(downloadLimitError(operationId, limit));
        return;
      }
      callback(null, chunk);
    }
  });
  try {
    await pipeline(response.body, counter, createWriteStream(target, { flags: "wx" }));
  } catch (error) {
    // Remove the half-written file so the next attempt doesn't deadlock on
    // the "wx" refusal-to-overwrite guard. Skip unlink on EEXIST — the file
    // already existed before we opened it (TOCTOU: another process created it
    // between our lstat check and the wx open), so it is not ours to delete.
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      await unlink(target).catch(() => {});
    }
    throw error;
  }
  return received;
}

export async function buildMultipartBody(
  operation: RegisteredOperation,
  config: ProductConfig,
  value: unknown
): Promise<FormData> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `${operation.operationId} expects a multipart body: { files: string[], fields?: Record<string, string> }`
    );
  }
  const { files, fields } = value as { files?: unknown; fields?: unknown };
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error(`${operation.operationId} requires a non-empty files array`);
  }
  const fieldName = operation.multipartField ?? "file";
  const form = new FormData();
  if (files.length > MAX_UPLOAD_FILES) {
    throw new Error(
      `${operation.operationId} accepts at most ${MAX_UPLOAD_FILES} files per request; received ${files.length}`
    );
  }
  // Resolve and validate every file before reading anything, so a request
  // that violates a limit reads zero file bytes into memory.
  const resolvedFiles: { path: string; size: number }[] = [];
  let totalBytes = 0;
  for (const file of files) {
    if (typeof file !== "string") {
      throw new Error(`${operation.operationId} files entries must be absolute paths`);
    }
    const source = await safeFilePath(config.fileRoot, file, "file");
    const canonicalSource = await realpath(source);
    if (!(await isWithinRoot(config.fileRoot, canonicalSource))) {
      throw new Error(`${operation.operationId} file path escapes the configured file root`);
    }
    const fileStat = await lstat(canonicalSource);
    if (!fileStat.isFile()) {
      throw new Error(
        `${operation.operationId} only uploads regular files: ${basename(canonicalSource)} is not a regular file`
      );
    }
    if (fileStat.size > MAX_FILE_BYTES) {
      throw new Error(
        `${operation.operationId} file ${basename(canonicalSource)} is ${fileStat.size} bytes, exceeding the ${MAX_FILE_BYTES}-byte per-file limit`
      );
    }
    totalBytes += fileStat.size;
    resolvedFiles.push({ path: canonicalSource, size: fileStat.size });
  }
  if (totalBytes > MAX_UPLOAD_TOTAL_BYTES) {
    throw new Error(
      `${operation.operationId} uploads are limited to ${MAX_UPLOAD_TOTAL_BYTES} total bytes per request; these ${resolvedFiles.length} files total ${totalBytes} bytes`
    );
  }
  for (const { path: filePath } of resolvedFiles) {
    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const mimeType = MIME_BY_EXT[ext] ?? "application/octet-stream";
    form.append(fieldName, new Blob([data], { type: mimeType }), basename(filePath));
  }
  if (fields !== undefined) {
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      throw new Error(`${operation.operationId} fields must be an object`);
    }
    for (const [key, fieldValue] of Object.entries(fields)) {
      form.append(key, String(fieldValue));
    }
  }
  return form;
}

// Read a UTF-8 text file from inside the file-root sandbox (same guard chain
// as multipart uploads: safeFilePath → realpath → within-root → regular file
// → size cap). Used by the Confluence storageValueFile parameter.
export async function readSandboxedTextFile(
  config: ProductConfig | undefined,
  value: string,
  label: string,
  maxBytes: number
): Promise<string> {
  const source = await safeFilePath(config?.fileRoot, value, label);
  const canonicalSource = await realpath(source);
  if (!(await isWithinRoot(config?.fileRoot, canonicalSource))) {
    throw new Error(`${label} escapes the configured file root`);
  }
  const fileStat = await lstat(canonicalSource);
  if (!fileStat.isFile()) {
    throw new Error(`${label} must be a regular file`);
  }
  if (fileStat.size > maxBytes) {
    throw new Error(`${label} is ${fileStat.size} bytes, exceeding the ${maxBytes}-byte limit`);
  }
  return readFile(canonicalSource, "utf8");
}

export async function safeFilePath(
  root: string | undefined,
  value: string,
  label: string,
  createDirs = false
): Promise<string> {
  if (!isAbsolute(value)) throw new Error(`${label} must be absolute paths`);
  if (!root) throw new Error(`${label} requires ATLASSIAN_FILE_ROOT or a product FILE_ROOT`);
  const resolvedRoot = resolve(root);
  const target = resolve(value);
  if (!isWithinResolvedPath(resolvedRoot, target)) {
    throw new Error(`${label} must be under the configured file root`);
  }
  // Symlink-escape guard: validate the nearest existing ancestor is within
  // root BEFORE creating any directories (prevents symlink-escape via mkdir
  // following a symlink pointing outside root).
  let ancestor = dirname(target);
  for (;;) {
    try {
      const canonicalAncestor = await realpath(ancestor);
      if (!(await isWithinRoot(resolvedRoot, canonicalAncestor))) {
        throw new Error(`${label} must be under the configured file root`);
      }
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        const parent = dirname(ancestor);
        if (parent === ancestor)
          throw new Error(`${label} parent cannot be resolved`, { cause: error });
        ancestor = parent;
        continue;
      }
      throw error;
    }
  }
  // Only create directories for download/outputPath flows (createDirs: true).
  // Upload paths (createDirs: false) are read-only — no directory side effects.
  if (createDirs) {
    await mkdir(dirname(target), { recursive: true });
  } else {
    try {
      await stat(dirname(target));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`${label} parent directory does not exist`, { cause: error });
      }
      throw error;
    }
  }
  // Belt-and-braces post-check: parent after resolution is still inside root.
  const canonicalParent = await realpath(dirname(target));
  if (!(await isWithinRoot(resolvedRoot, canonicalParent))) {
    throw new Error(`${label} must be under the configured file root`);
  }
  return resolve(canonicalParent, basename(target));
}

function isWithinResolvedPath(root: string, target: string): boolean {
  const rel = relative(root, target);
  // path.relative emits the platform separator ("..\\x" on Windows) — compare
  // against `..${sep}`, not a POSIX-only "../", or containment is bypassed.
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

export async function isWithinRoot(root: string | undefined, target: string): Promise<boolean> {
  if (!root) return false;
  // Canonicalize BOTH sides with the same async realpath: on Windows the
  // sync and async variants can disagree on 8.3 short-name/case form, and a
  // mixed-form comparison makes relative() see an escape that is not there.
  let canonicalRoot: string;
  try {
    canonicalRoot = await realpath(resolve(root));
  } catch {
    canonicalRoot = resolve(root);
  }
  const rel = relative(canonicalRoot, resolve(target));
  // See isWithinResolvedPath: `..${sep}`, never a POSIX-only "../".
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}
