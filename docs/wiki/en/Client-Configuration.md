# Client Configuration

The server is a stdio MCP server: your MCP client launches it as a child
process and talks JSON-RPC over stdio. All configuration arrives through
environment variables and command-line flags — there is no config file.

## Minimal client snippet

```json
{
  "mcpServers": {
    "atlassian-dc": {
      "command": "npx",
      "args": ["@zaimokuza/atlassian-server-mcp"],
      "env": {
        "JIRA_URL": "https://jira.example.internal",
        "JIRA_TOKEN": "..."
      }
    }
  }
}
```

From a source checkout, point at the built entry instead:

```json
{
  "mcpServers": {
    "atlassian-dc": {
      "command": "node",
      "args": ["/absolute/path/to/atlassian-server-mcp/dist/cli.js"],
      "env": {
        "JIRA_URL": "https://jira.example.internal",
        "CONFLUENCE_URL": "https://confluence.example.internal",
        "BITBUCKET_URL": "https://bitbucket.example.internal",
        "JIRA_TOKEN": "...",
        "CONFLUENCE_TOKEN": "...",
        "BITBUCKET_TOKEN": "..."
      }
    }
  }
}
```

Keep tokens out of committed files. Prefer your MCP client's environment
interpolation, or a local `.env`-style file with mode `0600` loaded by your
shell. The server never prints credentials, but your client configuration
file is only as safe as its file permissions.

## Command-line flags

| Flag                                     | Meaning                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `--exposure-tier=read\|safe\|risky\|max` | Widest tier of operations exposed (default `read`).                                                                            |
| `--force-include-ops=<glob>`             | Expose specific policy operations beyond the tier; repeatable.                                                                 |
| `--force-exclude-ops=<glob>`             | Hide specific operations under the tier; repeatable; wins over include.                                                        |
| `--tls-verify` / `--no-tls-verify`       | Override TLS verification explicitly (flag beats env).                                                                         |
| `--max-download-bytes=<n>`               | Download / `outputPath` byte cap (default and minimum: see [Attachments and Large Results](Attachments-and-Large-Results.md)). |
| `--max-output-bytes=<n>`                 | Serialized response budget per page (default 65,536).                                                                          |
| `--cursor-ttl-seconds=<n>`               | Pagination cursor lifetime (default 900).                                                                                      |
| `--skip-startup-check`                   | Skip the (warning-only) startup probe entirely.                                                                                |
| `doctor`                                 | Subcommand: strict pre-flight check instead of serving.                                                                        |

Every flag has an environment equivalent (`ATLASSIAN_EXPOSURE_TIER`,
`ATLASSIAN_FORCE_INCLUDE_OPERATIONS`, `ATLASSIAN_FORCE_EXCLUDE_OPERATIONS`,
`ATLASSIAN_TLS_VERIFY`, `ATLASSIAN_MAX_DOWNLOAD_BYTES`,
`ATLASSIAN_MAX_OUTPUT_BYTES`, `ATLASSIAN_CURSOR_TTL_SECONDS`). Flags win over
environment variables.

## What the client sees

- 4 generic tools: `atlassian_discover_operations`,
  `atlassian_describe_operation`, `atlassian_execute_operation`,
  `atlassian_server_info`.
- 24 typed tools for common Jira issue, Confluence content, and Bitbucket
  pull-request workflows (11 Jira, 6 Confluence, 7 Bitbucket).
- Only tools for **configured** products are registered, and generic discovery
  omits unconfigured products.
- Only operations at or below your exposure tier appear in discovery and can
  be executed; unknown or excluded operations fail closed.

## Verifying the setup

After adding the server to a client, ask the agent to call
`atlassian_server_info`: it returns configured products, versions, and the
active exposure tier. For a non-interactive check, run
`npx @zaimokuza/atlassian-server-mcp doctor` first — see
[Installation](Installation.md#verify-with-doctor).

---

[中文版](../zh-CN/Client-Configuration.md) · English is the authoritative version.
