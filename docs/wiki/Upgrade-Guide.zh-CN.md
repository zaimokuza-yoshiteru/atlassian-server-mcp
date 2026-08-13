# 升级指南

> **以英文版为准**：[English](Upgrade-Guide.md)

## 版本策略

包 `@zaimokuza/atlassian-server-mcp` 遵循语义化版本，重要变更记录在
GitHub Releases 页面。v1.0.0 是首个稳定版本。

## 升级

**npm 安装：**

```bash
# client 运行 npx @zaimokuza/atlassian-server-mcp —— 清 npx 缓存或钉版本
npx @zaimokuza/atlassian-server-mcp@latest doctor
```

**源码检出：**

```bash
git pull --ff-only
pnpm install
pnpm build
node dist/cli.js doctor
```

## 每次升级后

1. 读新版本的 GitHub Release 说明——breaking change 与新环境变量都会标
   注。
2. 对每个已配置产品重跑 `doctor`；可能出现新检查项。
3. 如果你钉了 `--exposure-tier` 或 FORCE 模式，重新查看
   `atlassian_discover_operations` 输出：操作数量随版本变化，新操作可能
   落入你已有的 glob。
4. 对照新默认值检查你钉的限制（`--max-download-bytes`、
   `--max-output-bytes`、`--cursor-ttl-seconds`）。

## 兼容性预期

- operation registry 与 exposure policy 每个版本从官方 Atlassian spec
  重新生成；operation ID 在同一主版本内稳定。
- 错误契约（`error.kind` / `status` / `operationId` / `fieldErrors`）在
  同一主版本内稳定。
- 默认值只在 release 说明标注时变化。

---

[English version](Upgrade-Guide.md)（英文版为准）
