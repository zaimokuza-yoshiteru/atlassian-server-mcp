# 认证与 TLS

> **以英文版为准**：[English](../en/Authentication-and-TLS.md)

## 凭证模型

每个已配置产品需要凭证：

- **PAT（首选）**：`JIRA_TOKEN`、`CONFLUENCE_TOKEN`、`BITBUCKET_TOKEN`——
  以 HTTP `Bearer` 头发送。
- **共享 Basic 兜底**：`ATLASSIAN_USERNAME` + `ATLASSIAN_PASSWORD`，只
  用于没有 token 的产品，两个变量必须同时设置。

产品 token 非空时永远优先于共享 Basic。配置了 URL 但既没有产品 PAT 也
没有完整 Basic 对，是致命的配置错误。PAT 在各产品 UI 的
Profile → Personal Access Tokens 创建。

服务器**以你的身份**行动：每个请求携带你的 PAT，Atlassian 是最终授权
边界，服务器不会提升或合并权限。每位开发者应运行自己的实例、用自己的
PAT。

base URL 只允许 `scheme://host[:port][/path]`。URL 内嵌凭证
（`https://user:pass@host`）或带 query/fragment 会在启动时被拒绝——把
PAT 放进 `*_TOKEN`。

## TLS 校验

证书与主机名校验**默认开启**。优先级：`--tls-verify` /
`--no-tls-verify` > `ATLASSIAN_TLS_VERIFY` > 安全默认值（`true`）。flag
与 env 冲突时 flag 生效并打印警告。

`ATLASSIAN_TLS_VERIFY` 严格解析：未设置用默认值；`true`/`false`（大小写
不敏感、允许首尾空白）被接受；**其他任何值直接启动失败**——拼写错误
不可能静默关闭校验。

关闭校验（`--no-tls-verify` 或 `ATLASSIAN_TLS_VERIFY=false`）仅可用于
对自签名端点的本地测试。HTTPS 仍然加密，但网络中间人可以冒充服务器。
校验关闭时服务器会在 stderr 打印警告。

## 自定义 CA

企业 CA 提供每产品 PEM 文件（仅在校验开启时读取）：

```bash
export JIRA_CA_FILE=/absolute/path/company-ca.pem
export CONFLUENCE_CA_FILE=/absolute/path/company-ca.pem
export BITBUCKET_CA_FILE=/absolute/path/company-ca.pem
```

## 企业代理

设置 `ATLASSIAN_PROXY`（或通用的 `HTTPS_PROXY` / `https_proxy`；两者同时
存在时 `ATLASSIAN_PROXY` 优先）：

```bash
export ATLASSIAN_PROXY=http://proxy.corp.internal:3128
export NO_PROXY=atlassian.corp.internal,.internal
```

`NO_PROXY` / `no_proxy` 支持精确主机、`.后缀`、`host:port` 与 `*`。代理
URL 内嵌的凭证（`http://user:pass@proxy:3128`）只用于代理认证。

## User-Agent

服务器自报 `atlassian-server-mcp/<version>`。WAF 或网关要求特定
User-Agent 时全局覆盖：

```bash
export ATLASSIAN_USER_AGENT=my-gateway-agent/1.0
```

## 凭证卫生保证

- 凭证、`Authorization`、`Cookie` 头在所有工具错误与日志中脱敏。
- 启动时认证失败只是警告；工具调用返回的真实错误同样统一脱敏。
- 生成的 E2E 辅助凭证（仅维护者机器）以 `0600` 权限存储，永不写回
  配置文件。

---

[English version](../en/Authentication-and-TLS.md)（英文版为准）
