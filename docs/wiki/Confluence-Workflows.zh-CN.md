# Confluence 工作流

> **以英文版为准**：[English](Confluence-Workflows.md)

针对 Confluence Data Center 的典型 agent 任务。typed 工具覆盖常见内容
生命周期，其余走通用工具。

## 搜索（CQL）

```
confluence_search({ cql: "space = MCP AND type = page AND text ~ \"release notes\"" })
```

结果用 `cursor` / `nextCursor` 分页；`responseProfile` 与 `fields` 控制
每项携带的内容量。

## 读页面

```
confluence_get_content({ id: "123456", expand: ["body.storage", "version"] })
```

用 `expand` 一次取回 storage 格式正文、版本、祖先或标签。

## 创建页面（safe 层级）

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

正文必须是 **Confluence storage 格式 XHTML**。服务器不做 Markdown 转换——
先用 pandoc 等外部工具预转换。

## 大页面：storageValueFile

内联正文对大页面不好用。`confluence_create_content` 与
`confluence_update_content` 都接受可选的 `storageValueFile` 参数替代
内联 `body.storage.value`：

```
confluence_create_content({
  content: {
    type: "page",
    title: "大型设计文档",
    space: { key: "MCP" }
  },
  storageValueFile: "/abs/path/under/file-root/design-doc.xhtml"
})
```

文件（storage XHTML，有大小上限——见
[附件与大结果](Attachments-and-Large-Results.zh-CN.md)）从
`ATLASSIAN_FILE_ROOT` 沙箱读取，
成为 `body.storage.value`；`representation` 固定为 `storage`。
`storageValueFile` 与内联 `body.storage.value` 互斥——同时传是结构化
错误。

## 更新页面（safe 层级）

更新需要当前版本号——先读，再用递增的 `version.number` 更新：

```
confluence_update_content({
  id: "123456",
  content: {
    type: "page",
    title: "Release notes 1.0",
    version: { number: 2 },
    body: { storage: { value: "<p>已更新</p>", representation: "storage" } }
  }
})
```

版本冲突意味着别人改过该页——重新读取后有意重试；服务器对任何请求都
不会自动重试。

## 附件

上传（multipart，`safe` 层级，需要 file root）：

```
atlassian_execute_operation({
  operationId: "confluence.attachments.upload",
  pathParams: { id: "123456" },
  body: { files: ["/abs/path/under/file-root/diagram.png"] }
})
```

下载用 `confluence_download_attachment`。

## 删除（risky 层级）

```
confluence_delete_content({ id: "123456" })
```

删除属于 `risky`——服务器不以 `--exposure-tier=risky` 或更高运行时不可见。

## 标签与限制（通用 execute）

```
atlassian_execute_operation({ operationId: "confluence.content.labels.add", pathParams: { id: "123456" }, body: [{ prefix: "global", name: "release" }] })
atlassian_execute_operation({ operationId: "confluence.content.labels.list", pathParams: { id: "123456" } })
```

用 `atlassian_discover_operations({ query: "label" })` 与
`atlassian_describe_operation` 查确切的 operation ID 与参数。

---

[English version](Confluence-Workflows.md)（英文版为准）
