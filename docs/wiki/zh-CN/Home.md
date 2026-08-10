# Atlassian Server MCP Wiki

> **以英文版为准**：[English](../en/Home.md)

一个 TypeScript MCP 2.x stdio server，把 LLM agent 连接到自托管的 **Jira、
Confluence、Bitbucket Data Center**。它把高频 typed 工具与固定 REST
operation registry 结合，通过 4 个通用工具按需发现，避免完整 registry
灌爆 `tools/list`。

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

- [安装](Installation.md)
- [客户端配置](Client-Configuration.md)
- [认证与 TLS](Authentication-and-TLS.md)
- [暴露层级](Exposure-Tiers.md)
- [Jira 工作流](Jira-Workflows.md)
- [Confluence 工作流](Confluence-Workflows.md)
- [Bitbucket 工作流](Bitbucket-Workflows.md)
- [附件与大结果](Attachments-and-Large-Results.md)
- [故障排查](Troubleshooting.md)
- [兼容矩阵](Compatibility-Matrix.md)
- [安全模型](Security-Model.md)
- [升级指南](Upgrade-Guide.md)

---

[English version](../en/Home.md)（英文版为准）
