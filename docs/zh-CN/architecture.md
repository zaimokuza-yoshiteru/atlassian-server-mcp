# 架构

> **本文以英文版为准**：[`docs/en/architecture.md`](../en/architecture.md)。中文翻译仅供参考，如有出入以英文版为准。

## 运行时流程

```text
MCP client
  -> typed workflow tools 或 atlassian_execute_operation
  -> 过滤后的 operation registry（OpenAPI 生成 + exposure policy）
  -> resolveExposure（tier + FORCE + 已配置产品）
  -> 使用调用方 PAT 的产品 HTTP client
  -> 响应投影、字节预算与 cursor 信封
```

## 事实来源

操作目录有多个职责刻意分离的来源：

- 入库的 OpenAPI inventory 与 `scripts/generate-operations.mjs` 生成原始
  method、path、参数与请求 schema 摘要。
- `rule/source.md` 是人工评审的策略输入，`src/exposure-policy.json` 是其
  生成的运行时产物。
- `src/operations/registry.json` 与三个生成的 TypeScript 文件派生自
  `rule/spec-cache/` 中锁定的官方快照。
- `resolveExposure()` 是 discover、describe、通用 execute、typed 工具、
  下载与对外 server-info 共用的唯一授权决策点。

稳定的请求模板作为 operation 元数据生成，只提供与实例无关的形状指引；
实例特定的字段与选项必须来自运行时元数据工具。

服务器永远不会提升 PAT 权限。Atlassian 仍是每个请求的最终授权边界。

## 产品激活与启动

`JIRA_URL`、`CONFLUENCE_URL`、`BITBUCKET_URL` 各自独立激活对应产品，至少
需要一个 URL。HTTP client、typed 工具、discovery 与健康信息只为已配置的
产品构建。

缺失必需的本地配置是致命的。网络失败、凭证被拒、版本超出生成/测试基线
只产生启动警告，不会阻止 stdio MCP 初始化；具体调用仍返回真实的连接/
认证错误。

## 暴露层级

默认 `read`；合法 tier 为 `read`、`safe`、`risky`、`max`。
`--force-include-ops` 与 `--force-exclude-ops` 接受可重复的段级 glob。
FORCE 排除优先于包含；永久排除或未知操作始终拒绝。固定计数、优先级链与
刷新命令见 [exposure-policy.md](exposure-policy.md)（英文版为准；中文版在
`docs/zh-CN/exposure-policy.md`）。

## 请求指引与错误

稳定的产品格式可作为 `requestBodyTemplate` 附加到操作上。实例特定的
Jira 字段 ID、必填标记与选项永远不会烘焙进模板；typed 的 create/edit
元数据工具查询目标实例，并至少使用 `standard` 响应投影。

Atlassian HTTP 失败以有界、脱敏的结构化错误越过 MCP 边界。Jira 与
Bitbucket 的字段错误还会归一化为 `fieldErrors`，原始的安全详情仍可用。
任何请求都不会自动重试（包括 429、5xx 或网络错误）——重试与否由调用
方决定；超时或 5xx 响应的上游写入结果可能未知。

## 文件边界

multipart 上传与二进制下载默认禁用，除非配置了本地 `ATLASSIAN_FILE_ROOT`
（或产品级 `JIRA_FILE_ROOT`、`CONFLUENCE_FILE_ROOT`、`BITBUCKET_FILE_ROOT`）。
路径必须绝对且位于该 root 之下；上传有大小上限，已有下载目标永远不会
被覆盖（限制见
[附件与大结果](../wiki/Attachments-and-Large-Results.zh-CN.md)）。
