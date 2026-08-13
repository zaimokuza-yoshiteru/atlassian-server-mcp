# Jira Workflows

Typical agent tasks against Jira Data Center. All examples work through the
typed tools where they exist, and through the generic tools
(`atlassian_discover_operations` → `atlassian_describe_operation` →
`atlassian_execute_operation`) for everything else.

## Golden rule: metadata before writes

Jira custom fields are instance-specific. Never guess `customfield_*` IDs or
required fields — query the target instance first:

1. `jira_get_create_metadata` (project, then issue type) before creating.
2. `jira_get_edit_metadata` before updating an existing issue.
3. `jira_get_transitions` before a workflow transition.
4. `jira_list_fields` to map custom field IDs to names and schemas.

## Search issues (JQL)

```
jira_search_issues({ jql: "project = MCP AND status = Open ORDER BY created DESC", maxResults: 20 })
```

Large result sets paginate with `cursor` / `nextCursor`; use
`responseProfile: "compact"` (default) to keep custom-field noise out, or
`fields: ["summary", "status", "assignee"]` to select exactly what you need.
See [Attachments and Large Results](Attachments-and-Large-Results.md).

## Read an issue

```
jira_get_issue({ issueIdOrKey: "MCP-123" })
```

## Create an issue

1. `jira_get_create_metadata({ projectIdOrKey: "MCP" })` → pick an issue type,
   read its required fields and allowed values.
2. Create with the fields the instance told you about:

```
jira_create_issue({
  fields: {
    project: { key: "MCP" },
    issuetype: { name: "Task" },
    summary: "Printer is on fire"
  }
})
```

## Update and comment

```
jira_update_issue({ issueIdOrKey: "MCP-123", fields: { summary: "Printer is no longer on fire" } })
jira_add_comment({ issueIdOrKey: "MCP-123", body: "Resolved by replacing the printer." })
```

## Transition (risky tier)

```
jira_get_transitions({ issueIdOrKey: "MCP-123" })     // what is available now
jira_transition_issue({ issueIdOrKey: "MCP-123", transition: { id: "31" } })
```

Transitions live in the `risky` tier — start the server with
`--exposure-tier=risky` (or FORCE-include the specific operation).

## Attachments

Upload via multipart bodies (requires `safe` tier and `ATLASSIAN_FILE_ROOT`):

```
atlassian_execute_operation({
  operationId: "jira.issue.attachments.upload",
  pathParams: { issueIdOrKey: "MCP-123" },
  body: { files: ["/abs/path/under/file-root/screenshot.png"] }
})
```

Download with `jira_download_attachment`. Limits and sandbox rules: see
[Attachments and Large Results](Attachments-and-Large-Results.md).

## Agile: boards and sprints

The agile operations are registry operations (`jira.agile.*`), called
through the generic tools. Typical sprint flow:

```
# Find boards and the active sprint (read tier)
atlassian_execute_operation({ operationId: "jira.agile.boards.list" })
atlassian_execute_operation({ operationId: "jira.agile.boards.sprints.list", pathParams: { boardId: 42 } })
atlassian_execute_operation({ operationId: "jira.agile.sprints.issues", pathParams: { sprintId: 7 } })

# Plan work (safe tier)
atlassian_execute_operation({ operationId: "jira.agile.sprints.create", body: { name: "Sprint 12", originBoardId: 42 } })
atlassian_execute_operation({ operationId: "jira.agile.sprints.issues.move", pathParams: { sprintId: 7 }, body: { issues: ["MCP-123"] } })
atlassian_execute_operation({ operationId: "jira.agile.issues.estimation.update", pathParams: { issueIdOrKey: "MCP-123" }, body: { value: 5 } })

# Close out (risky tier: sprint delete)
atlassian_execute_operation({ operationId: "jira.agile.sprints.delete", pathParams: { sprintId: 7 } })
```

Use `atlassian_describe_operation({ operationId: "jira.agile.sprints.create" })`
to see the exact parameters and any request body template before calling.

## Error handling

Atlassian errors arrive as structured tool errors with `status`,
`operationId`, sanitized details, and normalized `fieldErrors` (for example
which field failed validation). The server never retries any request
automatically — if a write times out, check the issue in Jira before deciding
to repeat it.

---

[中文版](Jira-Workflows.zh-CN.md) · English is the authoritative version.
