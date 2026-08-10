# 暴露层级（Exposure Tiers）

> **以英文版为准**：[English](../en/Exposure-Tiers.md)

暴露层级决定 registry 操作中哪些能被 LLM agent 发现和执行。它是
**agent 暴露边界，不是授权边界**——见[安全模型](Security-Model.md)。

## 四个层级

层级是累积的：每层包含其下全部。

| Tier           | 增加的能力                             |
| -------------- | -------------------------------------- |
| `read`（默认） | GET 等无副作用查询                     |
| `safe`         | 常规创建、更新与评论                   |
| `risky`        | 删除、工作流转换、合并等高影响状态变更 |
| `max`          | 其余全部策略操作                       |

各 tier 的操作计数不在此复述，因为策略每次从官方 spec 重新生成都会变化。
生成的 `src/exposure-policy.json` 是唯一事实源；运行时
`atlassian_discover_operations` 列出的就是当前配置可调用的全部操作。

策略还永久排除了全局/系统管理操作（集群、索引、迁移、升级、许可、全局
方案、安全引导等）。被排除操作不在运行时策略中：任何 flag 都无法恢复，
调用即 fail-closed。

## 选择层级

```bash
npx @zaimokuza/atlassian-server-mcp                              # read（默认）
npx @zaimokuza/atlassian-server-mcp --exposure-tier=safe
npx @zaimokuza/atlassian-server-mcp --exposure-tier=risky
npx @zaimokuza/atlassian-server-mcp --exposure-tier=max
```

或环境变量 `ATLASSIAN_EXPOSURE_TIER=safe`。

建议：

- **`read`**：问答、报表、分诊类助手。
- **`safe`**：需要在监督下建/改 issue、页面、PR 的 agent。
- **`risky`**：确实需要删除、转换、合并时。
- **`max`**：管理员辅助场景；未被永久排除的全部可调用。

## FORCE 模式微调

`--force-include-ops` 与 `--force-exclude-ops` 接受可重复的段级 glob
（`*` 段内、`**` 跨段），作用于 operation ID：

```bash
# 只读，但允许创建 Jira issue：
npx @zaimokuza/atlassian-server-mcp --force-include-ops=jira.issue.create

# safe 层级，但隐藏全部 Jira 项目操作：
npx @zaimokuza/atlassian-server-mcp --exposure-tier=safe --force-exclude-ops=jira.project.*
```

环境变量等价物：`ATLASSIAN_FORCE_INCLUDE_OPERATIONS`、
`ATLASSIAN_FORCE_EXCLUDE_OPERATIONS`（逗号分隔）。注意拼写——错误拼写
`..._OPREATIONS` 会被拒绝并报错。

优先级（从强到弱）：

```text
永久排除
  > FORCE_EXCLUDE
  > FORCE_INCLUDE
  > 固有 tier 与配置 tier 比较
  > 未知 / 不支持 / 未配置产品 => 拒绝
```

FORCE include 只改变暴露，永不改变操作的固有 tier 或 destructive 元数据，
也无法复活被排除或未知操作。

## 执行表现

- `atlassian_discover_operations` 只列出当前配置可调用的操作。
- 执行被隐藏、被排除或未知操作返回结构化错误（fail-closed），绝不
  透传。
- resolver 决策是通用 execute、typed 工具、下载与 server info 共用的唯一
  授权点。

策略事实来源与刷新流程见项目文档
[`docs/zh-CN/exposure-policy.md`](../../zh-CN/exposure-policy.md)（英文版
为准）。

---

[English version](../en/Exposure-Tiers.md)（英文版为准）
