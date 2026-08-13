# Jira 工作流

> **以英文版为准**：[English](Jira-Workflows.md)

针对 Jira Data Center 的典型 agent 任务。有 typed 工具的用 typed 工具，
其余走通用工具（`atlassian_discover_operations` →
`atlassian_describe_operation` → `atlassian_execute_operation`）。

## 黄金法则：写入前先查元数据

Jira 自定义字段是实例特定的。绝不猜测 `customfield_*` ID 或必填字段——
先查目标实例：

1. 创建前：`jira_get_create_metadata`（先项目，再 issue type）。
2. 更新前：`jira_get_edit_metadata`。
3. 转换前：`jira_get_transitions`。
4. `jira_list_fields` 把自定义字段 ID 映射为名称与 schema。

## 搜索 issue（JQL）

```
jira_search_issues({ jql: "project = MCP AND status = Open ORDER BY created DESC", maxResults: 20 })
```

大结果集用 `cursor` / `nextCursor` 分页；`responseProfile: "compact"`
（默认）避免自定义字段噪音，或用 `fields: ["summary", "status",
"assignee"]` 精确选择。见[附件与大结果](Attachments-and-Large-Results.zh-CN.md)。

## 读 issue

```
jira_get_issue({ issueIdOrKey: "MCP-123" })
```

## 创建 issue

1. `jira_get_create_metadata({ projectIdOrKey: "MCP" })` → 选 issue type，
   读必填字段与可选值。
2. 用实例告诉你的字段创建：

```
jira_create_issue({
  fields: {
    project: { key: "MCP" },
    issuetype: { name: "Task" },
    summary: "打印机着火了"
  }
})
```

## 更新与评论

```
jira_update_issue({ issueIdOrKey: "MCP-123", fields: { summary: "打印机已灭火" } })
jira_add_comment({ issueIdOrKey: "MCP-123", body: "换新打印机解决。" })
```

## 转换（risky 层级）

```
jira_get_transitions({ issueIdOrKey: "MCP-123" })     // 当前可用转换
jira_transition_issue({ issueIdOrKey: "MCP-123", transition: { id: "31" } })
```

转换属于 `risky` 层级——需要 `--exposure-tier=risky` 启动（或对特定操作
FORCE-include）。

## 附件

multipart 上传（需要 `safe` 层级与 `ATLASSIAN_FILE_ROOT`）：

```
atlassian_execute_operation({
  operationId: "jira.issue.attachments.upload",
  pathParams: { issueIdOrKey: "MCP-123" },
  body: { files: ["/abs/path/under/file-root/screenshot.png"] }
})
```

下载用 `jira_download_attachment`。限制与沙箱规则见
[附件与大结果](Attachments-and-Large-Results.zh-CN.md)。

## Agile：board 与 sprint

agile 操作是 registry 操作（`jira.agile.*`），经通用工具调用。
典型 sprint 流程：

```
# 找 board 与活动 sprint（read 层级）
atlassian_execute_operation({ operationId: "jira.agile.boards.list" })
atlassian_execute_operation({ operationId: "jira.agile.boards.sprints.list", pathParams: { boardId: 42 } })
atlassian_execute_operation({ operationId: "jira.agile.sprints.issues", pathParams: { sprintId: 7 } })

# 排期（safe 层级）
atlassian_execute_operation({ operationId: "jira.agile.sprints.create", body: { name: "Sprint 12", originBoardId: 42 } })
atlassian_execute_operation({ operationId: "jira.agile.sprints.issues.move", pathParams: { sprintId: 7 }, body: { issues: ["MCP-123"] } })
atlassian_execute_operation({ operationId: "jira.agile.issues.estimation.update", pathParams: { issueIdOrKey: "MCP-123" }, body: { value: 5 } })

# 收尾（risky 层级：删除 sprint）
atlassian_execute_operation({ operationId: "jira.agile.sprints.delete", pathParams: { sprintId: 7 } })
```

调用前用 `atlassian_describe_operation({ operationId:
"jira.agile.sprints.create" })` 查看确切参数与请求体模板。

## 错误处理

Atlassian 错误以结构化工具错误返回，含 `status`、`operationId`、脱敏
详情与归一化 `fieldErrors`（哪个字段校验失败）。服务器对任何请求都不
自动重试——写操作超时后，先在 Jira 里确认 issue 状态再决定是否重复。

---

[English version](Jira-Workflows.md)（英文版为准）
