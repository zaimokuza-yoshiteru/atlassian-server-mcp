# Installation

## Requirements

- **Node.js 22 or newer** (`engines: ">=22"`).
- Network access to your Jira / Confluence / Bitbucket Data Center instances.
- Docker is **not** required to run the server (it is only used for the
  project's own E2E test environments).

## From the npm package

Once published, the package is `@zaimokuza/atlassian-server-mcp` and runs
directly:

```bash
npx @zaimokuza/atlassian-server-mcp
```

Use this form in your MCP client configuration; no build step is needed.

## From source

```bash
git clone <repository-url>
cd atlassian-server-mcp
pnpm install
pnpm build
node dist/cli.js --help
```

The server speaks MCP over **stdio**. All application logs go to stderr;
stdout is reserved for MCP JSON-RPC.

## Configure products

A product is enabled when its URL is present. One, two, or all three products
can be configured; unconfigured products and their typed tools are hidden:

```bash
export JIRA_URL=https://jira.example.internal
export JIRA_TOKEN=...

export CONFLUENCE_URL=https://confluence.example.internal
export CONFLUENCE_TOKEN=...

export BITBUCKET_URL=https://bitbucket.example.internal
export BITBUCKET_TOKEN=...
```

See [Authentication and TLS](Authentication-and-TLS.md) for token/Basic rules
and [Client Configuration](Client-Configuration.md) for wiring this into an
MCP client.

## Verify with doctor

The default startup probe only prints warnings — an unreachable product or an
expired PAT does not stop the server. For a strict pre-flight check (first
install, CI setup), run:

```bash
npx @zaimokuza/atlassian-server-mcp doctor
# or from source:
node dist/cli.js doctor
```

`doctor` checks, one PASS/WARN/FAIL row each, with an actionable fix hint:

- configuration validity (at least one product URL, credential completeness)
- CA file readability (when configured)
- product reachability and credential validity (via `serverInfo`)
- product version against the tested baseline (WARN if outside, never fatal)
- TLS connectivity
- `ATLASSIAN_FILE_ROOT` existence and writability (when configured)

Any FAIL exits non-zero; WARN never blocks. If `doctor` fails, see
[Troubleshooting](Troubleshooting.md).

## Next steps

- [Client Configuration](Client-Configuration.md) — hook the server into your
  MCP client
- [Exposure Tiers](Exposure-Tiers.md) — decide which operations the agent may
  see
- [Upgrade Guide](Upgrade-Guide.md) — how to move between versions

---

[中文版](Installation.zh-CN.md) · English is the authoritative version.
