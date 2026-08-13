# 安装

> **以英文版为准**：[English](Installation.md)

## 要求

- **Node.js 22 或更新**（`engines: ">=22"`）。
- 能访问你的 Jira / Confluence / Bitbucket Data Center 实例。
- 运行服务器**不需要** Docker（Docker 只用于项目自身的 E2E 测试环境）。

## npm 包方式

包发布后，包名为 `@zaimokuza/atlassian-server-mcp`，直接运行：

```bash
npx @zaimokuza/atlassian-server-mcp
```

在 MCP client 配置中使用此形式，无需构建步骤。

## 源码方式

```bash
git clone <repository-url>
cd atlassian-server-mcp
pnpm install
pnpm build
node dist/cli.js --help
```

服务器通过 **stdio** 讲 MCP。所有应用日志走 stderr；stdout 只用于 MCP
JSON-RPC。

## 配置产品

产品 URL 存在即启用，可配置一到三个产品；未配置的产品及其 typed 工具
会被隐藏：

```bash
export JIRA_URL=https://jira.example.internal
export JIRA_TOKEN=...

export CONFLUENCE_URL=https://confluence.example.internal
export CONFLUENCE_TOKEN=...

export BITBUCKET_URL=https://bitbucket.example.internal
export BITBUCKET_TOKEN=...
```

token/Basic 规则见[认证与 TLS](Authentication-and-TLS.zh-CN.md)；接入 MCP
client 见[客户端配置](Client-Configuration.zh-CN.md)。

## 用 doctor 验证

默认启动探测只打印警告——产品不可达或 PAT 过期不会阻止服务器启动。
严格的起飞前检查（首次安装、CI 准备）用：

```bash
npx @zaimokuza/atlassian-server-mcp doctor
# 源码方式：
node dist/cli.js doctor
```

`doctor` 逐项输出 PASS/WARN/FAIL 并附可操作的修复建议：

- 配置有效性（至少一个产品 URL、凭证完整性）
- CA 文件可读性（如配置）
- 产品可达性与凭证有效性（经 `serverInfo`）
- 产品版本是否在测试基线内（偏离为 WARN，从不致命）
- TLS 连通性
- `ATLASSIAN_FILE_ROOT` 存在且可写（如配置）

任一 FAIL 非零退出；WARN 不阻塞。失败时见[故障排查](Troubleshooting.zh-CN.md)。

## 下一步

- [客户端配置](Client-Configuration.zh-CN.md)——把服务器接进 MCP client
- [暴露层级](Exposure-Tiers.zh-CN.md)——决定 agent 能看到哪些操作
- [升级指南](Upgrade-Guide.zh-CN.md)——版本间迁移

---

[English version](Installation.md)（英文版为准）
