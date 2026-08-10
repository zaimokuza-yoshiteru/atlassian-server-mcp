# 暴露策略（Exposure policy）

> **本文以英文版为准**：[`docs/en/exposure-policy.md`](../en/exposure-policy.md)。中文翻译仅供参考，如有出入以英文版为准。

`rule/source.md` 是人工维护的策略输入。`rule/build-policy.mjs` 校验它并
生成 `src/exposure-policy.json`；生成文件是运行时策略产物，禁止手改。
原始 operation registry 来自 `rule/spec-cache/` 锁定的官方快照与
`scripts/generate-operations.mjs`。

运行时流水线：

```text
official spec cache + source.md
        -> build-policy.mjs
        -> src/exposure-policy.json
        -> POLICY_OPERATIONS
        -> resolveExposure()
        -> discover / 通用 execute / typed / download 授权
```

## 层级（Tiers）

每个策略操作有一个固有 tier：`read`、`safe`、`risky` 或 `max`。配置的
tier 暴露该层级及以下的全部操作。

生成的 `src/exposure-policy.json` 是操作清单与各操作 tier 的唯一事实
源；操作计数与 tier 分布不在此复述，因为策略每次重新生成都会变化。直接
查看该产物，或对运行中的 server 使用 `atlassian_discover_operations`
查询。

策略还记录了一批永久排除的操作。它们不在 `POLICY_OPERATIONS` 中，
无法通过 FORCE include 恢复，调用时 fail-closed 拒绝。

## FORCE 优先级

`--force-include-ops` 与 `--force-exclude-ops` 接受校验过的 `*` 与 `**`
段级 glob，可重复。对应环境变量为 `ATLASSIAN_FORCE_INCLUDE_OPERATIONS`
与 `ATLASSIAN_FORCE_EXCLUDE_OPERATIONS`。排除优先于包含：

```text
永久排除
  > FORCE_EXCLUDE
  > FORCE_INCLUDE
  > 固有 tier 与配置 tier 比较
  > 未知 / 不支持 / 未配置的产品 => 拒绝
```

FORCE include 只改变暴露，永远不会改变操作的固有 tier 或 destructive
元数据。resolver 的决策带有 reason，FORCE 命中时还带匹配的模式。resolver
是每个外部可调用路径的安全边界；MCP annotations 与 typed 工具注册只是
面向客户端的提示，无法绕过它。

## 刷新策略输入

常规生成与检查都是离线的：

```bash
pnpm operations:generate
pnpm operations:check
pnpm policy:generate
pnpm policy:check
pnpm inventory:check
```

要有意刷新官方快照，使用显式联网命令并审查产生的 SHA、inventory、
diff、manifest 与策略变化：

```bash
node rule/fetch-api-inventory.mjs --refresh --bootstrap
```

有 drift 的刷新需要 `--accept-drift`；同 SHA 刷新零写入。生成的操作文件、
registry、exposure policy、inventory 与 manifest 都是入库产物，必须重新
生成而不是手改。
