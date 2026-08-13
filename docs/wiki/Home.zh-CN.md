# Atlassian Server MCP Wiki

> **以英文版为准**：[English](Home.md)

一个 TypeScript MCP 2.x stdio server，把 LLM agent 连接到自托管的 **Jira、
Confluence、Bitbucket Data Center**。客户端看到的是一小组面向常见工作流的
typed 工具，加上通用的 discover/describe/execute 工具；策略管控的 REST
operation 注册表通过通用工具按需发现、执行。

## 能做什么

- **Jira**：JQL 搜索、issue 读写/转换、评论、附件、字段与 create/edit
  元数据——以及 Jira Software Agile API（board、sprint、backlog、epic、
  estimation、rank）。
- **Confluence**：CQL 搜索、内容读写删、附件、从文件写入大页面。
- **Bitbucket**：仓库、提交、PR（创建、评论、review、合并）、diff/raw/
  archive 下载。

## 默认安全

- 默认 **`read` 暴露层级**——写操作只有显式 opt-in
  （`--exposure-tier=safe|risky|max`）才暴露。
- **TLS 校验默认开启**；PAT 认证优先。
- 凭证在所有错误与日志中脱敏。
- 文件访问沙箱在显式本地 root 之下，默认关闭。
- 高影响管理操作被永久排除。

## 页面导航

- [安装](Installation.zh-CN.md)
- [客户端配置](Client-Configuration.zh-CN.md)
- [认证与 TLS](Authentication-and-TLS.zh-CN.md)
- [暴露层级](Exposure-Tiers.zh-CN.md)
- [Jira 工作流](Jira-Workflows.zh-CN.md)
- [Confluence 工作流](Confluence-Workflows.zh-CN.md)
- [Bitbucket 工作流](Bitbucket-Workflows.zh-CN.md)
- [附件与大结果](Attachments-and-Large-Results.zh-CN.md)
- [故障排查](Troubleshooting.zh-CN.md)
- [兼容矩阵](Compatibility-Matrix.zh-CN.md)
- [安全模型](Security-Model.zh-CN.md)
- [升级指南](Upgrade-Guide.zh-CN.md)

---

[English version](Home.md)（英文版为准）
