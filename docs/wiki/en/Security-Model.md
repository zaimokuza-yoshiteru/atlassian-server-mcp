# Security Model

What this server does and does not defend. The short version: it is an MCP
protocol adapter with exposure governance, credential hygiene, and transport
reliability. Authorization itself always lives in Atlassian.

## Trust boundaries

- **The local user is trusted.** They control the process, the flags, and the
  environment. Nothing here defends against them.
- **The LLM agent is the governed party.** The exposure tier bounds which
  operations an agent can invoke accidentally or without supervision.
- **Atlassian is the final authorization boundary.** Every request carries
  the caller's own PAT; the server never elevates or combines permissions.

## Exposure governance

- Default tier is `read`; `safe` / `risky` / `max` widen deliberately.
- Global/system-administration operations are **permanently excluded**
  from the runtime policy and cannot be restored by any flag.
- Unknown, hidden, or excluded operations **fail closed** — the resolver is
  the single decision point for generic execute, typed tools, downloads, and
  server info. MCP annotations are client hints and never bypass it.
- This is an exposure boundary, **not** an authorization boundary: it does
  not replace PAT permissions, enterprise policy, approvals, or audit.
  Project/space/repository allowlists are intentionally not duplicated at
  the MCP layer — permission control is Atlassian's job.

## Credential handling

- PAT (Bearer) per product preferred; one shared Basic fallback.
- Credentials, `Authorization`, and `Cookie` headers are **redacted** from
  every tool error and log line; upstream 5xx implementation details are
  suppressed and error details are depth/size bounded.
- Base URLs embedding `user:pass@` (or query/fragment) are rejected at
  startup, so credentials can never leak through `atlassian_server_info`.
- Store tokens via MCP-client env interpolation or a local `0600` file;
  keychain/secret-store integration is deliberately out of scope.

## Transport safety

- TLS certificate and hostname verification is on by default; disabling it is
  explicit-only, strictly parsed (a typo aborts startup rather than silently
  disabling verification), and always warned about.
- **Redirects are never followed.** A 3xx becomes a structured error — this
  prevents credential forwarding to a different origin and stops redirect
  HTML from being saved as a "successful" download.
- **Requests are never automatically retried** — reads or writes, including
  on 429, 5xx, or network errors; whether to retry is the calling model's
  decision. After a timeout or 5xx the upstream outcome may be unknown;
  replaying a write could duplicate it.

## File sandbox

- Local file access is opt-in via `ATLASSIAN_FILE_ROOT` (or per-product
  roots); every path must resolve inside the root after symlink resolution.
- Uploads, downloads, `outputPath`, and `storageValueFile` are size-capped,
  limited to regular files, sized before reading, and never overwrite existing
  files. The exact limits live in
  [Attachments and Large Results](Attachments-and-Large-Results.md).

## Cursor integrity

Pagination cursors are **HMAC-signed**, bound to the operation and request
parameters, expire after 15 minutes, and exist only for GET operations — a
forged or repurposed continuation cannot smuggle a write or another query.

## Deliberate non-goals

- **No audit log.** Atlassian Data Center ships its own auditing; the
  project's security boundary is exposure policy plus credential redaction.
- **No keychain integration**, no resource-level allowlists, no automatic
  retries.

## Reporting

Report security issues through GitHub issues on the project repository. Only
the latest minor release line receives security fixes.

---

[中文版](../zh-CN/Security-Model.md) · English is the authoritative version.
