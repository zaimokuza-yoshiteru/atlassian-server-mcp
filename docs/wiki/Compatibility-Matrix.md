# Compatibility Matrix

## Runtime

| Component | Requirement                                                                                  |
| --------- | -------------------------------------------------------------------------------------------- |
| Node.js   | `>=22` (Node 20 is not supported)                                                            |
| Transport | MCP over stdio                                                                               |
| Products  | Jira / Confluence / Bitbucket **Data Center** (self-hosted); Atlassian Cloud is out of scope |

## Product version baseline

These versions are the **generation and test baseline**, not a startup
allowlist. The server starts against other versions with a warning; actual
API compatibility is determined by the target instance.

| Product    | Baseline versions    | Pinned E2E image                 |
| ---------- | -------------------- | -------------------------------- |
| Jira       | DC 10.3 / 11.3       | `atlassian/jira-software:11.3.5` |
| Confluence | DC 9.2 / 10.2        | `atlassian/confluence:10.2.11`   |
| Bitbucket  | DC 9.4 / 10.2 / 10.4 | `atlassian/bitbucket:10.4.1`     |

OpenAPI generation is pinned to official specs: Jira DC 11.3.8 (v11003),
Confluence DC 10.2.14 (v10214), Bitbucket DC 10.4 (v1004) — see
[`rule/api-inventory-official.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/rule/api-inventory-official.md).

## API scope

In scope for v1:

- Jira DC platform API (`/rest/api/2/**`)
- Jira Software Agile API (`/rest/agile/**`)
- Confluence DC API (`/rest/api/**`)
- Bitbucket DC API (all endpoints in the official reference)

Out of scope for v1:

- Jira Service Management, Assets, and Marketplace app APIs
- Atlassian Cloud APIs
- Global/system administration (cluster, indexing, migration, upgrade,
  licensing, global schemes, security bootstrap) — permanently excluded from
  the registry

## CI matrix (development)

The project itself is tested on Node 22 + 24 across Ubuntu and Windows, plus
a Docker build job. This concerns contributors, not deployments; see
[`docs/en/test-strategy.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/docs/en/test-strategy.md).

---

[中文版](Compatibility-Matrix.zh-CN.md) · English is the authoritative version.
