# 故障排查

> **以英文版为准**：[English](Troubleshooting.md)

先跑严格起飞前检查——它把大多数配置问题变成可行动的一行，而不是栈
追踪：

```bash
npx @zaimokuza/atlassian-server-mcp doctor
```

任一 FAIL 非零退出并打印修复建议；WARN（如产品版本偏离测试基线）不
阻塞。

## 常见问题

### `ECONNREFUSED` / 产品不可达

- URL 错误、实例宕机或防火墙拦截。
- 企业代理后设置 `ATLASSIAN_PROXY` / `HTTPS_PROXY` 并检查 `NO_PROXY`——
  见[认证与 TLS](Authentication-and-TLS.zh-CN.md)。

### 工具调用返回 401 / 403

- 401：PAT 缺失、过期或被吊销；或 Basic 凭证错误。重建 PAT
  （Profile → Personal Access Tokens）。
- 403：凭证有效但账号在目标项目/空间/仓库没有权限。本服务器不提升
  权限——在 Atlassian 侧修授权。
- 错误信息一律脱敏，凭证不会出现在消息里。

### 证书错误（`self-signed certificate`、`UNABLE_TO_VERIFY_LEAF_SIGNATURE`）

- 首选：给服务器企业 CA——`JIRA_CA_FILE` / `CONFLUENCE_CA_FILE` /
  `BITBUCKET_CA_FILE`。
- 仅本地测试：`--no-tls-verify` 或 `ATLASSIAN_TLS_VERIFY=false`。其他
  场景不安全；校验关闭时总有警告。
- `ATLASSIAN_TLS_VERIFY` 取 `true`/`false` 之外的值会启动失败——检查
  拼写。

### 启动错误：URL "must not embed credentials"

base URL 只允许 `scheme://host[:port][/path]`。去掉 `user:pass@`、
query 与 fragment；PAT 放进 `*_TOKEN`。

### "At least one product URL is required" / 产品工具缺失

产品及其 typed 工具只在设置了 `*_URL` 且凭证完整（产品 PAT 或完整的
共享 Basic 对）时存在。

### 启动 / doctor 的版本警告

版本基线（Jira 10.3/11.3、Confluence 9.2/10.2、Bitbucket
9.4/10.2/10.4）是生成/测试基线，不是白名单。其他版本可启动并收到警告；
实际兼容性由目标实例的 API 行为决定。见[兼容矩阵](Compatibility-Matrix.zh-CN.md)。

### cursor 过期或被拒

分页 cursor 经 HMAC 签名、绑定操作与参数、15 分钟过期。从头重新开始
查询（或调大 `--cursor-ttl-seconds`）。cursor 只存在于 GET 操作。

### 调用返回 "redirect" 错误

客户端从不跟随重定向；3xx 通常意味着会话过期或实例前方有登录页重定
向。检查凭证，以及是否有反向代理/WAF 拦截了 API 路径。

### 超时或 5xx 后的写操作

服务器对任何请求都不自动重试（包括 429、5xx 或网络错误）——是否重试
由调用方判断；丢失的响应可能掩盖了成功的写入。重复调用前先在产品 UI
确认对象状态。Confluence 更新报 `version conflict` 说明页面被改过：
重新读取后有意重试。

### 操作找不到 / 不可发现

- 操作高于你的 `--exposure-tier`、属于永久排除操作，或属于未配置产品。
  见[暴露层级](Exposure-Tiers.zh-CN.md)。
- 用 `atlassian_discover_operations({ query: "..." })` 查当前配置实际
  暴露了什么。

### 提到 file root 的上传/下载错误

`ATLASSIAN_FILE_ROOT` 未设置、路径非绝对、路径逃逸沙箱，或目标文件已
存在（下载永不覆盖）。上传/下载的具体限制见
[附件与大结果](Attachments-and-Large-Results.zh-CN.md)。

## 仍然卡住

- 保持启动探测开启（默认）并阅读 stderr——所有诊断都走 stderr，绝不
  走 stdout。
- 在项目仓库提 issue，附上 doctor 输出。

---

[English version](Troubleshooting.md)（英文版为准）
