# 官方接口清单数据管线

`fetch-api-inventory.mjs` 是官方接口清单的可重复入口。它只在显式传入 `--refresh` 时尝试取得新快照；普通执行和 CI 默认离线读取已提交的 `rule/spec-cache/`。

## 文件与口径

- `spec-cache/{jira,confluence,bitbucket}.json`：官方 OpenAPI 快照的规范化 JSON。
- `spec-cache/manifest.json`：来源 URL、OpenAPI 版本、快照 SHA-256、inventory/diff hash 和抓取时间；manifest 最后写入，作为提交标记。
- `api-inventory-{product}.json`：按 `(product, method, path)` 排序的完整官方清单。每项含 `product`、`method`、`path`、`summary`、`sourceKind`、`inProjectBaseline`；范围外 Jira 项含 `scopeReason`。
- `api-inventory-diff.md`：official full、project baseline、source.md 三组集合差异。
- `api-inventory-official.md`：项目基线清单（人工审定的数据源，非文档）。`scripts/generate-operations.mjs` 与 `fetch-api-inventory.mjs` 按格式敏感模式逐行解析，已列入 `.prettierignore`，禁止重排格式。

计数口径：以 `node rule/fetch-api-inventory.mjs --offline --check` 的输出为准，字段为 `specDiscovered`（按产品）、`documentedSupplements`、`officialFull`、`projectBaseline`、`source`。Jira 的 `/rest/agile/1.0/**` 与 `/rest/auth/1/**` 保留在 full inventory，但标记为范围外。

## 首次建库

```bash
node rule/fetch-api-inventory.mjs --refresh --bootstrap
```

首次建库要求八个目标文件全部不存在，并校验上述计数和 project baseline 集合。bootstrap 缺少任何官方输入时直接失败，不回退历史目录。

只存在部分目标文件会失败，避免产生不可验证的半套快照。

## 日常检查与刷新

```bash
node rule/fetch-api-inventory.mjs --offline --check
```

官方快照 SHA 变化即 drift，即使端点集合没有变化也会失败且不覆盖已提交文件。确认官方变更后才运行：

```bash
node rule/fetch-api-inventory.mjs --refresh --accept-drift
```

接受 drift 只更新快照、清单和 diff，不会自动修改 `source.md`、tier 或 generator override。完成人工审查后，再运行 policy builder 和项目 CI。

固定检查入口：

```bash
pnpm operations:generate
pnpm operations:check
node rule/fetch-api-inventory.mjs --offline --check
pnpm inventory:check
pnpm policy:generate
pnpm policy:check
```
