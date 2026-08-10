# Tool contracts

## Runtime metadata before Jira writes

Jira custom fields are instance-specific. Before `jira_create_issue`, call
`jira_get_create_metadata` with the project, then the chosen issue type. Before
`jira_update_issue`, call `jira_get_edit_metadata`. Before a transition, call
`jira_get_transitions`.

These read tools upgrade `compact` to `standard`; `full` remains available.
They preserve `customfield_*`, required flags, schemas, and allowed values. A
published example must never invent an enterprise custom-field ID or option.

## Stable body templates

`atlassian_describe_operation` may return `requestBodyTemplate` for official,
instance-independent formats. Current curated templates cover Jira issue/comment
outer structures, Confluence storage-format content, and Bitbucket project or
repository webhook configuration. Jira and Confluence global webhook management
remains excluded.

Templates are skeletons, not valid instance data. Placeholder values must be
replaced and instance-specific Jira fields must come from metadata calls.

## Error contract

An Atlassian HTTP failure is returned with `isError: true` in both text JSON and
`structuredContent`:

```json
{
  "error": {
    "kind": "atlassian_http_error",
    "product": "jira",
    "operationId": "jira.issue.create",
    "status": 400,
    "message": "jira.issue.create failed with HTTP 400",
    "fieldErrors": [{ "field": "summary", "message": "Field is required" }],
    "details": {
      "errors": { "summary": "Field is required" }
    }
  }
}
```

Secrets are redacted and details have depth, item, string, and byte limits.
Upstream 5xx implementation details are suppressed. The server never
automatically retries any request — including on 429, 5xx, or network errors;
whether to retry is the calling model's decision. In particular, do not
blindly replay a write after a timeout or 5xx: the operation may have
succeeded even though its response was lost.
