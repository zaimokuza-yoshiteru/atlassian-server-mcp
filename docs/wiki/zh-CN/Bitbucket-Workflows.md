# Bitbucket 工作流

> **以英文版为准**：[English](../en/Bitbucket-Workflows.md)

针对 Bitbucket Data Center 的典型 agent 任务。typed 工具覆盖 PR 生命
周期，仓库浏览与下载走通用工具。

## 浏览仓库与提交

```
bitbucket_list_repositories({ projectKey: "MCP" })
bitbucket_list_commits({ projectKey: "MCP", repositorySlug: "backend", limit: 20 })
```

## 列出与读取 PR

```
bitbucket_list_pull_requests({ projectKey: "MCP", repositorySlug: "backend", state: "OPEN" })
bitbucket_get_pull_request({ projectKey: "MCP", repositorySlug: "backend", pullRequestId: 42 })
```

## 创建 PR（safe 层级）

```
bitbucket_create_pull_request({
  projectKey: "MCP",
  repositorySlug: "backend",
  pullRequest: {
    title: "修复缓存加载竞态",
    description: "见 MCP-123",
    fromRef: { id: "refs/heads/bugfix/cache-race" },
    toRef: { id: "refs/heads/main" }
  }
})
```

确切请求形状用 `atlassian_describe_operation({ operationId:
"bitbucket.pullrequests.create" })` 查看。

## 评论与 review

```
bitbucket_add_pull_request_comment({
  projectKey: "MCP",
  repositorySlug: "backend",
  pullRequestId: 42,
  text: "LGTM，第 87 行有个小瑕疵。"
})
```

approve/unapprove、decline/reopen 是 registry 操作
（`bitbucket.pullrequests.approve`、`.decline`、`.reopen` 等），经
`atlassian_execute_operation` 调用。

## 合并（risky 层级）

```
bitbucket_merge_pull_request({
  projectKey: "MCP",
  repositorySlug: "backend",
  pullRequestId: 42,
  version: 3
})
```

`version` 是 PR 当前版本（来自 `bitbucket_get_pull_request`）——防止
合并一个在你查看后已变化的 PR。合并属于 `risky`，不以
`--exposure-tier=risky` 运行时不可见。

## diff 与文件下载

diff、raw 文件内容与仓库 archive 是二进制/文本下载，走文件传输路径
（保存到磁盘需要 file root）：

```
atlassian_execute_operation({
  operationId: "bitbucket.pullrequests.diff",
  pathParams: { projectKey: "MCP", repositorySlug: "backend", pullRequestId: 42 },
  downloadPath: "/abs/path/under/file-root/pr-42.diff"
})
```

`downloadPath` / `outputPath` 规则与限制见
[附件与大结果](Attachments-and-Large-Results.md)。

## 备注

- 仓库删除等管理操作位于更高层级或被永久排除；操作不可发现时查
  [暴露层级](Exposure-Tiers.md)。
- 结构化错误含 `status`、`operationId` 与脱敏上游详情；合并返回 409
  说明版本校验失败——重新读取 PR。

---

[English version](../en/Bitbucket-Workflows.md)（英文版为准）
