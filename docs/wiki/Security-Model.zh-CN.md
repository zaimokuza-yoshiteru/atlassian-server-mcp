# 安全模型

> **以英文版为准**：[English](Security-Model.md)

本服务器防什么、不防什么。一句话：它是带暴露治理、凭证卫生与传输可靠
性的 MCP 协议适配层；授权本身永远在 Atlassian。

## 信任边界

- **本地用户是被信任的。** 他们控制进程、参数与环境。本层不防御他们。
- **LLM agent 是被治理方。** 暴露层级约束 agent 可能意外或未经监督
  调用的操作范围。
- **Atlassian 是最终授权边界。** 每个请求携带调用者自己的 PAT；服务器
  不提升、不合并权限。

## 暴露治理

- 默认 `read` 层级；`safe` / `risky` / `max` 需显式放宽。
- 全局/系统管理操作被**永久排除**出运行时策略，任何 flag 都无法恢复。
- 未知、被隐藏或被排除操作 **fail-closed**——resolver 是通用 execute、
  typed 工具、下载与 server info 共用的唯一决策点。MCP annotations 只是
  客户端提示，无法绕过。
- 这是暴露边界，**不是**授权边界：不替代 PAT 权限、企业策略、审批或
  审计。项目/空间/仓库级 allowlist 有意不在 MCP 层复制——权限控制是
  Atlassian 服务端的职责。

## 凭证处理

- 每产品 PAT（Bearer）优先；一个共享 Basic 兜底。
- 凭证、`Authorization`、`Cookie` 头在所有工具错误与日志中**脱敏**；
  上游 5xx 实现细节被抑制，错误详情有深度/大小上限。
- base URL 内嵌 `user:pass@`（或 query/fragment）启动即拒绝，凭证不可能
  经 `atlassian_server_info` 泄漏。
- token 经 MCP client env 插值或本地 `0600` 文件存放；密钥链集成有意
  不做。

## 传输安全

- TLS 证书与主机名校验默认开启；关闭只能显式进行、严格解析（拼写错误
  直接启动失败而非静默关闭），且总有警告。
- **从不跟随重定向。** 3xx 变成结构化错误——防止凭证被转发到别的源，
  也防止重定向 HTML 被当成"成功"下载落盘。
- **任何请求都不自动重试**——读或写，包括 429、5xx 或网络错误；是否
  重试由调用方模型判断。超时或 5xx 后上游结果未知；重放写操作可能造成
  重复。

## 文件沙箱

- 本地文件访问经 `ATLASSIAN_FILE_ROOT`（或产品级 root）opt-in；所有路径
  符号链接解析后必须在 root 内。
- 上传、下载、`outputPath` 与 `storageValueFile` 均有大小上限，仅限常规
  文件，读取前先校验大小，且永不覆盖已存在文件。具体限制见
  [附件与大结果](Attachments-and-Large-Results.zh-CN.md)。

## cursor 完整性

分页 cursor 经 **HMAC 签名**，绑定操作与请求参数，15 分钟过期，且只存在
于 GET 操作——伪造或挪用的 continuation 无法偷渡写操作或别的查询。

## 有意不做

- **无审计日志。** Atlassian Data Center 自带审计；本项目的安全边界是
  exposure policy + 凭证脱敏。
- 无密钥链集成、无资源级 allowlist、无自动重试。

## 报告

安全问题请通过项目仓库的 GitHub issues 报告。只有最新的次版本线接收安
全修复。

---

[English version](Security-Model.md)（英文版为准）
