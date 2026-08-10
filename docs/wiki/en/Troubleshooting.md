# Troubleshooting

Start with the strict pre-flight check — it turns most configuration problems
into an actionable row instead of a stack trace:

```bash
npx @zaimokuza/atlassian-server-mcp doctor
```

Any FAIL exits non-zero and prints a fix hint; WARN (for example a product
version outside the tested baseline) never blocks.

## Common problems

### `ECONNREFUSED` / unreachable product

- The URL is wrong, the instance is down, or a firewall blocks egress.
- Behind a corporate proxy, set `ATLASSIAN_PROXY` / `HTTPS_PROXY` and check
  `NO_PROXY` — see
  [Authentication and TLS](Authentication-and-TLS.md#corporate-proxies).

### 401 / 403 from tool calls

- 401: the PAT is missing, expired, or revoked; or Basic credentials are
  wrong. Create a fresh PAT (Profile → Personal Access Tokens).
- 403: the credentials are valid but the account lacks permission in the
  target project/space/repository. This server never elevates permissions —
  fix the grant in Atlassian.
- Errors arrive sanitized; credentials never appear in messages.

### Certificate errors (`self-signed certificate`, `UNABLE_TO_VERIFY_LEAF_SIGNATURE`)

- Preferred: give the server your corporate CA —
  `JIRA_CA_FILE` / `CONFLUENCE_CA_FILE` / `BITBUCKET_CA_FILE`.
- Local testing only: `--no-tls-verify` or `ATLASSIAN_TLS_VERIFY=false`.
  Anything else is unsafe; a warning prints whenever verification is off.
- `ATLASSIAN_TLS_VERIFY` values other than `true`/`false` abort startup —
  check for typos.

### Startup error: URL "must not embed credentials"

Base URLs accept only `scheme://host[:port][/path]`. Remove
`user:pass@`, query strings, and fragments; put the PAT in `*_TOKEN`.

### "At least one product URL is required" / product tools missing

A product and its typed tools exist only when its `*_URL` is set, with a
complete credential pair (product PAT or both shared Basic variables).

### Version warning at startup / in doctor

The version baseline (Jira 10.3/11.3, Confluence 9.2/10.2, Bitbucket
9.4/10.2/10.4) is a generation/test baseline, not an allowlist. Newer or
older versions start with a warning; actual compatibility is decided by the
target instance's API behavior. See
[Compatibility Matrix](Compatibility-Matrix.md).

### Cursor expired or rejected

Pagination cursors are HMAC-signed, bound to the operation and parameters,
and expire after 15 minutes. Restart the query from the beginning (or raise
`--cursor-ttl-seconds`). Cursors only exist for GET operations.

### "redirect" error from a call

The client never follows redirects; a 3xx usually means an expired session or
a login-page redirect in front of the instance. Check credentials and whether
a reverse proxy/WAF is intercepting API paths.

### Writes failing after timeouts or 5xx

The server never retries any request automatically (including on 429, 5xx, or
network errors) — retrying is the caller's decision, and a lost response can
hide a successful write. Verify the object in the product UI before repeating
the call. Confluence `version conflict` on update means the page changed:
re-read and retry deliberately.

### Operation not found / not discoverable

- The operation is above your `--exposure-tier`, is one of the permanently
  excluded operations, or belongs to an unconfigured product.
  See [Exposure Tiers](Exposure-Tiers.md).
- Use `atlassian_discover_operations({ query: "..." })` to find what is
  actually exposed in your configuration.

### Upload/download errors mentioning the file root

`ATLASSIAN_FILE_ROOT` unset, path not absolute, path escapes the sandbox, or
the target file already exists (downloads never overwrite). The
upload/download limits themselves are documented in
[Attachments and Large Results](Attachments-and-Large-Results.md).

## Still stuck

- Run with the startup probe enabled (default) and read stderr — all
  diagnostics go there, never to stdout.
- File an issue on the project repository with the doctor output attached.

---

[中文版](../zh-CN/Troubleshooting.md) · English is the authoritative version.
