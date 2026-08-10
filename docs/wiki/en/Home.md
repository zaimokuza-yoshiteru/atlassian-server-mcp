# Atlassian Server MCP Wiki

A single TypeScript MCP 2.x stdio server that connects LLM agents to **Jira,
Confluence, and Bitbucket Data Center** (self-hosted). It combines
high-frequency typed tools with a fixed REST operation registry discovered
through 4 generic tools, so the full registry never floods `tools/list`.

## What you can do

- **Jira**: search (JQL), read/create/update/transition issues, comments,
  attachments, fields and create/edit metadata — plus the Jira Software Agile
  APIs (boards, sprints, backlog, epics, estimation, rank).
- **Confluence**: CQL search, read/create/update/delete content, attachments,
  large page bodies from files.
- **Bitbucket**: repositories, commits, pull requests (create, comment,
  review, merge), diff/raw/archive downloads.

## Safe by default

- Starts in the **`read` exposure tier** — writes are only exposed when you
  opt in (`--exposure-tier=safe|risky|max`).
- **TLS verification on** by default; PAT authentication preferred.
- Credentials are redacted from every error and log line.
- File access is sandboxed under an explicit local root and off by default.
- High-impact administration operations are permanently excluded.

## Pages

- [Installation](Installation.md)
- [Client Configuration](Client-Configuration.md)
- [Authentication and TLS](Authentication-and-TLS.md)
- [Exposure Tiers](Exposure-Tiers.md)
- [Jira Workflows](Jira-Workflows.md)
- [Confluence Workflows](Confluence-Workflows.md)
- [Bitbucket Workflows](Bitbucket-Workflows.md)
- [Attachments and Large Results](Attachments-and-Large-Results.md)
- [Troubleshooting](Troubleshooting.md)
- [Compatibility Matrix](Compatibility-Matrix.md)
- [Security Model](Security-Model.md)
- [Upgrade Guide](Upgrade-Guide.md)

---

[中文版](../zh-CN/Home.md) · English is the authoritative version.
