# Bitbucket Workflows

Typical agent tasks against Bitbucket Data Center. Typed tools cover the
pull-request lifecycle; repository browsing and downloads also go through the
generic tools.

## Browse repositories and commits

```
bitbucket_list_repositories({ projectKey: "MCP" })
bitbucket_list_commits({ projectKey: "MCP", repositorySlug: "backend", limit: 20 })
```

## List and read pull requests

```
bitbucket_list_pull_requests({ projectKey: "MCP", repositorySlug: "backend", state: "OPEN" })
bitbucket_get_pull_request({ projectKey: "MCP", repositorySlug: "backend", pullRequestId: 42 })
```

## Create a pull request (safe tier)

```
bitbucket_create_pull_request({
  projectKey: "MCP",
  repositorySlug: "backend",
  pullRequest: {
    title: "Fix race in cache loader",
    description: "See MCP-123",
    fromRef: { id: "refs/heads/bugfix/cache-race" },
    toRef: { id: "refs/heads/main" }
  }
})
```

Use `atlassian_describe_operation({ operationId: "bitbucket.pullrequests.create" })`
for the exact request shape.

## Comment and review

```
bitbucket_add_pull_request_comment({
  projectKey: "MCP",
  repositorySlug: "backend",
  pullRequestId: 42,
  text: "LGTM with one nit on line 87."
})
```

Approve/unapprove and decline/reopen are registry operations
(`bitbucket.pullrequests.approve`, `.decline`, `.reopen`, …) via
`atlassian_execute_operation`.

## Merge (risky tier)

```
bitbucket_merge_pull_request({
  projectKey: "MCP",
  repositorySlug: "backend",
  pullRequestId: 42,
  version: 3
})
```

`version` is the PR's current version (from `bitbucket_get_pull_request`) —
it guards against merging a PR that changed since you looked. Merges are
`risky`; they are hidden unless the server runs with
`--exposure-tier=risky`.

## Diffs and file downloads

Diffs, raw file contents, and repository archives are binary/text downloads
handled by the file-transfer path (file root required for saving to disk):

```
atlassian_execute_operation({
  operationId: "bitbucket.pullrequests.diff",
  pathParams: { projectKey: "MCP", repositorySlug: "backend", pullRequestId: 42 },
  downloadPath: "/abs/path/under/file-root/pr-42.diff"
})
```

See [Attachments and Large Results](Attachments-and-Large-Results.md) for
`downloadPath` / `outputPath` rules and limits.

## Notes

- Bitbucket repository deletion and other administrative operations sit in
  higher tiers or are permanently excluded; check
  [Exposure Tiers](Exposure-Tiers.md) when an operation is not discoverable.
- Structured errors carry `status`, `operationId`, and sanitized upstream
  details; a 409 on merge means the version check failed — re-read the PR.

---

[中文版](Bitbucket-Workflows.zh-CN.md) · English is the authoritative version.
