# Jira

## 暴露在聚合方法中

### read

jira.agile.boards.backlog.list - GET /rest/agile/1.0/board/{boardId}/backlog - 获取看板 backlog 中的 issue 列表
jira.agile.boards.configuration.get - GET /rest/agile/1.0/board/{boardId}/configuration - 获取看板配置
jira.agile.boards.epics.issues.list - GET /rest/agile/1.0/board/{boardId}/epic/{epicId}/issue - 获取看板中指定 epic 的 issue 列表
jira.agile.boards.epics.list - GET /rest/agile/1.0/board/{boardId}/epic - 获取看板的 epic 列表
jira.agile.boards.epics.none.issues.list - GET /rest/agile/1.0/board/{boardId}/epic/none/issue - 获取看板中不属于任何 epic 的 issue 列表
jira.agile.boards.get - GET /rest/agile/1.0/board/{boardId} - 按 ID 获取单个看板
jira.agile.boards.issues.list - GET /rest/agile/1.0/board/{boardId}/issue - 获取看板中的 issue 列表
jira.agile.boards.list - GET /rest/agile/1.0/board - 获取 Jira Software 看板列表
jira.agile.boards.projects.list - GET /rest/agile/1.0/board/{boardId}/project - 获取看板关联的项目列表
jira.agile.boards.properties.get - GET /rest/agile/1.0/board/{boardId}/properties/{propertyKey} - 按键获取看板属性值
jira.agile.boards.properties.list - GET /rest/agile/1.0/board/{boardId}/properties - 获取看板的全部属性键
jira.agile.boards.settings.refined-velocity.get - GET /rest/agile/1.0/board/{boardId}/settings/refined-velocity - 获取看板 refined velocity 设置值
jira.agile.boards.sprints.issues.list - GET /rest/agile/1.0/board/{boardId}/sprint/{sprintId}/issue - 获取看板中指定冲刺的 issue 列表
jira.agile.boards.sprints.list - GET /rest/agile/1.0/board/{boardId}/sprint - 获取指定看板的冲刺列表
jira.agile.boards.versions.list - GET /rest/agile/1.0/board/{boardId}/version - 获取看板的版本列表
jira.agile.epics.get - GET /rest/agile/1.0/epic/{epicIdOrKey} - 按 ID 或 key 获取 epic
jira.agile.epics.issues.list - GET /rest/agile/1.0/epic/{epicIdOrKey}/issue - 获取指定 epic 的 issue 列表
jira.agile.epics.none.issues.list - GET /rest/agile/1.0/epic/none/issue - 获取不属于任何 epic 的 issue 列表
jira.agile.issues.estimation.get - GET /rest/agile/1.0/issue/{issueIdOrKey}/estimation - 获取 issue 在指定看板下的估算值
jira.agile.issues.get - GET /rest/agile/1.0/issue/{issueIdOrKey} - 获取带 Agile 字段的单个 issue
jira.agile.sprints.get - GET /rest/agile/1.0/sprint/{sprintId} - 按 ID 获取冲刺
jira.agile.sprints.issues - GET /rest/agile/1.0/sprint/{sprintId}/issue - 获取冲刺中的 issue 列表
jira.agile.sprints.properties.get - GET /rest/agile/1.0/sprint/{sprintId}/properties/{propertyKey} - 按键获取冲刺属性值
jira.agile.sprints.properties.list - GET /rest/agile/1.0/sprint/{sprintId}/properties - 获取冲刺的全部属性键
jira.component.get - GET /rest/api/2/component/{id} - 按 ID 获取项目组件详情
jira.component.relatedissuecounts.list - GET /rest/api/2/component/{id}/relatedIssueCounts - 获取组件关联的 issue 数量
jira.custom-field-option.customfieldoption.get - GET /rest/api/2/customFieldOption/{id} - 按 ID 获取自定义字段选项
jira.custom-fields.customfields.list - GET /rest/api/2/customFields - 分页获取自定义字段列表
jira.custom-fields.customfields.options.list - GET /rest/api/2/customFields/{customFieldId}/options - 分页获取自定义字段的选项列表
jira.issue.attachments.metadata - GET /rest/api/2/attachment/{attachmentId} - 按 ID 获取 issue 附件元数据
jira.issue.comment.get - GET /rest/api/2/issue/{issueIdOrKey}/comment/{id} - 按 ID 获取单条评论内容
jira.issue.comments.list - GET /rest/api/2/issue/{issueKey}/comment - 获取 issue 的评论列表
jira.issue.createmeta.issuetypes.get - GET /rest/api/2/issue/createmeta/{projectIdOrKey}/issuetypes/{issueTypeId} - 获取指定 issue 类型的创建字段元数据
jira.issue.createmeta.issuetypes.list - GET /rest/api/2/issue/createmeta/{projectIdOrKey}/issuetypes - 获取项目可创建的 issue 类型元数据
jira.issue.editmeta.list - GET /rest/api/2/issue/{issueIdOrKey}/editmeta - 获取编辑 issue 可用的字段元数据
jira.issue.get - GET /rest/api/2/issue/{issueKey} - 按键或 ID 获取 issue 详情
jira.issue.remotelink.get - GET /rest/api/2/issue/{issueIdOrKey}/remotelink/{linkId} - 按 ID 获取 issue 远程链接
jira.issue.remotelink.list - GET /rest/api/2/issue/{issueIdOrKey}/remotelink - 获取 issue 的全部远程链接
jira.issue.search - GET /rest/api/2/search - 使用 JQL 搜索 issue
jira.issue.subtask.list - GET /rest/api/2/issue/{issueIdOrKey}/subtask - 获取 issue 的子任务列表
jira.issue.transitions.list - GET /rest/api/2/issue/{issueKey}/transitions - 获取 issue 可用的工作流转换
jira.project.version.list - GET /rest/api/2/project/{projectIdOrKey}/version - 分页获取项目的版本列表
jira.project.versions.list - GET /rest/api/2/project/{projectIdOrKey}/versions - 获取项目的全部版本列表
jira.projects.get - GET /rest/api/2/project/{projectKey} - 按键获取项目详细信息
jira.projects.list - GET /rest/api/2/project - 获取当前用户可见的项目列表
jira.search.error.lookup.list - GET /rest/api/2/search/error/lookup - 查询 JQL 搜索的错误信息
jira.server.info - GET /rest/api/2/serverInfo - 获取 Jira 版本与部署信息
jira.status-category.statuscategory.get - GET /rest/api/2/statuscategory/{idOrKey} - 按 ID 或键获取状态分类
jira.status-category.statuscategory.list - GET /rest/api/2/statuscategory - 获取全部状态分类列表
jira.status.get - GET /rest/api/2/status/{idOrName} - 按 ID 或名称获取状态
jira.status.list - GET /rest/api/2/status - 获取全部 issue 状态列表
jira.users.get - GET /rest/api/2/user - 获取指定 Jira 用户的信息
jira.users.search - GET /rest/api/2/user/picker - 按关键词搜索 Jira 用户

### safe

jira.agile.backlog.issues.move - POST /rest/agile/1.0/backlog/issue - 将 issue 移入 backlog
jira.agile.epics.issues.move - POST /rest/agile/1.0/epic/{epicIdOrKey}/issue - 将 issue 移入指定 epic
jira.agile.epics.none.issues.move - POST /rest/agile/1.0/epic/none/issue - 将 issue 移出所有 epic
jira.agile.epics.rank - PUT /rest/agile/1.0/epic/{epicIdOrKey}/rank - 调整 epic 相对另一 epic 的排名
jira.agile.epics.update - POST /rest/agile/1.0/epic/{epicIdOrKey} - 更新 epic 详情
jira.agile.issues.estimation.update - PUT /rest/agile/1.0/issue/{issueIdOrKey}/estimation - 更新 issue 在指定看板下的估算值
jira.agile.issues.rank - PUT /rest/agile/1.0/issue/rank - 调整 issue 相对排名
jira.agile.sprints.create - POST /rest/agile/1.0/sprint - 创建未来冲刺
jira.agile.sprints.issues.move - POST /rest/agile/1.0/sprint/{sprintId}/issue - 将 issue 移入冲刺
jira.agile.sprints.swap - POST /rest/agile/1.0/sprint/{sprintId}/swap - 交换两个冲刺的位置
jira.filter.columns.update - PUT /rest/api/2/filter/{id}/columns - 设置过滤器的默认显示列
jira.filter.create - POST /rest/api/2/filter - 创建新的 issue 过滤器
jira.filter.defaultsharescope.update - PUT /rest/api/2/filter/defaultShareScope - 设置过滤器的默认共享范围
jira.filter.permission.create - POST /rest/api/2/filter/{id}/permission - 为过滤器添加共享权限
jira.filter.update - PUT /rest/api/2/filter/{id} - 按 ID 更新已有过滤器
jira.issue.assignee.update - PUT /rest/api/2/issue/{issueIdOrKey}/assignee - 将 issue 指派给指定用户
jira.issue.attachments.upload - POST /rest/api/2/issue/{issueKey}/attachments - 为 issue 上传附件文件
jira.issue.bulk - POST /rest/api/2/issue/bulk - 从 JSON 批量创建 issue 或子任务
jira.issue.comments.add - POST /rest/api/2/issue/{issueKey}/comment - 为 issue 添加一条评论
jira.issue.comments.update - PUT /rest/api/2/issue/{issueKey}/comment/{commentId} - 更新指定的 issue 评论
jira.issue.create - POST /rest/api/2/issue - 创建一个新的 issue
jira.issue.remotelink.create - POST /rest/api/2/issue/{issueIdOrKey}/remotelink - 创建或更新 issue 远程链接
jira.issue.remotelink.update - PUT /rest/api/2/issue/{issueIdOrKey}/remotelink/{linkId} - 按 ID 更新 issue 远程链接
jira.issue.update - PUT /rest/api/2/issue/{issueKey} - 更新 issue 的字段内容
jira.search.create - POST /rest/api/2/search - 通过 POST 请求执行 JQL 搜索

### risky

jira.agile.boards.create - POST /rest/agile/1.0/board - 创建看板（共享配置变更）
jira.agile.boards.delete - DELETE /rest/agile/1.0/board/{boardId} - 删除看板
jira.agile.sprints.delete - DELETE /rest/agile/1.0/sprint/{sprintId} - 删除冲刺
jira.agile.sprints.update - PUT /rest/agile/1.0/sprint/{sprintId} - 全量更新冲刺
jira.agile.sprints.update.partial - POST /rest/agile/1.0/sprint/{sprintId} - 部分更新冲刺
jira.attachment.delete - DELETE /rest/api/2/attachment/{id} - 按 ID 删除 issue 附件
jira.filter.columns.delete - DELETE /rest/api/2/filter/{id}/columns - 将过滤器显示列重置为默认
jira.filter.delete - DELETE /rest/api/2/filter/{id} - 按 ID 删除指定过滤器
jira.filter.permission.delete - DELETE /rest/api/2/filter/{id}/permission/{permission-id} - 移除过滤器的指定共享权限
jira.issue.comments.delete - DELETE /rest/api/2/issue/{issueKey}/comment/{commentId} - 删除指定的 issue 评论
jira.issue.delete - DELETE /rest/api/2/issue/{issueKey} - 永久删除指定的 issue
jira.issue.remotelink.delete - DELETE /rest/api/2/issue/{issueIdOrKey}/remotelink - 删除 issue 的全部远程链接
jira.issue.remotelink.delete.issueidorkey - DELETE /rest/api/2/issue/{issueIdOrKey}/remotelink/{linkId} - 按 ID 删除 issue 远程链接
jira.issue.transitions.perform - POST /rest/api/2/issue/{issueKey}/transitions - 执行 issue 的工作流转换

### max

jira.attachment.meta.list - GET /rest/api/2/attachment/meta - 获取附件的能力与配置信息
jira.component.create - POST /rest/api/2/component - 在指定项目中创建新组件
jira.component.delete - DELETE /rest/api/2/component/{id} - 按 ID 删除指定项目组件
jira.component.update - PUT /rest/api/2/component/{id} - 按 ID 更新项目组件信息
jira.dashboard.get - GET /rest/api/2/dashboard/{id} - 按 ID 获取仪表盘详情
jira.dashboard.items.properties.delete - DELETE /rest/api/2/dashboard/{dashboardId}/items/{itemId}/properties/{propertyKey} - 删除仪表盘项的指定属性
jira.dashboard.items.properties.get - GET /rest/api/2/dashboard/{dashboardId}/items/{itemId}/properties - 获取仪表盘项的全部属性键
jira.dashboard.items.properties.get.dashboardid - GET /rest/api/2/dashboard/{dashboardId}/items/{itemId}/properties/{propertyKey} - 按键获取仪表盘项属性值
jira.dashboard.items.properties.update - PUT /rest/api/2/dashboard/{dashboardId}/items/{itemId}/properties/{propertyKey} - 设置仪表盘项的属性值
jira.dashboard.list - GET /rest/api/2/dashboard - 获取全部可见的仪表盘
jira.fields.list - GET /rest/api/2/field - 获取全部系统字段与自定义字段
jira.filter.columns.list - GET /rest/api/2/filter/{id}/columns - 获取过滤器的默认显示列
jira.filter.defaultsharescope.list - GET /rest/api/2/filter/defaultShareScope - 获取过滤器的默认共享范围
jira.filter.favourite.list - GET /rest/api/2/filter/favourite - 获取当前用户收藏的过滤器
jira.filter.get - GET /rest/api/2/filter/{id} - 按 ID 获取过滤器详情
jira.filter.permission.get - GET /rest/api/2/filter/{id}/permission/{permissionId} - 按 ID 获取过滤器共享权限
jira.filter.permission.list - GET /rest/api/2/filter/{id}/permission - 获取过滤器的全部共享权限
jira.issue-type.issuetype.get - GET /rest/api/2/issuetype/{id} - 按 ID 获取 issue 类型详情
jira.issue-type.issuetype.list - GET /rest/api/2/issuetype - 获取用户可见的全部 issue 类型
jira.issue.archive - POST /rest/api/2/issue/archive - 批量归档指定的 issue
jira.issue.archive.issueidorkey - PUT /rest/api/2/issue/{issueIdOrKey}/archive - 归档指定的单个 issue
jira.issue.comment.pin - PUT /rest/api/2/issue/{issueIdOrKey}/comment/{id}/pin - 置顶或取消置顶指定评论
jira.issue.notify - POST /rest/api/2/issue/{issueIdOrKey}/notify - 向收件人发送 issue 通知
jira.issue.picker.list - GET /rest/api/2/issue/picker - 获取用于自动补全的建议 issue
jira.issue.pinned-comments.list - GET /rest/api/2/issue/{issueIdOrKey}/pinned-comments - 获取 issue 的置顶评论列表
jira.issue.restore - PUT /rest/api/2/issue/{issueIdOrKey}/restore - 恢复已归档的 issue
jira.issue.subtask.move - POST /rest/api/2/issue/{issueIdOrKey}/subtask/move - 对 issue 的子任务重新排序
jira.issue.subtask.move.list - GET /rest/api/2/issue/{issueIdOrKey}/subtask/move - 检查子任务是否可移动
jira.issue.votes.create - POST /rest/api/2/issue/{issueIdOrKey}/votes - 为 issue 投出一票
jira.issue.votes.delete - DELETE /rest/api/2/issue/{issueIdOrKey}/votes - 取消对 issue 的投票
jira.issue.votes.list - GET /rest/api/2/issue/{issueIdOrKey}/votes - 获取 issue 的投票情况
jira.issue.watchers.add - POST /rest/api/2/issue/{issueKey}/watchers - 添加 issue 的关注者
jira.issue.watchers.delete - DELETE /rest/api/2/issue/{issueKey}/watchers - 移除 issue 的关注者
jira.issue.watchers.list - GET /rest/api/2/issue/{issueKey}/watchers - 获取 issue 的关注者列表
jira.issue.worklog.delete - DELETE /rest/api/2/issue/{issueIdOrKey}/worklog/{id} - 按 ID 删除指定工作日志
jira.issue.worklog.get - GET /rest/api/2/issue/{issueIdOrKey}/worklog/{id} - 按 ID 获取单条工作日志
jira.issue.worklog.update - PUT /rest/api/2/issue/{issueIdOrKey}/worklog/{id} - 按 ID 更新指定工作日志
jira.issue.worklogs.add - POST /rest/api/2/issue/{issueKey}/worklog - 为 issue 添加工作日志
jira.issue.worklogs.list - GET /rest/api/2/issue/{issueKey}/worklog - 获取 issue 的工作日志列表
jira.priority.get - GET /rest/api/2/priority/{id} - 按 ID 获取 issue 优先级
jira.priority.list - GET /rest/api/2/priority - 获取全部 issue 优先级
jira.priority.page.list - GET /rest/api/2/priority/page - 分页获取 issue 优先级
jira.project.archive - PUT /rest/api/2/project/{projectIdOrKey}/archive - 将指定项目置为归档状态
jira.project.components.list - GET /rest/api/2/project/{projectIdOrKey}/components - 获取项目下的组件列表
jira.project.issuesecuritylevelscheme.list - GET /rest/api/2/project/{projectKeyOrId}/issuesecuritylevelscheme - 获取项目的 issue 安全级别方案
jira.project.notificationscheme.list - GET /rest/api/2/project/{projectKeyOrId}/notificationscheme - 获取项目关联的通知方案
jira.project.permissionscheme.list - GET /rest/api/2/project/{projectKeyOrId}/permissionscheme - 获取项目已指派的权限方案
jira.project.permissionscheme.update - PUT /rest/api/2/project/{projectKeyOrId}/permissionscheme - 为项目指派新的权限方案
jira.project.restore - PUT /rest/api/2/project/{projectIdOrKey}/restore - 恢复此前已归档的项目
jira.project.role.create - POST /rest/api/2/project/{projectIdOrKey}/role/{id} - 向项目角色添加用户或组
jira.project.role.delete - DELETE /rest/api/2/project/{projectIdOrKey}/role/{id} - 从项目角色移除用户或组
jira.project.role.get - GET /rest/api/2/project/{projectIdOrKey}/role/{id} - 按 ID 获取项目角色详情
jira.project.role.list - GET /rest/api/2/project/{projectIdOrKey}/role - 获取项目中的全部角色
jira.project.role.update - PUT /rest/api/2/project/{projectIdOrKey}/role/{id} - 重置项目角色的成员列表
jira.project.securitylevel.list - GET /rest/api/2/project/{projectKeyOrId}/securitylevel - 获取项目的全部安全级别
jira.project.statuses.list - GET /rest/api/2/project/{projectIdOrKey}/statuses - 获取项目各 issue 类型的状态
jira.project.type.get - GET /rest/api/2/project/type/{projectTypeKey} - 按键获取项目类型详情
jira.project.type.list - GET /rest/api/2/project/type - 获取全部项目类型列表
jira.project.type.update - PUT /rest/api/2/project/{projectIdOrKey}/type/{newProjectTypeKey} - 更改指定项目的项目类型
jira.project.workflowscheme.list - GET /rest/api/2/project/{projectKeyOrId}/workflowscheme - 获取项目的工作流方案
jira.projects.create - POST /rest/api/2/project - 创建一个新的 Jira 项目
jira.projects.delete - DELETE /rest/api/2/project/{projectKey} - 删除指定的 Jira 项目
jira.projects.update - PUT /rest/api/2/project/{projectKey} - 更新指定项目的信息与设置
jira.resolution.get - GET /rest/api/2/resolution/{id} - 按 ID 获取解决结果详情
jira.resolution.list - GET /rest/api/2/resolution - 获取全部 issue 解决结果
jira.user.assignable.multiprojectsearch.list - GET /rest/api/2/user/assignable/multiProjectSearch - 跨项目批量查找可指派用户
jira.user.assignable.search.list - GET /rest/api/2/user/assignable/search - 查找 issue 的可指派用户
jira.user.viewissue.search.list - GET /rest/api/2/user/viewissue/search - 查找可浏览指定 issue 的用户
jira.version.create - POST /rest/api/2/version - 创建一个新的项目版本
jira.version.get - GET /rest/api/2/version/{id} - 按 ID 获取版本详细信息
jira.version.mergeto.update - PUT /rest/api/2/version/{id}/mergeto/{moveIssuesTo} - 将版本合并到另一版本
jira.version.move - POST /rest/api/2/version/{id}/move - 调整版本在列表中的位置
jira.version.relatedissuecounts.list - GET /rest/api/2/version/{id}/relatedIssueCounts - 获取版本关联的 issue 数量
jira.version.remotelink.create - POST /rest/api/2/version/{versionId}/remotelink - 创建或更新版本远程链接
jira.version.remotelink.create.versionid - POST /rest/api/2/version/{versionId}/remotelink/{globalId} - 按全局 ID 创建或更新远程版本链接
jira.version.remotelink.delete - DELETE /rest/api/2/version/{versionId}/remotelink - 删除版本的全部远程链接
jira.version.remotelink.delete.versionid - DELETE /rest/api/2/version/{versionId}/remotelink/{globalId} - 按全局 ID 删除版本远程链接
jira.version.remotelink.get - GET /rest/api/2/version/{versionId}/remotelink/{globalId} - 按全局 ID 获取版本远程链接
jira.version.remotelink.list - GET /rest/api/2/version/remotelink - 按全局 ID 获取远程版本链接
jira.version.remotelink.list.versionid - GET /rest/api/2/version/{versionId}/remotelink - 获取版本的全部远程链接
jira.version.removeandswap.create - POST /rest/api/2/version/{id}/removeAndSwap - 删除版本并替换 issue 中的引用
jira.version.unresolvedissuecount.list - GET /rest/api/2/version/{id}/unresolvedIssueCount - 获取版本未解决的 issue 数量
jira.version.update - PUT /rest/api/2/version/{id} - 按 ID 更新版本详细信息

## 完全不提供的功能

> 以下 7 个 Jira Agile 操作永久排除（未进 registry，仅在此留档）：
> PUT/DELETE /rest/agile/1.0/board/{boardId}/properties/{propertyKey} 与 PUT/DELETE /rest/agile/1.0/sprint/{sprintId}/properties/{propertyKey}（4 个，entity property 低价值，读操作已提供）；
> PUT /rest/agile/1.0/sprint/unmap 与 PUT /rest/agile/1.0/sprint/unmap-all（2 个，DC 同步语义晦涩）；
> PUT /rest/agile/1.0/board/{boardId}/settings/refined-velocity（看板设置变更，对应 GET 已在 read 提供）。

jira.application-properties.application-properties.advanced-settings.list - GET /rest/api/2/application-properties/advanced-settings - 获取全部高级设置属性
jira.application-properties.application-properties.get - GET /rest/api/2/application-properties - 按 key 获取应用属性
jira.application-properties.application-properties.update - PUT /rest/api/2/application-properties/{id} - 更新应用属性
jira.application-roles.applicationrole.get - GET /rest/api/2/applicationrole/{key} - 按 key 获取应用角色
jira.application-roles.applicationrole.list - GET /rest/api/2/applicationrole - 获取系统全部应用角色
jira.application-roles.applicationrole.update - PUT /rest/api/2/applicationrole - 批量更新应用角色
jira.application-roles.applicationrole.update.key - PUT /rest/api/2/applicationrole/{key} - 更新应用角色
jira.avatar.system.list - GET /rest/api/2/avatar/{type}/system - 获取全部系统头像
jira.cluster.node.delete - DELETE /rest/api/2/cluster/node/{nodeId} - 删除集群节点
jira.cluster.node.offline.update - PUT /rest/api/2/cluster/node/{nodeId}/offline - 将节点状态更新为离线
jira.cluster.nodes.list - GET /rest/api/2/cluster/nodes - 获取全部集群节点
jira.cluster.zdu.approve - POST /rest/api/2/cluster/zdu/approve - 批准集群升级
jira.cluster.zdu.cancel - POST /rest/api/2/cluster/zdu/cancel - 取消集群升级
jira.cluster.zdu.retryupgrade.create - POST /rest/api/2/cluster/zdu/retryUpgrade - 重试集群升级
jira.cluster.zdu.start - POST /rest/api/2/cluster/zdu/start - 启动集群升级
jira.cluster.zdu.state.get - GET /rest/api/2/cluster/zdu/state - 获取集群升级状态
jira.configuration.list - GET /rest/api/2/configuration - 获取 Jira 配置详情
jira.custom-fields.customfields.delete - DELETE /rest/api/2/customFields - 批量删除自定义字段
jira.email-templates.email-templates.apply - POST /rest/api/2/email-templates/apply - 使用先前上传的包更新邮件模板
jira.email-templates.email-templates.create - POST /rest/api/2/email-templates - 使用 zip 文件更新邮件模板
jira.email-templates.email-templates.list - GET /rest/api/2/email-templates - 以 zip 文件获取邮件模板
jira.email-templates.email-templates.revert - POST /rest/api/2/email-templates/revert - 将邮件模板恢复为默认
jira.email-templates.email-templates.types.get - GET /rest/api/2/email-templates/types - 获取模板的邮件类型
jira.field.create - POST /rest/api/2/field - 使用定义创建自定义字段
jira.group-user-picker.groupuserpicker.list - GET /rest/api/2/groupuserpicker - 按查询匹配用户与用户组（带高亮）
jira.group.create - POST /rest/api/2/group - 按给定参数创建用户组
jira.group.delete - DELETE /rest/api/2/group - 删除指定用户组
jira.group.member.list - GET /rest/api/2/group/member - 获取指定用户组中的用户
jira.group.user.create - POST /rest/api/2/group/user - 将用户加入指定用户组
jira.group.user.delete - DELETE /rest/api/2/group/user - 将用户移出指定用户组
jira.groups.picker.list - GET /rest/api/2/groups/picker - 按查询匹配用户组
jira.index-snapshot.index-snapshot.create - POST /rest/api/2/index-snapshot - 创建索引快照（若无进行中任务）
jira.index-snapshot.index-snapshot.isrunning.list - GET /rest/api/2/index-snapshot/isRunning - 获取索引快照创建状态
jira.index-snapshot.index-snapshot.list - GET /rest/api/2/index-snapshot - 获取可用索引快照列表
jira.issue-link-type.issuelinktype.create - POST /rest/api/2/issueLinkType - 创建 issue 链接类型
jira.issue-link-type.issuelinktype.delete - DELETE /rest/api/2/issueLinkType/{issueLinkTypeId} - 删除指定 issue 链接类型
jira.issue-link-type.issuelinktype.get - GET /rest/api/2/issueLinkType/{issueLinkTypeId} - 获取 issue 链接类型信息
jira.issue-link-type.issuelinktype.list - GET /rest/api/2/issueLinkType - 获取可用 issue 链接类型列表
jira.issue-link-type.issuelinktype.order.update - PUT /rest/api/2/issueLinkType/order - 按字母顺序重置 issue 链接类型排序
jira.issue-link-type.issuelinktype.order.update.issuelinktypeid - PUT /rest/api/2/issueLinkType/{issueLinkTypeId}/order - 更新 issue 链接类型的顺序
jira.issue-link-type.issuelinktype.update - PUT /rest/api/2/issueLinkType/{issueLinkTypeId} - 更新指定 issue 链接类型
jira.issue-link.issuelink.get - GET /rest/api/2/issueLink/{linkId} - 按 ID 获取 issue 链接
jira.issue-security-schemes.issuesecurityschemes.get - GET /rest/api/2/issuesecurityschemes/{id} - 按 ID 获取指定 issue 安全方案
jira.issue-security-schemes.issuesecurityschemes.list - GET /rest/api/2/issuesecurityschemes - 获取全部 issue 安全方案
jira.issue-type-scheme.issuetypescheme.associations.create - POST /rest/api/2/issuetypescheme/{schemeId}/associations - 为方案添加项目关联
jira.issue-type-scheme.issuetypescheme.associations.delete - DELETE /rest/api/2/issuetypescheme/{schemeId}/associations - 移除指定方案的全部项目关联
jira.issue-type-scheme.issuetypescheme.associations.delete.schemeid - DELETE /rest/api/2/issuetypescheme/{schemeId}/associations/{projIdOrKey} - 移除指定方案的指定项目关联
jira.issue-type-scheme.issuetypescheme.associations.list - GET /rest/api/2/issuetypescheme/{schemeId}/associations - 获取指定方案关联的全部项目
jira.issue-type-scheme.issuetypescheme.associations.update - PUT /rest/api/2/issuetypescheme/{schemeId}/associations - 设置方案的项目关联
jira.issue-type-scheme.issuetypescheme.create - POST /rest/api/2/issuetypescheme - 从 JSON 表示创建 issue 类型方案
jira.issue-type-scheme.issuetypescheme.delete - DELETE /rest/api/2/issuetypescheme/{schemeId} - 删除指定 issue 类型方案
jira.issue-type-scheme.issuetypescheme.get - GET /rest/api/2/issuetypescheme/{schemeId} - 按 ID 获取 issue 类型方案完整表示
jira.issue-type-scheme.issuetypescheme.list - GET /rest/api/2/issuetypescheme - 获取用户可见的全部 issue 类型方案
jira.issue-type-scheme.issuetypescheme.update - PUT /rest/api/2/issuetypescheme/{schemeId} - 从 JSON 表示更新指定 issue 类型方案
jira.issue-type.issuetype.alternatives.list - GET /rest/api/2/issuetype/{id}/alternatives - 获取可替代的备选 issue 类型
jira.issue-type.issuetype.avatar.create - POST /rest/api/2/issuetype/{id}/avatar - 将临时头像转为正式头像
jira.issue-type.issuetype.avatar.temporary.create - POST /rest/api/2/issuetype/{id}/avatar/temporary - 通过 multipart 上传为 issue 类型创建临时头像
jira.issue-type.issuetype.create - POST /rest/api/2/issuetype - 从 JSON 表示创建 issue 类型
jira.issue-type.issuetype.delete - DELETE /rest/api/2/issuetype/{id} - 删除指定 issue 类型并迁移关联 issue
jira.issue-type.issuetype.update - PUT /rest/api/2/issuetype/{id} - 从 JSON 表示更新指定 issue 类型
jira.issue.links.create - POST /rest/api/2/issueLink - 创建两个 issue 之间的链接
jira.issue.links.delete - DELETE /rest/api/2/issueLink/{linkId} - 删除 issue 之间的链接
jira.issue.remotelink.reciprocal - POST /rest/api/2/issue/remotelink/reciprocal - 创建双向远程 issue 链接
jira.jql.autocompletedata.list - GET /rest/api/2/jql/autocompletedata - 获取 JQL 搜索自动补全数据
jira.jql.autocompletedata.suggestions.list - GET /rest/api/2/jql/autocompletedata/suggestions - 获取 JQL 搜索自动补全建议
jira.license-validator.licensevalidator.create - POST /rest/api/2/licenseValidator - 校验 Jira 许可证
jira.monitoring.app.create - POST /rest/api/2/monitoring/app - 更新应用监控状态
jira.monitoring.app.list - GET /rest/api/2/monitoring/app - 获取应用监控状态
jira.monitoring.ipd.create - POST /rest/api/2/monitoring/ipd - 更新 IPD 监控状态
jira.monitoring.ipd.list - GET /rest/api/2/monitoring/ipd - 获取 IPD 监控是否启用
jira.monitoring.jmx.aremetricsexposed.list - GET /rest/api/2/monitoring/jmx/areMetricsExposed - 检查 JMX 指标是否正在暴露
jira.monitoring.jmx.getavailablemetrics.list - GET /rest/api/2/monitoring/jmx/getAvailableMetrics - 获取可用的 JMX 指标
jira.monitoring.jmx.startexposing.create - POST /rest/api/2/monitoring/jmx/startExposing - 开始暴露 JMX 指标
jira.monitoring.jmx.stopexposing.create - POST /rest/api/2/monitoring/jmx/stopExposing - 停止暴露 JMX 指标
jira.my-permissions.mypermissions.list - GET /rest/api/2/mypermissions - 获取当前登录用户的权限
jira.my-preferences.mypreferences.delete - DELETE /rest/api/2/mypreferences - 删除用户偏好设置
jira.my-preferences.mypreferences.list - GET /rest/api/2/mypreferences - 按 key 获取用户偏好设置
jira.my-preferences.mypreferences.update - PUT /rest/api/2/mypreferences - 更新用户偏好设置
jira.notification-scheme.notificationscheme.get - GET /rest/api/2/notificationscheme/{id} - 获取通知方案完整详情
jira.notification-scheme.notificationscheme.list - GET /rest/api/2/notificationscheme - 分页获取通知方案
jira.password.policy.createuser.create - POST /rest/api/2/password/policy/createUser - 获取创建用户被密码策略拒绝的原因
jira.password.policy.list - GET /rest/api/2/password/policy - 获取当前密码策略要求
jira.password.policy.updateuser.create - POST /rest/api/2/password/policy/updateUser - 获取更新用户密码被密码策略拒绝的原因
jira.permission-scheme.permissionscheme.create - POST /rest/api/2/permissionscheme - 创建权限方案
jira.permission-scheme.permissionscheme.create.schemeid - POST /rest/api/2/permissionscheme/{schemeId}/permission - 在方案中创建权限授予
jira.permission-scheme.permissionscheme.delete - DELETE /rest/api/2/permissionscheme/{schemeId} - 按 ID 删除权限方案
jira.permission-scheme.permissionscheme.delete.schemeid - DELETE /rest/api/2/permissionscheme/{schemeId}/permission/{permissionId} - 从方案中删除权限授予
jira.permission-scheme.permissionscheme.get - GET /rest/api/2/permissionscheme/{schemeId} - 按 ID 获取权限方案
jira.permission-scheme.permissionscheme.get.schemeid - GET /rest/api/2/permissionscheme/{schemeId}/permission/{permissionId} - 按 ID 获取权限授予
jira.permission-scheme.permissionscheme.list - GET /rest/api/2/permissionscheme - 获取全部权限方案
jira.permission-scheme.permissionscheme.list.schemeid - GET /rest/api/2/permissionscheme/{schemeId}/permission - 获取方案的全部权限授予
jira.permission-scheme.permissionscheme.update - PUT /rest/api/2/permissionscheme/{schemeId} - 更新权限方案
jira.permissions.list - GET /rest/api/2/permissions - 获取 Jira 实例中的全部权限
jira.project-category.projectcategory.create - POST /rest/api/2/projectCategory - 创建项目类别
jira.project-category.projectcategory.delete - DELETE /rest/api/2/projectCategory/{id} - 删除项目类别
jira.project-category.projectcategory.get - GET /rest/api/2/projectCategory/{id} - 按 ID 获取项目类别
jira.project-category.projectcategory.list - GET /rest/api/2/projectCategory - 获取全部项目类别
jira.project-category.projectcategory.update - PUT /rest/api/2/projectCategory/{id} - 更新项目类别
jira.project-validate.projectvalidate.key.list - GET /rest/api/2/projectvalidate/key - 校验项目 key
jira.project.avatar.create - POST /rest/api/2/project/{projectIdOrKey}/avatar - 将临时头像设为项目正式头像
jira.project.avatar.delete - DELETE /rest/api/2/project/{projectIdOrKey}/avatar/{id} - 删除项目的自定义头像
jira.project.avatar.temporary.create - POST /rest/api/2/project/{projectIdOrKey}/avatar/temporary - 通过 multipart 上传临时头像
jira.project.avatar.update - PUT /rest/api/2/project/{projectIdOrKey}/avatar - 更新项目头像的裁剪设置
jira.project.avatars.list - GET /rest/api/2/project/{projectIdOrKey}/avatars - 获取项目可用的全部头像
jira.project.type.accessible.list - GET /rest/api/2/project/type/{projectTypeKey}/accessible - 获取当前许可证可访问的项目类型
jira.projects.picker.list - GET /rest/api/2/projects/picker - 按查询匹配项目
jira.read-only-mode.readonly-mode.list - GET /rest/api/2/readonly-mode - 获取只读模式状态
jira.read-only-mode.readonly-mode.update - PUT /rest/api/2/readonly-mode - 更新只读模式状态
jira.reindex.create - POST /rest/api/2/reindex - 启动重建索引操作
jira.reindex.issue.create - POST /rest/api/2/reindex/issue - 重建单个 issue 的索引
jira.reindex.list - GET /rest/api/2/reindex - 获取重建索引信息
jira.reindex.progress.list - GET /rest/api/2/reindex/progress - 获取重建索引进度
jira.reindex.request.bulk.list - GET /rest/api/2/reindex/request/bulk - 获取多个重建索引请求的进度
jira.reindex.request.create - POST /rest/api/2/reindex/request - 执行待处理的重建索引请求
jira.reindex.request.get - GET /rest/api/2/reindex/request/{requestId} - 获取单个重建索引请求的进度
jira.role.actors.create - POST /rest/api/2/role/{id}/actors - 为角色添加默认 actor
jira.role.actors.delete - DELETE /rest/api/2/role/{id}/actors - 移除角色的默认 actor
jira.role.actors.list - GET /rest/api/2/role/{id}/actors - 获取角色的默认 actor
jira.role.create - POST /rest/api/2/role - 创建项目角色
jira.role.create.id - POST /rest/api/2/role/{id} - 部分更新角色名称或描述
jira.role.delete - DELETE /rest/api/2/role/{id} - 删除角色
jira.role.get - GET /rest/api/2/role/{id} - 获取指定项目角色
jira.role.list - GET /rest/api/2/role - 获取全部项目角色
jira.role.update - PUT /rest/api/2/role/{id} - 全量更新角色名称与描述
jira.screens.addtodefault.create - POST /rest/api/2/screens/addToDefault/{fieldId} - 向默认界面添加字段
jira.screens.availablefields.list - GET /rest/api/2/screens/{screenId}/availableFields - 获取界面可用的字段
jira.screens.list - GET /rest/api/2/screens - 获取字段可用的界面
jira.screens.tabs.create - POST /rest/api/2/screens/{screenId}/tabs - 为界面创建标签页
jira.screens.tabs.delete - DELETE /rest/api/2/screens/{screenId}/tabs/{tabId} - 从界面删除标签页
jira.screens.tabs.fields.create - POST /rest/api/2/screens/{screenId}/tabs/{tabId}/fields - 向标签页添加字段
jira.screens.tabs.fields.delete - DELETE /rest/api/2/screens/{screenId}/tabs/{tabId}/fields/{id} - 从标签页移除字段
jira.screens.tabs.fields.list - GET /rest/api/2/screens/{screenId}/tabs/{tabId}/fields - 获取标签页的全部字段
jira.screens.tabs.fields.move - POST /rest/api/2/screens/{screenId}/tabs/{tabId}/fields/{id}/move - 移动标签页上的字段
jira.screens.tabs.fields.updateshowwhenemptyindicator.update - PUT /rest/api/2/screens/{screenId}/tabs/{tabId}/fields/{id}/updateShowWhenEmptyIndicator/{newValue} - 更新字段的 showWhenEmptyIndicator
jira.screens.tabs.list - GET /rest/api/2/screens/{screenId}/tabs - 获取界面的全部标签页
jira.screens.tabs.move - POST /rest/api/2/screens/{screenId}/tabs/{tabId}/move/{pos} - 移动标签页位置
jira.screens.tabs.update - PUT /rest/api/2/screens/{screenId}/tabs/{tabId} - 重命名界面标签页
jira.search-limits.searchlimits.maxaggregationbuckets.list - GET /rest/api/2/searchLimits/maxAggregationBuckets - 获取最大聚合桶数
jira.search-limits.searchlimits.maxresultwindow.list - GET /rest/api/2/searchLimits/maxResultWindow - 获取最大结果窗口
jira.security-level.securitylevel.get - GET /rest/api/2/securitylevel/{id} - 按 ID 获取安全级别
jira.settings.baseurl.update - PUT /rest/api/2/settings/baseUrl - 更新 Jira 实例的基础 URL
jira.settings.columns.list - GET /rest/api/2/settings/columns - 获取 issue 导航器的默认系统列
jira.settings.columns.update - PUT /rest/api/2/settings/columns - 通过表单设置 issue 导航器默认系统列
jira.universal-avatar.universal-avatar.type.owner.create - POST /rest/api/2/universal_avatar/type/{type}/owner/{owningObjectId}/avatar - 由临时头像创建正式头像
jira.universal-avatar.universal-avatar.type.owner.delete - DELETE /rest/api/2/universal_avatar/type/{type}/owner/{owningObjectId}/avatar/{id} - 按 ID 删除头像
jira.universal-avatar.universal-avatar.type.owner.get - GET /rest/api/2/universal_avatar/type/{type}/owner/{owningObjectId} - 按类型与属主获取全部头像
jira.universal-avatar.universal-avatar.type.owner.temp.create - POST /rest/api/2/universal_avatar/type/{type}/owner/{owningObjectId}/temp - 通过 multipart 上传创建临时头像
jira.upgrade.create - POST /rest/api/2/upgrade - 运行待处理的升级任务
jira.upgrade.list - GET /rest/api/2/upgrade - 获取最近一次升级任务结果
jira.user.a11y.personal-settings.list - GET /rest/api/2/user/a11y/personal-settings - 获取可用的无障碍个人设置
jira.user.anonymization.create - POST /rest/api/2/user/anonymization - 调度用户匿名化
jira.user.anonymization.list - GET /rest/api/2/user/anonymization - 校验用户匿名化
jira.user.anonymization.progress.list - GET /rest/api/2/user/anonymization/progress - 获取用户匿名化进度
jira.user.anonymization.rerun.create - POST /rest/api/2/user/anonymization/rerun - 调度用户匿名化重跑
jira.user.anonymization.rerun.list - GET /rest/api/2/user/anonymization/rerun - 校验用户匿名化重跑
jira.user.anonymization.unlock.delete - DELETE /rest/api/2/user/anonymization/unlock - 删除过期的用户匿名化任务
jira.user.avatar.create - POST /rest/api/2/user/avatar - 由临时头像创建正式头像
jira.user.avatar.delete - DELETE /rest/api/2/user/avatar/{id} - 删除头像
jira.user.avatar.temporary.create - POST /rest/api/2/user/avatar/temporary - 通过 multipart 存储临时头像
jira.user.avatar.update - PUT /rest/api/2/user/avatar - 更新用户头像
jira.user.avatars.list - GET /rest/api/2/user/avatars - 获取用户的全部头像
jira.user.columns.delete - DELETE /rest/api/2/user/columns - 将默认列重置为系统默认
jira.user.columns.list - GET /rest/api/2/user/columns - 获取用户的默认列
jira.user.columns.update - PUT /rest/api/2/user/columns - 设置用户默认列
jira.user.list.list - GET /rest/api/2/user/list - 列出全部用户
jira.user.properties.delete - DELETE /rest/api/2/user/properties/{propertyKey} - 删除指定用户的属性
jira.user.properties.get - GET /rest/api/2/user/properties - 获取用户的全部属性键
jira.user.properties.get.propertykey - GET /rest/api/2/user/properties/{propertyKey} - 获取指定用户属性的值
jira.user.properties.update - PUT /rest/api/2/user/properties/{propertyKey} - 设置指定用户属性的值
jira.user.search.list - GET /rest/api/2/user/search - 按用户名查找用户
jira.user.session.delete - DELETE /rest/api/2/user/session/{username} - 删除用户会话
jira.workflow-scheme.workflowscheme.create - POST /rest/api/2/workflowscheme - 创建工作流方案
jira.workflow-scheme.workflowscheme.createdraft.create - POST /rest/api/2/workflowscheme/{id}/createdraft - 为工作流方案创建草稿
jira.workflow-scheme.workflowscheme.default.delete - DELETE /rest/api/2/workflowscheme/{id}/default - 移除方案的默认工作流
jira.workflow-scheme.workflowscheme.default.list - GET /rest/api/2/workflowscheme/{id}/default - 获取方案的默认工作流
jira.workflow-scheme.workflowscheme.default.update - PUT /rest/api/2/workflowscheme/{id}/default - 更新方案的默认工作流
jira.workflow-scheme.workflowscheme.delete - DELETE /rest/api/2/workflowscheme/{id} - 删除指定工作流方案
jira.workflow-scheme.workflowscheme.delete.id - DELETE /rest/api/2/workflowscheme/{id}/workflow - 从方案删除工作流映射
jira.workflow-scheme.workflowscheme.draft.default.delete - DELETE /rest/api/2/workflowscheme/{id}/draft/default - 移除草稿方案的默认工作流
jira.workflow-scheme.workflowscheme.draft.default.list - GET /rest/api/2/workflowscheme/{id}/draft/default - 获取草稿方案的默认工作流
jira.workflow-scheme.workflowscheme.draft.default.update - PUT /rest/api/2/workflowscheme/{id}/draft/default - 更新草稿方案的默认工作流
jira.workflow-scheme.workflowscheme.draft.delete - DELETE /rest/api/2/workflowscheme/{id}/draft - 删除指定工作流方案草稿
jira.workflow-scheme.workflowscheme.draft.delete.id - DELETE /rest/api/2/workflowscheme/{id}/draft/workflow - 从草稿方案删除工作流映射
jira.workflow-scheme.workflowscheme.draft.issuetype.delete - DELETE /rest/api/2/workflowscheme/{id}/draft/issuetype/{issueType} - 从草稿方案删除 issue 类型映射
jira.workflow-scheme.workflowscheme.draft.issuetype.get - GET /rest/api/2/workflowscheme/{id}/draft/issuetype/{issueType} - 获取草稿方案的 issue 类型映射
jira.workflow-scheme.workflowscheme.draft.issuetype.update - PUT /rest/api/2/workflowscheme/{id}/draft/issuetype/{issueType} - 设置草稿方案的 issue 类型映射
jira.workflow-scheme.workflowscheme.draft.list - GET /rest/api/2/workflowscheme/{id}/draft - 按 ID 获取指定工作流方案草稿
jira.workflow-scheme.workflowscheme.draft.list.id - GET /rest/api/2/workflowscheme/{id}/draft/workflow - 获取草稿工作流映射
jira.workflow-scheme.workflowscheme.draft.update - PUT /rest/api/2/workflowscheme/{id}/draft - 更新工作流方案草稿
jira.workflow-scheme.workflowscheme.draft.update.id - PUT /rest/api/2/workflowscheme/{id}/draft/workflow - 更新草稿方案中的工作流映射
jira.workflow-scheme.workflowscheme.get - GET /rest/api/2/workflowscheme/{id} - 按 ID 获取指定工作流方案
jira.workflow-scheme.workflowscheme.issuetype.delete - DELETE /rest/api/2/workflowscheme/{id}/issuetype/{issueType} - 从方案删除 issue 类型映射
jira.workflow-scheme.workflowscheme.issuetype.get - GET /rest/api/2/workflowscheme/{id}/issuetype/{issueType} - 获取方案的 issue 类型映射
jira.workflow-scheme.workflowscheme.issuetype.update - PUT /rest/api/2/workflowscheme/{id}/issuetype/{issueType} - 设置方案的 issue 类型映射
jira.workflow-scheme.workflowscheme.list - GET /rest/api/2/workflowscheme/{id}/workflow - 获取方案的工作流映射
jira.workflow-scheme.workflowscheme.update - PUT /rest/api/2/workflowscheme/{id} - 更新指定工作流方案
jira.workflow-scheme.workflowscheme.update.id - PUT /rest/api/2/workflowscheme/{id}/workflow - 更新方案中的工作流映射
jira.workflow.list - GET /rest/api/2/workflow - 获取全部工作流
jira.worklog.deleted.list - GET /rest/api/2/worklog/deleted - 返回指定时间以来删除的工作日志
jira.worklog.list.create - POST /rest/api/2/worklog/list - 返回指定 ID 的工作日志
jira.worklog.updated.list - GET /rest/api/2/worklog/updated - 返回指定时间以来更新的工作日志

# Confluence

## 暴露在聚合方法中

### read

confluence.attachments.metadata - GET /rest/api/content/{contentId}/child/attachment - 获取内容下的附件列表
confluence.child-content.get - GET /rest/api/content/{id}/child/{type} - 按类型获取内容的子内容
confluence.content-descendant.get - GET /rest/api/content/{id}/descendant/{type} - 按类型获取内容的后代
confluence.content-descendant.list - GET /rest/api/content/{id}/descendant - 获取内容的全部后代节点
confluence.content-resource.search.list - GET /rest/api/content/search - 使用 CQL 语句搜索内容
confluence.content.children.list - GET /rest/api/content/{contentId}/child - 获取内容的直接子内容
confluence.content.comments.list - GET /rest/api/content/{contentId}/child/comment - 获取内容下的评论列表
confluence.content.get - GET /rest/api/content/{contentId} - 按 ID 获取内容详细信息
confluence.content.history - GET /rest/api/content/{contentId}/history - 获取内容的完整编辑历史
confluence.content.labels.list - GET /rest/api/content/{contentId}/label - 获取内容的全部标签列表
confluence.content.list - GET /rest/api/content - 列出或用 CQL 搜索内容
confluence.content.versions.list - GET /rest/experimental/content/{id}/version - 获取内容的全部历史版本
confluence.search - GET /rest/api/search - 使用 CQL 执行内容搜索
confluence.server.info - GET /rest/applinks/1.0/manifest - 获取 Confluence 系统与版本信息
confluence.space-label.list - GET /rest/api/space/{spaceKey}/labels - 获取空间中的全部标签
confluence.space.content.get - GET /rest/api/space/{spaceKey}/content/{type} - 按类型获取空间中的内容
confluence.space.content.list - GET /rest/api/space/{spaceKey}/content - 获取空间中的全部内容
confluence.space.trash.list - GET /rest/api/space/{spaceKey}/trash - 获取空间回收站中的内容
confluence.spaces.get - GET /rest/api/space/{spaceKey} - 按空间键获取空间详情
confluence.spaces.list - GET /rest/api/space - 获取当前可见的空间列表
confluence.user.memberof.list - GET /rest/api/user/memberof - 获取用户所属的用户组
confluence.users.current - GET /rest/api/user/current - 获取当前登录用户信息

### safe

confluence.attachments.content.child.data.create - POST /rest/api/content/{id}/child/attachment/{attachmentId}/data - 上传附件的新二进制数据
confluence.attachments.content.child.move - POST /rest/api/content/{id}/child/attachment/{attachmentId}/move - 将附件移动到其他内容
confluence.attachments.content.child.update - PUT /rest/api/content/{id}/child/attachment/{attachmentId} - 更新附件的元数据信息
confluence.attachments.upload - POST /rest/api/content/{contentId}/child/attachment - 为指定内容上传新附件
confluence.content.create - POST /rest/api/content - 创建页面、博客等内容
confluence.content.labels.add - POST /rest/api/content/{contentId}/label - 为指定内容添加新标签
confluence.content.update - PUT /rest/api/content/{contentId} - 按 ID 更新指定内容信息
confluence.user.current.password.create - POST /rest/api/user/current/password - 修改当前登录用户的密码
confluence.user.current.update - PUT /rest/api/user/current - 更新当前登录用户的信息

### risky

confluence.attachments.content.child.delete - DELETE /rest/api/content/{id}/child/attachment/{attachmentId} - 删除内容下的指定附件
confluence.attachments.content.child.version.delete - DELETE /rest/api/content/{id}/child/attachment/{attachmentId}/version/{version} - 删除附件的指定历史版本
confluence.content-labels.delete - DELETE /rest/api/content/{id}/label/{label} - 按名称删除内容的标签
confluence.content-version.delete - DELETE /rest/api/content/{id}/version/{versionNumber} - 删除内容的指定历史版本
confluence.content.delete - DELETE /rest/api/content/{contentId} - 将内容移入回收站或彻底清除
confluence.content.labels.delete - DELETE /rest/api/content/{contentId}/label - 删除内容上的指定标签

### max

confluence.attachments.content.child.extractedtext.list - GET /rest/api/content/{id}/child/attachment/{attachmentId}/extractedtext - 获取附件中提取的文本
confluence.category.space.create - POST /rest/api/space/{spaceKey}/category/{labelName} - 为空间添加一个新的分类
confluence.category.space.delete - DELETE /rest/api/space/{spaceKey}/category/{categoryName} - 从空间中移除指定分类
confluence.content-property.create - POST /rest/api/content/{id}/property - 为指定内容创建新属性
confluence.content-property.create.id - POST /rest/api/content/{id}/property/{key} - 按指定键创建内容属性
confluence.content-property.delete - DELETE /rest/api/content/{id}/property/{key} - 按指定键删除内容属性
confluence.content-property.get - GET /rest/api/content/{id}/property/{key} - 按指定键获取内容属性
confluence.content-property.list - GET /rest/api/content/{id}/property - 获取内容上的全部属性
confluence.content-property.update - PUT /rest/api/content/{id}/property/{key} - 按指定键更新内容属性
confluence.content-resource.history.macro.id.get - GET /rest/api/content/{id}/history/{version}/macro/id/{macroId} - 按宏 ID 获取历史版本中的宏
confluence.content-resource.scan.list - GET /rest/api/content/scan - 按空间键扫描内容列表
confluence.content-restrictions.byoperation.get - GET /rest/api/content/{id}/restriction/byOperation/{operationKey} - 获取指定操作的内容限制
confluence.content-restrictions.relevantviewrestrictions.list - GET /rest/api/content/{id}/restriction/relevantViewRestrictions - 获取直接及继承的查看限制
confluence.content-watchers.list - GET /rest/api/content/{contentId}/watchers - 获取关注指定内容的用户
confluence.content.restrictions.list - GET /rest/api/content/{contentId}/restriction/byOperation - 按操作类型获取内容限制
confluence.content.restrictions.update - PUT /rest/api/content/{contentId}/restriction - 更新指定内容的访问限制
confluence.space-label.popular.list - GET /rest/api/space/{spaceKey}/labels/popular - 获取空间中的热门标签
confluence.space-label.recent.list - GET /rest/api/space/{spaceKey}/labels/recent - 获取空间最近使用的标签
confluence.space-label.related.list - GET /rest/api/space/{spaceKey}/labels/{labelName}/related - 获取与指定标签相关的标签
confluence.space-permissions.anonymous.grant - PUT /rest/api/space/{spaceKey}/permissions/anonymous/grant - 授予匿名用户空间权限
confluence.space-permissions.anonymous.list - GET /rest/api/space/{spaceKey}/permissions/anonymous - 获取匿名用户的空间权限
confluence.space-permissions.anonymous.revoke - PUT /rest/api/space/{spaceKey}/permissions/anonymous/revoke - 撤销匿名用户的空间权限
confluence.space-permissions.create - POST /rest/api/space/{spaceKey}/permissions - 批量为用户或组设置空间权限
confluence.space-permissions.group.get - GET /rest/api/space/{spaceKey}/permissions/group/{groupName} - 获取指定组的空间权限
confluence.space-permissions.group.grant - PUT /rest/api/space/{spaceKey}/permissions/group/{groupName}/grant - 授予指定组的空间权限
confluence.space-permissions.group.revoke - PUT /rest/api/space/{spaceKey}/permissions/group/{groupName}/revoke - 撤销指定组的空间权限
confluence.space-permissions.list - GET /rest/api/space/{spaceKey}/permissions - 获取空间的全部权限设置
confluence.space-permissions.user.get - GET /rest/api/space/{spaceKey}/permissions/user/{userKey} - 获取指定用户的空间权限
confluence.space-permissions.user.grant - PUT /rest/api/space/{spaceKey}/permissions/user/{userKey}/grant - 授予指定用户空间权限
confluence.space-permissions.user.revoke - PUT /rest/api/space/{spaceKey}/permissions/user/{userKey}/revoke - 撤销指定用户的空间权限
confluence.space-property.create - POST /rest/api/space/{spaceKey}/property - 为指定空间创建新属性
confluence.space-property.create.spacekey - POST /rest/api/space/{spaceKey}/property/{key} - 按指定键创建空间属性
confluence.space-property.delete - DELETE /rest/api/space/{spaceKey}/property/{key} - 按指定键删除空间属性
confluence.space-property.get - GET /rest/api/space/{spaceKey}/property/{key} - 按指定键获取空间属性
confluence.space-property.list - GET /rest/api/space/{spaceKey}/property - 获取空间上的全部属性
confluence.space-property.update - PUT /rest/api/space/{spaceKey}/property/{key} - 按指定键更新空间属性
confluence.space-watchers.list - GET /rest/api/space/{spaceKey}/watchers - 获取关注空间的用户列表
confluence.space.archive - PUT /rest/api/space/{spaceKey}/archive - 将指定空间置为归档状态
confluence.space.personal.create - POST /rest/api/space/personal - 为当前用户创建个人空间
confluence.space.private.create - POST /rest/api/space/_private - 创建一个新的私有空间
confluence.space.restore - PUT /rest/api/space/{spaceKey}/restore - 恢复此前已归档的空间
confluence.space.trash.delete - DELETE /rest/api/space/{spaceKey}/trash - 清空指定空间的回收站
confluence.spacecolorscheme.space.color-scheme.list - GET /rest/api/space/{spaceKey}/color-scheme - 获取空间当前的配色方案
confluence.spacecolorscheme.space.color-scheme.reset - PUT /rest/api/space/{spaceKey}/color-scheme/reset - 将空间配色方案重置为默认
confluence.spacecolorscheme.space.color-scheme.type.list - GET /rest/api/space/{spaceKey}/color-scheme/type - 获取空间配色方案的类型
confluence.spacecolorscheme.space.color-scheme.type.update - PUT /rest/api/space/{spaceKey}/color-scheme/type - 更新空间配色方案的类型
confluence.spacecolorscheme.space.color-scheme.update - PUT /rest/api/space/{spaceKey}/color-scheme - 更新指定空间的配色方案
confluence.spaces.create - POST /rest/api/space - 创建一个新的协作空间
confluence.spaces.delete - DELETE /rest/api/space/{spaceKey} - 永久删除指定的整个空间
confluence.spaces.update - PUT /rest/api/space/{spaceKey} - 更新指定空间的基本信息
confluence.user-watch.content.create - POST /rest/api/user/watch/content/{contentId} - 关注指定内容并接收通知
confluence.user-watch.content.delete - DELETE /rest/api/user/watch/content/{contentId} - 取消对指定内容的关注
confluence.user-watch.content.get - GET /rest/api/user/watch/content/{contentId} - 获取对内容的关注状态
confluence.user-watch.space.create - POST /rest/api/user/watch/space/{spaceKey} - 关注指定空间并接收通知
confluence.user-watch.space.delete - DELETE /rest/api/user/watch/space/{spaceKey} - 取消对指定空间的关注
confluence.user-watch.space.get - GET /rest/api/user/watch/space/{spaceKey} - 获取对空间的关注状态

## 完全不提供的功能

confluence.access-mode.accessmode.list - GET /rest/api/accessmode - 获取访问模式状态
confluence.admin-group.create - POST /rest/api/admin/group - 创建用户组
confluence.admin-group.delete - DELETE /rest/api/admin/group/{groupName} - 删除用户组
confluence.admin-space.personal.create - POST /rest/api/admin/space/personal/{username} - 为指定用户创建个人空间
confluence.admin-user.create - POST /rest/api/admin/user - 创建用户
confluence.admin-user.delete - DELETE /rest/api/admin/user/{username} - 删除用户
confluence.admin-user.disable - PUT /rest/api/admin/user/{username}/disable - 禁用用户
confluence.admin-user.enable - PUT /rest/api/admin/user/{username}/enable - 启用用户
confluence.admin-user.password.create - POST /rest/api/admin/user/{username}/password - 修改用户密码
confluence.admin-user.update - PUT /rest/api/admin/user/{username} - 更新用户
confluence.admin-users.list.active.list - GET /rest/api/admin/users/list/active - 获取活跃用户列表
confluence.backup-and-restore.backup-restore.files.list - GET /rest/api/backup-restore/restore/files - 获取恢复目录中的文件列表
confluence.backup-and-restore.backup-restore.jobs.cancel - PUT /rest/api/backup-restore/jobs/{jobId}/cancel - 取消任务
confluence.backup-and-restore.backup-restore.jobs.clear-queue.update - PUT /rest/api/backup-restore/jobs/clear-queue - 取消所有排队中的任务
confluence.backup-and-restore.backup-restore.jobs.download.list - GET /rest/api/backup-restore/jobs/{jobId}/download - 下载备份文件
confluence.backup-and-restore.backup-restore.jobs.get - GET /rest/api/backup-restore/jobs/{jobId} - 按 ID 获取任务详情
confluence.backup-and-restore.backup-restore.jobs.list - GET /rest/api/backup-restore/jobs - 按条件查询备份/恢复任务
confluence.backup-and-restore.backup-restore.site.create - POST /rest/api/backup-restore/backup/site - 创建站点备份任务
confluence.backup-and-restore.backup-restore.site.create-2 - POST /rest/api/backup-restore/restore/site - 创建站点恢复任务
confluence.backup-and-restore.backup-restore.site.upload.create - POST /rest/api/backup-restore/restore/site/upload - 以上传备份文件方式创建站点恢复任务
confluence.backup-and-restore.backup-restore.space.create - POST /rest/api/backup-restore/backup/space - 创建空间备份任务
confluence.backup-and-restore.backup-restore.space.create-2 - POST /rest/api/backup-restore/restore/space - 创建空间恢复任务
confluence.backup-and-restore.backup-restore.space.upload.create - POST /rest/api/backup-restore/restore/space/upload - 以上传备份文件方式创建空间恢复任务
confluence.cluster-information.nodes.list - GET /rest/api/cluster/nodes - 获取集群节点状态
confluence.content-blueprint.instance.create - POST /rest/api/content/blueprint/instance/{draftId} - 发布旧版（legacy）草稿
confluence.content-blueprint.instance.update - PUT /rest/api/content/blueprint/instance/{draftId} - 发布共享草稿
confluence.content-body.contentbody.convert.create - POST /rest/api/contentbody/convert/{to} - 转换内容正文格式（representation）
confluence.global-permissions.anonymous.grant - PUT /rest/api/permissions/anonymous/grant - 授予匿名用户全局权限
confluence.global-permissions.anonymous.list - GET /rest/api/permissions/anonymous - 获取匿名用户的全局权限
confluence.global-permissions.anonymous.revoke - PUT /rest/api/permissions/anonymous/revoke - 撤销匿名用户全局权限
confluence.global-permissions.group.get - GET /rest/api/permissions/group/{groupName} - 获取组的全局权限
confluence.global-permissions.group.grant - PUT /rest/api/permissions/group/{groupName}/grant - 授予组全局权限
confluence.global-permissions.group.revoke - PUT /rest/api/permissions/group/{groupName}/revoke - 撤销组全局权限
confluence.global-permissions.list - GET /rest/api/permissions - 获取全局权限
confluence.global-permissions.unlicensed.grant - PUT /rest/api/permissions/unlicensed/grant - 授予未许可用户全局权限
confluence.global-permissions.unlicensed.list - GET /rest/api/permissions/unlicensed - 获取未许可用户的全局权限
confluence.global-permissions.unlicensed.revoke - PUT /rest/api/permissions/unlicensed/revoke - 撤销未许可用户全局权限
confluence.global-permissions.update - PUT /rest/api/permissions - 为多个用户/组设置全局权限
confluence.global-permissions.user.get - GET /rest/api/permissions/user/{user} - 获取用户的全局权限
confluence.global-permissions.user.grant - PUT /rest/api/permissions/user/{user}/grant - 授予用户全局权限
confluence.global-permissions.user.revoke - PUT /rest/api/permissions/user/{user}/revoke - 撤销用户全局权限
confluence.globalcolorscheme.color-scheme.default.list - GET /rest/api/color-scheme/default - 获取默认全局配色方案
confluence.globalcolorscheme.color-scheme.list - GET /rest/api/color-scheme - 获取全局配色方案
confluence.globalcolorscheme.color-scheme.reset - PUT /rest/api/color-scheme/reset - 重置全局配色方案
confluence.globalcolorscheme.color-scheme.update - PUT /rest/api/color-scheme - 设置全局配色方案
confluence.group.get - GET /rest/api/group/{groupName} - 按名称获取组
confluence.group.groupancestor.list - GET /rest/api/group/groupancestor - 获取组的上级组
confluence.group.groupancestor.list.groupname - GET /rest/api/group/{groupName}/groupancestor - 获取指定组的上级组
confluence.group.groupmember.list - GET /rest/api/group/groupmember - 获取组的成员组
confluence.group.groupmember.list.groupname - GET /rest/api/group/{groupName}/groupmember - 获取指定组的成员组
confluence.group.groupparent.list - GET /rest/api/group/groupparent - 获取组的父组
confluence.group.groupparent.list.groupname - GET /rest/api/group/{groupName}/groupparent - 获取指定组的父组
confluence.group.info.get - GET /rest/api/group/info - 按名称获取组信息
confluence.group.list - GET /rest/api/group - 获取用户组列表
confluence.group.member.list - GET /rest/api/group/member - 获取组的成员用户
confluence.group.member.list.groupname - GET /rest/api/group/{groupName}/member - 获取指定组的成员用户
confluence.index-management.reindex - POST /rest/api/index/reindex - 重建 Confluence 搜索索引
confluence.index-management.reindex.list - GET /rest/api/index/reindex - 获取重建索引状态
confluence.index-management.resetjob.update - PUT /rest/api/index/resetjob - 重置重建索引任务状态
confluence.index-management.unindex.create - POST /rest/api/index/unindex - 从搜索索引中移除全部内容
confluence.instance-metrics.instance-metrics.list - GET /rest/api/instance-metrics - 获取实例指标
confluence.label.list - GET /rest/api/label/labels - 按名称/命名空间/空间/所有者查询标签
confluence.label.popular.list - GET /rest/api/label/popular - 获取热门标签
confluence.label.recent.list - GET /rest/api/label/recent - 获取最近使用的标签
confluence.label.related.list - GET /rest/api/label/{labelName}/related - 获取相关标签
confluence.long-task.longtask.get - GET /rest/api/longtask/{id} - 按 ID 获取长任务
confluence.long-task.longtask.list - GET /rest/api/longtask - 获取长任务列表
confluence.server-information.server-information.list - GET /rest/api/server-information - 获取服务器信息
confluence.user-group.delete - DELETE /rest/api/user/{username}/group/{groupName} - 将用户从组中移除
confluence.user-group.update - PUT /rest/api/user/{username}/group/{groupName} - 将用户加入组
confluence.user.anonymous.list - GET /rest/api/user/anonymous - 获取匿名用户信息
confluence.user.list - GET /rest/api/user - 获取用户
confluence.user.list.list - GET /rest/api/user/list - 获取注册用户列表
confluence.user.settings.update - PUT /rest/api/user/settings - 更新用户偏好设置
confluence.webhooks.create - POST /rest/api/webhooks - 创建 Webhook
confluence.webhooks.delete - DELETE /rest/api/webhooks/{webhookId} - 删除 Webhook
confluence.webhooks.get - GET /rest/api/webhooks/{webhookId} - 获取 Webhook
confluence.webhooks.latest.list - GET /rest/api/webhooks/{webhookId}/latest - 获取 Webhook 最近调用记录
confluence.webhooks.list - GET /rest/api/webhooks - 查询 Webhook
confluence.webhooks.statistics.list - GET /rest/api/webhooks/{webhookId}/statistics - 获取 Webhook 统计信息
confluence.webhooks.statistics.summary.get - GET /rest/api/webhooks/{webhookId}/statistics/summary - 获取 Webhook 统计摘要
confluence.webhooks.test.create - POST /rest/api/webhooks/test - 测试 Webhook
confluence.webhooks.update - PUT /rest/api/webhooks/{webhookId} - 更新 Webhook

# Bitbucket

## 暴露在聚合方法中

### read

bitbucket.branch-permissions.projects.repos.restrictions.get - GET /rest/branch-permissions/latest/projects/{projectKey}/repos/{repositorySlug}/restrictions/{id} - 按 ID 获取仓库引用限制
bitbucket.branch-permissions.projects.repos.restrictions.list - GET /rest/branch-permissions/latest/projects/{projectKey}/repos/{repositorySlug}/restrictions - 搜索仓库级别的引用限制
bitbucket.branches.list - GET /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/branches - 获取仓库的全部分支列表
bitbucket.commits.get - GET /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId} - 按 ID 获取提交详细信息
bitbucket.commits.list - GET /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/commits - 获取仓库的提交记录列表
bitbucket.default-tasks.projects.repos.tasks.list - GET /rest/default-tasks/latest/projects/{projectKey}/repos/{repositorySlug}/tasks - 分页获取仓库的默认任务
bitbucket.files.browse - GET /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/browse/{filePath} - 浏览仓库中的文件和目录
bitbucket.files.raw - GET /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/raw/{filePath} - 获取文件元数据（不含二进制内容）
bitbucket.project.repos.default-branch.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/default-branch - 获取仓库当前的默认分支
bitbucket.project.repos.forks.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/forks - 获取仓库的全部派生列表
bitbucket.project.repos.readme.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/readme - 获取仓库的 README 内容
bitbucket.project.repos.related.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/related - 获取与仓库相关的仓库列表
bitbucket.project.settings.auto-decline.list - GET /rest/api/latest/projects/{projectKey}/settings/auto-decline - 获取项目自动拒绝设置
bitbucket.project.settings.auto-merge.list - GET /rest/api/latest/projects/{projectKey}/settings/auto-merge - 获取项目拉取请求自动合并设置
bitbucket.project.settings.pull-requests.get - GET /rest/api/latest/projects/{projectKey}/settings/pull-requests/{scmId} - 获取项目拉取请求的合并策略
bitbucket.projects.get - GET /rest/api/1.0/projects/{projectKey} - 按项目键获取项目详情
bitbucket.projects.list - GET /rest/api/1.0/projects - 获取当前可见的项目列表
bitbucket.pull-requests.projects.repos.commits.pull-requests.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/pull-requests - 获取包含指定提交的拉取请求
bitbucket.pull-requests.projects.repos.participants.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/participants - 搜索拉取请求的参与者
bitbucket.pull-requests.projects.repos.pull-requests.auto-merge.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/auto-merge - 获取拉取请求的自动合并请求
bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/blocker-comments/{commentId} - 获取拉取请求阻塞性评论
bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/blocker-comments - 搜索拉取请求的阻塞性评论
bitbucket.pull-requests.projects.repos.pull-requests.changes.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/changes - 获取拉取请求的变更列表
bitbucket.pull-requests.projects.repos.pull-requests.comments.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId} - 按 ID 获取拉取请求评论
bitbucket.pull-requests.projects.repos.pull-requests.comments.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments - 获取指定路径的拉取请求评论
bitbucket.pull-requests.projects.repos.pull-requests.commit-message-suggestion.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/commit-message-suggestion - 获取合并提交信息建议
bitbucket.pull-requests.projects.repos.pull-requests.commits.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/commits - 获取拉取请求的提交列表
bitbucket.pull-requests.projects.repos.pull-requests.diff-stats-summary.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/diff-stats-summary/{path} - 获取拉取请求的 diff 统计摘要
bitbucket.pull-requests.projects.repos.pull-requests.diff.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/diff/{path} - 流式获取拉取请求的 diff
bitbucket.pull-requests.projects.repos.pull-requests.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}.patch - 流式获取拉取请求的 patch
bitbucket.pull-requests.projects.repos.pull-requests.merge-base.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/merge-base - 获取源与目标分支的共同祖先
bitbucket.pull-requests.projects.repos.pull-requests.merge.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/merge - 检查拉取请求是否可合并
bitbucket.pull-requests.projects.repos.pull-requests.participants.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/participants - 获取拉取请求的参与者
bitbucket.pull-requests.projects.repos.pull-requests.review.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/review - 获取拉取请求的评论线程
bitbucket.pull-requests.projects.repos.settings.reviewer-groups.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/reviewer-groups/{id} - 按 ID 获取仓库评审者组
bitbucket.pull-requests.projects.repos.settings.reviewer-groups.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/reviewer-groups - 获取仓库的全部评审者组
bitbucket.pull-requests.projects.repos.settings.reviewer-groups.users.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/reviewer-groups/{id}/users - 获取评审者组中的用户
bitbucket.pull-requests.projects.settings.reviewer-groups.get - GET /rest/api/latest/projects/{projectKey}/settings/reviewer-groups/{id} - 按 ID 获取项目评审者组
bitbucket.pull-requests.projects.settings.reviewer-groups.list - GET /rest/api/latest/projects/{projectKey}/settings/reviewer-groups - 获取项目的全部评审者组
bitbucket.pullrequests.activities - GET /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/activities - 获取拉取请求的活动列表
bitbucket.pullrequests.diff - GET /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}.diff - 获取拉取请求的 diff 元数据
bitbucket.pullrequests.get - GET /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId} - 按 ID 获取拉取请求详情
bitbucket.pullrequests.list - GET /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests - 获取仓库的拉取请求列表
bitbucket.repositories.get - GET /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug} - 获取指定仓库的详细信息
bitbucket.repositories.list - GET /rest/api/1.0/projects/{projectKey}/repos - 获取项目中的仓库列表
bitbucket.repository.projects.repos.archive.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/archive - 流式下载仓库归档文件
bitbucket.repository.projects.repos.browse.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/browse - 获取指定版本的文件内容
bitbucket.repository.projects.repos.changes.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/changes - 获取两次提交间的变更
bitbucket.repository.projects.repos.commits.changes.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/changes - 获取指定提交中的变更
bitbucket.repository.projects.repos.commits.comments.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/comments/{commentId} - 获取指定提交上的评论
bitbucket.repository.projects.repos.commits.comments.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/comments - 搜索指定提交上的评论
bitbucket.repository.projects.repos.commits.diff-stats-summary.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/diff-stats-summary/{path} - 获取版本间的 diff 统计摘要
bitbucket.repository.projects.repos.commits.diff.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/diff/{path} - 获取版本间的 diff 内容
bitbucket.repository.projects.repos.commits.merge-base.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/merge-base - 获取两个提交的共同祖先
bitbucket.repository.projects.repos.compare.changes.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/compare/changes - 比较两个提交间的变更
bitbucket.repository.projects.repos.compare.commits.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/compare/commits - 比较范围内的提交列表
bitbucket.repository.projects.repos.compare.diff-path.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/compare/diff{path} - 获取提交间的 diff 内容
bitbucket.repository.projects.repos.compare.diff-stats-summary-path.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/compare/diff-stats-summary{path} - 获取提交间的 diff 统计摘要
bitbucket.repository.projects.repos.diff.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/diff/{path} - 获取指定路径的原始 diff
bitbucket.repository.projects.repos.files.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/files/{path} - 获取指定路径下的文件
bitbucket.repository.projects.repos.files.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/files - 获取仓库目录中的文件
bitbucket.repository.projects.repos.labels.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/labels - 获取仓库的全部标签列表
bitbucket.repository.projects.repos.last-modified.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/last-modified/{path} - 获取路径下文件的最后修改提交
bitbucket.repository.projects.repos.last-modified.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/last-modified - 流式获取文件的最后修改提交
bitbucket.repository.projects.repos.patch.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/patch - 获取指定版本的 patch 内容
bitbucket.repository.projects.repos.ref-change-activities.branches.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/ref-change-activities/branches - 获取有引用变更活动的分支
bitbucket.repository.projects.repos.ref-change-activities.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/ref-change-activities - 获取仓库的引用变更活动
bitbucket.repository.projects.repos.settings.auto-decline.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/auto-decline - 获取仓库自动拒绝设置
bitbucket.repository.projects.repos.settings.auto-merge.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/auto-merge - 获取仓库拉取请求自动合并设置
bitbucket.repository.projects.repos.settings.change-author.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/change-author - 获取仓库拉取请求变更作者设置
bitbucket.repository.projects.repos.settings.hooks.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/hooks/{hookKey} - 按键获取指定仓库钩子
bitbucket.repository.projects.repos.settings.hooks.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/hooks - 获取仓库配置的钩子列表
bitbucket.repository.projects.repos.settings.hooks.settings.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/hooks/{hookKey}/settings - 获取仓库指定钩子的设置
bitbucket.repository.projects.repos.settings.pull-requests.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/pull-requests - 获取仓库的拉取请求设置
bitbucket.repository.projects.repos.tags.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/tags/{name} - 按名称获取仓库的标签
bitbucket.repository.projects.repos.tags.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/tags - 按条件查找仓库的标签
bitbucket.server.info - GET /rest/api/1.0/application-properties - 获取 Bitbucket 版本与应用属性

### safe

bitbucket.projects.create - POST /rest/api/1.0/projects - 创建一个新的 Bitbucket 项目
bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/blocker-comments - 添加拉取请求阻塞性评论
bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/blocker-comments/{commentId} - 更新拉取请求阻塞性评论
bitbucket.pull-requests.projects.repos.pull-requests.participants.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/participants - 指派拉取请求参与者角色
bitbucket.pull-requests.projects.repos.pull-requests.participants.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/participants/{userSlug} - 变更拉取请求的参与状态
bitbucket.pull-requests.projects.repos.pull-requests.review.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/review - 提交并完成拉取请求评审
bitbucket.pullrequests.approve - POST /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/approve - 审查并批准指定的拉取请求
bitbucket.pullrequests.comments.add - POST /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments - 为拉取请求添加新评论
bitbucket.pullrequests.comments.update - PUT /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId} - 更新指定的拉取请求评论
bitbucket.pullrequests.create - POST /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests - 创建一个新的拉取请求
bitbucket.pullrequests.decline - POST /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/decline - 拒绝合并指定的拉取请求
bitbucket.pullrequests.merge - POST /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/merge - 执行合并指定的拉取请求
bitbucket.pullrequests.reopen - POST /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/reopen - 重新打开已拒绝的拉取请求
bitbucket.pullrequests.unapprove - DELETE /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/approve - 撤销对拉取请求的批准
bitbucket.pullrequests.update - PUT /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId} - 更新指定拉取请求的信息
bitbucket.repository.projects.repos.branches.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/branches - 在指定仓库中创建新分支
bitbucket.repository.projects.repos.browse.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/browse/{path} - 在线编辑仓库中的文件
bitbucket.repository.projects.repos.commits.comments.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/comments/{commentId} - 更新指定提交上的评论
bitbucket.repository.projects.repos.commits.watch - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/watch - 关注仓库中指定的提交
bitbucket.repository.projects.repos.labels.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/labels - 为指定仓库添加新标签
bitbucket.repository.projects.repos.tags.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/tags - 在指定仓库中创建标签

### risky

bitbucket.pull-requests.projects.repos.pull-requests.auto-merge.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/auto-merge - 设置拉取请求自动合并
bitbucket.pull-requests.projects.repos.pull-requests.auto-merge.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/auto-merge - 取消拉取请求的自动合并
bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/blocker-comments/{commentId} - 删除拉取请求阻塞性评论
bitbucket.pull-requests.projects.repos.pull-requests.comments.apply-suggestion.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId}/apply-suggestion - 应用评论中的代码建议
bitbucket.pull-requests.projects.repos.pull-requests.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId} - 永久删除指定的拉取请求
bitbucket.pull-requests.projects.repos.pull-requests.participants.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/participants/{userSlug} - 取消拉取请求参与者指派
bitbucket.pull-requests.projects.repos.pull-requests.review.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/review - 放弃对拉取请求的评审
bitbucket.pullrequests.comments.delete - DELETE /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId} - 删除指定的拉取请求评论
bitbucket.repository.projects.repos.commits.comments.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/comments/{commentId} - 删除指定提交上的评论
bitbucket.repository.projects.repos.labels.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/labels/{labelName} - 从仓库移除指定的标签

### max

bitbucket.access-tokens.projects.create - PUT /rest/access-tokens/latest/projects/{projectKey} - 创建项目 HTTP 访问令牌
bitbucket.access-tokens.projects.delete - DELETE /rest/access-tokens/latest/projects/{projectKey}/{tokenId} - 删除项目的 HTTP 访问令牌
bitbucket.access-tokens.projects.get - GET /rest/access-tokens/latest/projects/{projectKey} - 获取项目的 HTTP 访问令牌
bitbucket.access-tokens.projects.get.projectkey - GET /rest/access-tokens/latest/projects/{projectKey}/{tokenId} - 按 ID 获取项目访问令牌
bitbucket.access-tokens.projects.repos.create - PUT /rest/access-tokens/latest/projects/{projectKey}/repos/{repositorySlug} - 创建仓库 HTTP 访问令牌
bitbucket.access-tokens.projects.repos.delete - DELETE /rest/access-tokens/latest/projects/{projectKey}/repos/{repositorySlug}/{tokenId} - 删除仓库的 HTTP 访问令牌
bitbucket.access-tokens.projects.repos.get - GET /rest/access-tokens/latest/projects/{projectKey}/repos/{repositorySlug} - 获取仓库的 HTTP 访问令牌
bitbucket.access-tokens.projects.repos.get.projectkey - GET /rest/access-tokens/latest/projects/{projectKey}/repos/{repositorySlug}/{tokenId} - 按 ID 获取仓库访问令牌
bitbucket.access-tokens.projects.repos.update - POST /rest/access-tokens/latest/projects/{projectKey}/repos/{repositorySlug}/{tokenId} - 按 ID 更新仓库访问令牌
bitbucket.access-tokens.projects.update - POST /rest/access-tokens/latest/projects/{projectKey}/{tokenId} - 按 ID 更新项目访问令牌
bitbucket.branch-permissions.projects.repos.restrictions.create - POST /rest/branch-permissions/latest/projects/{projectKey}/repos/{repositorySlug}/restrictions - 批量创建仓库引用限制
bitbucket.branch-permissions.projects.repos.restrictions.delete - DELETE /rest/branch-permissions/latest/projects/{projectKey}/repos/{repositorySlug}/restrictions/{id} - 按 ID 删除仓库引用限制
bitbucket.branch-permissions.restrictions.create - POST /rest/branch-permissions/latest/projects/{projectKey}/restrictions - 批量创建项目引用限制
bitbucket.branch-permissions.restrictions.delete - DELETE /rest/branch-permissions/latest/projects/{projectKey}/restrictions/{id} - 按 ID 删除项目引用限制
bitbucket.branch-permissions.restrictions.get - GET /rest/branch-permissions/latest/projects/{projectKey}/restrictions/{id} - 按 ID 获取项目引用限制
bitbucket.branch-permissions.restrictions.list - GET /rest/branch-permissions/latest/projects/{projectKey}/restrictions - 搜索项目级别的引用限制
bitbucket.builds-and-deployments.projects.repos.commits.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/builds - 为指定提交存储构建状态
bitbucket.builds-and-deployments.projects.repos.commits.create.projectkey - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/deployments - 创建或更新提交的部署记录
bitbucket.builds-and-deployments.projects.repos.commits.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/builds - 删除提交的指定构建状态
bitbucket.builds-and-deployments.projects.repos.commits.delete.projectkey - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/deployments - 删除提交关联的部署记录
bitbucket.builds-and-deployments.projects.repos.commits.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/builds - 获取提交的构建状态列表
bitbucket.builds-and-deployments.projects.repos.commits.list.projectkey - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/deployments - 获取提交关联的部署记录
bitbucket.default-tasks.projects.repos.tasks.create - POST /rest/default-tasks/latest/projects/{projectKey}/repos/{repositorySlug}/tasks - 为仓库添加新的默认任务
bitbucket.default-tasks.projects.repos.tasks.delete - DELETE /rest/default-tasks/latest/projects/{projectKey}/repos/{repositorySlug}/tasks - 删除仓库的全部默认任务
bitbucket.default-tasks.projects.repos.tasks.delete.projectkey - DELETE /rest/default-tasks/latest/projects/{projectKey}/repos/{repositorySlug}/tasks/{taskId} - 删除仓库的指定默认任务
bitbucket.default-tasks.projects.repos.tasks.update - PUT /rest/default-tasks/latest/projects/{projectKey}/repos/{repositorySlug}/tasks/{taskId} - 更新仓库的指定默认任务
bitbucket.default-tasks.tasks.create - POST /rest/default-tasks/latest/projects/{projectKey}/tasks - 为项目添加新的默认任务
bitbucket.default-tasks.tasks.delete - DELETE /rest/default-tasks/latest/projects/{projectKey}/tasks - 删除项目的全部默认任务
bitbucket.default-tasks.tasks.delete.projectkey - DELETE /rest/default-tasks/latest/projects/{projectKey}/tasks/{taskId} - 删除项目的指定默认任务
bitbucket.default-tasks.tasks.list - GET /rest/default-tasks/latest/projects/{projectKey}/tasks - 分页获取项目的默认任务
bitbucket.default-tasks.tasks.update - PUT /rest/default-tasks/latest/projects/{projectKey}/tasks/{taskId} - 更新项目的指定默认任务
bitbucket.permission-management.projects.repos.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions - 撤销所有用户和组的仓库权限
bitbucket.permission-management.projects.repos.groups.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/groups - 撤销指定组的仓库权限
bitbucket.permission-management.projects.repos.groups.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/groups - 获取拥有仓库权限的组
bitbucket.permission-management.projects.repos.groups.none.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/groups/none - 获取没有仓库权限的组
bitbucket.permission-management.projects.repos.groups.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/groups - 更新指定组的仓库权限
bitbucket.permission-management.projects.repos.search.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/search - 搜索仓库权限的授予情况
bitbucket.permission-management.projects.repos.users.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/users - 撤销指定用户的仓库权限
bitbucket.permission-management.projects.repos.users.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/users - 获取拥有仓库权限的用户
bitbucket.permission-management.projects.repos.users.none.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/users/none - 获取无仓库权限的用户
bitbucket.permission-management.projects.repos.users.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/permissions/users - 更新指定用户的仓库权限
bitbucket.permissions.users - GET /rest/api/1.0/projects/{projectKey}/permissions/users - 获取拥有项目权限的用户
bitbucket.project.avatar-png.create - POST /rest/api/latest/projects/{projectKey}/avatar.png - 上传图片并更新项目头像
bitbucket.project.avatar-png.list - GET /rest/api/latest/projects/{projectKey}/avatar.png - 获取项目头像 PNG 图片
bitbucket.project.permissions.all.create - POST /rest/api/latest/projects/{projectKey}/permissions/{permission}/all - 授予全体用户指定项目权限
bitbucket.project.permissions.all.list - GET /rest/api/latest/projects/{projectKey}/permissions/{permission}/all - 检查项目的默认权限设置
bitbucket.project.permissions.delete - DELETE /rest/api/latest/projects/{projectKey}/permissions - 撤销所有用户和组的项目权限
bitbucket.project.permissions.groups.delete - DELETE /rest/api/latest/projects/{projectKey}/permissions/groups - 撤销指定组的项目权限
bitbucket.project.permissions.groups.list - GET /rest/api/latest/projects/{projectKey}/permissions/groups - 获取拥有项目权限的组
bitbucket.project.permissions.groups.none.list - GET /rest/api/latest/projects/{projectKey}/permissions/groups/none - 获取没有项目权限的组
bitbucket.project.permissions.groups.update - PUT /rest/api/latest/projects/{projectKey}/permissions/groups - 更新指定组的项目权限
bitbucket.project.permissions.search.list - GET /rest/api/latest/projects/{projectKey}/permissions/search - 搜索项目权限的授予情况
bitbucket.project.permissions.users.delete - DELETE /rest/api/latest/projects/{projectKey}/permissions/users - 撤销指定用户的项目权限
bitbucket.project.permissions.users.none.list - GET /rest/api/latest/projects/{projectKey}/permissions/users/none - 获取无项目权限的用户
bitbucket.project.permissions.users.update - PUT /rest/api/latest/projects/{projectKey}/permissions/users - 更新指定用户的项目权限
bitbucket.project.repos.contributing.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/contributing - 获取仓库的贡献指南内容
bitbucket.project.repos.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug} - 派生（fork）指定仓库
bitbucket.project.repos.default-branch.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/default-branch - 更新仓库的默认分支设置
bitbucket.project.repos.recreate.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/recreate - 重试此前失败的仓库创建
bitbucket.project.settings-restriction.all.list - GET /rest/api/latest/projects/{projectKey}/settings-restriction/all - 获取全部强制执行中的项目设置
bitbucket.project.settings-restriction.create - POST /rest/api/latest/projects/{projectKey}/settings-restriction - 强制执行项目设置限制
bitbucket.project.settings-restriction.delete - DELETE /rest/api/latest/projects/{projectKey}/settings-restriction - 停止强制执行项目设置限制
bitbucket.project.settings-restriction.list - GET /rest/api/latest/projects/{projectKey}/settings-restriction - 获取强制执行中的项目设置限制
bitbucket.project.settings.auto-decline.delete - DELETE /rest/api/latest/projects/{projectKey}/settings/auto-decline - 删除项目拉取请求自动拒绝设置
bitbucket.project.settings.auto-decline.update - PUT /rest/api/latest/projects/{projectKey}/settings/auto-decline - 创建或更新自动拒绝设置
bitbucket.project.settings.auto-merge.delete - DELETE /rest/api/latest/projects/{projectKey}/settings/auto-merge - 删除项目拉取请求自动合并设置
bitbucket.project.settings.auto-merge.update - PUT /rest/api/latest/projects/{projectKey}/settings/auto-merge - 创建或更新自动合并设置
bitbucket.project.settings.change-author.delete - DELETE /rest/api/latest/projects/{projectKey}/settings/change-author - 删除项目拉取请求变更作者设置
bitbucket.project.settings.change-author.list - GET /rest/api/latest/projects/{projectKey}/settings/change-author - 获取项目拉取请求变更作者设置
bitbucket.project.settings.change-author.update - PUT /rest/api/latest/projects/{projectKey}/settings/change-author - 创建或更新变更作者设置
bitbucket.project.settings.hooks.enabled.delete - DELETE /rest/api/latest/projects/{projectKey}/settings/hooks/{hookKey}/enabled - 禁用项目下指定的仓库钩子
bitbucket.project.settings.hooks.enabled.update - PUT /rest/api/latest/projects/{projectKey}/settings/hooks/{hookKey}/enabled - 启用项目下指定的仓库钩子
bitbucket.project.settings.hooks.get - GET /rest/api/latest/projects/{projectKey}/settings/hooks/{hookKey} - 按键获取项目仓库钩子
bitbucket.project.settings.hooks.list - GET /rest/api/latest/projects/{projectKey}/settings/hooks - 获取项目的仓库钩子列表
bitbucket.project.settings.hooks.settings.get - GET /rest/api/latest/projects/{projectKey}/settings/hooks/{hookKey}/settings - 获取指定仓库钩子的设置
bitbucket.project.settings.hooks.settings.update - PUT /rest/api/latest/projects/{projectKey}/settings/hooks/{hookKey}/settings - 更新指定仓库钩子的设置
bitbucket.project.settings.pull-requests.create - POST /rest/api/latest/projects/{projectKey}/settings/pull-requests/{scmId} - 更新项目拉取请求的合并策略
bitbucket.project.webhooks.create - POST /rest/api/latest/projects/{projectKey}/webhooks - 创建项目 webhook
bitbucket.project.webhooks.delete - DELETE /rest/api/latest/projects/{projectKey}/webhooks/{webhookId} - 删除项目 webhook
bitbucket.project.webhooks.get - GET /rest/api/latest/projects/{projectKey}/webhooks/{webhookId} - 按 ID 获取项目 webhook
bitbucket.project.webhooks.latest.list - GET /rest/api/latest/projects/{projectKey}/webhooks/{webhookId}/latest - 获取最近一次 webhook 调用详情
bitbucket.project.webhooks.list - GET /rest/api/latest/projects/{projectKey}/webhooks - 获取项目的 webhook 列表
bitbucket.project.webhooks.statistics.list - GET /rest/api/latest/projects/{projectKey}/webhooks/{webhookId}/statistics - 获取 webhook 的统计数据
bitbucket.project.webhooks.statistics.summary.get - GET /rest/api/latest/projects/{projectKey}/webhooks/{webhookId}/statistics/summary - 获取 webhook 统计摘要
bitbucket.project.webhooks.test.create - POST /rest/api/latest/projects/{projectKey}/webhooks/test - 发送项目 webhook 测试
bitbucket.project.webhooks.update - PUT /rest/api/latest/projects/{projectKey}/webhooks/{webhookId} - 更新项目 webhook
bitbucket.projects.delete - DELETE /rest/api/1.0/projects/{projectKey} - 按键永久删除指定项目
bitbucket.projects.update - PUT /rest/api/1.0/projects/{projectKey} - 更新指定项目的基本信息
bitbucket.pull-requests.projects.repos.pull-requests.watch - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/watch - 关注指定的拉取请求动态
bitbucket.pull-requests.projects.repos.pull-requests.watch.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/watch - 停止关注指定的拉取请求
bitbucket.pull-requests.projects.repos.settings.reviewer-groups.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/reviewer-groups - 创建新的仓库评审者组
bitbucket.pull-requests.projects.repos.settings.reviewer-groups.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/reviewer-groups/{id} - 删除指定的仓库评审者组
bitbucket.pull-requests.projects.repos.settings.reviewer-groups.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/reviewer-groups/{id} - 更新仓库评审者组的属性
bitbucket.pull-requests.projects.settings.reviewer-groups.create - POST /rest/api/latest/projects/{projectKey}/settings/reviewer-groups - 创建新的项目评审者组
bitbucket.pull-requests.projects.settings.reviewer-groups.delete - DELETE /rest/api/latest/projects/{projectKey}/settings/reviewer-groups/{id} - 删除指定的项目评审者组
bitbucket.pull-requests.projects.settings.reviewer-groups.update - PUT /rest/api/latest/projects/{projectKey}/settings/reviewer-groups/{id} - 更新项目评审者组的属性
bitbucket.repositories.create - POST /rest/api/1.0/projects/{projectKey}/repos - 在指定项目中创建新仓库
bitbucket.repositories.delete - DELETE /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug} - 删除项目中指定的仓库
bitbucket.repositories.update - PUT /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug} - 更新指定仓库的设置信息
bitbucket.repository.projects.repos.commits.watch.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/watch - 停止关注仓库中的提交
bitbucket.repository.projects.repos.settings.auto-decline.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/auto-decline - 删除仓库拉取请求自动拒绝设置
bitbucket.repository.projects.repos.settings.auto-decline.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/auto-decline - 创建仓库自动拒绝设置
bitbucket.repository.projects.repos.settings.auto-merge.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/auto-merge - 删除仓库拉取请求自动合并设置
bitbucket.repository.projects.repos.settings.auto-merge.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/auto-merge - 创建或更新仓库自动合并设置
bitbucket.repository.projects.repos.settings.change-author.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/change-author - 删除仓库拉取请求变更作者设置
bitbucket.repository.projects.repos.settings.change-author.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/change-author - 创建或更新仓库变更作者设置
bitbucket.repository.projects.repos.settings.hooks.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/hooks/{hookKey} - 删除仓库中指定的钩子
bitbucket.repository.projects.repos.settings.hooks.enabled.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/hooks/{hookKey}/enabled - 禁用仓库中指定的钩子
bitbucket.repository.projects.repos.settings.hooks.enabled.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/hooks/{hookKey}/enabled - 启用仓库中指定的钩子
bitbucket.repository.projects.repos.settings.hooks.settings.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/hooks/{hookKey}/settings - 更新仓库指定钩子的设置
bitbucket.repository.projects.repos.settings.pull-requests.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/settings/pull-requests - 更新仓库的拉取请求设置
bitbucket.repository.projects.repos.watch - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/watch - 开始关注指定仓库动态
bitbucket.repository.projects.repos.watch.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/watch - 停止对指定仓库的关注
bitbucket.repository.projects.repos.webhooks.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/{webhookId} - 删除仓库 webhook
bitbucket.repository.projects.repos.webhooks.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/{webhookId} - 按 ID 获取仓库 webhook
bitbucket.repository.projects.repos.webhooks.latest.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/{webhookId}/latest - 获取最近一次 webhook 调用详情
bitbucket.repository.projects.repos.webhooks.search.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/search - 搜索仓库的 webhook
bitbucket.repository.projects.repos.webhooks.statistics.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/{webhookId}/statistics - 获取仓库 webhook 统计
bitbucket.repository.projects.repos.webhooks.statistics.summary.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/{webhookId}/statistics/summary - 获取仓库 webhook 统计摘要
bitbucket.repository.projects.repos.webhooks.test.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/test - 发送仓库 webhook 测试
bitbucket.repository.projects.repos.webhooks.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/webhooks/{webhookId} - 更新仓库 webhook
bitbucket.webhooks.create - POST /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/webhooks - 创建仓库 webhook
bitbucket.webhooks.list - GET /rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/webhooks - 获取仓库的 webhook 列表

## 完全不提供的功能

bitbucket.access-tokens.users.create - POST /rest/access-tokens/latest/users/{userSlug}/{tokenId} - 更新 HTTP 访问令牌
bitbucket.access-tokens.users.delete - DELETE /rest/access-tokens/latest/users/{userSlug}/{tokenId} - 删除 HTTP 访问令牌
bitbucket.access-tokens.users.get - GET /rest/access-tokens/latest/users/{userSlug} - 获取个人 HTTP 访问令牌
bitbucket.access-tokens.users.get.userslug - GET /rest/access-tokens/latest/users/{userSlug}/{tokenId} - 按 ID 获取 HTTP 访问令牌
bitbucket.access-tokens.users.update - PUT /rest/access-tokens/latest/users/{userSlug} - 创建个人 HTTP 访问令牌
bitbucket.admin.list - GET /rest/admin - 获取全局 SSH 密钥设置
bitbucket.admin.supported-key-types.list - GET /rest/admin/supported-key-types - 获取支持的 SSH 密钥算法与长度
bitbucket.admin.update - PUT /rest/admin - 更新全局 SSH 密钥设置
bitbucket.audit.notification-settings.retention-config-review.delete - DELETE /rest/audit/latest/notification-settings/retention-config-review - 忽略保留配置通知
bitbucket.authconfig.idps.create - POST /rest/authconfig/latest/idps - 创建 IdP 配置
bitbucket.authconfig.idps.delete - DELETE /rest/authconfig/latest/idps/{id} - 删除 IdP 配置
bitbucket.authconfig.idps.get - GET /rest/authconfig/latest/idps/{id} - 获取 IdP 配置
bitbucket.authconfig.idps.list - GET /rest/authconfig/latest/idps - 获取所有已配置的 IdP
bitbucket.authconfig.idps.update - PATCH /rest/authconfig/latest/idps/{id} - 更新 IdP 配置
bitbucket.authconfig.jit-users.list - GET /rest/authconfig/latest/jit-users - 获取所有 JIT 预置用户
bitbucket.authconfig.list - GET /rest/authconfig/latest/saml/certificate - 获取当前用于签名 SAML 认证请求的证书
bitbucket.authconfig.login-options.list - GET /rest/authconfig/latest/login-options - 获取可用的登录选项
bitbucket.authconfig.reset - POST /rest/authconfig/latest/saml/certificate/reset - 生成新的 SAML 认证请求签名证书
bitbucket.authconfig.sso.list - GET /rest/authconfig/latest/sso - 获取 SSO 配置
bitbucket.authconfig.sso.update - PATCH /rest/authconfig/latest/sso - 更新 SSO 配置
bitbucket.basicauth.config.list - GET /rest/basicauth/latest/config - 获取 Basic Auth 配置
bitbucket.basicauth.config.update - PUT /rest/basicauth/latest/config - 更新 Basic Auth 配置
bitbucket.branch-utils.projects.repos.branches.info.get - GET /rest/branch-utils/latest/projects/{projectKey}/repos/{repositorySlug}/branches/info/{commitId} - 获取分支信息
bitbucket.branches.create - POST /rest/branch-utils/1.0/projects/{projectKey}/repos/{repositorySlug}/branches - 创建仓库分支
bitbucket.branches.delete - DELETE /rest/branch-utils/1.0/projects/{projectKey}/repos/{repositorySlug}/branches - 删除仓库分支
bitbucket.builds.statuses.create - POST /rest/build-status/1.0/commits/{commitId} - 创建或更新构建状态
bitbucket.builds.statuses.list - GET /rest/build-status/1.0/commits/{commitId} - 获取提交的构建状态列表
bitbucket.capabilities.build.list - GET /rest/api/latest/build/capabilities - 获取构建能力
bitbucket.capabilities.deployment.list - GET /rest/api/latest/deployment/capabilities - 获取部署能力
bitbucket.comment-likes.projects.repos.commits.comments.reactions.delete - DELETE /rest/comment-likes/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/comments/{commentId}/reactions/{emoticon} - 移除评论的表情回应
bitbucket.comment-likes.projects.repos.commits.comments.reactions.update - PUT /rest/comment-likes/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/comments/{commentId}/reactions/{emoticon} - 对评论添加表情回应
bitbucket.comment-likes.projects.repos.pull-requests.comments.reactions.delete - DELETE /rest/comment-likes/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId}/reactions/{emoticon} - 移除拉取请求评论的表情回应
bitbucket.comment-likes.projects.repos.pull-requests.comments.reactions.update - PUT /rest/comment-likes/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId}/reactions/{emoticon} - 对拉取请求评论添加表情回应
bitbucket.csp.settings.update - PUT /rest/csp/latest/settings - 修改 CSP 严格级别设置
bitbucket.dashboard.pull-request-suggestions.list - GET /rest/api/latest/dashboard/pull-request-suggestions - 获取拉取请求建议
bitbucket.dashboard.pull-requests.list - GET /rest/api/latest/dashboard/pull-requests - 获取用户的拉取请求
bitbucket.default-reviewers.projects.condition.create - POST /rest/default-reviewers/latest/projects/{projectKey}/condition - 创建默认评审者条件
bitbucket.default-reviewers.projects.condition.delete - DELETE /rest/default-reviewers/latest/projects/{projectKey}/condition/{id} - 删除默认评审者条件
bitbucket.default-reviewers.projects.condition.update - PUT /rest/default-reviewers/latest/projects/{projectKey}/condition/{id} - 更新默认评审者条件
bitbucket.default-reviewers.projects.conditions.list - GET /rest/default-reviewers/latest/projects/{projectKey}/conditions - 获取默认评审者条件
bitbucket.default-reviewers.projects.repos.condition.create - POST /rest/default-reviewers/latest/projects/{projectKey}/repos/{repositorySlug}/condition - 创建默认评审者条件
bitbucket.default-reviewers.projects.repos.condition.delete - DELETE /rest/default-reviewers/latest/projects/{projectKey}/repos/{repositorySlug}/condition/{id} - 删除默认评审者条件
bitbucket.default-reviewers.projects.repos.condition.update - PUT /rest/default-reviewers/latest/projects/{projectKey}/repos/{repositorySlug}/condition/{id} - 更新默认评审者条件
bitbucket.default-reviewers.projects.repos.conditions.list - GET /rest/default-reviewers/latest/projects/{projectKey}/repos/{repositorySlug}/conditions - 获取默认评审者条件
bitbucket.default-reviewers.projects.repos.reviewers.list - GET /rest/default-reviewers/latest/projects/{projectKey}/repos/{repositorySlug}/reviewers - 获取创建拉取请求的必需评审者
bitbucket.git.projects.repos.pull-requests.rebase.create - POST /rest/git/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/rebase - 变基（rebase）拉取请求
bitbucket.git.projects.repos.pull-requests.rebase.list - GET /rest/git/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/rebase - 检查拉取请求 rebase 前置条件
bitbucket.git.projects.repos.tags.create - POST /rest/git/latest/projects/{projectKey}/repos/{repositorySlug}/tags - 创建标签
bitbucket.git.projects.repos.tags.delete - DELETE /rest/git/latest/projects/{projectKey}/repos/{repositorySlug}/tags/{name} - 删除标签
bitbucket.gpg.keys.create - POST /rest/gpg/latest/keys - 创建 GPG 密钥
bitbucket.gpg.keys.delete - DELETE /rest/gpg/latest/keys - 删除用户的全部 GPG 密钥
bitbucket.gpg.keys.delete.fingerprintorid - DELETE /rest/gpg/latest/keys/{fingerprintOrId} - 删除 GPG 密钥
bitbucket.gpg.keys.list - GET /rest/gpg/latest/keys - 获取全部 GPG 密钥
bitbucket.indexing.projects.repos.get - GET /rest/indexing/latest/projects/{projectKey}/repos/{repositorySlug} - 获取仓库搜索索引详情
bitbucket.indexing.projects.repos.indexing-queue-details.list - GET /rest/indexing/latest/projects/{projectKey}/repos/{repositorySlug}/indexing-queue-details - 获取仓库索引队列详细信息
bitbucket.indexing.projects.repos.indexing-queued-status.list - GET /rest/indexing/latest/projects/{projectKey}/repos/{repositorySlug}/indexing-queued-status - 检查仓库是否已加入索引队列
bitbucket.indexing.reindex - POST /rest/indexing/latest/reindex - 重建指定仓库列表的搜索索引
bitbucket.indexing.restart - POST /rest/indexing/latest/restart - 重启搜索索引工作线程
bitbucket.indexing.support-info.broken-index-status-repos.list - GET /rest/indexing/latest/support-info/broken-index-status-repos - 分页获取超过最大索引重试次数的仓库
bitbucket.indexing.support-info.indexing-thread-snapshot.list - GET /rest/indexing/latest/support-info/indexing-thread-snapshot - 获取索引线程详情快照
bitbucket.indexing.threads.update - PUT /rest/indexing/latest/threads - 设置索引工作线程数量
bitbucket.insights.projects.repos.commits.annotations.list - GET /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/annotations - 获取提交的 Code Insights 注解
bitbucket.insights.projects.repos.commits.reports.annotations.create - POST /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports/{key}/annotations - 添加 Code Insights 注解
bitbucket.insights.projects.repos.commits.reports.annotations.delete - DELETE /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports/{key}/annotations - 删除 Code Insights 注解
bitbucket.insights.projects.repos.commits.reports.annotations.list - GET /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports/{key}/annotations - 获取报告的 Code Insights 注解
bitbucket.insights.projects.repos.commits.reports.annotations.update - PUT /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports/{key}/annotations/{externalId} - 创建或替换 Code Insights 注解
bitbucket.insights.projects.repos.commits.reports.delete - DELETE /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports/{key} - 删除 Code Insights 报告
bitbucket.insights.projects.repos.commits.reports.get - GET /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports/{key} - 获取 Code Insights 报告
bitbucket.insights.projects.repos.commits.reports.list - GET /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports - 获取提交的全部 Code Insights 报告
bitbucket.insights.projects.repos.commits.reports.update - PUT /rest/insights/latest/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}/reports/{key} - 创建 Code Insights 报告
bitbucket.jira-dev.devinfo-backfill.create - POST /rest/jira-dev/latest/devinfo-backfill - 启动 Jira 开发信息回填同步
bitbucket.jira-dev.devinfo-backfill.delete - DELETE /rest/jira-dev/latest/devinfo-backfill - 停止 Jira 开发信息回填同步
bitbucket.jira-dev.devinfo-backfill.report.list - GET /rest/jira-dev/latest/devinfo-backfill/report - 获取失败的仓库回填任务及其错误
bitbucket.jira-dev.devinfo-backfill.status.get - GET /rest/jira-dev/latest/devinfo-backfill/status - 获取 Jira 开发信息回填状态
bitbucket.jira.comments.issues.create - POST /rest/jira/latest/comments/{commentId}/issues - 创建 Jira 事务
bitbucket.jira.issues.commits.list - GET /rest/jira/latest/issues/{issueKey}/commits - 获取事务键对应的变更集
bitbucket.jira.projects.primary-enhanced-entitylink.list - GET /rest/jira/latest/projects/{projectKey}/primary-enhanced-entitylink - 获取实体链接
bitbucket.jira.projects.repos.pull-requests.issues.list - GET /rest/jira/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/issues - 获取拉取请求关联的事务
bitbucket.keys.projects.repos.ssh.create - POST /rest/keys/latest/projects/{projectKey}/repos/{repositorySlug}/ssh - 添加仓库 SSH 密钥
bitbucket.keys.projects.repos.ssh.delete - DELETE /rest/keys/latest/projects/{projectKey}/repos/{repositorySlug}/ssh/{keyId} - 吊销仓库 SSH 密钥
bitbucket.keys.projects.repos.ssh.get - GET /rest/keys/latest/projects/{projectKey}/repos/{repositorySlug}/ssh/{keyId} - 获取仓库 SSH 密钥
bitbucket.keys.projects.repos.ssh.list - GET /rest/keys/latest/projects/{projectKey}/repos/{repositorySlug}/ssh - 获取仓库 SSH 密钥
bitbucket.keys.projects.repos.ssh.permission.update - PUT /rest/keys/latest/projects/{projectKey}/repos/{repositorySlug}/ssh/{keyId}/permission/{permission} - 更新仓库 SSH 密钥权限
bitbucket.keys.projects.ssh.create - POST /rest/keys/latest/projects/{projectKey}/ssh - 添加项目 SSH 密钥
bitbucket.keys.projects.ssh.delete - DELETE /rest/keys/latest/projects/{projectKey}/ssh/{keyId} - 吊销项目 SSH 密钥
bitbucket.keys.projects.ssh.get - GET /rest/keys/latest/projects/{projectKey}/ssh/{keyId} - 获取项目 SSH 密钥
bitbucket.keys.projects.ssh.list - GET /rest/keys/latest/projects/{projectKey}/ssh - 获取项目 SSH 密钥
bitbucket.keys.projects.ssh.permission.update - PUT /rest/keys/latest/projects/{projectKey}/ssh/{keyId}/permission/{permission} - 更新项目 SSH 密钥权限
bitbucket.keys.ssh.delete - DELETE /rest/keys/latest/ssh/{keyId} - 吊销项目 SSH 密钥
bitbucket.keys.ssh.projects.list - GET /rest/keys/latest/ssh/{keyId}/projects - 获取项目 SSH 密钥
bitbucket.keys.ssh.repos.list - GET /rest/keys/latest/ssh/{keyId}/repos - 获取仓库 SSH 密钥
bitbucket.markup.preview - POST /rest/api/latest/markup/preview - 预览 Markdown 渲染
bitbucket.mirroring.account.settings.preferred-mirror.create - POST /rest/mirroring/latest/account/settings/preferred-mirror - 设置首选镜像
bitbucket.mirroring.account.settings.preferred-mirror.delete - DELETE /rest/mirroring/latest/account/settings/preferred-mirror - 移除首选镜像
bitbucket.mirroring.account.settings.preferred-mirror.list - GET /rest/mirroring/latest/account/settings/preferred-mirror - 获取首选镜像
bitbucket.mirroring.analyticssettings.list - GET /rest/mirroring/latest/analyticsSettings - 获取上游分析设置
bitbucket.mirroring.authenticate.create - POST /rest/mirroring/latest/authenticate - 代表用户进行认证
bitbucket.mirroring.farmnodes.list - GET /rest/mirroring/latest/farmNodes - 获取镜像场节点
bitbucket.mirroring.mirrorrepos.delayed-sync.list - GET /rest/mirroring/latest/mirrorRepos/delayed-sync - 获取延迟同步的仓库
bitbucket.mirroring.mirrorrepos.get - GET /rest/mirroring/latest/mirrorRepos/{externalRepositoryId} - 获取克隆 URL
bitbucket.mirroring.mirrorservers.delete - DELETE /rest/mirroring/latest/mirrorServers/{mirrorId} - 按 ID 删除镜像服务器
bitbucket.mirroring.mirrorservers.events.create - POST /rest/mirroring/latest/mirrorServers/{mirrorId}/events - 发布 RepositoryMirrorEvent
bitbucket.mirroring.mirrorservers.get - GET /rest/mirroring/latest/mirrorServers/{mirrorId} - 按 ID 获取镜像服务器
bitbucket.mirroring.mirrorservers.list - GET /rest/mirroring/latest/mirrorServers - 获取所有镜像服务器
bitbucket.mirroring.mirrorservers.update - PUT /rest/mirroring/latest/mirrorServers/{mirrorId} - 升级镜像服务器
bitbucket.mirroring.progress.list - GET /rest/mirroring/latest/progress - 获取同步进度状态
bitbucket.mirroring.projects.get - GET /rest/mirroring/latest/projects/{projectId} - 获取项目
bitbucket.mirroring.projects.repos.list - GET /rest/mirroring/latest/projects/{projectId}/repos - 获取项目中仓库的哈希
bitbucket.mirroring.repos.get - GET /rest/mirroring/latest/repos/{repoId} - 获取指定仓库的内容哈希
bitbucket.mirroring.repos.list - GET /rest/mirroring/latest/repos - 获取仓库的内容哈希
bitbucket.mirroring.repos.mirrors.list - GET /rest/mirroring/latest/repos/{repoId}/mirrors - 获取仓库的镜像
bitbucket.mirroring.requests.accept.create - POST /rest/mirroring/latest/requests/{mirroringRequestId}/accept - 接受镜像请求
bitbucket.mirroring.requests.create - POST /rest/mirroring/latest/requests - 创建镜像请求
bitbucket.mirroring.requests.delete - DELETE /rest/mirroring/latest/requests/{mirroringRequestId} - 删除镜像请求
bitbucket.mirroring.requests.get - GET /rest/mirroring/latest/requests/{mirroringRequestId} - 获取镜像请求
bitbucket.mirroring.requests.list - GET /rest/mirroring/latest/requests - 获取镜像请求
bitbucket.mirroring.requests.reject.create - POST /rest/mirroring/latest/requests/{mirroringRequestId}/reject - 拒绝镜像请求
bitbucket.mirroring.supportinfo.projects.repos.repo-lock-owner.list - GET /rest/mirroring/latest/supportInfo/projects/{projectKey}/repos/{repositorySlug}/repo-lock-owner - 获取同步过程的仓库锁持有者
bitbucket.mirroring.supportinfo.projects.repos.reposyncstatus.list - GET /rest/mirroring/latest/supportInfo/projects/{projectKey}/repos/{repositorySlug}/repoSyncStatus - 获取镜像仓库的信息
bitbucket.mirroring.supportinfo.refchangesqueue.count.get - GET /rest/mirroring/latest/supportInfo/refChangesQueue/count - 获取引用变更队列条目总数
bitbucket.mirroring.supportinfo.refchangesqueue.list - GET /rest/mirroring/latest/supportInfo/refChangesQueue - 获取引用变更队列中的条目
bitbucket.mirroring.supportinfo.repo-lock-owners.list - GET /rest/mirroring/latest/supportInfo/repo-lock-owners - 获取同步过程的全部仓库锁持有者
bitbucket.mirroring.supportinfo.reposyncstatus.list - GET /rest/mirroring/latest/supportInfo/repoSyncStatus - 获取仓库同步状态
bitbucket.mirroring.syncsettings.list - GET /rest/mirroring/latest/syncSettings - 获取上游设置
bitbucket.mirroring.syncsettings.mode.list - GET /rest/mirroring/latest/syncSettings/mode - 获取镜像模式
bitbucket.mirroring.syncsettings.mode.update - PUT /rest/mirroring/latest/syncSettings/mode - 更新镜像模式
bitbucket.mirroring.syncsettings.projects.create - POST /rest/mirroring/latest/syncSettings/projects - 添加多个待镜像项目
bitbucket.mirroring.syncsettings.projects.create.projectid - POST /rest/mirroring/latest/syncSettings/projects/{projectId} - 添加待镜像项目
bitbucket.mirroring.syncsettings.projects.delete - DELETE /rest/mirroring/latest/syncSettings/projects/{projectId} - 停止镜像项目
bitbucket.mirroring.syncsettings.projects.list - GET /rest/mirroring/latest/syncSettings/projects - 获取被镜像的项目 ID
bitbucket.mirroring.syncsettings.update - PUT /rest/mirroring/latest/syncSettings - 更新上游设置
bitbucket.mirroring.upstreamserver.list - GET /rest/mirroring/latest/upstreamServer - 获取上游服务器
bitbucket.mirroring.zdu.end.create - POST /rest/mirroring/latest/zdu/end - 结束镜像场上的 ZDU 升级
bitbucket.mirroring.zdu.start - POST /rest/mirroring/latest/zdu/start - 开始镜像场上的 ZDU 升级
bitbucket.other-operations.inbox.pull-requests.count.get - GET /rest/api/latest/inbox/pull-requests/count - 获取收件箱中拉取请求总数
bitbucket.other-operations.inbox.pull-requests.list - GET /rest/api/latest/inbox/pull-requests - 获取收件箱中的拉取请求
bitbucket.permission-management.admin.groups.add-users.create - POST /rest/api/latest/admin/groups/add-users - 将多个用户加入用户组
bitbucket.permission-management.admin.groups.create - POST /rest/api/latest/admin/groups - 创建用户组
bitbucket.permission-management.admin.groups.delete - DELETE /rest/api/latest/admin/groups - 删除用户组
bitbucket.permission-management.admin.groups.delete-2 - DELETE /rest/api/latest/admin/permissions/groups - 撤销用户组的全部全局权限
bitbucket.permission-management.admin.groups.list - GET /rest/api/latest/admin/groups - 获取用户组
bitbucket.permission-management.admin.groups.list-2 - GET /rest/api/latest/admin/permissions/groups - 获取拥有某全局权限的用户组
bitbucket.permission-management.admin.groups.more-members.list - GET /rest/api/latest/admin/groups/more-members - 获取用户组成员
bitbucket.permission-management.admin.groups.more-non-members.list - GET /rest/api/latest/admin/groups/more-non-members - 获取不在组中的成员
bitbucket.permission-management.admin.groups.none.list - GET /rest/api/latest/admin/permissions/groups/none - 获取无全局权限的用户组
bitbucket.permission-management.admin.groups.update - PUT /rest/api/latest/admin/permissions/groups - 更新用户组的全局权限
bitbucket.permission-management.admin.user-directories.list - GET /rest/api/latest/admin/user-directories - 获取用户目录
bitbucket.permission-management.admin.users.add-groups.create - POST /rest/api/latest/admin/users/add-groups - 将用户加入多个用户组
bitbucket.permission-management.admin.users.captcha.delete - DELETE /rest/api/latest/admin/users/captcha - 清除用户的 CAPTCHA 限制
bitbucket.permission-management.admin.users.create - POST /rest/api/latest/admin/users - 创建用户
bitbucket.permission-management.admin.users.credentials.update - PUT /rest/api/latest/admin/users/credentials - 为用户设置密码
bitbucket.permission-management.admin.users.delete - DELETE /rest/api/latest/admin/permissions/users - 撤销用户的全部全局权限
bitbucket.permission-management.admin.users.delete-2 - DELETE /rest/api/latest/admin/users - 删除用户
bitbucket.permission-management.admin.users.erasure.create - POST /rest/api/latest/admin/users/erasure - 擦除用户信息
bitbucket.permission-management.admin.users.erasure.list - GET /rest/api/latest/admin/users/erasure - 检查用户是否可删除
bitbucket.permission-management.admin.users.list - GET /rest/api/latest/admin/permissions/users - 获取拥有某全局权限的用户
bitbucket.permission-management.admin.users.list-2 - GET /rest/api/latest/admin/users - 获取用户列表
bitbucket.permission-management.admin.users.more-members.list - GET /rest/api/latest/admin/users/more-members - 获取用户所属的用户组
bitbucket.permission-management.admin.users.more-non-members.list - GET /rest/api/latest/admin/users/more-non-members - 查找用户未加入的用户组
bitbucket.permission-management.admin.users.none.list - GET /rest/api/latest/admin/permissions/users/none - 获取无全局权限的用户
bitbucket.permission-management.admin.users.remove-group.create - POST /rest/api/latest/admin/users/remove-group - 将用户移出用户组
bitbucket.permission-management.admin.users.rename - POST /rest/api/latest/admin/users/rename - 重命名用户
bitbucket.permission-management.admin.users.update - PUT /rest/api/latest/admin/permissions/users - 更新用户的全局权限
bitbucket.permission-management.admin.users.update-2 - PUT /rest/api/latest/admin/users - 更新用户详情
bitbucket.permission-management.groups.list - GET /rest/api/latest/groups - 获取用户组名称
bitbucket.policies.admin.repos.archive - PUT /rest/policies/latest/admin/repos/archive - 更新仓库归档策略
bitbucket.policies.admin.repos.archive.list - GET /rest/policies/latest/admin/repos/archive - 获取仓库归档策略
bitbucket.policies.admin.repos.delete.list - GET /rest/policies/latest/admin/repos/delete - 获取仓库删除策略
bitbucket.policies.admin.repos.delete.update - PUT /rest/policies/latest/admin/repos/delete - 更新仓库删除策略
bitbucket.project.hook-scripts.delete - DELETE /rest/api/latest/projects/{projectKey}/hook-scripts/{scriptId} - 移除钩子脚本
bitbucket.project.hook-scripts.list - GET /rest/api/latest/projects/{projectKey}/hook-scripts - 获取已配置的钩子脚本
bitbucket.project.hook-scripts.update - PUT /rest/api/latest/projects/{projectKey}/hook-scripts/{scriptId} - 创建/更新钩子脚本
bitbucket.project.hooks.avatar.list - GET /rest/api/latest/hooks/{hookKey}/avatar - 获取项目头像
bitbucket.project.repos.license.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/license - 获取仓库许可证
bitbucket.pull-requests.admin.pull-requests.create - POST /rest/api/latest/admin/pull-requests/{scmId} - 更新合并策略
bitbucket.pull-requests.admin.pull-requests.get - GET /rest/api/latest/admin/pull-requests/{scmId} - 获取合并策略
bitbucket.repository.profile.recent.repos.list - GET /rest/api/latest/profile/recent/repos - 获取最近访问的仓库

> 以下 5 个 attachments 操作永久排除（原 coverage low-value 实证备注）：Bitbucket 10.4.1 WADL 确认 /attachments 无 POST 方法——附件创建不经 REST 暴露，这些 CRUD/元数据操作无法对真实附件做可重复验证。

bitbucket.repository.projects.repos.attachments.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/attachments/{attachmentId} - 删除仓库中的指定附件
bitbucket.repository.projects.repos.attachments.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/attachments/{attachmentId} - 按 ID 获取仓库附件内容
bitbucket.repository.projects.repos.attachments.metadata.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/attachments/{attachmentId}/metadata - 删除指定附件的元数据
bitbucket.repository.projects.repos.attachments.metadata.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/attachments/{attachmentId}/metadata - 获取指定附件的元数据
bitbucket.repository.projects.repos.attachments.metadata.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/attachments/{attachmentId}/metadata - 保存指定附件的元数据
bitbucket.repository.projects.repos.diff.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/diff - 获取指定路径的原始 diff
bitbucket.repository.projects.repos.hook-scripts.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/hook-scripts/{scriptId} - 移除钩子脚本
bitbucket.repository.projects.repos.hook-scripts.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/hook-scripts - 获取钩子脚本
bitbucket.repository.projects.repos.hook-scripts.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/hook-scripts/{scriptId} - 创建/更新钩子脚本
bitbucket.repository.repos.list - GET /rest/api/latest/repos - 搜索仓库
bitbucket.required-builds.projects.repos.condition.create - POST /rest/required-builds/latest/projects/{projectKey}/repos/{repositorySlug}/condition - 创建必需构建合并检查
bitbucket.required-builds.projects.repos.condition.delete - DELETE /rest/required-builds/latest/projects/{projectKey}/repos/{repositorySlug}/condition/{id} - 删除必需构建合并检查
bitbucket.required-builds.projects.repos.condition.update - PUT /rest/required-builds/latest/projects/{projectKey}/repos/{repositorySlug}/condition/{id} - 更新必需构建合并检查
bitbucket.required-builds.projects.repos.conditions.list - GET /rest/required-builds/latest/projects/{projectKey}/repos/{repositorySlug}/conditions - 获取必需构建合并检查
bitbucket.secrets.keys.inactive.delete - DELETE /rest/secrets/1.0/keys/inactive - 删除非活动 AES 密钥
bitbucket.secrets.keys.inactive.list - GET /rest/secrets/1.0/keys/inactive - 获取非活动 AES 密钥
bitbucket.secrets.keys.rotate - POST /rest/secrets/1.0/keys/rotate - 轮换当前 AES 密钥
bitbucket.security.projects.repos.secret-scanning.allowlist.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/allowlist - 创建仓库密钥扫描白名单规则
bitbucket.security.projects.repos.secret-scanning.allowlist.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/allowlist/{id} - 删除仓库密钥扫描白名单规则
bitbucket.security.projects.repos.secret-scanning.allowlist.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/allowlist/{id} - 获取仓库密钥扫描白名单规则
bitbucket.security.projects.repos.secret-scanning.allowlist.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/allowlist - 查找仓库密钥扫描白名单规则
bitbucket.security.projects.repos.secret-scanning.allowlist.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/allowlist/{id} - 编辑仓库密钥扫描白名单规则
bitbucket.security.projects.repos.secret-scanning.exempt.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/exempt - 删除豁免仓库
bitbucket.security.projects.repos.secret-scanning.exempt.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/exempt - 查询仓库是否被豁免
bitbucket.security.projects.repos.secret-scanning.rules.create - POST /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/rules - 创建仓库密钥扫描规则
bitbucket.security.projects.repos.secret-scanning.rules.delete - DELETE /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/rules/{id} - 删除仓库密钥扫描规则
bitbucket.security.projects.repos.secret-scanning.rules.get - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/rules/{id} - 获取仓库密钥扫描规则
bitbucket.security.projects.repos.secret-scanning.rules.list - GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/rules - 查找仓库密钥扫描规则
bitbucket.security.projects.repos.secret-scanning.rules.update - PUT /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/secret-scanning/rules/{id} - 编辑仓库密钥扫描规则
bitbucket.security.projects.secret-scanning.allowlist.create - POST /rest/api/latest/projects/{projectKey}/secret-scanning/allowlist - 创建项目密钥扫描白名单规则
bitbucket.security.projects.secret-scanning.allowlist.delete - DELETE /rest/api/latest/projects/{projectKey}/secret-scanning/allowlist/{id} - 删除项目密钥扫描白名单规则
bitbucket.security.projects.secret-scanning.allowlist.get - GET /rest/api/latest/projects/{projectKey}/secret-scanning/allowlist/{id} - 获取项目密钥扫描白名单规则
bitbucket.security.projects.secret-scanning.allowlist.list - GET /rest/api/latest/projects/{projectKey}/secret-scanning/allowlist - 查找项目密钥扫描白名单规则
bitbucket.security.projects.secret-scanning.allowlist.update - PUT /rest/api/latest/projects/{projectKey}/secret-scanning/allowlist/{id} - 编辑项目密钥扫描白名单规则
bitbucket.security.projects.secret-scanning.exempt.create - POST /rest/api/latest/projects/{projectKey}/secret-scanning/exempt - 批量豁免仓库的密钥扫描
bitbucket.security.projects.secret-scanning.exempt.list - GET /rest/api/latest/projects/{projectKey}/secret-scanning/exempt - 查找项目中被豁免密钥扫描的仓库
bitbucket.security.projects.secret-scanning.rules.create - POST /rest/api/latest/projects/{projectKey}/secret-scanning/rules - 创建项目密钥扫描规则
bitbucket.security.projects.secret-scanning.rules.delete - DELETE /rest/api/latest/projects/{projectKey}/secret-scanning/rules/{id} - 删除项目密钥扫描规则
bitbucket.security.projects.secret-scanning.rules.get - GET /rest/api/latest/projects/{projectKey}/secret-scanning/rules/{id} - 获取项目密钥扫描规则
bitbucket.security.projects.secret-scanning.rules.list - GET /rest/api/latest/projects/{projectKey}/secret-scanning/rules - 查找项目密钥扫描规则
bitbucket.security.projects.secret-scanning.rules.update - PUT /rest/api/latest/projects/{projectKey}/secret-scanning/rules/{id} - 编辑项目密钥扫描规则
bitbucket.security.secret-scanning.exempt.create - POST /rest/api/latest/secret-scanning/exempt - 批量豁免仓库的密钥扫描
bitbucket.security.secret-scanning.exempt.list - GET /rest/api/latest/secret-scanning/exempt - 查找全部被豁免密钥扫描的仓库
bitbucket.security.secret-scanning.rules.create - POST /rest/api/latest/secret-scanning/rules - 创建全局密钥扫描规则
bitbucket.security.secret-scanning.rules.delete - DELETE /rest/api/latest/secret-scanning/rules/{id} - 删除全局密钥扫描规则
bitbucket.security.secret-scanning.rules.get - GET /rest/api/latest/secret-scanning/rules/{id} - 获取全局密钥扫描规则
bitbucket.security.secret-scanning.rules.list - GET /rest/api/latest/secret-scanning/rules - 查找全局密钥扫描规则
bitbucket.security.secret-scanning.rules.update - PUT /rest/api/latest/secret-scanning/rules/{id} - 编辑全局密钥扫描规则
bitbucket.security.signing.x509-certificates.create - POST /rest/api/latest/signing/x509-certificates - 创建 X.509 证书
bitbucket.security.signing.x509-certificates.crl.update - PUT /rest/api/latest/signing/x509-certificates/crl/{id} - 更新 X.509 CRL 条目
bitbucket.security.signing.x509-certificates.delete - DELETE /rest/api/latest/signing/x509-certificates/{id} - 删除 X.509 证书
bitbucket.security.signing.x509-certificates.list - GET /rest/api/latest/signing/x509-certificates - 获取全部 X.509 证书
bitbucket.security.system-signing.configuration.create - POST /rest/api/latest/system-signing/configuration - 更新系统签名配置
bitbucket.security.system-signing.configuration.get - GET /rest/api/latest/system-signing/configuration - 获取系统签名配置
bitbucket.ssh.keys.create - POST /rest/ssh/latest/keys - 为用户添加 SSH 密钥
bitbucket.ssh.keys.delete - DELETE /rest/ssh/latest/keys - 删除当前用户全部 SSH 密钥
bitbucket.ssh.keys.delete.keyid - DELETE /rest/ssh/latest/keys/{keyId} - 移除 SSH 密钥
bitbucket.ssh.keys.get - GET /rest/ssh/latest/keys/{keyId} - 按 keyId 获取用户 SSH 密钥
bitbucket.ssh.keys.list - GET /rest/ssh/latest/keys - 获取用户的 SSH 密钥
bitbucket.ssh.settings.get - GET /rest/ssh/latest/settings - 获取 SSH 设置
bitbucket.sync.projects.repos.create - POST /rest/sync/latest/projects/{projectKey}/repos/{repositorySlug} - 禁用同步
bitbucket.sync.projects.repos.get - GET /rest/sync/latest/projects/{projectKey}/repos/{repositorySlug} - 获取同步状态
bitbucket.sync.projects.repos.synchronize.create - POST /rest/sync/latest/projects/{projectKey}/repos/{repositorySlug}/synchronize - 手动同步
bitbucket.system-maintenance.admin.banner.delete - DELETE /rest/api/latest/admin/banner - 删除公告横幅
bitbucket.system-maintenance.admin.banner.list - GET /rest/api/latest/admin/banner - 获取公告横幅
bitbucket.system-maintenance.admin.banner.update - PUT /rest/api/latest/admin/banner - 更新/设置公告横幅
bitbucket.system-maintenance.admin.cluster.get - GET /rest/api/latest/admin/cluster - 获取集群节点信息
bitbucket.system-maintenance.admin.default-branch.delete - DELETE /rest/api/latest/admin/default-branch - 清除默认分支
bitbucket.system-maintenance.admin.default-branch.list - GET /rest/api/latest/admin/default-branch - 获取默认分支
bitbucket.system-maintenance.admin.default-branch.update - PUT /rest/api/latest/admin/default-branch - 更新/设置默认分支
bitbucket.system-maintenance.admin.git.mesh.config.control-plane-pem.list - GET /rest/api/latest/admin/git/mesh/config/control-plane.pem - 获取控制平面 PEM
bitbucket.system-maintenance.admin.git.mesh.diagnostics.connectivity.list - GET /rest/api/latest/admin/git/mesh/diagnostics/connectivity - 生成 Mesh 连通性报告
bitbucket.system-maintenance.admin.git.mesh.nodes.create - POST /rest/api/latest/admin/git/mesh/nodes - 注册新 Mesh 节点
bitbucket.system-maintenance.admin.git.mesh.nodes.delete - DELETE /rest/api/latest/admin/git/mesh/nodes/{id} - 删除 Mesh 节点
bitbucket.system-maintenance.admin.git.mesh.nodes.get - GET /rest/api/latest/admin/git/mesh/nodes/{id} - 获取 Mesh 节点
bitbucket.system-maintenance.admin.git.mesh.nodes.list - GET /rest/api/latest/admin/git/mesh/nodes - 获取全部已注册 Mesh 节点
bitbucket.system-maintenance.admin.git.mesh.nodes.update - PUT /rest/api/latest/admin/git/mesh/nodes/{id} - 更新 Mesh 节点
bitbucket.system-maintenance.admin.git.mesh.support-zips.get - GET /rest/api/latest/admin/git/mesh/support-zips/{id} - 获取指定节点的支持包
bitbucket.system-maintenance.admin.git.mesh.support-zips.list - GET /rest/api/latest/admin/git/mesh/support-zips - 获取全部 Mesh 节点的支持包
bitbucket.system-maintenance.admin.license.create - POST /rest/api/latest/admin/license - 更新许可证
bitbucket.system-maintenance.admin.license.get - GET /rest/api/latest/admin/license - 获取许可证详情
bitbucket.system-maintenance.admin.mail-server.delete - DELETE /rest/api/latest/admin/mail-server - 删除邮件配置
bitbucket.system-maintenance.admin.mail-server.list - GET /rest/api/latest/admin/mail-server - 获取邮件配置
bitbucket.system-maintenance.admin.mail-server.sender-address.delete - DELETE /rest/api/latest/admin/mail-server/sender-address - 删除发件人地址配置
bitbucket.system-maintenance.admin.mail-server.sender-address.list - GET /rest/api/latest/admin/mail-server/sender-address - 获取服务器邮件地址
bitbucket.system-maintenance.admin.mail-server.sender-address.update - PUT /rest/api/latest/admin/mail-server/sender-address - 更新服务器邮件地址
bitbucket.system-maintenance.admin.mail-server.update - PUT /rest/api/latest/admin/mail-server - 更新邮件配置
bitbucket.system-maintenance.admin.rate-limit.history.get - GET /rest/api/latest/admin/rate-limit/history - 获取限流历史
bitbucket.system-maintenance.admin.rate-limit.settings.get - GET /rest/api/latest/admin/rate-limit/settings - 获取限流设置
bitbucket.system-maintenance.admin.rate-limit.settings.update - PUT /rest/api/latest/admin/rate-limit/settings - 设置限流
bitbucket.system-maintenance.admin.rate-limit.settings.users.create - POST /rest/api/latest/admin/rate-limit/settings/users - 为多个用户设置限流
bitbucket.system-maintenance.admin.rate-limit.settings.users.delete - DELETE /rest/api/latest/admin/rate-limit/settings/users/{userSlug} - 删除用户特定的限流设置
bitbucket.system-maintenance.admin.rate-limit.settings.users.get - GET /rest/api/latest/admin/rate-limit/settings/users/{userSlug} - 获取用户特定的限流设置
bitbucket.system-maintenance.admin.rate-limit.settings.users.list - GET /rest/api/latest/admin/rate-limit/settings/users - 获取用户的限流设置
bitbucket.system-maintenance.admin.rate-limit.settings.users.update - PUT /rest/api/latest/admin/rate-limit/settings/users/{userSlug} - 设置用户的限流
bitbucket.system-maintenance.hook-scripts.content.list - GET /rest/api/latest/hook-scripts/{scriptId}/content - 获取钩子脚本内容
bitbucket.system-maintenance.hook-scripts.create - POST /rest/api/latest/hook-scripts - 创建新的钩子脚本
bitbucket.system-maintenance.hook-scripts.delete - DELETE /rest/api/latest/hook-scripts/{scriptId} - 删除钩子脚本
bitbucket.system-maintenance.hook-scripts.get - GET /rest/api/latest/hook-scripts/{scriptId} - 获取钩子脚本
bitbucket.system-maintenance.hook-scripts.update - PUT /rest/api/latest/hook-scripts/{scriptId} - 更新钩子脚本
bitbucket.system-maintenance.labels.get - GET /rest/api/latest/labels/{labelName} - 获取标签
bitbucket.system-maintenance.labels.labeled.list - GET /rest/api/latest/labels/{labelName}/labeled - 获取标签关联的对象
bitbucket.system-maintenance.labels.list - GET /rest/api/latest/labels - 获取全部标签
bitbucket.system-maintenance.logs.logger.get - GET /rest/api/latest/logs/logger/{loggerName} - 获取当前日志级别
bitbucket.system-maintenance.logs.logger.update - PUT /rest/api/latest/logs/logger/{loggerName}/{levelName} - 设置日志级别
bitbucket.system-maintenance.logs.rootlogger.list - GET /rest/api/latest/logs/rootLogger - 获取根日志级别
bitbucket.system-maintenance.logs.rootlogger.update - PUT /rest/api/latest/logs/rootLogger/{levelName} - 设置根日志级别
bitbucket.system-maintenance.logs.settings.get - GET /rest/api/latest/logs/settings - 获取调试日志与性能分析设置
bitbucket.system-maintenance.logs.settings.update - PUT /rest/api/latest/logs/settings - 设置调试日志与性能分析
bitbucket.system-maintenance.migration.exports.cancel - POST /rest/api/latest/migration/exports/{jobId}/cancel - 取消导出任务
bitbucket.system-maintenance.migration.exports.create - POST /rest/api/latest/migration/exports - 启动导出任务
bitbucket.system-maintenance.migration.exports.get - GET /rest/api/latest/migration/exports/{jobId} - 获取导出任务详情
bitbucket.system-maintenance.migration.exports.messages.list - GET /rest/api/latest/migration/exports/{jobId}/messages - 获取任务消息
bitbucket.system-maintenance.migration.exports.preview - POST /rest/api/latest/migration/exports/preview - 预览导出
bitbucket.system-maintenance.migration.imports.cancel - POST /rest/api/latest/migration/imports/{jobId}/cancel - 取消导入任务
bitbucket.system-maintenance.migration.imports.create - POST /rest/api/latest/migration/imports - 启动导入任务
bitbucket.system-maintenance.migration.imports.get - GET /rest/api/latest/migration/imports/{jobId} - 获取导入任务状态
bitbucket.system-maintenance.migration.imports.messages.list - GET /rest/api/latest/migration/imports/{jobId}/messages - 获取导入任务消息
bitbucket.system-maintenance.migration.mesh.cancel - POST /rest/api/latest/migration/mesh/{jobId}/cancel - 取消 Mesh 迁移任务
bitbucket.system-maintenance.migration.mesh.create - POST /rest/api/latest/migration/mesh - 启动 Mesh 迁移任务
bitbucket.system-maintenance.migration.mesh.get - GET /rest/api/latest/migration/mesh/{jobId} - 获取 Mesh 迁移任务详情
bitbucket.system-maintenance.migration.mesh.messages.list - GET /rest/api/latest/migration/mesh/{jobId}/messages - 获取 Mesh 迁移任务消息
bitbucket.system-maintenance.migration.mesh.preview - POST /rest/api/latest/migration/mesh/preview - 预览 Mesh 迁移
bitbucket.system-maintenance.migration.mesh.repos.list - GET /rest/api/latest/migration/mesh/repos - 按 Mesh 迁移状态查找仓库
bitbucket.system-maintenance.migration.mesh.summaries.list - GET /rest/api/latest/migration/mesh/summaries - 获取全部 Mesh 迁移任务摘要
bitbucket.system-maintenance.migration.mesh.summary.get - GET /rest/api/latest/migration/mesh/summary - 获取 Mesh 迁移任务摘要
bitbucket.system-maintenance.migration.mesh.summary.get.jobid - GET /rest/api/latest/migration/mesh/{jobId}/summary - 获取 Mesh 迁移任务摘要
bitbucket.system-maintenance.users.avatar-png.create - POST /rest/api/latest/users/{userSlug}/avatar.png - 更新用户头像
bitbucket.system-maintenance.users.avatar-png.delete - DELETE /rest/api/latest/users/{userSlug}/avatar.png - 删除用户头像
bitbucket.system-maintenance.users.credentials.update - PUT /rest/api/latest/users/credentials - 设置密码
bitbucket.system-maintenance.users.get - GET /rest/api/latest/users/{userSlug} - 获取用户
bitbucket.system-maintenance.users.settings.create - POST /rest/api/latest/users/{userSlug}/settings - 更新用户设置
bitbucket.system-maintenance.users.settings.get - GET /rest/api/latest/users/{userSlug}/settings - 获取用户设置
bitbucket.system-maintenance.users.update - PUT /rest/api/latest/users - 更新用户详情
bitbucket.tsv.authenticate.captcha.list - GET /rest/tsv/latest/authenticate/captcha - 获取 CAPTCHA 验证挑战
bitbucket.tsv.authenticate.create - POST /rest/tsv/latest/authenticate - 使用两步验证（2SV）进行认证
bitbucket.tsv.authenticate.recovery-code.create - POST /rest/tsv/latest/authenticate/recovery-code - 使用恢复码认证
bitbucket.tsv.authenticate.totp-code.create - POST /rest/tsv/latest/authenticate/totp-code - 使用 TOTP 验证码认证
bitbucket.tsv.elevate-permissions.list - GET /rest/tsv/latest/elevate-permissions - 获取提权会话状态
bitbucket.tsv.elevate-permissions.password.create - POST /rest/tsv/latest/elevate-permissions/password - 使用密码创建提权会话
bitbucket.tsv.elevate-permissions.recovery-code.create - POST /rest/tsv/latest/elevate-permissions/recovery-code - 使用恢复码创建提权会话
bitbucket.tsv.elevate-permissions.totp.create - POST /rest/tsv/latest/elevate-permissions/totp - 使用 TOTP 创建提权会话
bitbucket.tsv.sso-management-status.list - GET /rest/tsv/latest/sso-management-status - 获取 SSO 管理状态
bitbucket.tsv.status.get - GET /rest/tsv/latest/status - 获取两步验证状态
bitbucket.tsv.totp.complete-enforced-enrollment.create - POST /rest/tsv/latest/totp/complete-enforced-enrollment - 完成强制两步验证注册
bitbucket.tsv.totp.complete-enrollment-update.create - POST /rest/tsv/latest/totp/complete-enrollment-update - 完成两步验证认证应用更新
bitbucket.tsv.totp.complete-voluntary-enrollment.create - POST /rest/tsv/latest/totp/complete-voluntary-enrollment - 完成自愿两步验证注册
bitbucket.tsv.totp.recovery-code.rotate - POST /rest/tsv/latest/totp/recovery-code/rotate - 轮换恢复码
bitbucket.tsv.totp.start-enforced-enrollment.create - POST /rest/tsv/latest/totp/start-enforced-enrollment - 开始强制两步验证注册
bitbucket.tsv.totp.start-enrollment-update.create - POST /rest/tsv/latest/totp/start-enrollment-update - 开始两步验证认证应用更新
bitbucket.tsv.totp.start-voluntary-enrollment.create - POST /rest/tsv/latest/totp/start-voluntary-enrollment - 开始自愿两步验证注册
bitbucket.tsv.totp.unenroll.delete - DELETE /rest/tsv/latest/totp/unenroll - 注销当前用户的两步验证
bitbucket.tsv.totp.unenroll.user.delete - DELETE /rest/tsv/latest/totp/unenroll/user/{userName} - 注销指定用户的两步验证
bitbucket.users.list - GET /rest/api/1.0/users - 获取 Bitbucket 用户列表
bitbucket.zdu.approve - POST /rest/zdu/approve - 批准并完成 ZDU 升级
bitbucket.zdu.cancel - POST /rest/zdu/cancel - 取消 ZDU 升级
bitbucket.zdu.cluster.get - GET /rest/zdu/cluster - 获取集群概览（状态与节点组成）
bitbucket.zdu.nodes.get - GET /rest/zdu/nodes/{nodeId} - 获取指定节点的信息
bitbucket.zdu.start - POST /rest/zdu/start - 开始 ZDU 升级（允许集群异构升级）
bitbucket.zdu.state.get - GET /rest/zdu/state - 获取集群状态及响应节点信息
