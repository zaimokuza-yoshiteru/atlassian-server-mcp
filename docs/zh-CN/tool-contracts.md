# 工具契约

> **本文以英文版为准**：[`docs/en/tool-contracts.md`](../en/tool-contracts.md)。中文翻译仅供参考，如有出入以英文版为准。

## Jira 写入前先查运行时元数据

Jira 自定义字段是实例特定的。`jira_create_issue` 之前，先用项目调
`jira_get_create_metadata`，再用选定的 issue type 调一次。
`jira_update_issue` 之前调 `jira_get_edit_metadata`。转换（transition）
之前调 `jira_get_transitions`。

这些读工具会把 `compact` 升级为 `standard`；`full` 仍可用。它们保留
`customfield_*`、必填标记、schema 与可选值。发布的示例绝不能编造企业
自定义字段 ID 或选项。

## 稳定的请求体模板

`atlassian_describe_operation` 可为官方的、与实例无关的格式返回
`requestBodyTemplate`。当前 curated 模板覆盖 Jira issue/comment 外层
结构、Confluence storage 格式内容与 Bitbucket 项目/仓库 webhook 配置。
Jira 与 Confluence 的全局 webhook 管理仍为排除项。

模板是骨架，不是合法的实例数据。占位值必须替换，实例特定的 Jira 字段
必须来自元数据调用。

## 错误契约

Atlassian HTTP 失败以 `isError: true` 返回，文本 JSON 与
`structuredContent` 中一致：

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

秘密会被脱敏，详情有深度、条目数、字符串与字节上限。上游 5xx 的实现
细节会被抑制。server 对任何请求都不自动重试——包括 429、5xx 或网络
错误；是否重试由调用方模型判断。尤其是超时或 5xx 之后不要盲目重放一个
写操作：响应虽然丢失，操作可能已经成功。
