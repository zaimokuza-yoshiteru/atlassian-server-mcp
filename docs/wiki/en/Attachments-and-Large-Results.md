# Attachments and Large Results

How the server moves files and oversized payloads between your machine and
the Atlassian products — and the limits that keep an agent from flooding
memory or disk.

## The file sandbox

All local file access is **opt-in and sandboxed**:

```bash
export ATLASSIAN_FILE_ROOT=/absolute/path/to/attachments
# optional per-product overrides:
export JIRA_FILE_ROOT=...
export CONFLUENCE_FILE_ROOT=...
export BITBUCKET_FILE_ROOT=...
```

Without a file root, uploads, downloads, `outputPath`, and `storageValueFile`
are unavailable. Every local path must be absolute and resolve (after
symlink resolution) inside the root; anything escaping the sandbox is
rejected. Non-regular files (FIFOs, devices, sockets) are rejected.
Download targets that already exist are **never overwritten**.

## Uploads (multipart)

Pass local files in the operation body:

```json
{ "files": ["/abs/path/under/file-root/a.png", "/abs/path/under/file-root/b.log"] }
```

Limits (all three enforced before any file is read):

- **10 files** per request
- **50 MiB** per file
- **100 MiB** total per request

Exceeding any limit returns a structured error naming the file, its size, and
the limit.

## Downloads

Binary downloads (Jira/Confluence attachments, Bitbucket diff/raw/archive)
are saved to disk with an absolute `downloadPath` under the file root:

- Default cap: **100 MiB** per download
- Configurable: `--max-download-bytes` / `ATLASSIAN_MAX_DOWNLOAD_BYTES`
  (minimum 1 MiB)
- Existing files are never overwritten

Typed helpers `jira_download_attachment` and
`confluence_download_attachment` wrap the common cases.

## Large responses: outputPath

When a read is expected to exceed the response budget, pass `outputPath` to
`atlassian_execute_operation` or any read-only typed tool. The raw upstream
body is **streamed to a file under the file root** without entering memory;
the result includes `savedPath` and `bytes`. Pagination is skipped
(`hasMore` is always false, no `nextCursor`) — read the file in chunks with
file-system tools instead. `outputPath` shares the
`--max-download-bytes` cap.

## Large Confluence pages: storageValueFile

For big page bodies, `confluence_create_content` and
`confluence_update_content` accept `storageValueFile`: an absolute path under
the file root to a file containing **Confluence storage-format XHTML**
(up to **10 MiB**). The file content becomes `body.storage.value`
(`representation` fixed to `storage`), and the parameter is mutually
exclusive with an inline `body.storage.value`. Convert other formats
(Markdown etc.) with an external tool such as pandoc first — the server does
not render or convert content.

## Pagination and response budgets

MCP protocol pagination does not cover application data inside `tools/call`,
so reads use a server-defined envelope with `cursor` / `nextCursor`:

```ts
{
  cursor?: string;
  pageSize?: number; // default 25, max 100
  responseProfile?: "compact" | "standard" | "full";
  fields?: string[];
  maxOutputBytes?: number;
}
```

- Default serialized response budget: **65,536 bytes** per page
  (`--max-output-bytes` / `ATLASSIAN_MAX_OUTPUT_BYTES` to change).
- `compact` omits Jira `customfield_*` values unless selected via `fields`;
  use `jira_list_fields` to map IDs to names.
- A single oversized object is traversed in stable JSON-path order; oversized
  strings split by UTF-8 byte count.
- Cursors are **HMAC-signed**, expire after **15 minutes**
  (`--cursor-ttl-seconds` / `ATLASSIAN_CURSOR_TTL_SECONDS`), and are bound to
  the operation and request parameters.
- Cursors exist only for GET operations — a continuation can never replay a
  write.

When `page.hasMore` is true, pass `page.nextCursor` back to the same tool with
the same parameters.

---

[中文版](../zh-CN/Attachments-and-Large-Results.md) · English is the authoritative version.
