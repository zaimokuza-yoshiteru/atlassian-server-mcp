# Architecture

## Runtime flow

```text
MCP client
  -> typed workflow tools or atlassian_execute_operation
  -> filtered operation registry (OpenAPI generated + exposure policy)
  -> resolveExposure (tier + FORCE + configured products)
  -> product HTTP client using the caller's PAT
  -> response projection, byte budget, and cursor envelope
```

## Sources of truth

The operation catalog has separate sources with deliberately different
responsibilities:

- The checked-in OpenAPI inventory and `scripts/generate-operations.mjs`
  generate raw methods, paths, parameters, and request schema summaries.
- `rule/source.md` is the reviewed policy input and `src/exposure-policy.json`
  is its generated runtime artifact.
- `src/operations/registry.json` and the three generated TypeScript files are
  derived from the pinned snapshots in `rule/spec-cache/`.
- `resolveExposure()` is the single authorization decision used by discover,
  describe, generic execute, typed tools, downloads, and external server-info.

Stable request templates are generated as operation metadata. They provide
instance-independent shape guidance only; instance-specific fields and options
must come from runtime metadata tools.

The server never elevates a PAT. Atlassian remains the final authorization
boundary for every request.

## Product activation and startup

`JIRA_URL`, `CONFLUENCE_URL`, and `BITBUCKET_URL` independently activate their
products. At least one URL is required. HTTP clients, typed tools, discovery,
and health information are built only for configured products.

Missing required local configuration is fatal. Network failures, rejected
credentials, and versions outside the generation/test baseline produce startup
warnings but do not stop stdio MCP initialization. Individual calls still
return their real connection/authentication errors.

## Exposure tiers

The server defaults to `read`; valid tiers are `read`, `safe`, `risky`, and
`max`. `--force-include-ops` and `--force-exclude-ops` accept repeatable segment
globs. FORCE exclusion wins over inclusion, and permanently excluded or
unknown operations remain denied. See [exposure-policy.md](exposure-policy.md)
for the fixed counts, precedence chain, and refresh commands.

## Request guidance and errors

Stable product formats can be attached to an operation as
`requestBodyTemplate`. Instance-specific Jira field IDs, required flags, and
options are never baked into templates; typed create/edit metadata tools query
the target instance and use at least the `standard` response profile.

Atlassian HTTP failures cross the MCP boundary as bounded, sanitized structured
errors. Jira and Bitbucket field errors are also normalized into `fieldErrors`,
while the original safe details remain available. No request is automatically
retried (including on 429, 5xx, or network errors) — retry decisions belong to
the caller; a timeout or 5xx response can have an unknown upstream write
outcome.

## File boundary

Multipart uploads and binary downloads are disabled unless a local
`ATLASSIAN_FILE_ROOT` (or product-specific `JIRA_FILE_ROOT`,
`CONFLUENCE_FILE_ROOT`, `BITBUCKET_FILE_ROOT`) is configured. Paths must be
absolute and remain below that root; uploads are size-capped and existing
download targets are never overwritten (limits:
[Attachments and Large Results](../wiki/en/Attachments-and-Large-Results.md)).
