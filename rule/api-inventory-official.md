# Atlassian Data Center REST API Official Baseline Inventory

> Generated: 2026-07-31
> Purpose: the official API baseline for the OpenAPI generator. Runtime exposure and tiering are governed by `src/exposure-policy.json`.
>
> **This file is machine-parsed and lives under `rule/` because it is a data source, not documentation.** `scripts/generate-operations.mjs` and `rule/fetch-api-inventory.mjs` read it line by line with format-sensitive patterns, so it is excluded from Prettier (`.prettierignore`). Do not reformat. Conventions:
> - Part headers (`# 第N部分：...`) and `##` section headers are parser anchors. Section headers drive operation-id grouping and must keep their parenthesized English names unchanged.
> - Column 3 (功能简述) is the canonical Chinese description. The generator preserves it in the registry as `summaryZh`; it must stay Chinese.
> - Column 4 is the official English summary from the pinned OpenAPI specs (informational; the generator sources English summaries from the specs themselves).
> - Each product part ends with a "Fetch failures / uncertain records" section — read it before relying on the tables.
>
> **Scope**
> - Jira DC platform API (`/rest/api/2/**`), Confluence DC API (`/rest/api/**`), and every REST endpoint recorded in the official Bitbucket DC reference.
> - Out of scope: Jira Service Management, Assets, Marketplace app APIs, and Cloud APIs. The Jira Software agile API (`/rest/agile/**`) is not listed here; 39 agile operations enter the registry through `OVERRIDES` in `scripts/generate-operations.mjs` instead.
> - Deprecated / experimental endpoints are included with markers.
>
> **Sources** (all official Atlassian documentation, extracted page by page, nothing from memory)
> - Jira: developer.atlassian.com/server/jira/platform/rest/v11003/ (Jira DC 11.3.8, embedded OpenAPI 3.0 spec, 289 paths)
> - Confluence: developer.atlassian.com/server/confluence/rest/v10214/ (Confluence DC 10.2.14, embedded OpenAPI 3.0.1 spec)
> - Bitbucket: developer.atlassian.com/server/bitbucket/rest/v1004/ (Bitbucket DC 10.4, officially published OpenAPI 3.0.1: dac-static.atlassian.com/server/bitbucket/10.4.swagger.v3.json)
>
> **Total endpoints: 1141** (Jira 387 + Confluence 176 + Bitbucket 578)
>
> **Quality verification**: each of the three inventories was cross-checked at set level against the official OpenAPI spec by an independent review pass — 0 missing, 0 extra (the 6 Bitbucket ZDU endpoints are an intentional off-spec supplement, independently verified), 0 scope violations; 10 sampled descriptions per product all matched the official summaries semantically.

---


# 第一部分：Jira DC (Part 1: Jira DC)


Source: official Atlassian Jira Data Center REST API reference (developer.atlassian.com, v11003 = Jira 11.3.8, embedded OpenAPI spec `info.version` = 11.3.8).
Scope: all `/rest/api/2/**` endpoints (including the Data Center-only cluster, licenseValidator, monitoring, reindex, index-snapshot, email-templates, readonly-mode, and upgrade groups). Excluded here: `/rest/agile/**` (Jira Software agile — exposed via generator OVERRIDES instead), JSM, Assets, and app APIs.

## Issue

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| POST | /rest/api/2/issue | 从 JSON 创建 Issue 或子任务 | Create an issue or sub-task from json | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| POST | /rest/api/2/issue/archive | 批量归档 Issue | Archive list of issues | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| POST | /rest/api/2/issue/bulk | 从 JSON 批量创建 Issue 或子任务 | Create an issue or sub-task from json - bulk operation. | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/createmeta/{projectIdOrKey}/issuetypes | 获取项目 Issue 类型元数据 | Get metadata for project issue types | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/createmeta/{projectIdOrKey}/issuetypes/{issueTypeId} | 获取创建 Issue 可用的 Issue 类型元数据 | Get metadata for issue types used for creating issues | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/picker | 获取用于自动补全的建议 Issue | Get suggested issues for auto-completion | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| POST | /rest/api/2/issue/remotelink/reciprocal | 创建双向远程 Issue 链接 | Create reciprocal remote issue link | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey} | 按 key 获取 Issue | Get issue for key | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| PUT | /rest/api/2/issue/{issueIdOrKey} | 从 JSON 表示编辑 Issue | Edit an issue from a JSON representation | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| DELETE | /rest/api/2/issue/{issueIdOrKey} | 删除 Issue | Delete an issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| PUT | /rest/api/2/issue/{issueIdOrKey}/archive | 归档 Issue | Archive an issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| PUT | /rest/api/2/issue/{issueIdOrKey}/assignee | 将 Issue 指派给用户 | Assign an issue to a user | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| POST | /rest/api/2/issue/{issueIdOrKey}/attachments | 为 Issue 添加一个或多个附件 | Add one or more attachments to an issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/comment | 获取 Issue 的评论 | Get comments for an issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| POST | /rest/api/2/issue/{issueIdOrKey}/comment | 添加评论 | Add a comment | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/comment/{id} | 按 ID 获取评论 | Get a comment by id | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| PUT | /rest/api/2/issue/{issueIdOrKey}/comment/{id} | 更新评论 | Update a comment | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| DELETE | /rest/api/2/issue/{issueIdOrKey}/comment/{id} | 删除评论 | Delete a comment | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| PUT | /rest/api/2/issue/{issueIdOrKey}/comment/{id}/pin | 置顶评论 | Pin a comment | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/editmeta | 获取编辑 Issue 可用的 Issue 类型元数据 | Get metadata for issue types used for editing issues | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| POST | /rest/api/2/issue/{issueIdOrKey}/notify | 向接收者发送通知 | Send notification to recipients | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/pinned-comments | 获取 Issue 的置顶评论 | Get pinned comments for an issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/properties | 获取 Issue 的全部属性键 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/properties/{propertyKey} | 获取 Issue 指定属性的值 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| PUT | /rest/api/2/issue/{issueIdOrKey}/properties/{propertyKey} | 更新指定 Issue 属性的值 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| DELETE | /rest/api/2/issue/{issueIdOrKey}/properties/{propertyKey} | 删除 Issue 的属性 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/remotelink | 获取 Issue 的远程链接 | Get remote issue links for an issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| POST | /rest/api/2/issue/{issueIdOrKey}/remotelink | 创建或更新远程 Issue 链接 | Create or update remote issue link | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| DELETE | /rest/api/2/issue/{issueIdOrKey}/remotelink | 删除远程 Issue 链接 | Delete remote issue link | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/remotelink/{linkId} | 按 ID 获取远程 Issue 链接 | Get a remote issue link by its id | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| PUT | /rest/api/2/issue/{issueIdOrKey}/remotelink/{linkId} | 更新远程 Issue 链接 | Update remote issue link | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| DELETE | /rest/api/2/issue/{issueIdOrKey}/remotelink/{linkId} | 按 ID 删除远程 Issue 链接 | Delete remote issue link by id | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| PUT | /rest/api/2/issue/{issueIdOrKey}/restore | 恢复已归档的 Issue | Restore an archived issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/subtask | 获取 Issue 的子任务列表 | Get an issue's subtask list | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/subtask/move | 检查子任务是否可移动 | Check if a subtask can be moved | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| POST | /rest/api/2/issue/{issueIdOrKey}/subtask/move | 对 Issue 的子任务重新排序 | Reorder an issue's subtasks | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/transitions | 获取 Issue 可执行的转换列表 | Get list of transitions possible for an issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| POST | /rest/api/2/issue/{issueIdOrKey}/transitions | 对 Issue 执行转换 | Perform a transition on an issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/votes | 获取 Issue 的投票 | Get votes for issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| POST | /rest/api/2/issue/{issueIdOrKey}/votes | 为 Issue 投票 | Add vote to issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| DELETE | /rest/api/2/issue/{issueIdOrKey}/votes | 取消 Issue 的投票 | Remove vote from issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/watchers | 获取 Issue 关注者列表 | Get list of watchers of issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| POST | /rest/api/2/issue/{issueIdOrKey}/watchers | 添加用户为 Issue 关注者 | Add a user as watcher | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| DELETE | /rest/api/2/issue/{issueIdOrKey}/watchers | 移除 Issue 的关注者 | Delete watcher from issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/worklog | 获取 Issue 的工作日志 | Get worklogs for an issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| POST | /rest/api/2/issue/{issueIdOrKey}/worklog | 添加工作日志 | Add a worklog entry | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| GET | /rest/api/2/issue/{issueIdOrKey}/worklog/{id} | 按 ID 获取工作日志 | Get a worklog by id | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| PUT | /rest/api/2/issue/{issueIdOrKey}/worklog/{id} | 更新工作日志 | Update a worklog entry | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |
| DELETE | /rest/api/2/issue/{issueIdOrKey}/worklog/{id} | 删除工作日志 | Delete a worklog entry | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issue/#api-group-issue |

## 应用属性 (Application Properties)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/application-properties | 按 key 获取应用属性 | Get an application property by key | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-application-properties/#api-group-application-properties |
| GET | /rest/api/2/application-properties/advanced-settings | 获取全部高级设置属性 | Get all advanced settings properties | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-application-properties/#api-group-application-properties |
| PUT | /rest/api/2/application-properties/{id} | 更新应用属性 | Update an application property | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-application-properties/#api-group-application-properties |

## 应用角色 (Application Roles)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/applicationrole | 获取系统全部应用角色 | Get all application roles in the system | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-applicationrole/#api-group-applicationrole |
| PUT | /rest/api/2/applicationrole | 批量更新应用角色 | Update application roles | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-applicationrole/#api-group-applicationrole |
| GET | /rest/api/2/applicationrole/{key} | 按 key 获取应用角色 | Get application role by key | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-applicationrole/#api-group-applicationrole |
| PUT | /rest/api/2/applicationrole/{key} | 更新应用角色 | Update application role | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-applicationrole/#api-group-applicationrole |

## 附件 (Attachment)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/attachment/meta | 获取附件能力配置 | Get attachment capabilities | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-attachment/#api-group-attachment |
| GET | /rest/api/2/attachment/{id} | 获取附件元数据（含实际文件 URI） | Get the meta-data for an attachment, including the URI of the actual attached file | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-attachment/#api-group-attachment |
| DELETE | /rest/api/2/attachment/{id} | 删除 Issue 的附件 | Delete an attachment from an issue | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-attachment/#api-group-attachment |
| GET | /rest/api/2/attachment/{id}/expand/human | 获取可读的附件展开信息 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-attachment/#api-group-attachment |
| GET | /rest/api/2/attachment/{id}/expand/raw | 获取原始附件展开信息 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-attachment/#api-group-attachment |

## 头像 (Avatar)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/avatar/{type}/system | 获取全部系统头像 | Get all system avatars | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-avatar/#api-group-avatar |

## 集群 (Cluster, Data Center)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| PUT | /rest/api/2/cluster/index-snapshot/{nodeId} | 请求节点索引快照 [deprecated] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-cluster/#api-group-cluster |
| DELETE | /rest/api/2/cluster/node/{nodeId} | 删除集群节点 | Delete a cluster node | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-cluster/#api-group-cluster |
| PUT | /rest/api/2/cluster/node/{nodeId}/offline | 将节点状态更新为离线 | Update node state to offline | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-cluster/#api-group-cluster |
| GET | /rest/api/2/cluster/nodes | 获取全部集群节点 | Get all cluster nodes | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-cluster/#api-group-cluster |
| POST | /rest/api/2/cluster/zdu/approve | 批准集群升级 | Approve cluster upgrade | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-cluster/#api-group-cluster |
| POST | /rest/api/2/cluster/zdu/cancel | 取消集群升级 | Cancel cluster upgrade | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-cluster/#api-group-cluster |
| POST | /rest/api/2/cluster/zdu/retryUpgrade | 重试集群升级 | Retry cluster upgrade | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-cluster/#api-group-cluster |
| POST | /rest/api/2/cluster/zdu/start | 启动集群升级 | Start cluster upgrade | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-cluster/#api-group-cluster |
| GET | /rest/api/2/cluster/zdu/state | 获取集群升级状态 | Get cluster upgrade state | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-cluster/#api-group-cluster |

## 评论 (Comment)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/comment/{commentId}/properties | 获取评论的属性键 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-comment/#api-group-comment |
| GET | /rest/api/2/comment/{commentId}/properties/{propertyKey} | 获取评论的属性值 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-comment/#api-group-comment |
| PUT | /rest/api/2/comment/{commentId}/properties/{propertyKey} | 设置评论属性 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-comment/#api-group-comment |
| DELETE | /rest/api/2/comment/{commentId}/properties/{propertyKey} | 删除评论的属性 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-comment/#api-group-comment |

## 组件 (Component)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| POST | /rest/api/2/component | 创建组件 | Create component | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-component/#api-group-component |
| GET | /rest/api/2/component/page | 分页获取组件 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-component/#api-group-component |
| GET | /rest/api/2/component/{id} | 获取项目组件 | Get project component | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-component/#api-group-component |
| PUT | /rest/api/2/component/{id} | 更新组件 | Update a component | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-component/#api-group-component |
| DELETE | /rest/api/2/component/{id} | 删除项目组件 | Delete a project component | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-component/#api-group-component |
| GET | /rest/api/2/component/{id}/relatedIssueCounts | 获取组件相关 Issue | Get component related issues | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-component/#api-group-component |

## 配置 (Configuration)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/configuration | 获取 Jira 配置详情 | Get Jira configuration details | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-configuration/#api-group-configuration |

## 自定义字段选项 (Custom Field Option)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/customFieldOption/{id} | 按 ID 获取自定义字段选项 | Get custom field option by ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-customfieldoption/#api-group-customfieldoption |

## 自定义字段 (Custom Fields)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/customFields | 分页获取自定义字段 | Get custom fields with pagination | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-customfields/#api-group-customfields |
| DELETE | /rest/api/2/customFields | 批量删除自定义字段 | Delete custom fields in bulk | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-customfields/#api-group-customfields |
| GET | /rest/api/2/customFields/{customFieldId}/options | 获取自定义字段选项 [experimental] | Get options for a custom field (page-based pagination; customFieldId must be numeric) | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-customfields/#api-group-customfields |

## 仪表盘 (Dashboard)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/dashboard | 获取全部仪表盘（可选过滤） | Get all dashboards with optional filtering | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-dashboard/#api-group-dashboard |
| GET | /rest/api/2/dashboard/{dashboardId}/items/{itemId}/properties | 获取仪表盘项的全部属性键 | Get all properties keys for a dashboard item | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-dashboard/#api-group-dashboard |
| GET | /rest/api/2/dashboard/{dashboardId}/items/{itemId}/properties/{propertyKey} | 获取仪表盘项的属性值 | Get a property from a dashboard item | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-dashboard/#api-group-dashboard |
| PUT | /rest/api/2/dashboard/{dashboardId}/items/{itemId}/properties/{propertyKey} | 设置仪表盘项属性 | Set a property on a dashboard item | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-dashboard/#api-group-dashboard |
| DELETE | /rest/api/2/dashboard/{dashboardId}/items/{itemId}/properties/{propertyKey} | 删除仪表盘项的属性 | Delete a property from a dashboard item | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-dashboard/#api-group-dashboard |
| GET | /rest/api/2/dashboard/{id} | 按 ID 获取单个仪表盘 | Get a single dashboard by ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-dashboard/#api-group-dashboard |

## 邮件模板 (Email Templates)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/email-templates | 以 zip 文件获取邮件模板 | Get email templates as zip file | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-email-templates/#api-group-email-templates |
| POST | /rest/api/2/email-templates | 使用 zip 文件更新邮件模板 | Update email templates with zip file | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-email-templates/#api-group-email-templates |
| POST | /rest/api/2/email-templates/apply | 使用先前上传的包更新邮件模板 | Update email templates with previously uploaded pack | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-email-templates/#api-group-email-templates |
| POST | /rest/api/2/email-templates/revert | 将邮件模板恢复为默认 | Update email templates to default | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-email-templates/#api-group-email-templates |
| GET | /rest/api/2/email-templates/types | 获取模板的邮件类型 | Get email types for templates | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-email-templates/#api-group-email-templates |

## 字段 (Field)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/field | 获取全部系统与自定义字段 | Get all fields, both System and Custom | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-field/#api-group-field |
| POST | /rest/api/2/field | 使用定义创建自定义字段 | Create a custom field using a definition | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-field/#api-group-field |

## 过滤器 (Filter)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| POST | /rest/api/2/filter | 创建过滤器 | Create a new filter | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-filter/#api-group-filter |
| GET | /rest/api/2/filter/defaultShareScope | 获取默认共享范围 | Get default share scope | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-filter/#api-group-filter |
| PUT | /rest/api/2/filter/defaultShareScope | 设置默认共享范围 | Set default share scope | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-filter/#api-group-filter |
| GET | /rest/api/2/filter/favourite | 获取收藏的过滤器 | Get favourite filters | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-filter/#api-group-filter |
| GET | /rest/api/2/filter/{id} | 按 ID 获取过滤器 | Get a filter by ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-filter/#api-group-filter |
| PUT | /rest/api/2/filter/{id} | 更新已有过滤器 | Update an existing filter | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-filter/#api-group-filter |
| DELETE | /rest/api/2/filter/{id} | 删除过滤器 | Delete a filter | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-filter/#api-group-filter |
| GET | /rest/api/2/filter/{id}/columns | 获取过滤器的默认列 | Get default columns for filter | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-filter/#api-group-filter |
| PUT | /rest/api/2/filter/{id}/columns | 设置过滤器默认列 | Set default columns for filter | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-filter/#api-group-filter |
| DELETE | /rest/api/2/filter/{id}/columns | 重置过滤器列 | Reset columns for filter | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-filter/#api-group-filter |
| GET | /rest/api/2/filter/{id}/permission | 获取过滤器的全部共享权限 | Get all share permissions of filter | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-filter/#api-group-filter |
| POST | /rest/api/2/filter/{id}/permission | 为过滤器添加共享权限 | Add share permissions to filter | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-filter/#api-group-filter |
| DELETE | /rest/api/2/filter/{id}/permission/{permission-id} | 移除过滤器的共享权限 | Remove share permissions from filter | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-filter/#api-group-filter |
| GET | /rest/api/2/filter/{id}/permission/{permissionId} | 获取过滤器的单条共享权限 | Get a single share permission of filter | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-filter/#api-group-filter |

## 用户组 (Group)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| POST | /rest/api/2/group | 按给定参数创建用户组 | Create a group with given parameters | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-group/#api-group-group |
| DELETE | /rest/api/2/group | 删除指定用户组 | Delete a specified group | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-group/#api-group-group |
| GET | /rest/api/2/group/member | 获取指定用户组中的用户 | Get users from a specified group | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-group/#api-group-group |
| POST | /rest/api/2/group/user | 将用户加入指定用户组 | Add a user to a specified group | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-group/#api-group-group |
| DELETE | /rest/api/2/group/user | 将用户移出指定用户组 | Remove a user from a specified group | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-group/#api-group-group |

## 用户组查询 (Groups)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/groups/picker | 按查询匹配用户组 | Get groups matching a query | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-groups/#api-group-groups |

## 用户/组选择器 (Group User Picker)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/groupuserpicker | 按查询匹配用户与用户组（带高亮） | Get users and groups matching query with highlighting | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-groupuserpicker/#api-group-groupuserpicker |

## 索引快照 (Index Snapshot)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/index-snapshot | 获取可用索引快照列表 | Get list of available index snapshots | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-index-snapshot/#api-group-index-snapshot |
| POST | /rest/api/2/index-snapshot | 创建索引快照（若无进行中任务） | Create index snapshot if not in progress | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-index-snapshot/#api-group-index-snapshot |
| GET | /rest/api/2/index-snapshot/isRunning | 获取索引快照创建状态 | Get index snapshot creation status | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-index-snapshot/#api-group-index-snapshot |

## 索引 (Index)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/index/summary | 获取索引状况摘要 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-index/#api-group-index |

## Issue 链接 (Issue Link)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| POST | /rest/api/2/issueLink | 在两个 Issue 之间创建链接 | Create an issue link between two issues | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuelink/#api-group-issuelink |
| GET | /rest/api/2/issueLink/{linkId} | 按 ID 获取 Issue 链接 | Get an issue link with the specified id | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuelink/#api-group-issuelink |
| DELETE | /rest/api/2/issueLink/{linkId} | 按 ID 删除 Issue 链接 | Delete an issue link with the specified id | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuelink/#api-group-issuelink |

## Issue 链接类型 (Issue Link Type)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/issueLinkType | 获取可用 Issue 链接类型列表 | Get list of available issue link types | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuelinktype/#api-group-issuelinktype |
| POST | /rest/api/2/issueLinkType | 创建 Issue 链接类型 | Create a new issue link type | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuelinktype/#api-group-issuelinktype |
| PUT | /rest/api/2/issueLinkType/order | 按字母顺序重置 Issue 链接类型排序 | Reset the order of issue link types alphabetically. | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuelinktype/#api-group-issuelinktype |
| GET | /rest/api/2/issueLinkType/{issueLinkTypeId} | 获取 Issue 链接类型信息 | Get information about an issue link type | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuelinktype/#api-group-issuelinktype |
| PUT | /rest/api/2/issueLinkType/{issueLinkTypeId} | 更新指定 Issue 链接类型 | Update the specified issue link type | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuelinktype/#api-group-issuelinktype |
| DELETE | /rest/api/2/issueLinkType/{issueLinkTypeId} | 删除指定 Issue 链接类型 | Delete the specified issue link type | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuelinktype/#api-group-issuelinktype |
| PUT | /rest/api/2/issueLinkType/{issueLinkTypeId}/order | 更新 Issue 链接类型的顺序 | Update the order of the issue link type. | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuelinktype/#api-group-issuelinktype |

## Issue 安全方案 (Issue Security Schemes)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/issuesecurityschemes | 获取全部 Issue 安全方案 | Get all issue security schemes | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuesecurityschemes/#api-group-issuesecurityschemes |
| GET | /rest/api/2/issuesecurityschemes/{id} | 按 ID 获取指定 Issue 安全方案 | Get specific issue security scheme by id | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuesecurityschemes/#api-group-issuesecurityschemes |

## Issue 类型 (Issue Type)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/issuetype | 获取用户可见的全部 Issue 类型 | Get list of all issue types visible to user | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetype/#api-group-issuetype |
| POST | /rest/api/2/issuetype | 从 JSON 表示创建 Issue 类型 | Create an issue type from JSON representation | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetype/#api-group-issuetype |
| GET | /rest/api/2/issuetype/page | 分页获取过滤后的 Issue 类型 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetype/#api-group-issuetype |
| GET | /rest/api/2/issuetype/{id} | 按 ID 获取 Issue 类型完整表示 | Get full representation of issue type by id | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetype/#api-group-issuetype |
| PUT | /rest/api/2/issuetype/{id} | 从 JSON 表示更新指定 Issue 类型 | Update specified issue type from JSON representation | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetype/#api-group-issuetype |
| DELETE | /rest/api/2/issuetype/{id} | 删除指定 Issue 类型并迁移关联 Issue | Delete specified issue type and migrate associated issues | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetype/#api-group-issuetype |
| GET | /rest/api/2/issuetype/{id}/alternatives | 获取指定 ID 的备选 Issue 类型列表 | Get list of alternative issue types for given id | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetype/#api-group-issuetype |
| POST | /rest/api/2/issuetype/{id}/avatar | 将临时头像转为正式头像 | Convert temporary avatar into a real avatar | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetype/#api-group-issuetype |
| POST | /rest/api/2/issuetype/{id}/avatar/temporary | 通过 multipart 上传为 Issue 类型创建临时头像 | Create temporary avatar using multipart for issue type | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetype/#api-group-issuetype |
| GET | /rest/api/2/issuetype/{issueTypeId}/properties | 获取 Issue 类型的全部属性键 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetype/#api-group-issuetype |
| GET | /rest/api/2/issuetype/{issueTypeId}/properties/{propertyKey} | 获取指定 Issue 类型属性值 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetype/#api-group-issuetype |
| PUT | /rest/api/2/issuetype/{issueTypeId}/properties/{propertyKey} | 更新指定 Issue 类型的属性 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetype/#api-group-issuetype |
| DELETE | /rest/api/2/issuetype/{issueTypeId}/properties/{propertyKey} | 删除指定 Issue 类型的属性 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetype/#api-group-issuetype |

## Issue 类型方案 (Issue Type Scheme)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/issuetypescheme | 获取用户可见的全部 Issue 类型方案 | Get list of all issue type schemes visible to user | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetypescheme/#api-group-issuetypescheme |
| POST | /rest/api/2/issuetypescheme | 从 JSON 表示创建 Issue 类型方案 | Create an issue type scheme from JSON representation | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetypescheme/#api-group-issuetypescheme |
| GET | /rest/api/2/issuetypescheme/{schemeId} | 按 ID 获取 Issue 类型方案完整表示 | Get full representation of issue type scheme by id | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetypescheme/#api-group-issuetypescheme |
| PUT | /rest/api/2/issuetypescheme/{schemeId} | 从 JSON 表示更新指定 Issue 类型方案 | Update specified issue type scheme from JSON representation | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetypescheme/#api-group-issuetypescheme |
| DELETE | /rest/api/2/issuetypescheme/{schemeId} | 删除指定 Issue 类型方案 | Delete specified issue type scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetypescheme/#api-group-issuetypescheme |
| GET | /rest/api/2/issuetypescheme/{schemeId}/associations | 获取指定方案关联的全部项目 | Get all of the associated projects for specified scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetypescheme/#api-group-issuetypescheme |
| POST | /rest/api/2/issuetypescheme/{schemeId}/associations | 为方案添加项目关联 | Add project associations to scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetypescheme/#api-group-issuetypescheme |
| PUT | /rest/api/2/issuetypescheme/{schemeId}/associations | 设置方案的项目关联 | Set project associations for scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetypescheme/#api-group-issuetypescheme |
| DELETE | /rest/api/2/issuetypescheme/{schemeId}/associations | 移除指定方案的全部项目关联 | Remove all project associations for specified scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetypescheme/#api-group-issuetypescheme |
| DELETE | /rest/api/2/issuetypescheme/{schemeId}/associations/{projIdOrKey} | 移除指定方案的指定项目关联 | Remove given project association for specified scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-issuetypescheme/#api-group-issuetypescheme |

## JQL

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/jql/autocompletedata | 获取 JQL 搜索自动补全数据 | Get auto complete data for JQL searches | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-jql/#api-group-jql |
| GET | /rest/api/2/jql/autocompletedata/suggestions | 获取 JQL 搜索自动补全建议 | Get auto complete suggestions for JQL search | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-jql/#api-group-jql |

## 许可证校验 (License Validator)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| POST | /rest/api/2/licenseValidator | 校验 Jira 许可证 | Validate a Jira license | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-licensevalidator/#api-group-licensevalidator |

## 监控 (Monitoring)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/monitoring/app | 获取应用监控状态 | Get App Monitoring status | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-monitoring/#api-group-monitoring |
| POST | /rest/api/2/monitoring/app | 更新应用监控状态 | Update App Monitoring status | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-monitoring/#api-group-monitoring |
| GET | /rest/api/2/monitoring/ipd | 获取 IPD 监控是否启用 | Get if IPD Monitoring is enabled | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-monitoring/#api-group-monitoring |
| POST | /rest/api/2/monitoring/ipd | 更新 IPD 监控状态 | Update IPD Monitoring status | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-monitoring/#api-group-monitoring |
| GET | /rest/api/2/monitoring/jmx/areMetricsExposed | 检查 JMX 指标是否正在暴露 | Check if JMX metrics are being exposed | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-monitoring/#api-group-monitoring |
| GET | /rest/api/2/monitoring/jmx/getAvailableMetrics | 获取可用的 JMX 指标 | Get the available JMX metrics | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-monitoring/#api-group-monitoring |
| POST | /rest/api/2/monitoring/jmx/startExposing | 开始暴露 JMX 指标 | Start exposing JMX metrics | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-monitoring/#api-group-monitoring |
| POST | /rest/api/2/monitoring/jmx/stopExposing | 停止暴露 JMX 指标 | Stop exposing JMX metrics | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-monitoring/#api-group-monitoring |

## 我的权限 (My Permissions)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/mypermissions | 获取当前登录用户的权限 | Get permissions for the logged in user | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-mypermissions/#api-group-mypermissions |

## 我的偏好设置 (My Preferences)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/mypreferences | 按 key 获取用户偏好设置 | Get user preference by key | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-mypreferences/#api-group-mypreferences |
| PUT | /rest/api/2/mypreferences | 更新用户偏好设置 | Update user preference | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-mypreferences/#api-group-mypreferences |
| DELETE | /rest/api/2/mypreferences | 删除用户偏好设置 | Delete user preference | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-mypreferences/#api-group-mypreferences |

## 当前用户 (Myself)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/myself | 获取当前登录用户 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-myself/#api-group-myself |
| PUT | /rest/api/2/myself | 更新当前登录用户 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-myself/#api-group-myself |
| PUT | /rest/api/2/myself/password | 更新调用者密码 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-myself/#api-group-myself |

## 通知方案 (Notification Scheme)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/notificationscheme | 分页获取通知方案 | Get paginated notification schemes | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-notificationscheme/#api-group-notificationscheme |
| GET | /rest/api/2/notificationscheme/{id} | 获取通知方案完整详情 | Get full notification scheme details | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-notificationscheme/#api-group-notificationscheme |

## 密码 (Password)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/password/policy | 获取当前密码策略要求 | Get current password policy requirements | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-password/#api-group-password |
| POST | /rest/api/2/password/policy/createUser | 获取创建用户被密码策略拒绝的原因 | Get reasons for password policy disallowance on user creation | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-password/#api-group-password |
| POST | /rest/api/2/password/policy/updateUser | 获取更新用户密码被密码策略拒绝的原因 | Get reasons for password policy disallowance on user password update | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-password/#api-group-password |

## 权限 (Permissions)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/permissions | 获取 Jira 实例中的全部权限 | Get all permissions present in Jira instance | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-permissions/#api-group-permissions |

## 权限方案 (Permission Scheme)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/permissionscheme | 获取全部权限方案 | Get all permission schemes | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-permissionscheme/#api-group-permissionscheme |
| POST | /rest/api/2/permissionscheme | 创建权限方案 | Create a new permission scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-permissionscheme/#api-group-permissionscheme |
| GET | /rest/api/2/permissionscheme/{permissionSchemeId}/attribute/{attributeKey} | 按 key 获取方案属性 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-permissionscheme/#api-group-permissionscheme |
| PUT | /rest/api/2/permissionscheme/{permissionSchemeId}/attribute/{key} | 更新或插入方案属性 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-permissionscheme/#api-group-permissionscheme |
| GET | /rest/api/2/permissionscheme/{schemeId} | 按 ID 获取权限方案 | Get a permission scheme by ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-permissionscheme/#api-group-permissionscheme |
| PUT | /rest/api/2/permissionscheme/{schemeId} | 更新权限方案 | Update a permission scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-permissionscheme/#api-group-permissionscheme |
| DELETE | /rest/api/2/permissionscheme/{schemeId} | 按 ID 删除权限方案 | Delete a permission scheme by ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-permissionscheme/#api-group-permissionscheme |
| GET | /rest/api/2/permissionscheme/{schemeId}/permission | 获取方案的全部权限授予 | Get all permission grants of a scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-permissionscheme/#api-group-permissionscheme |
| POST | /rest/api/2/permissionscheme/{schemeId}/permission | 在方案中创建权限授予 | Create a permission grant in a scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-permissionscheme/#api-group-permissionscheme |
| GET | /rest/api/2/permissionscheme/{schemeId}/permission/{permissionId} | 按 ID 获取权限授予 | Get a permission grant by ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-permissionscheme/#api-group-permissionscheme |
| DELETE | /rest/api/2/permissionscheme/{schemeId}/permission/{permissionId} | 从方案中删除权限授予 | Delete a permission grant from a scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-permissionscheme/#api-group-permissionscheme |

## 优先级 (Priority)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/priority | 获取全部 Issue 优先级 | Get all issue priorities | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-priority/#api-group-priority |
| GET | /rest/api/2/priority/page | 分页获取 Issue 优先级 | Get paginated issue priorities | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-priority/#api-group-priority |
| GET | /rest/api/2/priority/{id} | 按 ID 获取 Issue 优先级 | Get an issue priority by ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-priority/#api-group-priority |

## 优先级方案 (Priority Schemes)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/priorityschemes | 获取全部优先级方案 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-priorityschemes/#api-group-priorityschemes |
| POST | /rest/api/2/priorityschemes | 创建优先级方案 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-priorityschemes/#api-group-priorityschemes |
| GET | /rest/api/2/priorityschemes/{schemeId} | 按 ID 获取优先级方案 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-priorityschemes/#api-group-priorityschemes |
| PUT | /rest/api/2/priorityschemes/{schemeId} | 更新优先级方案 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-priorityschemes/#api-group-priorityschemes |
| DELETE | /rest/api/2/priorityschemes/{schemeId} | 删除优先级方案 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-priorityschemes/#api-group-priorityschemes |

## 项目 (Project)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/project | 获取全部可见项目 | Get all visible projects | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| POST | /rest/api/2/project | 创建项目 | Create a new project | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/type | 获取全部项目类型 | Get all project types | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/type/{projectTypeKey} | 按 key 获取项目类型 | Get project type by key | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/type/{projectTypeKey}/accessible | 按 key 获取项目类型 | Get project type by key | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectIdOrKey} | 按 ID 或 key 获取项目 | Get a project by ID or key | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| PUT | /rest/api/2/project/{projectIdOrKey} | 更新项目 | Update a project | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| DELETE | /rest/api/2/project/{projectIdOrKey} | 删除项目 | Delete a project | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| PUT | /rest/api/2/project/{projectIdOrKey}/archive | 归档项目 | Archive a project | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| POST | /rest/api/2/project/{projectIdOrKey}/avatar | 由临时头像创建正式头像 | Create avatar from temporary | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| PUT | /rest/api/2/project/{projectIdOrKey}/avatar | 更新项目头像 | Update project avatar | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| POST | /rest/api/2/project/{projectIdOrKey}/avatar/temporary | 通过 multipart 存储临时头像 | Store temporary avatar using multipart | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| DELETE | /rest/api/2/project/{projectIdOrKey}/avatar/{id} | 删除头像 | Delete an avatar | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectIdOrKey}/avatars | 获取项目的全部头像 | Get all avatars for a project | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectIdOrKey}/components | 获取项目组件列表 | Get project components | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectIdOrKey}/properties | 获取项目的全部属性键 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectIdOrKey}/properties/{propertyKey} | 获取项目属性值 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| PUT | /rest/api/2/project/{projectIdOrKey}/properties/{propertyKey} | 设置指定项目属性的值 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| DELETE | /rest/api/2/project/{projectIdOrKey}/properties/{propertyKey} | 删除项目属性 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| PUT | /rest/api/2/project/{projectIdOrKey}/restore | 恢复已归档的项目 | Restore an archived project | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectIdOrKey}/role | 获取项目中的全部角色 | Get all roles in project | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectIdOrKey}/role/{id} | 获取项目角色详情 | Get details for a project role | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| POST | /rest/api/2/project/{projectIdOrKey}/role/{id} | 向项目角色添加 actor（用户/组） | Add actor to project role | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| PUT | /rest/api/2/project/{projectIdOrKey}/role/{id} | 更新项目角色及其 actor | Update project role with actors | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| DELETE | /rest/api/2/project/{projectIdOrKey}/role/{id} | 从项目角色删除 actor | Delete actors from project role | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectIdOrKey}/statuses | 获取项目全部 Issue 类型及其状态 | Get all issue types with statuses for a project | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| PUT | /rest/api/2/project/{projectIdOrKey}/type/{newProjectTypeKey} | 更新项目类型 | Update project type | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectIdOrKey}/version | 分页获取项目版本 | Get paginated project versions | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectIdOrKey}/versions | 获取项目版本列表 | Get project versions | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectKeyOrId}/issuesecuritylevelscheme | 获取项目的 Issue 安全方案 | Get issue security scheme for project | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectKeyOrId}/notificationscheme | 获取项目关联的通知方案 | Get notification scheme associated with the project | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectKeyOrId}/permissionscheme | 获取已指派的权限方案 | Get assigned permission scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| PUT | /rest/api/2/project/{projectKeyOrId}/permissionscheme | 为项目指派权限方案 | Assign permission scheme to project | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectKeyOrId}/priorityscheme | 获取已指派的优先级方案 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| PUT | /rest/api/2/project/{projectKeyOrId}/priorityscheme | 为项目指派优先级方案 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| DELETE | /rest/api/2/project/{projectKeyOrId}/priorityscheme/{schemeId} | 解除项目与优先级方案的关联 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectKeyOrId}/securitylevel | 获取项目的全部安全级别 | Get all security levels for project | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |
| GET | /rest/api/2/project/{projectKeyOrId}/workflowscheme | 获取项目的工作流方案 | Get workflow scheme for project | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-project/#api-group-project |

## 项目类别 (Project Category)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/projectCategory | 获取全部项目类别 | Get all project categories | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-projectcategory/#api-group-projectcategory |
| POST | /rest/api/2/projectCategory | 创建项目类别 | Create project category | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-projectcategory/#api-group-projectcategory |
| GET | /rest/api/2/projectCategory/{id} | 按 ID 获取项目类别 | Get project category by ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-projectcategory/#api-group-projectcategory |
| PUT | /rest/api/2/projectCategory/{id} | 更新项目类别 | Update project category | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-projectcategory/#api-group-projectcategory |
| DELETE | /rest/api/2/projectCategory/{id} | 删除项目类别 | Delete project category | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-projectcategory/#api-group-projectcategory |

## 项目查询 (Projects)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/projects/picker | 按查询匹配项目 | Get projects matching query | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-projects/#api-group-projects |

## 项目校验 (Project Validate)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/projectvalidate/key | 校验项目 key | Get project key validation | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-projectvalidate/#api-group-projectvalidate |

## 只读模式 (Read-only Mode)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/readonly-mode | 获取只读模式状态 | Get read-only mode status | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-readonly-mode/#api-group-readonly-mode |
| PUT | /rest/api/2/readonly-mode | 更新只读模式状态 | Update read-only mode status | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-readonly-mode/#api-group-readonly-mode |

## 重建索引 (Reindex)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/reindex | 获取重建索引信息 | Get reindex information | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-reindex/#api-group-reindex |
| POST | /rest/api/2/reindex | 启动重建索引操作 | Start a reindex operation | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-reindex/#api-group-reindex |
| POST | /rest/api/2/reindex/issue | 重建单个 Issue 的索引 | Reindex individual issues | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-reindex/#api-group-reindex |
| GET | /rest/api/2/reindex/progress | 获取重建索引进度 | Get reindex progress | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-reindex/#api-group-reindex |
| POST | /rest/api/2/reindex/request | 执行待处理的重建索引请求 | Execute pending reindex requests | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-reindex/#api-group-reindex |
| GET | /rest/api/2/reindex/request/bulk | 获取多个重建索引请求的进度 | Get progress of multiple reindex requests | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-reindex/#api-group-reindex |
| GET | /rest/api/2/reindex/request/{requestId} | 获取单个重建索引请求的进度 | Get progress of a single reindex request | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-reindex/#api-group-reindex |

## 解决结果 (Resolution)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/resolution | 获取全部解决结果 | Get all resolutions | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-resolution/#api-group-resolution |
| GET | /rest/api/2/resolution/page | 分页获取过滤后的解决结果 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-resolution/#api-group-resolution |
| GET | /rest/api/2/resolution/{id} | 按 ID 获取解决结果 | Get a resolution by ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-resolution/#api-group-resolution |

## 项目角色 (Role)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/role | 获取全部项目角色 | Get all project roles | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-role/#api-group-role |
| POST | /rest/api/2/role | 创建项目角色 | Create a new project role | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-role/#api-group-role |
| GET | /rest/api/2/role/{id} | 获取指定项目角色 | Get a specific project role | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-role/#api-group-role |
| POST | /rest/api/2/role/{id} | 部分更新角色名称或描述 | Partially updates a role's name or description | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-role/#api-group-role |
| PUT | /rest/api/2/role/{id} | 全量更新角色名称与描述 | Fully updates a role's name and description | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-role/#api-group-role |
| DELETE | /rest/api/2/role/{id} | 删除角色 | Deletes a role | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-role/#api-group-role |
| GET | /rest/api/2/role/{id}/actors | 获取角色的默认 actor | Get default actors for a role | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-role/#api-group-role |
| POST | /rest/api/2/role/{id}/actors | 为角色添加默认 actor | Adds default actors to a role | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-role/#api-group-role |
| DELETE | /rest/api/2/role/{id}/actors | 移除角色的默认 actor | Removes default actor from a role | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-role/#api-group-role |

## 界面 (Screens)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/screens | 获取字段可用的界面 | Get available field screens | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-screens/#api-group-screens |
| POST | /rest/api/2/screens/addToDefault/{fieldId} | 向默认界面添加字段 | Add field to default screen | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-screens/#api-group-screens |
| GET | /rest/api/2/screens/{screenId}/availableFields | 获取界面可用的字段 | Get available fields for screen | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-screens/#api-group-screens |
| GET | /rest/api/2/screens/{screenId}/tabs | 获取界面的全部标签页 | Get all tabs for a screen | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-screens/#api-group-screens |
| POST | /rest/api/2/screens/{screenId}/tabs | 为界面创建标签页 | Create tab for a screen | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-screens/#api-group-screens |
| PUT | /rest/api/2/screens/{screenId}/tabs/{tabId} | 重命名界面标签页 | Rename a tab on a screen | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-screens/#api-group-screens |
| DELETE | /rest/api/2/screens/{screenId}/tabs/{tabId} | 从界面删除标签页 | Delete a tab from a screen | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-screens/#api-group-screens |
| GET | /rest/api/2/screens/{screenId}/tabs/{tabId}/fields | 获取标签页的全部字段 | Get all fields for a tab | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-screens/#api-group-screens |
| POST | /rest/api/2/screens/{screenId}/tabs/{tabId}/fields | 向标签页添加字段 | Add field to a tab | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-screens/#api-group-screens |
| DELETE | /rest/api/2/screens/{screenId}/tabs/{tabId}/fields/{id} | 从标签页移除字段 | Remove field from tab | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-screens/#api-group-screens |
| POST | /rest/api/2/screens/{screenId}/tabs/{tabId}/fields/{id}/move | 移动标签页上的字段 | Move field on a tab | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-screens/#api-group-screens |
| PUT | /rest/api/2/screens/{screenId}/tabs/{tabId}/fields/{id}/updateShowWhenEmptyIndicator/{newValue} | 更新字段的 showWhenEmptyIndicator | Update 'showWhenEmptyIndicator' for a field | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-screens/#api-group-screens |
| POST | /rest/api/2/screens/{screenId}/tabs/{tabId}/move/{pos} | 移动标签页位置 | Move tab position | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-screens/#api-group-screens |

## 搜索 (Search)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/search | 使用 JQL 查询 Issue | Get issues using JQL | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-search/#api-group-search |
| POST | /rest/api/2/search | 使用 JQL 执行搜索 | Perform search with JQL | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-search/#api-group-search |
| GET | /rest/api/2/search/error/lookup | 查询当前用户/上下文的搜索错误信息（官方文档未提供 summary，按响应描述翻译） | Get search error messages for the current user or context | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-search/#api-group-search |

## 搜索限制 (Search Limits)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/searchLimits/maxAggregationBuckets | 获取最大聚合桶数 | Get maximum aggregation buckets | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-searchlimits/#api-group-searchlimits |
| GET | /rest/api/2/searchLimits/maxResultWindow | 获取最大结果窗口 | Get maximum result window | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-searchlimits/#api-group-searchlimits |

## 安全级别 (Security Level)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/securitylevel/{id} | 按 ID 获取安全级别 | Get a security level by ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-securitylevel/#api-group-securitylevel |

## 服务器信息 (Server Info)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/serverInfo | 获取当前 Jira 服务器概要信息 | Get general information about the current Jira server | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-serverinfo/#api-group-serverinfo |

## 设置 (Settings)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| PUT | /rest/api/2/settings/baseUrl | 更新 Jira 实例的基础 URL | Update base URL for Jira instance | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-settings/#api-group-settings |
| GET | /rest/api/2/settings/columns | 获取 Issue 导航器的默认系统列 | Get default system columns for issue navigator | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-settings/#api-group-settings |
| PUT | /rest/api/2/settings/columns | 通过表单设置 Issue 导航器默认系统列 | Set default system columns for issue navigator using form | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-settings/#api-group-settings |

## 状态 (Status)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/status | 获取全部状态 | Get all statuses | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-status/#api-group-status |
| GET | /rest/api/2/status/page | 分页获取过滤后的状态 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-status/#api-group-status |
| GET | /rest/api/2/status/{idOrName} | 按 ID 或名称获取状态 | Get status by ID or name | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-status/#api-group-status |

## 状态分类 (Status Category)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/statuscategory | 获取全部状态分类 | Get all status categories | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-statuscategory/#api-group-statuscategory |
| GET | /rest/api/2/statuscategory/{idOrKey} | 按 ID 或 key 获取状态分类 | Get status category by ID or key | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-statuscategory/#api-group-statuscategory |

## 术语 (Terminology)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/terminology/entries | 获取 epic 与 sprint 的全部已定义名称 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-terminology/#api-group-terminology |
| POST | /rest/api/2/terminology/entries | 将 epic/sprint 名称从原名更新为新名 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-terminology/#api-group-terminology |
| GET | /rest/api/2/terminology/entries/{originalName} | 按原名称获取 epic 或 sprint 名称 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-terminology/#api-group-terminology |

## 通用头像 (Universal Avatar)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/universal_avatar/type/{type}/owner/{owningObjectId} | 按类型与属主获取全部头像 | Get all avatars for a type and owner | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-universal-avatar/#api-group-universal-avatar |
| POST | /rest/api/2/universal_avatar/type/{type}/owner/{owningObjectId}/avatar | 由临时头像创建正式头像 | Create avatar from temporary | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-universal-avatar/#api-group-universal-avatar |
| DELETE | /rest/api/2/universal_avatar/type/{type}/owner/{owningObjectId}/avatar/{id} | 按 ID 删除头像 | Delete avatar by ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-universal-avatar/#api-group-universal-avatar |
| POST | /rest/api/2/universal_avatar/type/{type}/owner/{owningObjectId}/temp | 通过 multipart 上传创建临时头像 | Create temporary avatar using multipart upload | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-universal-avatar/#api-group-universal-avatar |

## 升级 (Upgrade)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/upgrade | 获取最近一次升级任务结果 | Get result of the last upgrade task | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-upgrade/#api-group-upgrade |
| POST | /rest/api/2/upgrade | 运行待处理的升级任务 | Run pending upgrade tasks | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-upgrade/#api-group-upgrade |

## 用户 (User)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/user | 按用户名或 key 获取用户 | Get user by username or key | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| POST | /rest/api/2/user | 创建用户 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| PUT | /rest/api/2/user | 更新用户详情 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| DELETE | /rest/api/2/user | 删除用户 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/a11y/personal-settings | 获取可用的无障碍个人设置 | Get available accessibility personal settings | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/anonymization | 校验用户匿名化 | Get validation for user anonymization | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| POST | /rest/api/2/user/anonymization | 调度用户匿名化 | Schedule user anonymization | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/anonymization/progress | 获取用户匿名化进度 | Get user anonymization progress | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/anonymization/rerun | 校验用户匿名化重跑 | Get validation for user anonymization rerun | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| POST | /rest/api/2/user/anonymization/rerun | 调度用户匿名化重跑 | Schedule user anonymization rerun | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| DELETE | /rest/api/2/user/anonymization/unlock | 删除过期的用户匿名化任务 | Delete stale user anonymization task | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| POST | /rest/api/2/user/application | 将用户添加到应用（授予应用访问权） [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| DELETE | /rest/api/2/user/application | 将用户从应用移除（收回应用访问权） [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/assignable/multiProjectSearch | 批量查找可指派用户 | Find bulk assignable users | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/assignable/search | 按用户名查找可指派用户 | Find assignable users by username | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| POST | /rest/api/2/user/avatar | 由临时头像创建正式头像 | Create avatar from temporary | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| PUT | /rest/api/2/user/avatar | 更新用户头像 | Update user avatar | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| POST | /rest/api/2/user/avatar/temporary | 通过 multipart 存储临时头像 | Store temporary avatar using multipart | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| DELETE | /rest/api/2/user/avatar/{id} | 删除头像 | Delete avatar | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/avatars | 获取用户的全部头像 | Get all avatars for user | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/columns | 获取用户的默认列 | Get default columns for user | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| PUT | /rest/api/2/user/columns | 设置用户默认列 | Set default columns for user | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| DELETE | /rest/api/2/user/columns | 将默认列重置为系统默认 | Reset default columns to system default | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/duplicated/count | 获取重复用户数量 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/duplicated/list | 获取重复用户映射 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/list | 列出全部用户 | List all users | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| PUT | /rest/api/2/user/password | 更新用户密码 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/permission/search | 查找拥有全部指定权限的用户 [deprecated] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/picker | 按查询为用户选择器查找用户 | Find users for picker by query | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/properties | 获取用户的全部属性键 | Get keys of all properties for a user | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/properties/{propertyKey} | 获取指定用户属性的值 | Get the value of a specified user's property | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| PUT | /rest/api/2/user/properties/{propertyKey} | 设置指定用户属性的值 | Set the value of a specified user's property | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| DELETE | /rest/api/2/user/properties/{propertyKey} | 删除指定用户的属性 | Delete a specified user's property | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/search | 按用户名查找用户 | Find users by username | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| DELETE | /rest/api/2/user/session/{username} | 删除用户会话 | Delete user session | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |
| GET | /rest/api/2/user/viewissue/search | 查找拥有浏览权限的用户 | Find users with browse permission | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-user/#api-group-user |

## 版本 (Version)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/version | 分页获取版本 [experimental] |  | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| POST | /rest/api/2/version | 创建版本 | Create new version | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| GET | /rest/api/2/version/remotelink | 按 global ID 获取远程版本链接 | Get remote version links by global ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| GET | /rest/api/2/version/{id} | 获取版本详情 | Get version details | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| PUT | /rest/api/2/version/{id} | 更新版本详情 | Update version details | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| PUT | /rest/api/2/version/{id}/mergeto/{moveIssuesTo} | 合并版本 | Merge versions | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| POST | /rest/api/2/version/{id}/move | 调整版本顺序 | Modify version's sequence | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| GET | /rest/api/2/version/{id}/relatedIssueCounts | 获取版本相关 Issue 数量 | Get version related issues count | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| POST | /rest/api/2/version/{id}/removeAndSwap | 删除版本并替换引用值 | Delete version and replace values | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| GET | /rest/api/2/version/{id}/unresolvedIssueCount | 获取版本未解决 Issue 数量 | Get version unresolved issues count | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| GET | /rest/api/2/version/{versionId}/remotelink | 按版本 ID 获取远程版本链接 | Get remote version links by version ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| POST | /rest/api/2/version/{versionId}/remotelink | 不使用 global ID 创建或更新远程版本链接 | Create or update remote version link without global ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| DELETE | /rest/api/2/version/{versionId}/remotelink | 删除版本的全部远程版本链接 | Delete all remote version links for version | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| GET | /rest/api/2/version/{versionId}/remotelink/{globalId} | 获取指定远程版本链接 | Get specific remote version link | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| POST | /rest/api/2/version/{versionId}/remotelink/{globalId} | 使用 global ID 创建或更新远程版本链接 | Create or update remote version link with global ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |
| DELETE | /rest/api/2/version/{versionId}/remotelink/{globalId} | 删除指定远程版本链接 | Delete specific remote version link | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-version/#api-group-version |

## 工作流 (Workflow)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/workflow | 获取全部工作流 | Get all workflows | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflow/#api-group-workflow |

## 工作流方案 (Workflow Scheme)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| POST | /rest/api/2/workflowscheme | 创建工作流方案 | Create a new workflow scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| GET | /rest/api/2/workflowscheme/{id} | 按 ID 获取指定工作流方案 | Get requested workflow scheme by ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| PUT | /rest/api/2/workflowscheme/{id} | 更新指定工作流方案 | Update a specified workflow scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| DELETE | /rest/api/2/workflowscheme/{id} | 删除指定工作流方案 | Delete the specified workflow scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| POST | /rest/api/2/workflowscheme/{id}/createdraft | 为工作流方案创建草稿 | Create a draft for a workflow scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| GET | /rest/api/2/workflowscheme/{id}/default | 获取方案的默认工作流 | Get default workflow for a scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| PUT | /rest/api/2/workflowscheme/{id}/default | 更新方案的默认工作流 | Update default workflow for a scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| DELETE | /rest/api/2/workflowscheme/{id}/default | 移除方案的默认工作流 | Remove default workflow from a scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| GET | /rest/api/2/workflowscheme/{id}/draft | 按 ID 获取指定工作流方案草稿 | Get requested draft workflow scheme by ID | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| PUT | /rest/api/2/workflowscheme/{id}/draft | 更新工作流方案草稿 | Update a draft workflow scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| DELETE | /rest/api/2/workflowscheme/{id}/draft | 删除指定工作流方案草稿 | Delete the specified draft workflow scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| GET | /rest/api/2/workflowscheme/{id}/draft/default | 获取草稿方案的默认工作流 | Get default workflow for a draft scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| PUT | /rest/api/2/workflowscheme/{id}/draft/default | 更新草稿方案的默认工作流 | Update default workflow for a draft scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| DELETE | /rest/api/2/workflowscheme/{id}/draft/default | 移除草稿方案的默认工作流 | Remove default workflow from a draft scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| GET | /rest/api/2/workflowscheme/{id}/draft/issuetype/{issueType} | 获取草稿方案的 Issue 类型映射 | Get issue type mapping for a draft scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| PUT | /rest/api/2/workflowscheme/{id}/draft/issuetype/{issueType} | 设置草稿方案的 Issue 类型映射 | Set an issue type mapping for a draft scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| DELETE | /rest/api/2/workflowscheme/{id}/draft/issuetype/{issueType} | 从草稿方案删除 Issue 类型映射 | Delete an issue type mapping from a draft scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| GET | /rest/api/2/workflowscheme/{id}/draft/workflow | 获取草稿工作流映射 | Get draft workflow mappings | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| PUT | /rest/api/2/workflowscheme/{id}/draft/workflow | 更新草稿方案中的工作流映射 | Update a workflow mapping in a draft scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| DELETE | /rest/api/2/workflowscheme/{id}/draft/workflow | 从草稿方案删除工作流映射 | Delete a workflow mapping from a draft scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| GET | /rest/api/2/workflowscheme/{id}/issuetype/{issueType} | 获取方案的 Issue 类型映射 | Get issue type mapping for a scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| PUT | /rest/api/2/workflowscheme/{id}/issuetype/{issueType} | 设置方案的 Issue 类型映射 | Set an issue type mapping for a scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| DELETE | /rest/api/2/workflowscheme/{id}/issuetype/{issueType} | 从方案删除 Issue 类型映射 | Delete an issue type mapping from a scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| GET | /rest/api/2/workflowscheme/{id}/workflow | 获取方案的工作流映射 | Get workflow mappings for a scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| PUT | /rest/api/2/workflowscheme/{id}/workflow | 更新方案中的工作流映射 | Update a workflow mapping in a scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |
| DELETE | /rest/api/2/workflowscheme/{id}/workflow | 从方案删除工作流映射 | Delete a workflow mapping from a scheme | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-workflowscheme/#api-group-workflowscheme |

## 工作日志 (Worklog)

| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/2/worklog/deleted | 返回指定时间以来删除的工作日志 | Returns worklogs deleted since given time. | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-worklog/#api-group-worklog |
| POST | /rest/api/2/worklog/list | 返回指定 ID 的工作日志 | Returns worklogs for given ids. | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-worklog/#api-group-worklog |
| GET | /rest/api/2/worklog/updated | 返回指定时间以来更新的工作日志 | Returns worklogs updated since given time. | https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-worklog/#api-group-worklog |

## 抓取失败/存疑记录 (Fetch failures / uncertain records)

- `https://docs.atlassian.com/software/jira/docs/api/REST/11.3.0/` (and every 11.x / 10.x version, plus `latest`) returns 404 or stays at 9.17.x; that site does not host Jira 10+ documentation. The authoritative source is the developer.atlassian.com v11003 reference (Jira 11.3.8).
- The official version index (https://developer.atlassian.com/server/jira/platform/rest-apis/) listed only up to Jira 11.2 (v11002) at fetch time, not 11.3; the v11003 page is reachable and its embedded spec reports `info.version=11.3.8`, so it was adopted.
- 36 resource pages were truncated during the first parallel fetch (incomplete HTML). Because every page embeds the same complete OpenAPI spec (289 paths), the spec was extracted from the fully downloaded pages (page_application-properties.html and 30 others, cross-verified byte-identical); data completeness is unaffected.
- These endpoints appear in the same official reference but fall outside `/rest/api/2/**` and were not counted: `GET/POST/DELETE /rest/auth/1/session`, `DELETE /rest/auth/1/websudo`. They can be added separately if ever needed.
- The embedded spec contains 31 `/agile/1.0/**` paths (backlog/board/epic/sprint plus some issue-tagged rank/estimation endpoints) belonging to the Jira Software agile API; they are excluded from this baseline (39 agile operations are exposed via generator OVERRIDES instead).
- The Chinese descriptions are human translations of the English summaries; [deprecated] / [experimental] markers come from the spec's `deprecated` and `x-experimental` fields.

Endpoint total: 387

---


# 第二部分：Confluence DC (Part 2: Confluence DC)


## Access Mode（api-group-access-mode）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/accessmode | 获取访问模式状态 | Get access mode status | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-access-mode |

## Admin Group（api-group-admin-group）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| POST | /rest/api/admin/group | 创建用户组 | Create group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-admin-group |
| DELETE | /rest/api/admin/group/{groupName} | 删除用户组 | Delete group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-admin-group |

## Admin Space（api-group-admin-space）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| POST | /rest/api/admin/space/personal/{username} | 为指定用户创建个人空间 | Creates personal Space for a User. | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-admin-space |

## Admin User（api-group-admin-user）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| POST | /rest/api/admin/user | 创建用户 | Create user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-admin-user |
| DELETE | /rest/api/admin/user/{username} | 删除用户 | Delete user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-admin-user |
| PUT | /rest/api/admin/user/{username} | 更新用户 | Update user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-admin-user |
| PUT | /rest/api/admin/user/{username}/disable | 禁用用户 | Disable user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-admin-user |
| PUT | /rest/api/admin/user/{username}/enable | 启用用户 | Enable user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-admin-user |
| POST | /rest/api/admin/user/{username}/password | 修改用户密码 | Change password | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-admin-user |

## Admin Users（api-group-admin-users）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/admin/users/list/active | 获取活跃用户列表 | Get active users | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-admin-users |

## Attachments（api-group-attachments）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/content/{id}/child/attachment | 获取内容的附件列表 | Get attachment | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-attachments |
| POST | /rest/api/content/{id}/child/attachment | 创建/上传附件 | Create attachments | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-attachments |
| DELETE | /rest/api/content/{id}/child/attachment/{attachmentId} | 删除附件 | Remove attachment | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-attachments |
| PUT | /rest/api/content/{id}/child/attachment/{attachmentId} | 更新附件的非二进制数据（元数据） | Update non-binary data of an Attachment | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-attachments |
| POST | /rest/api/content/{id}/child/attachment/{attachmentId}/data | 更新附件的二进制数据 | Update binary data of an attachment | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-attachments |
| GET | /rest/api/content/{id}/child/attachment/{attachmentId}/extractedtext | 获取附件的提取文本 | Get the extracted text of an attachment | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-attachments |
| POST | /rest/api/content/{id}/child/attachment/{attachmentId}/move | 移动附件 | Move attachment | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-attachments |
| DELETE | /rest/api/content/{id}/child/attachment/{attachmentId}/version/{version} | 删除附件的指定版本 | Remove attachment version | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-attachments |

## Backup and Restore（api-group-backup-and-restore）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| POST | /rest/api/backup-restore/backup/site | 创建站点备份任务 | Create site backup job | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-backup-and-restore |
| POST | /rest/api/backup-restore/backup/space | 创建空间备份任务 | Create space backup job | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-backup-and-restore |
| GET | /rest/api/backup-restore/jobs | 按条件查询备份/恢复任务 | Find jobs by filters | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-backup-and-restore |
| PUT | /rest/api/backup-restore/jobs/clear-queue | 取消所有排队中的任务 | Cancel all queued jobs | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-backup-and-restore |
| GET | /rest/api/backup-restore/jobs/{jobId} | 按 ID 获取任务详情 | Get job by ID | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-backup-and-restore |
| PUT | /rest/api/backup-restore/jobs/{jobId}/cancel | 取消任务 | Cancel job | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-backup-and-restore |
| GET | /rest/api/backup-restore/jobs/{jobId}/download | 下载备份文件 | Download backup file | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-backup-and-restore |
| GET | /rest/api/backup-restore/restore/files | 获取恢复目录中的文件列表 | Get files in restore directory | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-backup-and-restore |
| POST | /rest/api/backup-restore/restore/site | 创建站点恢复任务 | Create site restore job | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-backup-and-restore |
| POST | /rest/api/backup-restore/restore/site/upload | 以上传备份文件方式创建站点恢复任务 | Create site restore job for upload backup file | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-backup-and-restore |
| POST | /rest/api/backup-restore/restore/space | 创建空间恢复任务 | Create space restore job | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-backup-and-restore |
| POST | /rest/api/backup-restore/restore/space/upload | 以上传备份文件方式创建空间恢复任务 | Create space restore job for upload backup file | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-backup-and-restore |

## Category（api-group-category）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| DELETE | /rest/api/space/{spaceKey}/category/{categoryName} | 从空间移除分类 | Remove a category from a space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-category |
| POST | /rest/api/space/{spaceKey}/category/{labelName} | 为空间添加分类 | Add a category to a space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-category |

## Child Content（api-group-child-content）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/content/{id}/child | 获取内容的子内容 | Get children of content | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-child-content |
| GET | /rest/api/content/{id}/child/comment | 获取内容的评论 | Get comments of content | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-child-content |
| GET | /rest/api/content/{id}/child/{type} | 按类型获取内容的子内容 | Get children of content by type | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-child-content |

## Cluster information（api-group-cluster-information）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/cluster/nodes | 获取集群节点状态 | Get node statuses in a cluster | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-cluster-information |

## Content Blueprint（api-group-content-blueprint）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| POST | /rest/api/content/blueprint/instance/{draftId} | 发布旧版（legacy）草稿 | Publish legacy draft | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-blueprint |
| PUT | /rest/api/content/blueprint/instance/{draftId} | 发布共享草稿 | Publish shared draft | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-blueprint |

## Content Body（api-group-content-body）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| POST | /rest/api/contentbody/convert/{to} | 转换内容正文格式（representation） | Convert body representation | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-body |

## Content Descendant（api-group-content-descendant）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/content/{id}/descendant | 获取内容的后代 | Get Descendants | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-descendant |
| GET | /rest/api/content/{id}/descendant/{type} | 按类型获取内容的后代 | Get descendants of type | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-descendant |

## Content Labels（api-group-content-labels）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| DELETE | /rest/api/content/{id}/label | 按查询参数删除内容标签 | Delete label with query param | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-labels |
| GET | /rest/api/content/{id}/label | 获取内容的标签 | Get labels | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-labels |
| POST | /rest/api/content/{id}/label | 为内容添加标签 | Add Labels | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-labels |
| DELETE | /rest/api/content/{id}/label/{label} | 删除内容的指定标签 | Delete label | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-labels |

## Content Property（api-group-content-property）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/content/{id}/property | 获取内容的全部属性 | Find all content properties | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-property |
| POST | /rest/api/content/{id}/property | 创建内容属性 | Create a content property | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-property |
| DELETE | /rest/api/content/{id}/property/{key} | 删除内容属性 | Delete content property | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-property |
| GET | /rest/api/content/{id}/property/{key} | 按键获取内容属性 | Find content property by key | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-property |
| POST | /rest/api/content/{id}/property/{key} | 按指定键创建内容属性 | Create a content property with a specific key | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-property |
| PUT | /rest/api/content/{id}/property/{key} | 更新内容属性 | Update content property | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-property |

## Content Resource（api-group-content-resource）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/content | 获取内容列表 | Get content | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-resource |
| POST | /rest/api/content | 创建内容 | Create content | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-resource |
| GET | /rest/api/content/scan | 按空间键扫描内容 | Scan content by space key | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-resource |
| GET | /rest/api/content/search | 使用 CQL 搜索内容 | Search content using CQL | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-resource |
| PUT | /rest/api/content/{contentId} | 更新内容 | Update content | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-resource |
| DELETE | /rest/api/content/{id} | 删除内容 | Delete content | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-resource |
| GET | /rest/api/content/{id} | 按 ID 获取内容 | Get content by ID | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-resource |
| GET | /rest/api/content/{id}/history | 获取内容历史 | Get history of content | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-resource |
| GET | /rest/api/content/{id}/history/{version}/macro/hash/{hash} | 按哈希获取宏内容 [deprecated] |  | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-resource |
| GET | /rest/api/content/{id}/history/{version}/macro/id/{macroId} | 按宏 ID 获取宏内容 | Get macro body by macro ID | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-resource |

## Content Restrictions（api-group-content-restrictions）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| PUT | /rest/api/content/{id}/restriction | 更新内容限制 | Update restrictions | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-restrictions |
| GET | /rest/api/content/{id}/restriction/byOperation | 按操作获取全部限制 | Get all restrictions by Operation | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-restrictions |
| GET | /rest/api/content/{id}/restriction/byOperation/{operationKey} | 获取指定操作的限制 | Get all restrictions for given operation | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-restrictions |
| GET | /rest/api/content/{id}/restriction/relevantViewRestrictions | 获取直接及继承的查看限制 | Get all view restriction both direct and inherited. | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-restrictions |

## Content Version（api-group-content-version）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| DELETE | /rest/api/content/{id}/version/{versionNumber} | 删除内容的指定历史版本 | Delete content history | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-version |

## Content Watchers（api-group-content-watchers）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/content/{contentId}/watchers | 获取关注指定内容的用户 | Fetch users watching a given content | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-content-watchers |

## Global Permissions（api-group-global-permissions）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/permissions | 获取全局权限 | Get global permissions | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-global-permissions |
| PUT | /rest/api/permissions | 为多个用户/组设置全局权限 | Set global permissions to multiple users/groups | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-global-permissions |
| GET | /rest/api/permissions/anonymous | 获取匿名用户的全局权限 | Gets the permissions granted to an anonymous user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-global-permissions |
| PUT | /rest/api/permissions/anonymous/grant | 授予匿名用户全局权限 | Grants global permissions to anonymous users | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-global-permissions |
| PUT | /rest/api/permissions/anonymous/revoke | 撤销匿名用户全局权限 | Revoke global permissions from anonymous users | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-global-permissions |
| GET | /rest/api/permissions/group/{groupName} | 获取组的全局权限 | Gets global permissions granted to a group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-global-permissions |
| PUT | /rest/api/permissions/group/{groupName}/grant | 授予组全局权限 | Grants global permissions to a group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-global-permissions |
| PUT | /rest/api/permissions/group/{groupName}/revoke | 撤销组全局权限 | Revoke global permissions from a group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-global-permissions |
| GET | /rest/api/permissions/unlicensed | 获取未许可用户的全局权限 | Gets the permissions granted to an unlicensed users | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-global-permissions |
| PUT | /rest/api/permissions/unlicensed/grant | 授予未许可用户全局权限 | Grants global permissions to unlicensed users | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-global-permissions |
| PUT | /rest/api/permissions/unlicensed/revoke | 撤销未许可用户全局权限 | Revoke global permissions from unlicensed users | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-global-permissions |
| GET | /rest/api/permissions/user/{user} | 获取用户的全局权限 | Gets global permissions granted to a user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-global-permissions |
| PUT | /rest/api/permissions/user/{user}/grant | 授予用户全局权限 | Grants global permissions to a user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-global-permissions |
| PUT | /rest/api/permissions/user/{user}/revoke | 撤销用户全局权限 | Revoke global permissions from a user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-global-permissions |

## GlobalColorScheme（api-group-globalcolorscheme）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/color-scheme | 获取全局配色方案 | Get global color scheme | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-globalcolorscheme |
| PUT | /rest/api/color-scheme | 设置全局配色方案 | Set global color scheme | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-globalcolorscheme |
| GET | /rest/api/color-scheme/default | 获取默认全局配色方案 | Get default global color scheme | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-globalcolorscheme |
| PUT | /rest/api/color-scheme/reset | 重置全局配色方案 | Reset global color scheme | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-globalcolorscheme |

## Group（api-group-group）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/group | 获取用户组列表 | Get groups | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-group |
| GET | /rest/api/group/groupancestor | 获取组的上级组 | Get group ancestor of a group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-group |
| GET | /rest/api/group/groupmember | 获取组的成员组 | Get group members of group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-group |
| GET | /rest/api/group/groupparent | 获取组的父组 | Get group parents of a group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-group |
| GET | /rest/api/group/info | 按名称获取组信息 | Get group by name | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-group |
| GET | /rest/api/group/member | 获取组的成员用户 | Get members of group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-group |
| GET | /rest/api/group/{groupName} | 按名称获取组 | Get group by name | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-group |
| GET | /rest/api/group/{groupName}/groupancestor | 获取指定组的上级组 | Get group ancestor of a group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-group |
| GET | /rest/api/group/{groupName}/groupmember | 获取指定组的成员组 | Get group members of group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-group |
| GET | /rest/api/group/{groupName}/groupparent | 获取指定组的父组 | Get group parents of a group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-group |
| GET | /rest/api/group/{groupName}/member | 获取指定组的成员用户 | Get members of group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-group |

## Index Management（api-group-index-management）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/index/reindex | 获取重建索引状态 | Get reindex status | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-index-management |
| POST | /rest/api/index/reindex | 重建 Confluence 搜索索引 | Rebuild Confluence search index | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-index-management |
| PUT | /rest/api/index/resetjob | 重置重建索引任务状态 | Reset reindex job status | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-index-management |
| POST | /rest/api/index/unindex | 从搜索索引中移除全部内容 | Remove all content from search index | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-index-management |

## Instance Metrics（api-group-instance-metrics）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/instance-metrics | 获取实例指标 | Get instance metrics | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-instance-metrics |

## Label（api-group-label）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/label/labels | 按名称/命名空间/空间/所有者查询标签 | Get list of labels matching the given label name, namespace, space (via space key) or owner. | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-label |
| GET | /rest/api/label/popular | 获取热门标签 | Get most popular labels | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-label |
| GET | /rest/api/label/recent | 获取最近使用的标签 | Get recently used labels | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-label |
| GET | /rest/api/label/{labelName}/related | 获取相关标签 | Get related labels. | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-label |

## Long Task（api-group-long-task）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/longtask | 获取长任务列表 | Get tasks | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-long-task |
| GET | /rest/api/longtask/{id} | 按 ID 获取长任务 | Get task by ID | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-long-task |

## Other Operations（api-group-other-operations）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/audit | 获取审计记录 [deprecated] |  | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-other-operations |

## Search（api-group-search）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/search | 使用 CQL 搜索 Confluence 中的实体 | Search for entities in confluence | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-search |

## Server Information（api-group-server-information）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/server-information | 获取服务器信息 | Get server information | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-server-information |

## Space（api-group-space）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/space | 获取空间列表（可按 key 过滤） | Get spaces by key | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space |
| POST | /rest/api/space | 创建空间 | Creates a new Space. | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space |
| POST | /rest/api/space/_private | 创建私有空间 | Create private space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space |
| POST | /rest/api/space/personal | 为当前用户创建个人空间 | Creates the personal Space for self. | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space |
| DELETE | /rest/api/space/{spaceKey} | 删除空间 | Delete Space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space |
| GET | /rest/api/space/{spaceKey} | 获取空间 | Get space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space |
| PUT | /rest/api/space/{spaceKey} | 更新空间 | Update Space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space |
| PUT | /rest/api/space/{spaceKey}/archive | 归档空间 | Archive space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space |
| GET | /rest/api/space/{spaceKey}/content | 获取空间中的内容 | Get contents in space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space |
| GET | /rest/api/space/{spaceKey}/content/{type} | 按类型获取空间中的内容 | Get contents by type | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space |
| PUT | /rest/api/space/{spaceKey}/restore | 恢复已归档空间 | Restore space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space |
| DELETE | /rest/api/space/{spaceKey}/trash | 清空空间回收站 | Remove all trash contents | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space |
| GET | /rest/api/space/{spaceKey}/trash | 获取空间回收站中的内容 | Get trash contents of space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space |

## Space Label（api-group-space-label）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/space/{spaceKey}/labels | 获取空间的全部标签 | Fetch all labels | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-label |
| GET | /rest/api/space/{spaceKey}/labels/popular | 获取空间热门标签 | Get popular labels | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-label |
| GET | /rest/api/space/{spaceKey}/labels/recent | 获取空间最近使用的标签 | Get recent labels | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-label |
| GET | /rest/api/space/{spaceKey}/labels/{labelName}/related | 获取空间相关标签 | Get related labels | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-label |

## Space Permissions（api-group-space-permissions）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/space/{spaceKey}/permissions | 获取空间的全部权限 | Get all space permissions | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-permissions |
| POST | /rest/api/space/{spaceKey}/permissions | 在指定空间为多个用户/组/匿名用户设置权限 | Set permissions to multiple users/groups/anonymous user in the given space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-permissions |
| GET | /rest/api/space/{spaceKey}/permissions/anonymous | 获取匿名用户在空间中的权限 | Gets the permissions granted to an anonymous user in a space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-permissions |
| PUT | /rest/api/space/{spaceKey}/permissions/anonymous/grant | 授予匿名用户空间权限 | Grants space permissions to anonymous user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-permissions |
| PUT | /rest/api/space/{spaceKey}/permissions/anonymous/revoke | 撤销匿名用户空间权限 | Revoke space permissions from anonymous user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-permissions |
| GET | /rest/api/space/{spaceKey}/permissions/group/{groupName} | 获取组在空间中的权限 | Gets the permissions granted to a group in a space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-permissions |
| PUT | /rest/api/space/{spaceKey}/permissions/group/{groupName}/grant | 授予组空间权限 | Grants space permissions to a group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-permissions |
| PUT | /rest/api/space/{spaceKey}/permissions/group/{groupName}/revoke | 撤销组空间权限 | Revoke space permissions from a group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-permissions |
| GET | /rest/api/space/{spaceKey}/permissions/user/{userKey} | 获取用户在空间中的权限 | Gets the permissions granted to a user in a space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-permissions |
| PUT | /rest/api/space/{spaceKey}/permissions/user/{userKey}/grant | 授予用户空间权限 | Grants space permissions to a user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-permissions |
| PUT | /rest/api/space/{spaceKey}/permissions/user/{userKey}/revoke | 撤销用户空间权限 | Revoke space permissions from a user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-permissions |

## Space Property（api-group-space-property）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/space/{spaceKey}/property | 获取空间属性 | Get space properties | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-property |
| POST | /rest/api/space/{spaceKey}/property | 创建空间属性 | Create a space property | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-property |
| DELETE | /rest/api/space/{spaceKey}/property/{key} | 删除空间属性 | Delete space property | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-property |
| GET | /rest/api/space/{spaceKey}/property/{key} | 按键获取空间属性 | Get space property by key | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-property |
| POST | /rest/api/space/{spaceKey}/property/{key} | 按指定键创建空间属性 | Create a space property with a specific key | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-property |
| PUT | /rest/api/space/{spaceKey}/property/{key} | 更新空间属性 | Update space property | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-property |

## Space Watchers（api-group-space-watchers）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/space/{spaceKey}/watchers | 获取关注空间的用户 | Fetch users watching space | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-space-watchers |

## SpaceColorScheme（api-group-spacecolorscheme）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/space/{spaceKey}/color-scheme | 获取空间配色方案 | Get Space color scheme | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-spacecolorscheme |
| PUT | /rest/api/space/{spaceKey}/color-scheme | 更新空间配色方案 | Update Space color scheme | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-spacecolorscheme |
| PUT | /rest/api/space/{spaceKey}/color-scheme/reset | 重置空间配色方案 | Reset Space color scheme | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-spacecolorscheme |
| GET | /rest/api/space/{spaceKey}/color-scheme/type | 获取空间配色方案类型 | Get Space color scheme type | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-spacecolorscheme |
| PUT | /rest/api/space/{spaceKey}/color-scheme/type | 更新空间配色方案类型 | Update Space color scheme type | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-spacecolorscheme |

## User（api-group-user）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/user | 获取用户 | Get user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user |
| GET | /rest/api/user/anonymous | 获取匿名用户信息 | Get information about anonymous user type | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user |
| GET | /rest/api/user/current | 获取当前用户 | Get current user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user |
| PUT | /rest/api/user/current | 更新当前用户信息 | Update details of the current user | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user |
| POST | /rest/api/user/current/password | 修改当前用户密码 | Change password | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user |
| GET | /rest/api/user/list | 获取注册用户列表 | Get registered users | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user |
| GET | /rest/api/user/memberof | 获取用户所属的用户组 | Get groups | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user |
| PUT | /rest/api/user/settings | 更新用户偏好设置 | Update a user's preference settings | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user |

## User Group（api-group-user-group）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| DELETE | /rest/api/user/{username}/group/{groupName} | 将用户从组中移除 | Delete user group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user-group |
| PUT | /rest/api/user/{username}/group/{groupName} | 将用户加入组 | Update user group | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user-group |

## User Watch（api-group-user-watch）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| DELETE | /rest/api/user/watch/content/{contentId} | 取消关注内容 | Remove content watcher | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user-watch |
| GET | /rest/api/user/watch/content/{contentId} | 获取内容关注信息 | Get information about content watcher | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user-watch |
| POST | /rest/api/user/watch/content/{contentId} | 关注内容 | Add content watcher | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user-watch |
| DELETE | /rest/api/user/watch/space/{spaceKey} | 取消关注空间 | Remove space watcher | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user-watch |
| GET | /rest/api/user/watch/space/{spaceKey} | 获取空间关注信息 | Get information about space watcher | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user-watch |
| POST | /rest/api/user/watch/space/{spaceKey} | 关注空间 | Add space watcher | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-user-watch |

## Webhooks（api-group-webhooks）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/webhooks | 查询 Webhook | Find webhooks | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-webhooks |
| POST | /rest/api/webhooks | 创建 Webhook | Create webhook | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-webhooks |
| POST | /rest/api/webhooks/test | 测试 Webhook | Test webhook | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-webhooks |
| DELETE | /rest/api/webhooks/{webhookId} | 删除 Webhook | Delete webhook | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-webhooks |
| GET | /rest/api/webhooks/{webhookId} | 获取 Webhook | Get webhook | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-webhooks |
| PUT | /rest/api/webhooks/{webhookId} | 更新 Webhook | Update webhook | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-webhooks |
| GET | /rest/api/webhooks/{webhookId}/latest | 获取 Webhook 最近调用记录 | Get latest invocations | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-webhooks |
| GET | /rest/api/webhooks/{webhookId}/statistics | 获取 Webhook 统计信息 | Get statistic | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-webhooks |
| GET | /rest/api/webhooks/{webhookId}/statistics/summary | 获取 Webhook 统计摘要 | Get statistics summary | https://developer.atlassian.com/server/confluence/rest/v10214/api-group-webhooks |

## 抓取失败/存疑记录 (Fetch failures / uncertain records)

- The FetchURL tool could not reach developer.atlassian.com due to network policy, so the official pages were fetched directly with curl (HTTP 200, same data source).
- The official site is a client-rendered SPA whose `/api/markdown` endpoint returns 401; the actual data source is the complete OpenAPI 3.0.1 spec embedded in every page (`window.__DATA__.schema`, info.title="Confluence Data Center 10.2.14"). Four group pages (access-mode / content-resource / space / other-operations) were spot-checked and their embedded specs are byte-identical (same MD5), so the embedded spec is the single authoritative source; group membership follows the spec's tags.
- `GET /rest/api/audit` has no tags and no summary/description in the spec, only `deprecated: true`; it was placed in `api-group-other-operations` (the only navigation group without a tag) with an inferred description (audit records), marked [deprecated].
- These endpoints have no summary/description in the official spec; their Chinese descriptions were written from the operationId: `GET /rest/api/content/{id}/child/attachment/{attachmentId}/extractedtext` (getAttachmentExtractedText), `POST /rest/api/content/{id}/property/{key}` (create_2).
- The index page also offers v1100 (product 11.0.0) documentation; v10214 (product 10.2.14) was chosen as the version closest to the 10.2.x test baseline.
- No experimental endpoints were found in the official spec; there are 2 deprecated endpoints (marked in the tables).

Endpoint total: 176

---


# 第三部分：Bitbucket DC (Part 3: Bitbucket DC)


Data source: the official OpenAPI 3.0.1 definition published with the doc pages (https://dac-static.atlassian.com/server/bitbucket/10.4.swagger.v3.json, identical to every v1004 api-group page), plus the Rolling Upgrades REST API section embedded in the intro page.

## Other operations
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/latest/inbox/pull-requests | 获取收件箱中的拉取请求 | Get pull requests in inbox | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-other-operations/ |
| GET | /rest/api/latest/inbox/pull-requests/count | 获取收件箱中拉取请求总数 | Get total number of pull requests in inbox | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-other-operations/ |

## Authentication
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/access-tokens/latest/projects/{projectKey} | 获取项目 HTTP 访问令牌 | Get project HTTP tokens | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| PUT | /rest/access-tokens/latest/projects/{projectKey} | 创建项目 HTTP 访问令牌 | Create project HTTP token | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/access-tokens/latest/projects/{projectKey}/repos/{repositorySlug} | 获取仓库 HTTP 访问令牌 | Get repository HTTP tokens | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| PUT | /rest/access-tokens/latest/projects/{projectKey}/repos/{repositorySlug} | 创建仓库 HTTP 访问令牌 | Create repository HTTP token | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| DELETE | /rest/access-tokens/latest/projects/{projectKey}/repos/{repositorySlug}/{tokenId} | 删除 HTTP 访问令牌 | Delete a HTTP token | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/access-tokens/latest/projects/{projectKey}/repos/{repositorySlug}/{tokenId} | 按 ID 获取 HTTP 访问令牌 | Get HTTP token by ID | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/access-tokens/latest/projects/{projectKey}/repos/{repositorySlug}/{tokenId} | 更新 HTTP 访问令牌 | Update HTTP token | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| DELETE | /rest/access-tokens/latest/projects/{projectKey}/{tokenId} | 删除 HTTP 访问令牌 | Delete a HTTP token | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/access-tokens/latest/projects/{projectKey}/{tokenId} | 按 ID 获取 HTTP 访问令牌 | Get HTTP token by ID | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/access-tokens/latest/projects/{projectKey}/{tokenId} | 更新 HTTP 访问令牌 | Update HTTP token | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/access-tokens/latest/users/{userSlug} | 获取个人 HTTP 访问令牌 | Get personal HTTP tokens | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| PUT | /rest/access-tokens/latest/users/{userSlug} | 创建个人 HTTP 访问令牌 | Create personal HTTP token | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| DELETE | /rest/access-tokens/latest/users/{userSlug}/{tokenId} | 删除 HTTP 访问令牌 | Delete a HTTP token | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/access-tokens/latest/users/{userSlug}/{tokenId} | 按 ID 获取 HTTP 访问令牌 | Get HTTP token by ID | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/access-tokens/latest/users/{userSlug}/{tokenId} | 更新 HTTP 访问令牌 | Update HTTP token | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/authconfig/latest/idps | 获取所有已配置的 IdP | Get all configured IdPs | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/authconfig/latest/idps | 创建 IdP 配置 | Create IdP configuration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| DELETE | /rest/authconfig/latest/idps/{id} | 删除 IdP 配置 | Delete IdP configuration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/authconfig/latest/idps/{id} | 获取 IdP 配置 | Get IdP configuration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| PATCH | /rest/authconfig/latest/idps/{id} | 更新 IdP 配置 | Update IdP configuration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/authconfig/latest/jit-users | 获取所有 JIT 预置用户 | Get all JIT provisioned users | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/authconfig/latest/login-options | 获取可用的登录选项 | Get available login options | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/authconfig/latest/sso | 获取 SSO 配置 | Get SSO configuration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| PATCH | /rest/authconfig/latest/sso | 更新 SSO 配置 | Update SSO configuration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/basicauth/latest/config | 获取 Basic Auth 配置 | Get basic auth configuration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| PUT | /rest/basicauth/latest/config | 更新 Basic Auth 配置 | Update basic auth configuration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/keys/latest/projects/{projectKey}/repos/{repositorySlug}/ssh | 获取仓库 SSH 密钥 | Get repository SSH keys | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/keys/latest/projects/{projectKey}/repos/{repositorySlug}/ssh | 添加仓库 SSH 密钥 | Add repository SSH key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| DELETE | /rest/keys/latest/projects/{projectKey}/repos/{repositorySlug}/ssh/{keyId} | 吊销仓库 SSH 密钥 | Revoke repository SSH key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/keys/latest/projects/{projectKey}/repos/{repositorySlug}/ssh/{keyId} | 获取仓库 SSH 密钥 | Get repository SSH key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| PUT | /rest/keys/latest/projects/{projectKey}/repos/{repositorySlug}/ssh/{keyId}/permission/{permission} | 更新仓库 SSH 密钥权限 | Update repository SSH key permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/keys/latest/projects/{projectKey}/ssh | 获取项目 SSH 密钥 | Get SSH key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/keys/latest/projects/{projectKey}/ssh | 添加项目 SSH 密钥 | Add project SSH key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| DELETE | /rest/keys/latest/projects/{projectKey}/ssh/{keyId} | 吊销项目 SSH 密钥 | Revoke project SSH key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/keys/latest/projects/{projectKey}/ssh/{keyId} | 获取项目 SSH 密钥 | Get project SSH key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| PUT | /rest/keys/latest/projects/{projectKey}/ssh/{keyId}/permission/{permission} | 更新项目 SSH 密钥权限 | Update project SSH key permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| DELETE | /rest/keys/latest/ssh/{keyId} | 吊销项目 SSH 密钥 | Revoke project SSH key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/keys/latest/ssh/{keyId}/projects | 获取项目 SSH 密钥 | Get project SSH keys | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/keys/latest/ssh/{keyId}/repos | 获取仓库 SSH 密钥 | Get repository SSH key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| DELETE | /rest/ssh/latest/keys | 删除当前用户全部 SSH 密钥 | Delete all user SSH key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/ssh/latest/keys | 获取用户的 SSH 密钥 | Get SSH keys for user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/ssh/latest/keys | 为用户添加 SSH 密钥 | Add SSH key for user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| DELETE | /rest/ssh/latest/keys/{keyId} | 移除 SSH 密钥 | Remove SSH key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/ssh/latest/keys/{keyId} | 按 keyId 获取用户 SSH 密钥 | Get SSH key for user by keyId | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/ssh/latest/settings | 获取 SSH 设置 | Get SSH settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/tsv/latest/authenticate | 使用两步验证（2SV）进行认证 | Authenticate with 2SV | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/tsv/latest/authenticate/captcha | 获取 CAPTCHA 验证挑战 | Get CAPTCHA challenge | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/tsv/latest/authenticate/recovery-code | 使用恢复码认证 | Authenticate using recovery code | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/tsv/latest/authenticate/totp-code | 使用 TOTP 验证码认证 | Authenticate using TOTP code | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/tsv/latest/elevate-permissions | 获取提权会话状态 | Get elevated session status | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/tsv/latest/elevate-permissions/password | 使用密码创建提权会话 | Create elevated session with password | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/tsv/latest/elevate-permissions/recovery-code | 使用恢复码创建提权会话 | Create elevated session with recovery code | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/tsv/latest/elevate-permissions/totp | 使用 TOTP 创建提权会话 | Create elevated session with TOTP | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/tsv/latest/sso-management-status | 获取 SSO 管理状态 | Get SSO management status | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| GET | /rest/tsv/latest/status | 获取两步验证状态 | Get two-step verification status | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/tsv/latest/totp/complete-enforced-enrollment | 完成强制两步验证注册 | Complete enforced enrollment in 2SV | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/tsv/latest/totp/complete-enrollment-update | 完成两步验证认证应用更新 | Complete authentication app update for 2SV | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/tsv/latest/totp/complete-voluntary-enrollment | 完成自愿两步验证注册 | Complete voluntary enrollment in 2SV | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/tsv/latest/totp/recovery-code/rotate | 轮换恢复码 | Rotate recovery code | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/tsv/latest/totp/start-enforced-enrollment | 开始强制两步验证注册 | Start enforced enrollment in 2SV | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/tsv/latest/totp/start-enrollment-update | 开始两步验证认证应用更新 | Start authentication app update for 2SV | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| POST | /rest/tsv/latest/totp/start-voluntary-enrollment | 开始自愿两步验证注册 | Start voluntary enrollment in 2SV | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| DELETE | /rest/tsv/latest/totp/unenroll | 注销当前用户的两步验证 | Uneroll current user from two-step verification | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |
| DELETE | /rest/tsv/latest/totp/unenroll/user/{userName} | 注销指定用户的两步验证 | Unenroll specific user from two-step verification | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-authentication/ |

## Builds and Deployments
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/builds | 删除指定构建状态 | Delete a specific build status | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/builds | 获取指定构建状态 | Get a specific build status | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/builds | 存储构建状态 | Store a build status | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/deployments | 删除部署 | Delete a deployment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/deployments | 获取部署 | Get a deployment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/deployments | 创建或更新部署 | Create or update a deployment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| POST | /rest/build-status/latest/commits/stats | 获取多个提交的构建状态统计 [deprecated] |  | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| GET | /rest/build-status/latest/commits/stats/{commitId} | 获取提交的构建状态统计 [deprecated] |  | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| GET | /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/annotations | 获取提交的 Code Insights 注解 | Get Code Insights annotations for a commit | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| GET | /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports | 获取提交的全部 Code Insights 报告 | Get all Code Insights reports for a commit | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| DELETE | /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports/{key} | 删除 Code Insights 报告 | Delete a Code Insights report | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| GET | /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports/{key} | 获取 Code Insights 报告 | Get a Code Insights report | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| PUT | /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports/{key} | 创建 Code Insights 报告 | Create a Code Insights report | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| DELETE | /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports/{key}/annotations | 删除 Code Insights 注解 | Delete Code Insights annotations | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| GET | /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports/{key}/annotations | 获取报告的 Code Insights 注解 | Get Code Insights annotations for a report | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| POST | /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports/{key}/annotations | 添加 Code Insights 注解 | Add Code Insights annotations | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| PUT | /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports/{key}/annotations/{externalId} | 创建或替换 Code Insights 注解 | Create or replace a Code Insights annotation | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| POST | /rest/required-builds/latest/projects/{projectKey}/repos/{repositorySlug}/condition | 创建必需构建合并检查 | Create a required builds merge check | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| DELETE | /rest/required-builds/latest/projects/{projectKey}/repos/{repositorySlug}/condition/{id} | 删除必需构建合并检查 | Delete a required builds merge check | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| PUT | /rest/required-builds/latest/projects/{projectKey}/repos/{repositorySlug}/condition/{id} | 更新必需构建合并检查 | Update a required builds merge check | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |
| GET | /rest/required-builds/latest/projects/{projectKey}/repos/{repositorySlug}/conditions | 获取必需构建合并检查 | Get required builds merge checks | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-builds-and-deployments/ |

## Capabilities
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/latest/build/capabilities | 获取构建能力 | Get build capabilities | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-capabilities/ |
| GET | /rest/api/latest/deployment/capabilities | 获取部署能力 | Get deployment capabilities | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-capabilities/ |

## Content Security Policy
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| PUT | /rest/csp/latest/settings | 修改 CSP 严格级别设置 | Change CSP strictness setting | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-content-security-policy/ |

## Dashboard
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/latest/dashboard/pull-request-suggestions | 获取拉取请求建议 | Get pull request suggestions | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-dashboard/ |
| GET | /rest/api/latest/dashboard/pull-requests | 获取用户的拉取请求 | Get pull requests for a user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-dashboard/ |

## Deprecated
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/build-status/latest/commits/{commitId} | 获取提交的构建状态 [deprecated] | List build statuses for a commit | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-deprecated/ |
| POST | /rest/build-status/latest/commits/{commitId} | 为提交创建构建状态 [deprecated] | Create or update a build status | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-deprecated/ |

## Jira Integration
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| DELETE | /rest/jira-dev/latest/devinfo-backfill | 停止 Jira 开发信息回填同步 | Stop a Jira development information backfill sync | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-jira-integration/ |
| POST | /rest/jira-dev/latest/devinfo-backfill | 启动 Jira 开发信息回填同步 | Start a Jira development information backfill sync | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-jira-integration/ |
| GET | /rest/jira-dev/latest/devinfo-backfill/report | 获取失败的仓库回填任务及其错误 | Get repository backfill tasks that failed and their associated errors | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-jira-integration/ |
| GET | /rest/jira-dev/latest/devinfo-backfill/status | 获取 Jira 开发信息回填状态 | Get Jira development information backfill status | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-jira-integration/ |
| POST | /rest/jira/latest/comments/{commentId}/issues | 创建 Jira 事务 | Create Jira Issue | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-jira-integration/ |
| GET | /rest/jira/latest/issues/{issueKey}/commits | 获取事务键对应的变更集 | Get changesets for issue key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-jira-integration/ |
| GET | /rest/jira/latest/projects/{projectKey}/primary-enhanced-entitylink | 获取实体链接 | Get entity link | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-jira-integration/ |
| GET | /rest/jira/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/issues | 获取拉取请求关联的事务 | Get issues for a pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-jira-integration/ |

## Markup
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| POST | /rest/api/latest/markup/preview | 预览 Markdown 渲染 | Preview markdown render | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-markup/ |

## Mirroring (Mirror)
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/mirroring/latest/farmNodes | 获取镜像场节点 | Get farm nodes | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| GET | /rest/mirroring/latest/mirrorRepos/delayed-sync | 获取延迟同步的仓库 | Get delayed sync repositories | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| GET | /rest/mirroring/latest/mirrorRepos/{externalRepositoryId} | 获取克隆 URL | Get clone URLs | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| GET | /rest/mirroring/latest/progress | 获取同步进度状态 | Get synchronization progress state | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| GET | /rest/mirroring/latest/supportInfo/projects/{projectKey}/repos/{repositorySlug}/repo-lock-owner | 获取同步过程的仓库锁持有者 | Get the repository lock owner for the syncing process | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| GET | /rest/mirroring/latest/supportInfo/projects/{projectKey}/repos/{repositorySlug}/repoSyncStatus | 获取镜像仓库的信息 | Gets information about the mirrored repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| GET | /rest/mirroring/latest/supportInfo/refChangesQueue | 获取引用变更队列中的条目 | Get items in ref changes queue | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| GET | /rest/mirroring/latest/supportInfo/refChangesQueue/count | 获取引用变更队列条目总数 | Get total number of items in ref changes queue | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| GET | /rest/mirroring/latest/supportInfo/repo-lock-owners | 获取同步过程的全部仓库锁持有者 | Get all the repository lock owners for the syncing process | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| GET | /rest/mirroring/latest/supportInfo/repoSyncStatus | 获取仓库同步状态 | Get sync status of repositories | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| GET | /rest/mirroring/latest/syncSettings | 获取上游设置 | Get upstream settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| PUT | /rest/mirroring/latest/syncSettings | 更新上游设置 | Update upstream settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| GET | /rest/mirroring/latest/syncSettings/mode | 获取镜像模式 | Get mirror mode | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| PUT | /rest/mirroring/latest/syncSettings/mode | 更新镜像模式 | Update mirror mode | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| GET | /rest/mirroring/latest/syncSettings/projects | 获取被镜像的项目 ID | Get mirrored project IDs | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| POST | /rest/mirroring/latest/syncSettings/projects | 添加多个待镜像项目 | Add multiple projects to be mirrored | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| DELETE | /rest/mirroring/latest/syncSettings/projects/{projectId} | 停止镜像项目 | Stop mirroring project | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| POST | /rest/mirroring/latest/syncSettings/projects/{projectId} | 添加待镜像项目 | Add project to be mirrored | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| GET | /rest/mirroring/latest/upstreamServer | 获取上游服务器 | Get upstream server | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| POST | /rest/mirroring/latest/zdu/end | 结束镜像场上的 ZDU 升级 | End ZDU upgrade on mirror farm | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |
| POST | /rest/mirroring/latest/zdu/start | 开始镜像场上的 ZDU 升级 | Start ZDU upgrade on mirror farm | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--mirror-/ |

## Mirroring (Upstream)
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| DELETE | /rest/mirroring/latest/account/settings/preferred-mirror | 移除首选镜像 | Remove preferred mirror | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| GET | /rest/mirroring/latest/account/settings/preferred-mirror | 获取首选镜像 | Get preferred mirror | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| POST | /rest/mirroring/latest/account/settings/preferred-mirror | 设置首选镜像 | Set preferred mirror | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| GET | /rest/mirroring/latest/analyticsSettings | 获取上游分析设置 | Get analytics settings from upstream | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| POST | /rest/mirroring/latest/authenticate | 代表用户进行认证 | Authenticate on behalf of a user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| GET | /rest/mirroring/latest/mirrorServers | 获取所有镜像服务器 | Get all mirrors | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| DELETE | /rest/mirroring/latest/mirrorServers/{mirrorId} | 按 ID 删除镜像服务器 | Delete mirror by ID | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| GET | /rest/mirroring/latest/mirrorServers/{mirrorId} | 按 ID 获取镜像服务器 | Get mirror by ID | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| PUT | /rest/mirroring/latest/mirrorServers/{mirrorId} | 升级镜像服务器 | Upgrade mirror server | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| POST | /rest/mirroring/latest/mirrorServers/{mirrorId}/events | 发布 RepositoryMirrorEvent | Publish RepositoryMirrorEvent | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| GET | /rest/mirroring/latest/projects/{projectId} | 获取项目 | Get project | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| GET | /rest/mirroring/latest/projects/{projectId}/repos | 获取项目中仓库的哈希 | Get hashes for repositories in project | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| GET | /rest/mirroring/latest/repos | 获取仓库的内容哈希 | Get content hashes for repositories | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| GET | /rest/mirroring/latest/repos/{repoId} | 获取指定仓库的内容哈希 | Get content hash for a repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| GET | /rest/mirroring/latest/repos/{repoId}/mirrors | 获取仓库的镜像 | Get mirrors for repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| GET | /rest/mirroring/latest/requests | 获取镜像请求 | Get mirroring requests | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| POST | /rest/mirroring/latest/requests | 创建镜像请求 | Create a mirroring request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| DELETE | /rest/mirroring/latest/requests/{mirroringRequestId} | 删除镜像请求 | Delete a mirroring request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| GET | /rest/mirroring/latest/requests/{mirroringRequestId} | 获取镜像请求 | Get a mirroring request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| POST | /rest/mirroring/latest/requests/{mirroringRequestId}/accept | 接受镜像请求 | Accept a mirroring request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |
| POST | /rest/mirroring/latest/requests/{mirroringRequestId}/reject | 拒绝镜像请求 | Reject a mirroring request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-mirroring--upstream-/ |

## Permission Management
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| DELETE | /rest/api/latest/admin/groups | 删除用户组 | Remove group | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/admin/groups | 获取用户组 | Get groups | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| POST | /rest/api/latest/admin/groups | 创建用户组 | Create group | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| POST | /rest/api/latest/admin/groups/add-user | 将用户加入用户组 [deprecated] |  | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| POST | /rest/api/latest/admin/groups/add-users | 将多个用户加入用户组 | Add multiple users to group | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/admin/groups/more-members | 获取用户组成员 | Get group members | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/admin/groups/more-non-members | 获取不在组中的成员 | Get members not in group | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| POST | /rest/api/latest/admin/groups/remove-user | 将用户移出用户组 [deprecated] |  | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| DELETE | /rest/api/latest/admin/permissions/groups | 撤销用户组的全部全局权限 | Revoke all global permissions for group | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/admin/permissions/groups | 获取拥有某全局权限的用户组 | Get groups with a global permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| PUT | /rest/api/latest/admin/permissions/groups | 更新用户组的全局权限 | Update global permission for group | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/admin/permissions/groups/none | 获取无全局权限的用户组 | Get groups with no global permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| DELETE | /rest/api/latest/admin/permissions/users | 撤销用户的全部全局权限 | Revoke all global permissions for user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/admin/permissions/users | 获取拥有某全局权限的用户 | Get users with a global permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| PUT | /rest/api/latest/admin/permissions/users | 更新用户的全局权限 | Update global permission for user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/admin/permissions/users/none | 获取无全局权限的用户 | Get users with no global permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/admin/user-directories | 获取用户目录 | Get directories | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| DELETE | /rest/api/latest/admin/users | 删除用户 | Remove user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/admin/users | 获取用户列表 | Get users | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| POST | /rest/api/latest/admin/users | 创建用户 | Create user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| PUT | /rest/api/latest/admin/users | 更新用户详情 | Update user details | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| POST | /rest/api/latest/admin/users/add-group | 将用户加入用户组 [deprecated] |  | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| POST | /rest/api/latest/admin/users/add-groups | 将用户加入多个用户组 | Add user to groups | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| DELETE | /rest/api/latest/admin/users/captcha | 清除用户的 CAPTCHA 限制 | Clear CAPTCHA for user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| PUT | /rest/api/latest/admin/users/credentials | 为用户设置密码 | Set password for user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/admin/users/erasure | 检查用户是否可删除 | Check user removal | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| POST | /rest/api/latest/admin/users/erasure | 擦除用户信息 | Erase user information | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/admin/users/more-members | 获取用户所属的用户组 | Get groups for user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/admin/users/more-non-members | 查找用户未加入的用户组 | Find other groups for user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| POST | /rest/api/latest/admin/users/remove-group | 将用户移出用户组 | Remove user from group | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| POST | /rest/api/latest/admin/users/rename | 重命名用户 | Rename user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/groups | 获取用户组名称 | Get group names | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions | 撤销所有用户和组的仓库权限 | Revoke all repository permissions for users and groups | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/groups | 撤销组的仓库权限 | Revoke group repository permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/groups | 获取拥有仓库权限的组 | Get groups with permission to repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/groups | 更新组的仓库权限 | Update group repository permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/groups/none | 获取无仓库权限的组 | Get groups without repository permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/search | 搜索仓库权限 | Search repository permissions | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/users | 撤销用户的仓库权限 | Revoke user repository permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/users | 获取拥有仓库权限的用户 | Get users with permission to repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/users | 更新用户的仓库权限 | Update user repository permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/users/none | 获取无仓库权限的用户 | Get users without repository permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-permission-management/ |

## Project
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/latest/hooks/{hookKey}/avatar | 获取项目头像 | Get project avatar | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects | 获取项目列表 | Get projects | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| POST | /rest/api/latest/projects | 创建新项目 | Create a new project | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/api/latest/projects/{projectKey} | 删除项目 | Delete project | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey} | 获取项目 | Get a project | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| PUT | /rest/api/latest/projects/{projectKey} | 更新项目 | Update project | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/avatar.png | 获取项目头像 | Get avatar for project | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| POST | /rest/api/latest/projects/{projectKey}/avatar.png | 更新项目头像 | Update project avatar | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/hook-scripts | 获取已配置的钩子脚本 | Get configured hook scripts | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/api/latest/projects/{projectKey}/hook-scripts/{scriptId} | 移除钩子脚本 | Remove a hook script | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| PUT | /rest/api/latest/projects/{projectKey}/hook-scripts/{scriptId} | 创建/更新钩子脚本 | Create/update a hook script | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/api/latest/projects/{projectKey}/permissions | 撤销项目权限 | Revoke project permissions | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/api/latest/projects/{projectKey}/permissions/groups | 撤销组的项目权限 | Revoke group project permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/permissions/groups | 获取拥有项目权限的组 | Get groups with permission to project | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| PUT | /rest/api/latest/projects/{projectKey}/permissions/groups | 更新组的项目权限 | Update group project permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/permissions/groups/none | 获取无项目权限的组 | Get groups without project permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/permissions/search | 搜索项目权限 | Search project permissions | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/api/latest/projects/{projectKey}/permissions/users | 撤销用户的项目权限 | Revoke user project permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/permissions/users | 获取拥有项目权限的用户 | Get users with permission to project | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| PUT | /rest/api/latest/projects/{projectKey}/permissions/users | 更新用户的项目权限 | Update user project permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/permissions/users/none | 获取无项目权限的用户 | Get users without project permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/permissions/{permission}/all | 检查默认项目权限 | Check default project permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| POST | /rest/api/latest/projects/{projectKey}/permissions/{permission}/all | 授予项目权限 | Grant project permission | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/repos | 获取项目的仓库列表 | Get repositories for project | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| POST | /rest/api/latest/projects/{projectKey}/repos | 创建仓库 | Create repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug} | 删除仓库 | Delete repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug} | 获取仓库 | Get repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug} | 派生（fork）仓库 | Fork repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug} | 更新仓库 | Update repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/contributing | 获取仓库贡献指南 | Get repository contributing guidelines | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/default-branch | 获取仓库默认分支 | Get repository default branch | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/default-branch | 更新仓库默认分支 | Update default branch for repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/forks | 获取仓库的派生列表 | Get repository forks | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/license | 获取仓库许可证 | Get repository license | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/readme | 获取仓库 README | Get repository readme | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/recreate | 重试仓库创建 | Retry repository creation | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/related | 获取相关仓库 | Get related repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/api/latest/projects/{projectKey}/settings-restriction | 停止强制执行项目设置限制 | Stop enforcing project restriction | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/settings-restriction | 获取强制执行中的项目设置 | Get enforcing project setting | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| POST | /rest/api/latest/projects/{projectKey}/settings-restriction | 强制执行项目设置限制 | Enforce project restriction | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/settings-restriction/all | 获取全部强制执行中的项目设置 | Get all enforcing project settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/api/latest/projects/{projectKey}/settings/auto-decline | 删除自动拒绝设置 | Delete auto decline settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/settings/auto-decline | 获取自动拒绝设置 | Get auto decline settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| PUT | /rest/api/latest/projects/{projectKey}/settings/auto-decline | 创建/更新自动拒绝设置 | Create/Update auto decline settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/api/latest/projects/{projectKey}/settings/auto-merge | 删除拉取请求自动合并设置 | Delete pull request auto-merge settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/settings/auto-merge | 获取拉取请求自动合并设置 | Get pull request auto-merge settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| PUT | /rest/api/latest/projects/{projectKey}/settings/auto-merge | 创建或更新拉取请求自动合并设置 | Create or update the pull request auto-merge settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/api/latest/projects/{projectKey}/settings/change-author | 删除拉取请求变更作者设置 | Delete pull request change-author settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/settings/change-author | 获取拉取请求变更作者设置 | Get pull request change-author settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| PUT | /rest/api/latest/projects/{projectKey}/settings/change-author | 创建或更新拉取请求变更作者设置 | Create or update the pull request change-author settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/settings/hooks | 获取仓库钩子 | Get repository hooks | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/settings/hooks/{hookKey} | 获取指定仓库钩子 | Get a repository hook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/api/latest/projects/{projectKey}/settings/hooks/{hookKey}/enabled | 禁用仓库钩子 | Disable repository hook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| PUT | /rest/api/latest/projects/{projectKey}/settings/hooks/{hookKey}/enabled | 启用仓库钩子 | Enable repository hook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/settings/hooks/{hookKey}/settings | 获取仓库钩子设置 | Get repository hook settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| PUT | /rest/api/latest/projects/{projectKey}/settings/hooks/{hookKey}/settings | 更新仓库钩子设置 | Update repository hook settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/settings/pull-requests/{scmId} | 获取合并策略 | Get merge strategy | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| POST | /rest/api/latest/projects/{projectKey}/settings/pull-requests/{scmId} | 更新合并策略 | Update merge strategy | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/webhooks | 查找 webhook | Find webhooks | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| POST | /rest/api/latest/projects/{projectKey}/webhooks | 创建 webhook | Create webhook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| POST | /rest/api/latest/projects/{projectKey}/webhooks/test | 测试 webhook | Test webhook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/api/latest/projects/{projectKey}/webhooks/{webhookId} | 删除 webhook | Delete webhook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/webhooks/{webhookId} | 获取 webhook | Get webhook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| PUT | /rest/api/latest/projects/{projectKey}/webhooks/{webhookId} | 更新 webhook | Update webhook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/webhooks/{webhookId}/latest | 获取最近一次 webhook 调用详情 | Get last webhook invocation details | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/webhooks/{webhookId}/statistics | 获取 webhook 统计 | Get webhook statistics | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/api/latest/projects/{projectKey}/webhooks/{webhookId}/statistics/summary | 获取 webhook 统计摘要 | Get webhook statistics summary | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/branch-permissions/latest/projects/{projectKey}/restrictions | 搜索引用（ref）限制 | Search for ref restrictions | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| POST | /rest/branch-permissions/latest/projects/{projectKey}/restrictions | 批量创建引用限制 | Create multiple ref restrictions | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/branch-permissions/latest/projects/{projectKey}/restrictions/{id} | 删除引用限制 | Delete a ref restriction | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/branch-permissions/latest/projects/{projectKey}/restrictions/{id} | 获取引用限制 | Get a ref restriction | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/default-tasks/latest/projects/{projectKey}/tasks | 删除项目的全部默认任务 | Deletes all default tasks for the project | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| GET | /rest/default-tasks/latest/projects/{projectKey}/tasks | 分页获取默认任务 | Get a page of default tasks | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| POST | /rest/default-tasks/latest/projects/{projectKey}/tasks | 添加默认任务 | Add a default task | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| DELETE | /rest/default-tasks/latest/projects/{projectKey}/tasks/{taskId} | 删除指定默认任务 | Delete a specific default task | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |
| PUT | /rest/default-tasks/latest/projects/{projectKey}/tasks/{taskId} | 更新默认任务 | Update a default task | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-project/ |

## Pull Requests
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/latest/admin/pull-requests/{scmId} | 获取合并策略 | Get merge strategies | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/api/latest/admin/pull-requests/{scmId} | 更新合并策略 | Update merge strategies | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/pull-requests | 获取包含指定提交的拉取请求 | Get repository pull requests containing commit | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/participants | 搜索拉取请求参与者 | Search pull request participants | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests | 获取仓库的拉取请求列表 | Get pull requests for repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests | 创建拉取请求 | Create pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId} | 删除拉取请求 | Delete pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId} | 获取拉取请求 | Get pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId} | 更新拉取请求元数据 | Update pull request metadata | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}.diff | 流式获取拉取请求原始 diff | Stream raw pull request diff | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}.patch | 流式获取拉取请求 patch | Stream pull request as patch | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/activities | 获取拉取请求活动记录 | Get pull request activity | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/approve | 取消批准拉取请求 [deprecated] | Withdraw pull request approval | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/approve | 批准拉取请求 [deprecated] | Approve a pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/auto-merge | 取消拉取请求自动合并 | Cancel auto-merge for pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/auto-merge | 获取拉取请求自动合并请求 | Get auto-merge request for pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/auto-merge | 自动合并拉取请求 | Auto-merge pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/blocker-comments | 搜索拉取请求阻塞性评论 | Search pull request comments | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/blocker-comments | 添加阻塞性评论 | Add new blocker comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/blocker-comments/{commentId} | 删除拉取请求评论 | Delete pull request comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/blocker-comments/{commentId} | 获取拉取请求评论 | Get pull request comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/blocker-comments/{commentId} | 更新拉取请求评论 | Update pull request comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/changes | 获取拉取请求变更 | Gets pull request changes | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments | 获取指定路径的拉取请求评论 | Get pull request comments for path | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments | 添加拉取请求评论 | Add pull request comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId} | 删除拉取请求评论 | Delete a pull request comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId} | 获取拉取请求评论 | Get a pull request comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId} | 更新拉取请求评论 | Update pull request comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId}/apply-suggestion | 应用拉取请求建议 | Apply pull request suggestion | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/commit-message-suggestion | 获取提交信息建议 | Get commit message suggestion | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/commits | 获取拉取请求提交列表 | Get pull request commits | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/decline | 拒绝拉取请求 | Decline pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/diff-stats-summary/{path} | 获取拉取请求 diff 统计摘要 | Get diff stats summary for pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/diff/{path} | 流式获取拉取请求中的 diff | Stream a diff within a pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/merge | 测试拉取请求是否可合并 | Test if pull request can be merged | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/merge | 合并拉取请求 | Merge pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/merge-base | 获取拉取请求源/目标分支最新提交的共同祖先 | Get the common ancestor between the latest commits of the source and target branches of the pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/participants | 取消指派拉取请求参与者 [deprecated] |  | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/participants | 获取拉取请求参与者 | Get pull request participants | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/participants | 指派拉取请求参与者角色 | Assign pull request participant role | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/participants/{userSlug} | 取消指派拉取请求参与者 | Unassign pull request participant | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/participants/{userSlug} | 变更拉取请求参与状态 | Change pull request status | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/reopen | 重新打开拉取请求 | Re-open pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/review | 放弃拉取请求评审 | Discard pull request review | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/review | 获取拉取请求评论线程 | Get pull request comment thread | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/review | 完成拉取请求评审 | Complete pull request review | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/watch | 停止关注拉取请求 | Stop watching pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/watch | 关注拉取请求 | Watch pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/reviewer-groups | 获取全部评审者组 | Get all reviewer groups | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/reviewer-groups | 创建评审者组 | Create reviewer group | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/reviewer-groups/{id} | 删除评审者组 | Delete reviewer group | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/reviewer-groups/{id} | 获取评审者组 | Get reviewer group | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/reviewer-groups/{id} | 更新评审者组属性 | Update reviewer group attributes | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/reviewer-groups/{id}/users | 获取评审者组用户 | Get reviewer group users | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/settings/reviewer-groups | 获取全部评审者组 | Get all reviewer groups | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/api/latest/projects/{projectKey}/settings/reviewer-groups | 创建评审者组 | Create reviewer group | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| DELETE | /rest/api/latest/projects/{projectKey}/settings/reviewer-groups/{id} | 删除评审者组 | Delete reviewer group | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/api/latest/projects/{projectKey}/settings/reviewer-groups/{id} | 获取评审者组 | Get reviewer group | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| PUT | /rest/api/latest/projects/{projectKey}/settings/reviewer-groups/{id} | 更新评审者组属性 | Update reviewer group attributes | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| DELETE | /rest/comment-likes/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId}/reactions/{emoticon} | 移除拉取请求评论的表情回应 | Remove a reaction from a PR comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| PUT | /rest/comment-likes/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId}/reactions/{emoticon} | 对拉取请求评论添加表情回应 | React to a PR comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/default-reviewers/latest/projects/{projectKey}/condition | 创建默认评审者条件 | Create default reviewer condition | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| DELETE | /rest/default-reviewers/latest/projects/{projectKey}/condition/{id} | 删除默认评审者条件 | Delete default reviewer condition | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| PUT | /rest/default-reviewers/latest/projects/{projectKey}/condition/{id} | 更新默认评审者条件 | Update default reviewer condition | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/default-reviewers/latest/projects/{projectKey}/conditions | 获取默认评审者条件 | Get default reviewer conditions | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/default-reviewers/latest/projects/{projectKey}/repos/{repositorySlug}/condition | 创建默认评审者条件 | Create default reviewer condition | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| DELETE | /rest/default-reviewers/latest/projects/{projectKey}/repos/{repositorySlug}/condition/{id} | 删除默认评审者条件 | Delete default reviewer condition | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| PUT | /rest/default-reviewers/latest/projects/{projectKey}/repos/{repositorySlug}/condition/{id} | 更新默认评审者条件 | Update default reviewer condition | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/default-reviewers/latest/projects/{projectKey}/repos/{repositorySlug}/conditions | 获取默认评审者条件 | Get default reviewer conditions | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/default-reviewers/latest/projects/{projectKey}/repos/{repositorySlug}/reviewers | 获取创建拉取请求的必需评审者 | Get required reviewers for PR creation | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| GET | /rest/git/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/rebase | 检查拉取请求 rebase 前置条件 | Check PR rebase precondition | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |
| POST | /rest/git/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/rebase | rebase 拉取请求 | Rebase pull request | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-pull-requests/ |

## Repository
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/latest/profile/recent/repos | 获取最近访问的仓库 | Get recently accessed repositories | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/archive | 流式下载仓库归档 | Stream archive of repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/attachments/{attachmentId} | 删除附件 | Delete an attachment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/attachments/{attachmentId} | 获取附件 | Get an attachment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/attachments/{attachmentId}/metadata | 删除附件元数据 | Delete attachment metadata | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/attachments/{attachmentId}/metadata | 获取附件元数据 | Get attachment metadata | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/attachments/{attachmentId}/metadata | 保存附件元数据 | Save attachment metadata | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/branches | 查找分支 | Find branches | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/branches | 创建分支 | Create branch | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/branches/default | 获取默认分支 [deprecated] |  | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/branches/default | 更新默认分支 [deprecated] |  | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/browse | 获取指定版本的文件内容 | Get file content at revision | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/browse/{path} | 获取文件内容 | Get file content | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/browse/{path} | 编辑文件 | Edit file | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/changes | 获取提交中的变更 | Get changes made in commit | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits | 获取提交列表 | Get commits | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId} | 按 ID 获取提交 | Get commit by ID | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/changes | 获取提交中的变更 | Get changes in commit | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/comments | 搜索提交评论 | Search for commit comments | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/comments | 添加提交评论 [experimental] |  | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/comments/{commentId} | 删除提交评论 | Delete a commit comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/comments/{commentId} | 获取提交评论 | Get a commit comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/comments/{commentId} | 更新提交评论 | Update a commit comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/diff-stats-summary/{path} | 获取版本间 diff 统计摘要 | Get diff stats summary between revisions | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/diff/{path} | 获取版本间 diff | Get diff between revisions | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/merge-base | 获取两个提交的共同祖先 | Get the common ancestor between two commits | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/watch | 停止关注提交 | Stop watching commit | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/watch | 关注提交 | Watch commit | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/compare/changes | 比较提交间的变更 | Compare commits | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/compare/commits | 获取可访问的提交 | Get accessible commits | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/compare/diff-stats-summary{path} | 获取提交间 diff 统计摘要 | Retrieve the diff stats summary between commits | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/compare/diff{path} | 获取提交间 diff | Get diff between commits | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/diff | 获取指定路径的原始 diff | Get raw diff for path | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/diff/{path} | 获取指定路径的原始 diff | Get raw diff for path | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/files | 获取目录中的文件 | Get files in directory | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/files/{path} | 获取目录中的文件 | Get files in directory | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/hook-scripts | 获取钩子脚本 | Get hook scripts | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/hook-scripts/{scriptId} | 移除钩子脚本 | Remove a hook script | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/hook-scripts/{scriptId} | 创建/更新钩子脚本 | Create/update a hook script | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/labels | 获取仓库标签 | Get repository labels | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/labels | 添加仓库标签 | Add repository label | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/labels/{labelName} | 移除仓库标签 | Remove repository label | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/last-modified | 流式获取文件最后修改提交 | Stream files | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/last-modified/{path} | 流式获取路径下文件的最后修改提交 | Stream files with last modified commit in path | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/patch | 获取指定版本的 patch 内容 | Get patch content at revision | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/raw/{path} | 获取指定版本文件的原始内容 | Get raw content of a file at revision | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/ref-change-activities | 获取引用变更活动 | Get ref change activity | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/ref-change-activities/branches | 获取仓库中有引用变更活动的分支 | Get branches with ref change activities for repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/auto-decline | 删除自动拒绝设置 | Delete auto decline settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/auto-decline | 获取自动拒绝设置 | Get auto decline settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/auto-decline | 创建自动拒绝设置 | Create auto decline settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/auto-merge | 删除拉取请求自动合并设置 | Delete pull request auto-merge settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/auto-merge | 获取拉取请求自动合并设置 | Get pull request auto-merge settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/auto-merge | 创建或更新拉取请求自动合并设置 | Create or update the pull request auto-merge settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/change-author | 删除拉取请求变更作者设置 | Delete pull request change-author settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/change-author | 获取拉取请求变更作者设置 | Get pull request change-author settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/change-author | 创建或更新拉取请求变更作者设置 | Create or update the pull request change-author settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/hooks | 获取仓库钩子 | Get repository hooks | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/hooks/{hookKey} | 删除仓库钩子 | Delete repository hook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/hooks/{hookKey} | 获取仓库钩子 | Get repository hook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/hooks/{hookKey}/enabled | 禁用仓库钩子 | Disable repository hook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/hooks/{hookKey}/enabled | 启用仓库钩子 | Enable repository hook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/hooks/{hookKey}/settings | 获取仓库钩子设置 | Get repository hook settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/hooks/{hookKey}/settings | 更新仓库钩子设置 | Update repository hook settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/pull-requests | 获取拉取请求设置 | Get pull request settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/pull-requests | 更新拉取请求设置 | Update pull request settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/tags | 查找标签 | Find tag | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/tags | 创建标签 | Create tag | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/tags/{name} | 获取标签 | Get tag | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/watch | 停止关注仓库 | Stop watching repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/watch | 关注仓库 | Watch repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks | 查找 webhook | Find webhooks | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks | 创建 webhook | Create webhook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/search | 搜索 webhook | Search webhooks | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/test | 测试 webhook | Test webhook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/{webhookId} | 删除 webhook | Delete webhook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/{webhookId} | 获取 webhook | Get webhook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/{webhookId} | 更新 webhook | Update webhook | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/{webhookId}/latest | 获取最近一次 webhook 调用详情 | Get last webhook invocation details | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/{webhookId}/statistics | 获取 webhook 统计 | Get webhook statistics | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/{webhookId}/statistics/summary | 获取 webhook 统计摘要 | Get webhook statistics summary | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/api/latest/repos | 搜索仓库 | Search for repositories | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/branch-permissions/latest/projects/{projectKey}/repos/{repositorySlug}/restrictions | 搜索引用（ref）限制 | Search for ref restrictions | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/branch-permissions/latest/projects/{projectKey}/repos/{repositorySlug}/restrictions | 批量创建引用限制 | Create multiple ref restrictions | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/branch-permissions/latest/projects/{projectKey}/repos/{repositorySlug}/restrictions/{id} | 删除引用限制 | Delete a ref restriction | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/branch-permissions/latest/projects/{projectKey}/repos/{repositorySlug}/restrictions/{id} | 获取引用限制 | Get a ref restriction | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/branch-utils/latest/projects/{projectKey}/repos/{repositorySlug}/branches | 删除分支 | Delete branch | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/branch-utils/latest/projects/{projectKey}/repos/{repositorySlug}/branches | 创建分支 | Create branch | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/branch-utils/latest/projects/{projectKey}/repos/{repositorySlug}/branches/info/{commitId} | 获取分支信息 | Get branch | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/comment-likes/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/comments/{commentId}/reactions/{emoticon} | 移除评论的表情回应 | Remove a reaction from comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| PUT | /rest/comment-likes/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/comments/{commentId}/reactions/{emoticon} | 对评论添加表情回应 | React to a comment | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/default-tasks/latest/projects/{projectKey}/repos/{repositorySlug}/tasks | 删除仓库的全部默认任务 | Deletes all default tasks for the repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/default-tasks/latest/projects/{projectKey}/repos/{repositorySlug}/tasks | 分页获取默认任务 | Get a page of default tasks | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/default-tasks/latest/projects/{projectKey}/repos/{repositorySlug}/tasks | 添加默认任务 | Add a default task | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/default-tasks/latest/projects/{projectKey}/repos/{repositorySlug}/tasks/{taskId} | 删除指定默认任务 | Delete a specific default task | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| PUT | /rest/default-tasks/latest/projects/{projectKey}/repos/{repositorySlug}/tasks/{taskId} | 更新默认任务 | Update a default task | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/git/latest/projects/{projectKey}/repos/{repositorySlug}/tags | 创建标签 | Create tag | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| DELETE | /rest/git/latest/projects/{projectKey}/repos/{repositorySlug}/tags/{name} | 删除标签 | Delete tag | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| GET | /rest/sync/latest/projects/{projectKey}/repos/{repositorySlug} | 获取同步状态 | Get synchronization status | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/sync/latest/projects/{projectKey}/repos/{repositorySlug} | 禁用同步 | Disable synchronization | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |
| POST | /rest/sync/latest/projects/{projectKey}/repos/{repositorySlug}/synchronize | 手动同步 | Manual synchronization | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-repository/ |

## SAML certificate configuration
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/authconfig/latest/saml/certificate | 获取当前用于签名 SAML 认证请求的证书 | Get the certificate currently used to sign SAML authentication requests | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-saml-certificate-configuration/ |
| POST | /rest/authconfig/latest/saml/certificate/reset | 生成新的 SAML 认证请求签名证书 | Generate a new certificate for signing SAML authentication requests | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-saml-certificate-configuration/ |

## Search
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/indexing/latest/projects/{projectKey}/repos/{repositorySlug} | 获取仓库搜索索引详情 | Get repository search indexing details. | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-search/ |
| GET | /rest/indexing/latest/projects/{projectKey}/repos/{repositorySlug}/indexing-queue-details | 获取仓库索引队列详细信息 | Retrieve detailed queue information for a repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-search/ |
| GET | /rest/indexing/latest/projects/{projectKey}/repos/{repositorySlug}/indexing-queued-status | 检查仓库是否已加入索引队列 | Checks if a repository has been queued for indexing. | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-search/ |
| POST | /rest/indexing/latest/reindex | 重建指定仓库列表的搜索索引 | Re-indexes the search index of the provided list of repositories | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-search/ |
| POST | /rest/indexing/latest/restart | 重启搜索索引工作线程 | Restarts the search indexing worker thread | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-search/ |
| GET | /rest/indexing/latest/support-info/broken-index-status-repos | 分页获取超过最大索引重试次数的仓库 | Retrieve a paged list of repositories which have exceeded the configured maximum indexing retries. | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-search/ |
| GET | /rest/indexing/latest/support-info/indexing-thread-snapshot | 获取索引线程详情快照 | Retrieve a snapshot of the indexing thread details. | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-search/ |
| PUT | /rest/indexing/latest/threads | 设置索引工作线程数量 | Sets the desired number of indexing worker threads | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-search/ |

## Security
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/allowlist | 查找仓库密钥扫描白名单规则 | Find repository secret scanning allowlist rules | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/allowlist | 创建仓库密钥扫描白名单规则 | Create repository secret scanning allowlist rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/allowlist/{id} | 删除仓库密钥扫描白名单规则 | Delete a repository secret scanning allowlist rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/allowlist/{id} | 获取仓库密钥扫描白名单规则 | Get a repository secret scanning allowlist rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/allowlist/{id} | 编辑仓库密钥扫描白名单规则 | Edit an existing repository secret scanning allowlist rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/exempt | 删除豁免仓库 | Delete an exempt repository | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/exempt | 查询仓库是否被豁免 | Get whether a repository is exempt | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/exempt | 将仓库豁免出密钥扫描 [deprecated] |  | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/rules | 查找仓库密钥扫描规则 | Find repository secret scanning rules | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| POST | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/rules | 创建仓库密钥扫描规则 | Create repository secret scanning rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| DELETE | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/rules/{id} | 删除仓库密钥扫描规则 | Delete a repository secret scanning rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/rules/{id} | 获取仓库密钥扫描规则 | Get a repository secret scanning rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| PUT | /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/rules/{id} | 编辑仓库密钥扫描规则 | Edit an existing repository secret scanning rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/api/latest/projects/{projectKey}/secret-scanning/allowlist | 查找项目密钥扫描白名单规则 | Find project secret scanning allowlist rules | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| POST | /rest/api/latest/projects/{projectKey}/secret-scanning/allowlist | 创建项目密钥扫描白名单规则 | Create project secret scanning allowlist rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| DELETE | /rest/api/latest/projects/{projectKey}/secret-scanning/allowlist/{id} | 删除项目密钥扫描白名单规则 | Delete a project secret scanning allowlist rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/api/latest/projects/{projectKey}/secret-scanning/allowlist/{id} | 获取项目密钥扫描白名单规则 | Get a project secret scanning allowlist rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| PUT | /rest/api/latest/projects/{projectKey}/secret-scanning/allowlist/{id} | 编辑项目密钥扫描白名单规则 | Edit an existing project secret scanning allowlist rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/api/latest/projects/{projectKey}/secret-scanning/exempt | 查找项目中被豁免密钥扫描的仓库 | Find repos exempt from secret scanning for a project | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| POST | /rest/api/latest/projects/{projectKey}/secret-scanning/exempt | 批量豁免仓库的密钥扫描 | Bulk exempt repos from secret scanning | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/api/latest/projects/{projectKey}/secret-scanning/rules | 查找项目密钥扫描规则 | Find project secret scanning rules | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| POST | /rest/api/latest/projects/{projectKey}/secret-scanning/rules | 创建项目密钥扫描规则 | Create project secret scanning rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| DELETE | /rest/api/latest/projects/{projectKey}/secret-scanning/rules/{id} | 删除项目密钥扫描规则 | Delete a project secret scanning rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/api/latest/projects/{projectKey}/secret-scanning/rules/{id} | 获取项目密钥扫描规则 | Get a project secret scanning rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| PUT | /rest/api/latest/projects/{projectKey}/secret-scanning/rules/{id} | 编辑项目密钥扫描规则 | Edit an existing project secret scanning rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/api/latest/secret-scanning/exempt | 查找全部被豁免密钥扫描的仓库 | Find all repos exempt from secret scan | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| POST | /rest/api/latest/secret-scanning/exempt | 批量豁免仓库的密钥扫描 | Bulk exempt repos from secret scanning | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/api/latest/secret-scanning/rules | 查找全局密钥扫描规则 | Find global secret scanning rules | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| POST | /rest/api/latest/secret-scanning/rules | 创建全局密钥扫描规则 | Create global secret scanning rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| DELETE | /rest/api/latest/secret-scanning/rules/{id} | 删除全局密钥扫描规则 | Delete a global secret scanning rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/api/latest/secret-scanning/rules/{id} | 获取全局密钥扫描规则 | Get a global secret scanning rule | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| PUT | /rest/api/latest/secret-scanning/rules/{id} | 编辑全局密钥扫描规则 | Edit a global secret scanning rule. | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/api/latest/signing/x509-certificates | 获取全部 X.509 证书 | Get all X.509 certificates | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| POST | /rest/api/latest/signing/x509-certificates | 创建 X.509 证书 | Create an X.509 certificate | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| PUT | /rest/api/latest/signing/x509-certificates/crl/{id} | 更新 X.509 CRL 条目 | Update X.509 CRL entries | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| DELETE | /rest/api/latest/signing/x509-certificates/{id} | 删除 X.509 证书 | Delete an X.509 certificate | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/api/latest/system-signing/configuration | 获取系统签名配置 | Get system signing configuration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| POST | /rest/api/latest/system-signing/configuration | 更新系统签名配置 | Update system signing configuration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| DELETE | /rest/gpg/latest/keys | 删除用户的全部 GPG 密钥 | Delete all GPG keys for user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/gpg/latest/keys | 获取全部 GPG 密钥 | Get all GPG keys | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| POST | /rest/gpg/latest/keys | 创建 GPG 密钥 | Create a GPG key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| DELETE | /rest/gpg/latest/keys/{fingerprintOrId} | 删除 GPG 密钥 | Delete a GPG key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| DELETE | /rest/secrets/1.0/keys/inactive | 删除非活动 AES 密钥 | Delete inactive AES key(s) | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| GET | /rest/secrets/1.0/keys/inactive | 获取非活动 AES 密钥 | Retrieve inactive AES key(s) | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |
| POST | /rest/secrets/1.0/keys/rotate | 轮换当前 AES 密钥 | Rotate the current AES key | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-security/ |

## System Maintenance
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/admin | 获取全局 SSH 密钥设置 | Get global SSH key settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/admin | 更新全局 SSH 密钥设置 | Update global SSH key settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/admin/supported-key-types | 获取支持的 SSH 密钥算法与长度 | Get supported SSH key algorithms and lengths | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| DELETE | /rest/api/latest/admin/banner | 删除公告横幅 | Delete announcement banner | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/banner | 获取公告横幅 | Get announcement banner | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/api/latest/admin/banner | 更新/设置公告横幅 | Update/Set announcement banner | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/cluster | 获取集群节点信息 | Get cluster node information | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| DELETE | /rest/api/latest/admin/default-branch | 清除默认分支 | Clear default branch | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/default-branch | 获取默认分支 | Get the default branch | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/api/latest/admin/default-branch | 更新/设置默认分支 | Update/Set default branch | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/git/mesh/config/control-plane.pem | 获取控制平面 PEM | Get the control plane PEM | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/git/mesh/diagnostics/connectivity | 生成 Mesh 连通性报告 | Generate Mesh connectivity report | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/git/mesh/nodes | 获取全部已注册 Mesh 节点 | Get all registered Mesh nodes | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| POST | /rest/api/latest/admin/git/mesh/nodes | 注册新 Mesh 节点 | Register new Mesh node | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| DELETE | /rest/api/latest/admin/git/mesh/nodes/{id} | 删除 Mesh 节点 | Delete Mesh node | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/git/mesh/nodes/{id} | 获取 Mesh 节点 | Get Mesh node | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/api/latest/admin/git/mesh/nodes/{id} | 更新 Mesh 节点 | Update Mesh node | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/git/mesh/support-zips | 获取全部 Mesh 节点的支持包 | Get support zips for all Mesh nodes | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/git/mesh/support-zips/{id} | 获取指定节点的支持包 | Get support zip for node | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/license | 获取许可证详情 | Get license details | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| POST | /rest/api/latest/admin/license | 更新许可证 | Update license | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| DELETE | /rest/api/latest/admin/mail-server | 删除邮件配置 | Delete mail configuration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/mail-server | 获取邮件配置 | Get mail configuration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/api/latest/admin/mail-server | 更新邮件配置 | Update mail configuration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| DELETE | /rest/api/latest/admin/mail-server/sender-address | 删除发件人地址配置 | Update mail configuration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/mail-server/sender-address | 获取服务器邮件地址 | Get server mail address | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/api/latest/admin/mail-server/sender-address | 更新服务器邮件地址 | Update server mail address | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/rate-limit/history | 获取限流历史 | Get rate limit history | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/rate-limit/settings | 获取限流设置 | Get rate limit settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/api/latest/admin/rate-limit/settings | 设置限流 | Set rate limit | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/rate-limit/settings/users | 获取用户的限流设置 | Get rate limit settings for user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| POST | /rest/api/latest/admin/rate-limit/settings/users | 为多个用户设置限流 | Set rate limit settings for users | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| DELETE | /rest/api/latest/admin/rate-limit/settings/users/{userSlug} | 删除用户特定的限流设置 | Delete user specific rate limit settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/admin/rate-limit/settings/users/{userSlug} | 获取用户特定的限流设置 | Get user specific rate limit settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/api/latest/admin/rate-limit/settings/users/{userSlug} | 设置用户的限流 | Set rate limit settings for user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/application-properties | 获取应用属性 | Get application properties | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| POST | /rest/api/latest/hook-scripts | 创建新的钩子脚本 | Create a new hook script | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| DELETE | /rest/api/latest/hook-scripts/{scriptId} | 删除钩子脚本 | Delete a hook script. | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/hook-scripts/{scriptId} | 获取钩子脚本 | Get a hook script | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/api/latest/hook-scripts/{scriptId} | 更新钩子脚本 | Update a hook script | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/hook-scripts/{scriptId}/content | 获取钩子脚本内容 | Get hook script content | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/labels | 获取全部标签 | Get all labels | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/labels/{labelName} | 获取标签 | Get label | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/labels/{labelName}/labeled | 获取标签关联的对象 | Get labelables for label | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/logs/logger/{loggerName} | 获取当前日志级别 | Get current log level | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/api/latest/logs/logger/{loggerName}/{levelName} | 设置日志级别 | Set log level | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/logs/rootLogger | 获取根日志级别 | Get root log level | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/api/latest/logs/rootLogger/{levelName} | 设置根日志级别 | Set root log level | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/logs/settings | 获取调试日志与性能分析设置 | Get debug logging and profiling | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/api/latest/logs/settings | 设置调试日志与性能分析 | Set debug logging and profiling | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| POST | /rest/api/latest/migration/exports | 启动导出任务 | Start export job | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| POST | /rest/api/latest/migration/exports/preview | 预览导出 | Preview export | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/migration/exports/{jobId} | 获取导出任务详情 | Get export job details | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| POST | /rest/api/latest/migration/exports/{jobId}/cancel | 取消导出任务 | Cancel export job | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/migration/exports/{jobId}/messages | 获取任务消息 | Get job messages | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| POST | /rest/api/latest/migration/imports | 启动导入任务 | Start import job | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/migration/imports/{jobId} | 获取导入任务状态 | Get import job status | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| POST | /rest/api/latest/migration/imports/{jobId}/cancel | 取消导入任务 | Cancel import job | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/migration/imports/{jobId}/messages | 获取导入任务消息 | Get import job messages | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| POST | /rest/api/latest/migration/mesh | 启动 Mesh 迁移任务 | Start Mesh migration job | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| POST | /rest/api/latest/migration/mesh/preview | 预览 Mesh 迁移 | Preview Mesh migration | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/migration/mesh/repos | 按 Mesh 迁移状态查找仓库 | Find repositories by Mesh migration state | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/migration/mesh/summaries | 获取全部 Mesh 迁移任务摘要 | Get all Mesh migration job summaries | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/migration/mesh/summary | 获取 Mesh 迁移任务摘要 | Get summary for Mesh migration job | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/migration/mesh/{jobId} | 获取 Mesh 迁移任务详情 | Get Mesh migration job details | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| POST | /rest/api/latest/migration/mesh/{jobId}/cancel | 取消 Mesh 迁移任务 | Cancel Mesh migration job | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/migration/mesh/{jobId}/messages | 获取 Mesh 迁移任务消息 | Get Mesh migration job messages | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/migration/mesh/{jobId}/summary | 获取 Mesh 迁移任务摘要 | Get Mesh migration job summary | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/users | 获取全部用户 | Get all users | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/api/latest/users | 更新用户详情 | Update user details | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/api/latest/users/credentials | 设置密码 | Set password | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/users/{userSlug} | 获取用户 | Get user | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| DELETE | /rest/api/latest/users/{userSlug}/avatar.png | 删除用户头像 | Delete user avatar | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| POST | /rest/api/latest/users/{userSlug}/avatar.png | 更新用户头像 | Update user avatar | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/api/latest/users/{userSlug}/settings | 获取用户设置 | Get user settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| POST | /rest/api/latest/users/{userSlug}/settings | 更新用户设置 | Update user settings | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| DELETE | /rest/audit/latest/notification-settings/retention-config-review | 忽略保留配置通知 | Dismiss retention config notification | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/policies/latest/admin/repos/archive | 获取仓库归档策略 | Get repository archive policy | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/policies/latest/admin/repos/archive | 更新仓库归档策略 | Update repository archive policy | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| GET | /rest/policies/latest/admin/repos/delete | 获取仓库删除策略 | Get repository delete policy | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |
| PUT | /rest/policies/latest/admin/repos/delete | 更新仓库删除策略 | Update the repository delete policy | https://developer.atlassian.com/server/bitbucket/rest/v1004/api-group-system-maintenance/ |

## Rolling Upgrades REST API（记录于 intro 页面）
| Method | Path | 功能简述 (canonical Chinese) | English summary | Docs |
|------|------|----------|-----------------|--------------|
| GET | /rest/zdu/state | 获取集群状态及响应节点信息 | Get the cluster state and responding nodes | https://developer.atlassian.com/server/bitbucket/rest/v1004/intro/ |
| GET | /rest/zdu/nodes/{nodeId} | 获取指定节点的信息 | Get information about a specific node | https://developer.atlassian.com/server/bitbucket/rest/v1004/intro/ |
| GET | /rest/zdu/cluster | 获取集群概览（状态与节点组成） | Get an overview of the cluster, including its state and nodes | https://developer.atlassian.com/server/bitbucket/rest/v1004/intro/ |
| POST | /rest/zdu/start | 开始 ZDU 升级（允许集群异构升级） | Start a ZDU upgrade, allowing the cluster to run mixed versions | https://developer.atlassian.com/server/bitbucket/rest/v1004/intro/ |
| POST | /rest/zdu/cancel | 取消 ZDU 升级 | Cancel the ZDU upgrade | https://developer.atlassian.com/server/bitbucket/rest/v1004/intro/ |
| POST | /rest/zdu/approve | 批准并完成 ZDU 升级 | Approve and finish the ZDU upgrade | https://developer.atlassian.com/server/bitbucket/rest/v1004/intro/ |

## 抓取失败/存疑记录 (Fetch failures / uncertain records)

- No fetch failures: all 19 api-group pages (HTTP 200) and the official OpenAPI definition (10.4.swagger.v3.json, info.version=10.4) were retrieved successfully and share the same source.
- Version note: the doc site offers versioned v1004 (10.4.x) URLs and this baseline follows v1004; the unversioned `latest` pages were not used.
- "Other operations" group (2 inbox endpoints): these endpoints carry no tag in the official OpenAPI definition and are grouped under "Other operations" by the doc site's Redoc rendering rules; the grouping is inferred accordingly and was not visually verified page by page.
- Dual-tag note: 10 endpoints carry both a "Deprecated" tag and a functional-group tag. This baseline lists each endpoint exactly once, under its functional group with a [deprecated] marker; the official "Deprecated" group page repeats those 10 endpoints.
- The official "Deprecated" group has only 2 rows here (endpoints tagged Deprecated only); the other 10 deprecated endpoints appear with [deprecated] markers in Builds and Deployments (2), Permission Management (3), Pull Requests (3), and Repository (2).
- One [experimental] marker: POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/comments — the official description notes that "general file comments are an experimental feature".
- The Rolling Upgrades REST API (/rest/zdu/**, 6 endpoints) appears only in the intro page body, not in the OpenAPI definition; it was recorded from the intro page.
- 2 SAML endpoints have no summary in the official definition; their Chinese descriptions were translated from the official description.

Endpoint total: 578
