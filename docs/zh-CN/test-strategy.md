# 测试策略

> **本文以英文版为准**：[`docs/en/test-strategy.md`](../en/test-strategy.md)。中文翻译仅供参考，如有出入以英文版为准。

测试套件把"能在 GitHub Actions 跑的证据"与"需要有 license、有状态的
Atlassian Data Center 产品的证据"分开。只有当请求经 stdio 进入构建后的
MCP server 并到达真实产品时，一个操作才被计为真实 E2E 覆盖。fixture 的
REST 调用永远不计入。

## GitHub Actions

`pnpm test:ci` 按顺序执行：

1. TypeScript 类型检查。
2. 生产构建。
3. 配置、策略、授权、HTTP 构造、投影、分页、cursor、错误与进程内 service
   行为的单元测试，带 v8 覆盖率门槛（见下文"单元覆盖率门禁"）。
4. 契约测试：spawn `dist/cli.js`，通过 stdio 讲 JSON-RPC，用 mock 上游
   验证请求映射、tools/list 元数据与脱敏错误传播。
5. 针对构建出的策略 registry 的 coverage 台账 drift 检查，随后
   是生成的 operations/inventory/policy drift 检查。
6. 打包 smoke：打出 tarball 并用 npm 装进空目录。

CI 有意不运行 Jira、Confluence、Bitbucket 的 Docker 镜像。许可、证书、
启动时间与资源需求使这类任务在普通托管 runner 上不可靠且过于昂贵。

契约测试证明 MCP 边界与映射，不证明与某个 Atlassian 版本的兼容性。没有
真实产品场景时在台账中标记为 `contract-only`。

## 单元覆盖率门禁

单元套件以 v8 覆盖率运行（`vitest run --coverage`），范围 `src/**/*.ts`，
排除生成的操作清单（`src/operations/**`）与类型声明。`vitest.config.ts`
中的 `coverage.thresholds` 是门禁的唯一事实源：实测覆盖率低于门槛时
CI 失败。实测基线不在此复述——重跑套件即可得到当前数字；随覆盖率提升
上调 `vitest.config.ts` 中的门槛。

历史上的盲区补测覆盖 HTTP 错误状态映射（429/5xx，结构化且脱敏的
details）、transport 超时传播（undici headers/body 超时）、TLS 校验路径
（自签名拒绝 / 关闭校验接受 / 自定义 CA 校验）、响应解码边界、multipart
校验、`sanitizeErrorDetails`、`src/json.ts`。已知残留缺口：`src/cli.ts`、
`src/index.ts`、`src/server.ts` 由 stdio/契约套件经子进程覆盖，进程内
读数为未覆盖；`src/service.ts`、`src/errors.ts`、`src/tools-products.ts`
仍有未覆盖的错误与产品注册路径。

## 本地真实产品 E2E

第一版唯一认可的基线是 `compose.yaml` 中的确切默认镜像：

| 产品       | 测试镜像                         |
| ---------- | -------------------------------- |
| Jira       | `atlassian/jira-software:11.3.5` |
| Confluence | `atlassian/confluence:10.2.11`   |
| Bitbucket  | `atlassian/bitbucket:10.4.1`     |

每个产品单独运行。主场景刻意顺序执行且自清理：

- Jira issue：create-metadata → C → R → 附件上传/元数据/下载 → U → R →
  附件删除 → D → 失败 R。
- Confluence 页面：C → R → 附件上传/元数据/下载 → 二进制替换/下载 →
  U → R → 附件删除 → D → 失败 R。
- Bitbucket PR：Basic-auth fixture 项目/仓库/分支 → C → R → diff 下载/
  raw 文件下载/archive 下载 → 评论 → 第二用户 review → merge → R →
  删除仓库 → 删除项目。

每个资源名带唯一 run ID。每个场景使用 `try/finally`，并把已创建/已清理/
清理失败的资源记录到 git 忽略的 `.e2e-state/cleanup-journal.jsonl`。会留
下实质项目级 fixture 的清理失败视为测试失败。

compose 栈还以 `postgres:16-alpine` 作为产品数据库。第一版不维护其他
版本的兼容矩阵；server 不会因版本不同拒绝启动，但测试结论只适用于以上
镜像。

### 首次准备

```bash
cp .env.dc.example .env.dc
node scripts/e2e.mjs jira up       # 每次只启动一个产品
```

首次创建 volume 后仍需在浏览器完成 Atlassian setup wizard、录入 license、
创建管理员。然后在 `.env.dc` 填写该产品 URL、管理员账号密码和首选 PAT。
需要刷新 timebomb license 时执行：

```bash
pnpm dc:setup jira
```

Confluence license 仍需在 UI 更新；这是官方产品边界，不由测试绕过。

### Jira SMTP 一次性配置（mailpit）

Jira E2E 的通知投递验证依赖 mailpit 作为本地 SMTP 捕获器。
`docker compose --profile jira up` 启动后 mailpit 会自动就绪。然后在
Jira UI 中一次性配置（仅需做一次，配置持久化在 Jira home volume 中）：

1. Jira 管理界面 → 系统 → 外发邮件
2. 主机名：`mailpit`，端口：`1025`，协议：`SMTP`
3. 无 TLS、无认证
4. 发送测试邮件确认 mailpit 收到（`http://localhost:8025`）

该配置是 owner 手动操作，不属于自动化测试脚本。

### Jira 自定义字段选项 fixture（可选）

Jira E2E 元数据扫描依赖一个带选项的自定义字段作为 `customfieldoption.get`
和 `customfields.options.list` 的发现源。发现逻辑只读
`GET /rest/api/2/field` 和 `GET /rest/api/2/customFields/{id}/options`，
找到任意一个选项数 ≥ 1 的 option 类型字段即可。

Jira Software 自带的 `Epic Status` 字段（选项 To Do / In Progress /
Done）天然满足条件，因此 **fresh volume 无需任何手工配置**，
`e2e-prepare.mjs` 预检会直接通过。

如果不愿依赖产品内建字段（例如担心 Epic Status 在未来版本变化），可在
Jira UI 中一次性创建一个备用字段：

1. Jira 管理界面 → 问题 → 自定义字段
2. 添加自定义字段 → 选择 "Select List (single choice)"
3. 名称：`E2E Options Fixture`，描述：`Disposable options source for E2E`
4. 添加 2~3 个选项（如 Alpha / Beta / Gamma）

无需关联任何屏幕——发现链不经过屏幕。该字段仅用于 E2E 发现
（`e2e-prepare.mjs` 预检 + `metadata-sweep.e2e.test.ts` beforeAll 探测），
不会被测试删除或修改。

### 单产品运行

```bash
pnpm e2e:jira
pnpm e2e:confluence
pnpm e2e:bitbucket
```

命令不会同时启动三个镜像。Compose healthcheck 通过后，编排器还会继续
探测产品自己的 REST endpoint，最多等待 180 秒，让插件和应用服务完成
初始化；因此“容器 healthy”不等于“REST 已可用”。缺少实例或凭据时直接
失败，不会 skip，因此成功结果可以作为证据。

完成后可停止当前 profile：

```bash
node scripts/e2e.mjs jira down
```

如果明确要删除该产品的数据库和 home volume，使用：

```bash
node scripts/e2e.mjs jira reset
```

`reset` 不可恢复，只适用于已确认可销毁的本地环境。

### 顺序运行三产品

```bash
pnpm e2e:all
```

该命令严格执行 Jira `up → prepare → test → down`，再执行 Confluence，
最后 Bitbucket；永远不会使用 `--profile all`。每个产品仍必须事先完成其
首次 wizard 和 license 配置。

### 第二用户自动化

每次运行会先检查 `mcp-e2e-reviewer`，不存在时用管理员凭据创建。生成的
凭据写入 `.e2e-state/<product>/reviewer.env`，文件权限为 `0600` 且被
Git 忽略，不会覆盖用户维护的 `.env.dc`。

测试优先读取 `E2E_REVIEWER_<PRODUCT>_TOKEN`。三个产品并不都提供稳定、
可移植的管理员 PAT 签发 REST API，所以不能安全地承诺全自动创建 PAT；
没有 PAT 时记录并使用 Basic fallback。如果 Jira 禁用了 Basic，则需要在
UI 给第二用户创建 PAT，再将其放入环境变量。若用户已存在但本地没有其
密码或 PAT，prepare 会明确失败，防止悄悄使用错误身份。

### 低权限 fixture 用户

`pnpm dc:setup` 还会为每个产品创建最小权限的 `mcp-e2e-limited` 用户，供
`tests/e2e/permissions` 场景验证服务端错误契约在 Atlassian 拒绝路径下
是否成立（并不测试 Atlassian 权限系统本身）。这些 fixture 是共享、幂等
的，并刻意不记入清理 journal：

- Jira：受限项目 `E2EPRIV`（使用仅管理员的 "E2E Restricted Scheme" 权限
  方案），内含一个 fixture issue。
- Confluence：私有空间 `E2EPRIV`（仅管理员有任何权限），内含一个
  fixture 页面。
- Bitbucket：受限项目 `E2EPRIV`，内含 `restricted` 仓库（limited 用户持
  有 REPO_WRITE）与 `hidden` 仓库（无任何授权），以及 limited 用户为自
  己签发的只读 PAT（REPO_READ 范围）——Bitbucket 不允许管理员代其他用
  户签发 token。

凭据与 fixture id 写入 `.e2e-state/<product>/limited.env`，文件权限为
`0600`。若用户已存在但本地没有其密码，dc:setup 会明确失败；此时设置一
次 `E2E_LIMITED_PASSWORD`，或在产品 UI 删除该用户后重跑。

### 数据与清理

- Jira/Confluence 使用固定的 `MCP` 项目/空间作为容器；每个 issue/page
  使用随机 run ID，并在同一测试内删除。
- Bitbucket 每次创建随机项目和仓库，场景结束时先删除仓库，再删除项目；
  Bitbucket 不允许直接删除仍包含仓库的项目。
- 所有场景使用 `try/finally`；清理状态追加到
  `.e2e-state/cleanup-journal.jsonl`。
- 测试失败后先检查 journal，再处理 `cleanup-failed` 记录。不要把
  fixture REST 的成功当成 MCP 接口成功。

### 常见错误

- `ECONNREFUSED`：容器未启动或仍未 healthy。
- `401/403`：PAT/Basic 不可用，或个人账号没有相应产品/项目权限。
- `Reviewer exists but its credential is unknown`：设置
  `E2E_REVIEWER_PASSWORD` 或对应 reviewer PAT。
- Bitbucket Git push 失败：Git HTTP Basic 不可用；提供可执行 Git 推送的
  管理员账号密码。凭据不会写入日志。
- Confluence 更新返回版本冲突：确认 disposable 环境中没有其他进程同时
  修改测试页。

## 覆盖标准

`tests/e2e/coverage.json` 为每个运行时 operation ID 记录一行。允许的状态：

- `automated`：经构建后的 stdio MCP 对锁定产品真实调用过。
- `contract-only`：仅用 mock 上游验证了构建后 MCP 行为。
- `manual`：存在可重复的手工流程。
- `deferred`：有价值但尚未实现；必须写明原因。
- `low-value`：自动化成本目前超过其开发者工作流价值；必须写明原因。
- `environment-unavailable`：锁定环境无法提供必要依赖或能力；必须写明原因。

台账覆盖全部策略操作；永久排除的
原始操作有意不在台账中。这不声称是完整的线上 API 覆盖：台账完整性与
真实产品证据是两个分开的主张。

有意修改 registry 或场景映射后运行 `pnpm coverage:generate`。CI 跑
`pnpm coverage:check`，drift 即失败。

## 不计为 API 覆盖的内容

- REST fixture 创建、用户引导、紧急清理与 Git push。
- 针对三个锁定镜像之外版本的启动。
- JSM、Assets、Marketplace 插件 API，以及被排除的全局/系统管理操作——
  它们在 v1 registry 之外。
- LLM 推理质量、自动重试、企业钩子或 Atlassian 权限策略——它们不在本
  桥接层的职责范围内。
