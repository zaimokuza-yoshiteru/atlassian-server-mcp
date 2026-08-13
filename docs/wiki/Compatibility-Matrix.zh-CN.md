# 兼容矩阵

> **以英文版为准**：[English](Compatibility-Matrix.md)

## 运行时

| 组件    | 要求                                                                              |
| ------- | --------------------------------------------------------------------------------- |
| Node.js | `>=22`（不支持 Node 20）                                                          |
| 传输    | MCP over stdio                                                                    |
| 产品    | Jira / Confluence / Bitbucket **Data Center**（自托管）；Atlassian Cloud 不在范围 |

## 产品版本基线

以下版本是**生成与测试基线**，不是启动白名单。对其他版本服务器可启动
并给出警告；实际 API 兼容性由目标实例决定。

| 产品       | 基线版本             | 锁定 E2E 镜像                    |
| ---------- | -------------------- | -------------------------------- |
| Jira       | DC 10.3 / 11.3       | `atlassian/jira-software:11.3.5` |
| Confluence | DC 9.2 / 10.2        | `atlassian/confluence:10.2.11`   |
| Bitbucket  | DC 9.4 / 10.2 / 10.4 | `atlassian/bitbucket:10.4.1`     |

OpenAPI 生成锁定官方 spec：Jira DC 11.3.8（v11003）、Confluence DC
10.2.14（v10214）、Bitbucket DC 10.4（v1004）——见
[`rule/api-inventory-official.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/rule/api-inventory-official.md)
（英文）。

## API 范围

v1 范围内：

- Jira DC 平台 API（`/rest/api/2/**`）
- Jira Software Agile API（`/rest/agile/**`）
- Confluence DC API（`/rest/api/**`）
- Bitbucket DC API（官方参考收录的全部端点）

v1 范围外：

- Jira Service Management、Assets、Marketplace 插件 API
- Atlassian Cloud API
- 全局/系统管理（集群、索引、迁移、升级、许可、全局方案、安全引导）——
  从 registry 永久排除

## CI 矩阵（开发）

项目自身在 Node 22 + 24 × Ubuntu + Windows 上测试，另有 Docker 构建
job。这面向贡献者而非部署方；见
[`docs/zh-CN/test-strategy.md`](https://github.com/zaimokuza-yoshiteru/atlassian-server-mcp/blob/main/docs/zh-CN/test-strategy.md)（英文版为准）。

---

[English version](Compatibility-Matrix.md)（英文版为准）
