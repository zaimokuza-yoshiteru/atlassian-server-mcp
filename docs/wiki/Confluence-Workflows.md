# Confluence Workflows

Typical agent tasks against Confluence Data Center. Typed tools cover the
common content lifecycle; everything else goes through the generic tools
(`atlassian_discover_operations` → `atlassian_describe_operation` →
`atlassian_execute_operation`).

## Search (CQL)

```
confluence_search({ cql: "space = MCP AND type = page AND text ~ \"release notes\"" })
```

Results paginate with `cursor` / `nextCursor`; `responseProfile` and `fields`
control how much each item carries.

## Read a page

```
confluence_get_content({ id: "123456", expand: ["body.storage", "version"] })
```

Use `expand` to pull the storage-format body, version, ancestors, or labels in
one call.

## Create a page (safe tier)

```
confluence_create_content({
  content: {
    type: "page",
    title: "Release notes 1.0",
    space: { key: "MCP" },
    body: { storage: { value: "<p>Hello <strong>Confluence</strong></p>", representation: "storage" } }
  }
})
```

The body must be **Confluence storage-format XHTML**. The server does not
convert Markdown — pre-convert with an external tool such as pandoc.

## Large pages: storageValueFile

Inline bodies become unwieldy for big pages. Both `confluence_create_content`
and `confluence_update_content` accept an optional `storageValueFile`
parameter instead of an inline `body.storage.value`:

```
confluence_create_content({
  content: {
    type: "page",
    title: "Big design doc",
    space: { key: "MCP" }
  },
  storageValueFile: "/abs/path/under/file-root/design-doc.xhtml"
})
```

The file (storage XHTML, size-capped — see
[Attachments and Large Results](Attachments-and-Large-Results.md)) is read
from the `ATLASSIAN_FILE_ROOT`
sandbox and becomes `body.storage.value`; `representation` is fixed to
`storage`. `storageValueFile` is mutually exclusive with an inline
`body.storage.value` — passing both is a structured error.

## Update a page (safe tier)

Updates need the current version number — read first, then update with
`version.number` incremented:

```
confluence_update_content({
  id: "123456",
  content: {
    type: "page",
    title: "Release notes 1.0",
    version: { number: 2 },
    body: { storage: { value: "<p>Updated</p>", representation: "storage" } }
  }
})
```

A version conflict means someone else edited the page — re-read and retry
deliberately; the server never retries any request automatically.

## Attachments

Upload (multipart, `safe` tier, file root required):

```
atlassian_execute_operation({
  operationId: "confluence.attachments.upload",
  pathParams: { id: "123456" },
  body: { files: ["/abs/path/under/file-root/diagram.png"] }
})
```

Download with `confluence_download_attachment`.

## Delete (risky tier)

```
confluence_delete_content({ id: "123456" })
```

Deletes are `risky` — they are not visible unless the server runs with
`--exposure-tier=risky` or higher.

## Labels and restrictions (via generic execute)

```
atlassian_execute_operation({ operationId: "confluence.content.labels.add", pathParams: { id: "123456" }, body: [{ prefix: "global", name: "release" }] })
atlassian_execute_operation({ operationId: "confluence.content.labels.list", pathParams: { id: "123456" } })
```

Discover the exact operation IDs and parameters with
`atlassian_discover_operations({ query: "label" })` and
`atlassian_describe_operation`.

---

[中文版](Confluence-Workflows.zh-CN.md) · English is the authoritative version.
