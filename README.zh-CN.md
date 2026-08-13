<div align="center">
  <img src="https://raw.githubusercontent.com/zaimokuza-yoshiteru/atlassian-server-mcp/main/assets/banner.svg" alt="atlassian-server-mcp" width="960">
  <br>
  <a href="https://www.npmjs.com/package/@zaimokuza/atlassian-server-mcp"><img src="https://img.shields.io/npm/v/@zaimokuza/atlassian-server-mcp" alt="npm version"></a>
  <a href="https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/zaimokuza-yoshiteru/atlassian-server-mcp/ci.yml?branch=main" alt="CI status"></a>
  <a href="https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/LICENSE"><img src="https://img.shields.io/github/license/zaimokuza-yoshiteru/atlassian-server-mcp" alt="license: MIT"></a>
  <a href="https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/package.json"><img src="https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white" alt="node >= 22"></a>
</div>

# Atlassian Server MCP

[English README](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/README.md)（英文版为准）

一个 TypeScript MCP 2.x stdio server，统一对接 Jira、Confluence、Bitbucket
Data Center。它把高频 typed 工具与固定 REST operation registry 结合，
通过通用工具按需发现，避免完整 registry 灌爆 `tools/list`。

## 特性

- **三产品一个 server**——Jira DC 平台 API 与 Jira Software Agile API
  （board、sprint、backlog、epic）、Confluence、Bitbucket PR 工作流。
- **分层暴露**——每个操作有固有 `read` / `safe` / `risky` / `max`
  层级；agent 只能看到配置层级与 FORCE glob 允许的范围。这是 agent
  暴露边界，不是授权边界。
- **默认安全**——默认只读启动、TLS 校验开启、PAT 认证优先、凭证在
  所有错误与日志中脱敏。
- **策略由官方 spec 生成**——暴露策略从锁定的 Atlassian OpenAPI 快照
  构建；`atlassian_discover_operations` 报告运行中 server 实际暴露的
  内容。
- **严格起飞前 `doctor`**——接入 client 前校验配置、凭证、可达性、
  TLS 与 file root 可写性。

## 快速开始（5 分钟）

1. 安装并构建（需要 Node.js 22 或更新）：

   ```bash
   pnpm install
   pnpm build
   ```

2. 配置至少一个产品。产品 URL 存在即启用；产品 PAT 非空优先，否则需要
   完整的共享 Basic 凭证：

   ```bash
   export JIRA_URL=https://jira.example.internal
   export JIRA_TOKEN=...
   # 可选：CONFLUENCE_URL / CONFLUENCE_TOKEN、BITBUCKET_URL / BITBUCKET_TOKEN
   # Basic 兜底（共享）：ATLASSIAN_USERNAME + ATLASSIAN_PASSWORD
   ```

3. 在 MCP client 中配置：

   ```json
   {
     "mcpServers": {
       "atlassian-dc": {
         "command": "node",
         "args": ["/absolute/path/to/atlassian-server-mcp/dist/cli.js"],
         "env": {
           "JIRA_URL": "https://jira.example.internal",
           "JIRA_TOKEN": "..."
         }
       }
     }
   }
   ```

   包发布后可直接 `npx @zaimokuza/atlassian-server-mcp`。

4. 用严格的起飞前检查验证：

   ```bash
   npx @zaimokuza/atlassian-server-mcp doctor
   ```

   任一 FAIL 非零退出；WARN 不阻塞。

## 安全警告

- TLS 证书与主机名校验**默认开启**。`--no-tls-verify` /
  `ATLASSIAN_TLS_VERIFY=false` 会关闭它，仅可用于对自签名端点的本地
  测试——否则网络中间人可以冒充你的服务器。
- 暴露层级默认 `read`。`--exposure-tier=safe|risky|max` 会扩大 LLM
  agent 可调用的范围；它永远不替代 Atlassian PAT 权限。
- 威胁模型见 Wiki [安全模型](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/wiki/Security-Model.zh-CN)
  页。

## 兼容性

生成/测试基线（不是启动白名单——其他版本可启动并收到警告，实际兼容性
由目标实例决定）：

| 产品       | 基线版本             | 锁定 E2E 镜像                    |
| ---------- | -------------------- | -------------------------------- |
| Jira       | DC 10.3 / 11.3       | `atlassian/jira-software:11.3.5` |
| Confluence | DC 9.2 / 10.2        | `atlassian/confluence:10.2.11`   |
| Bitbucket  | DC 9.4 / 10.2 / 10.4 | `atlassian/bitbucket:10.4.1`     |

要求 Node.js `>=22`。Jira Service Management、Assets 与 Marketplace 插件
API 不在 v1 范围。

## 文档

用户文档在[项目 Wiki](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/wiki/Home.zh-CN)（内容源在
[`docs/wiki/`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/tree/main/docs/wiki)，
自动同步；中文页面带 `.zh-CN` 后缀）：

- [安装](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/wiki/Installation.zh-CN)
  · [客户端配置](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/wiki/Client-Configuration.zh-CN)
  · [认证与 TLS](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/wiki/Authentication-and-TLS.zh-CN)
  · [暴露层级](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/wiki/Exposure-Tiers.zh-CN)
  · [故障排查](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/wiki/Troubleshooting.zh-CN)

项目/开发者文档：

- [`docs/zh-CN/architecture.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/docs/zh-CN/architecture.md)
  — 运行时数据流与事实来源
- [`docs/zh-CN/exposure-policy.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/docs/zh-CN/exposure-policy.md)
  — 从官方 spec 生成的 operation 级暴露策略
- [`docs/zh-CN/tool-contracts.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/docs/zh-CN/tool-contracts.md)
  — 元数据先行写入、请求体模板、错误契约
- [`docs/zh-CN/test-strategy.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/docs/zh-CN/test-strategy.md)
  — CI 与真实产品 E2E 的证据边界，含本地 Data Center E2E 完整流程
- [`docs/zh-CN/release-process.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/docs/zh-CN/release-process.md)
  — 维护者发布备忘

所有开发者文档均有英文版（`docs/en/`），Wiki 页面均有对应英文页（不带后缀），**以英文版为准**。

## 贡献与支持

开发环境准备与生成物纪律见
[`AGENTS.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/AGENTS.md)
及上文开发者文档。bug 报告与功能请求请走 GitHub issues。
