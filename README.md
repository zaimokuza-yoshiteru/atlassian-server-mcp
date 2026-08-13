<div align="center">
  <img src="https://raw.githubusercontent.com/zaimokuza-yoshiteru/atlassian-server-mcp/main/assets/banner.svg" alt="atlassian-server-mcp" width="960">
  <br>
  <a href="https://www.npmjs.com/package/@zaimokuza/atlassian-server-mcp"><img src="https://img.shields.io/npm/v/@zaimokuza/atlassian-server-mcp" alt="npm version"></a>
  <a href="https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/zaimokuza-yoshiteru/atlassian-server-mcp/ci.yml?branch=main" alt="CI status"></a>
  <a href="https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/LICENSE"><img src="https://img.shields.io/github/license/zaimokuza-yoshiteru/atlassian-server-mcp" alt="license: MIT"></a>
  <a href="https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/package.json"><img src="https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white" alt="node >= 22"></a>
</div>

# Atlassian Server MCP

[中文 README](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/README.zh-CN.md)

A single TypeScript MCP 2.x stdio server for Jira, Confluence, and Bitbucket
Data Center. Clients see a small set of typed tools for common workflows plus
generic discover/describe/execute tools; the policy-gated REST operation
registry is discovered and executed on demand through the generic tools.

## Features

- **Three products, one server** — Jira DC platform APIs plus the Jira
  Software Agile APIs (boards, sprints, backlog, epics), Confluence, and
  Bitbucket pull-request workflows.
- **Tiered exposure** — operations carry an intrinsic `read` / `safe` /
  `risky` / `max` tier; the agent only sees what your configured tier and
  FORCE globs allow. An agent exposure boundary, not an authorization
  boundary.
- **Safe by default** — starts read-only, TLS verification on, PAT auth
  preferred, credentials redacted from every error and log line.
- **Policy generated from official specs** — the exposure policy is built
  from pinned Atlassian OpenAPI snapshots; `atlassian_discover_operations`
  reports exactly what a running server exposes.
- **Strict pre-flight `doctor`** — validates configuration, credentials,
  reachability, TLS, and file-root writability before you wire up a client.

## Quick start (5 minutes)

1. Install and build (Node.js 22 or newer):

   ```bash
   pnpm install
   pnpm build
   ```

2. Configure at least one product. A product is enabled when its URL is
   present; a non-empty product PAT wins, otherwise the shared Basic
   credentials are required:

   ```bash
   export JIRA_URL=https://jira.example.internal
   export JIRA_TOKEN=...
   # optional: CONFLUENCE_URL / CONFLUENCE_TOKEN, BITBUCKET_URL / BITBUCKET_TOKEN
   # Basic fallback (shared): ATLASSIAN_USERNAME + ATLASSIAN_PASSWORD
   ```

3. Point your MCP client at the server:

   ```json
   {
     "mcpServers": {
       "atlassian-dc": {
         "command": "node",
         "args": ["/absolute/path/to/atlassian-server-mcp/dist/cli.js"],
         "env": {
           "JIRA_URL": "https://jira.example.internal",
           "JIRA_TOKEN": "..."
         }
       }
     }
   }
   ```

   When the package is published, `npx @zaimokuza/atlassian-server-mcp`
   works the same way.

4. Verify with the strict pre-flight check:

   ```bash
   npx @zaimokuza/atlassian-server-mcp doctor
   ```

   Any FAIL exits non-zero; WARN never blocks.

## Security warning

- TLS certificate and hostname verification is **on by default**.
  `--no-tls-verify` / `ATLASSIAN_TLS_VERIFY=false` disables it and is only
  acceptable for local testing against self-signed endpoints — an active
  network attacker can then impersonate your server.
- The exposure tier defaults to `read`. `--exposure-tier=safe|risky|max`
  widens what an LLM agent may invoke; it never replaces Atlassian PAT
  permissions.
- See the Wiki [Security Model](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/wiki/Security-Model)
  page for the threat model.

## Compatibility

Generation/test baseline (not a startup allowlist — other versions start
with a warning and actual compatibility is determined by the target
instance):

| Product    | Baseline versions    | Pinned E2E image                 |
| ---------- | -------------------- | -------------------------------- |
| Jira       | DC 10.3 / 11.3       | `atlassian/jira-software:11.3.5` |
| Confluence | DC 9.2 / 10.2        | `atlassian/confluence:10.2.11`   |
| Bitbucket  | DC 9.4 / 10.2 / 10.4 | `atlassian/bitbucket:10.4.1`     |

Node.js `>=22` is required. Jira Service Management, Assets, and Marketplace
app APIs are outside v1.

## Documentation

User documentation lives in the [project Wiki](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/wiki)
(content source under [`docs/wiki/`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/tree/main/docs/wiki),
synced automatically; Chinese pages carry the `.zh-CN` suffix):

- [Installation](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/wiki/Installation)
  · [Client configuration](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/wiki/Client-Configuration)
  · [Authentication and TLS](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/wiki/Authentication-and-TLS)
  · [Exposure tiers](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/wiki/Exposure-Tiers)
  · [Troubleshooting](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/wiki/Troubleshooting)

Project/developer documentation:

- [`docs/en/architecture.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/docs/en/architecture.md)
  — runtime data flow and sources of truth
- [`docs/en/exposure-policy.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/docs/en/exposure-policy.md)
  — operation-level exposure policy, generated from official specs
- [`docs/en/tool-contracts.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/docs/en/tool-contracts.md)
  — metadata-first writes, body templates, error contract
- [`docs/en/test-strategy.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/docs/en/test-strategy.md)
  — CI vs. real-product E2E evidence boundaries, plus the local Data Center
  E2E walkthrough
- [`docs/en/release-process.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/docs/en/release-process.md)
  — maintainer release memo

Chinese counterparts of every developer page live under `docs/zh-CN/`, and
every Wiki page has a `.zh-CN` twin; the English version is authoritative.

## Contributing and support

Development setup and the generated-files discipline are documented in
[`AGENTS.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/AGENTS.md)
and the developer documentation above. Report bugs and request features
through GitHub issues.
