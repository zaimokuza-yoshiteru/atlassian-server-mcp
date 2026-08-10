# 发布流程

> **本文以英文版为准**：[`docs/en/release-process.md`](../en/release-process.md)。中文翻译仅供参考，如有出入以英文版为准。

`@zaimokuza/atlassian-server-mcp` 的维护者发布备忘。发布由
`.github/workflows/release.yml` 自动执行（推送 `v*` tag 触发，由配了
required reviewers 的 `npm-production` environment 把关）。维护者负责在本机
完成证据链、创建 tag、配置一次性的仓库/npm 设置；其余步骤全部在 workflow
中运行。

## 1. 前置门禁

1. 工作区干净：`git status --porcelain` 为空。
2. 本地 `pnpm test:ci` 全绿（与 CI 同一门禁：lint、格式、类型检查、构建、
   带覆盖率门槛的单元测试、契约测试、生成物 drift 检查、打包 smoke）。
3. `vitest.config.ts` 中的单元覆盖率门槛仍反映实测基线（见
   `docs/en/test-strategy.md`）。

## 2. RC Freeze 证据链

发布候选必须由绑定到被发布确切 commit 的本机全量 E2E 来证明（Phase B 的
基线运行不算——后续 phase 改动了 runtime、transport、registry 与生成器）：

1. 记录要被证明的 HEAD SHA（"被证明 SHA"）。
2. 跑本机全量 E2E：`pnpm e2e:all`，然后逐产品 reconcile。每个产品必须
   PASS 且残留 sweep 失败为零。
3. 运行 `node scripts/release-check.mjs`。其契约：
   - 校验工作区干净；
   - 逐产品读取 `.e2e-state/<product>/run-report.json`，要求
     `gitSha == <被证明 SHA>`、`dirty == false`、sweep 失败为零，且
     `coverageSha` / `policySha` 与当前生成物一致；
   - 要求 `numTotalTests > 0` 且失败测试为零——"0 tests / 0 failed" 的
     假报告永远无法通过；
   - 强制执行针对 `tests/e2e/coverage.json` automated 台账的 operation 级
     reconcile（预期操作数按产品从台账动态计算，绝不硬编码）：每个操作
     必须 PASS，PARTIAL 与 NOT RUN 均为零；
   - 要求 `.e2e-state/<product>/run-manifest.json` 存在、JSON 合法，且与
     report 在 product/gitSha/dirty/startedAt/productVersion/
     dockerImageDigest/coverageSha/policySha 上逐项一致；
   - 全部通过则输出 `release-evidence/<被证明SHA>.json`（schema v2：每产品
     操作/测试计数 + 各 report、manifest、invoked-ops journal 的 SHA-256，
     含顶层总计）并打印 `OK`；
   - 任一不满足即非零退出。刻意不提供 `--allow-stale` /
     `--allow-sweep-failures` 逃生开关。
4. 将 `release-evidence/<被证明SHA>.json` 单独提交（message 注明
   evidence for `<被证明SHA>`）。证据 commit 会推进 HEAD；证据内记录的仍
   是被证明的代码 SHA。在证据 commit 上复核可运行
   `node scripts/release-check.mjs --proven-sha <被证明SHA>`。

## 3. 版本与 tag

1. 设置 `package.json` 的 `version`（如 `1.0.0`）。
2. 校验 tarball 内容：`pnpm pack`，确认 `README.md`、`README.zh-CN.md`、
   `LICENSE`、`dist/` 都在包内。
3. 把 tag 打在证据 commit 上（使 tag 自带证据），并核对证据文件内的
   `gitSha` 等于 tag 的父提交。

## 4. 发布（workflow 自动执行，维护者把关）

推送 tag 后 `.github/workflows/release.yml` 在 `npm-production`
environment 中运行（required reviewers 审批后才执行）。workflow 依次：
校验 tag == package.json version → `pnpm install --frozen-lockfile` →
`pnpm test:ci` → 校验 `release-evidence/<tag 父提交>.json` 绑定 tag 的父
提交且 operation 门禁全绿 → 打包 tarball 并检查每个 dist 文件都有对应
源文件 → 生成 SBOM 与 SHA256SUMS → npm 版本查重（已存在即失败）→ 按
fail-closed 的 dist-tag 策略（稳定版 → `latest`，`-rc.N` → `rc`，其他
prerelease 后缀一律失败）以 `--provenance` 发布 → 把预先创建的 draft
GitHub Release 转为公开。

维护者在 workflow 之外的职责：

- 一次性配置：npm trusted publisher 绑定本仓库 + `release.yml` +
  `npm-production` environment；environment 配 required reviewers。不使用
  长期 npm token。
- Release notes：由维护者在 draft GitHub Release 上手工填写（按设计没有
  CHANGELOG），再转公开。
- workflow 上传的附件：tarball、`sbom.json`、`SHA256SUMS` 与 release
  evidence JSON。E2E 原始 report/manifest 在 gitignored 的 `.e2e-state/`
  中，workflow **无法**附加——evidence JSON 内含它们的 SHA-256。如需要
  原始报告附件，由维护者从跑 E2E 的机器上手工上传。
- 仓库设置（转 public、分支保护、secret scanning）属仓库管理动作，不在
  本文档范围。

## 5. 发布后

- 按需把 `version` 提到下一个开发版本。
