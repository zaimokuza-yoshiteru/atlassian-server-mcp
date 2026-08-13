# 客户端配置

> **以英文版为准**：[English](Client-Configuration.md)

服务器是 stdio MCP server：MCP client 把它作为子进程启动，经 stdio 讲
JSON-RPC。全部配置通过环境变量与命令行参数传入——没有配置文件。

## 最小 client 配置

```json
{
  "mcpServers": {
    "atlassian-dc": {
      "command": "npx",
      "args": ["@zaimokuza/atlassian-server-mcp"],
      "env": {
        "JIRA_URL": "https://jira.example.internal",
        "JIRA_TOKEN": "..."
      }
    }
  }
}
```

源码检出方式指向构建产物：

```json
{
  "mcpServers": {
    "atlassian-dc": {
      "command": "node",
      "args": ["/absolute/path/to/atlassian-server-mcp/dist/cli.js"],
      "env": {
        "JIRA_URL": "https://jira.example.internal",
        "CONFLUENCE_URL": "https://confluence.example.internal",
        "BITBUCKET_URL": "https://bitbucket.example.internal",
        "JIRA_TOKEN": "...",
        "CONFLUENCE_TOKEN": "...",
        "BITBUCKET_TOKEN": "..."
      }
    }
  }
}
```

不要把 token 提交进仓库。优先用 MCP client 的环境变量插值，或用权限
`0600` 的本地文件由 shell 加载。服务器永不打印凭证，但 client 配置文件
的安全性取决于文件权限。

## 命令行参数

| 参数                                     | 含义                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `--exposure-tier=read\|safe\|risky\|max` | 暴露的最宽层级（默认 `read`）。                                                                          |
| `--force-include-ops=<glob>`             | 在层级之外额外暴露指定策略操作；可重复。                                                                 |
| `--force-exclude-ops=<glob>`             | 在层级之内隐藏指定操作；可重复；优先于 include。                                                         |
| `--tls-verify` / `--no-tls-verify`       | 显式覆盖 TLS 校验（flag 优先于 env）。                                                                   |
| `--max-download-bytes=<n>`               | 下载 / `outputPath` 字节上限（默认值与最小值见[附件与大结果](Attachments-and-Large-Results.zh-CN.md)）。 |
| `--max-output-bytes=<n>`                 | 每页序列化响应预算（默认 65,536）。                                                                      |
| `--cursor-ttl-seconds=<n>`               | 分页 cursor 存活时间（默认 900）。                                                                       |
| `--skip-startup-check`                   | 完全跳过（仅告警的）启动探测。                                                                           |
| `doctor`                                 | 子命令：严格起飞前检查，不启动服务。                                                                     |

每个 flag 都有环境变量等价物（`ATLASSIAN_EXPOSURE_TIER`、
`ATLASSIAN_FORCE_INCLUDE_OPERATIONS`、`ATLASSIAN_FORCE_EXCLUDE_OPERATIONS`、
`ATLASSIAN_TLS_VERIFY`、`ATLASSIAN_MAX_DOWNLOAD_BYTES`、
`ATLASSIAN_MAX_OUTPUT_BYTES`、`ATLASSIAN_CURSOR_TTL_SECONDS`）。flag 优先
于环境变量。

## client 能看到什么

- 通用工具：`atlassian_discover_operations`、
  `atlassian_describe_operation`、`atlassian_execute_operation`、
  `atlassian_server_info`。
- typed 工具覆盖常见 Jira issue、Confluence 内容、Bitbucket PR 工作流。
- 只注册**已配置**产品的工具；通用发现也省略未配置产品。
- 只有处于暴露层级及以下的操作能被发现和执行；未知或被排除操作
  fail-closed 拒绝。

## 验证

接入 client 后让 agent 调 `atlassian_server_info`：返回已配置产品、版本
与当前暴露层级。非交互检查先跑 `npx @zaimokuza/atlassian-server-mcp doctor`——见
[安装](Installation.zh-CN.md)。

---

[English version](Client-Configuration.md)（英文版为准）
