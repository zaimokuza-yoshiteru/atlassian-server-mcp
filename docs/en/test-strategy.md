# Test strategy

The suite separates evidence that can run in GitHub Actions from evidence that
requires licensed, stateful Atlassian Data Center products. A test only counts
an operation as real E2E coverage when the request enters the built MCP server
over stdio and reaches a real product. Fixture REST calls never count.

## GitHub Actions

`pnpm test:ci` performs, in order:

1. TypeScript type checking.
2. A production build.
3. Unit tests for configuration, policy, authorization, HTTP construction,
   projection, pagination, cursors, errors, and in-process service behavior,
   run with v8 coverage thresholds (see "Unit coverage gate" below).
4. Contract tests that spawn `dist/cli.js`, speak JSON-RPC over stdio, and use a
   mock upstream to verify request mapping, tools/list metadata, and sanitized
   error propagation.
5. A coverage-ledger drift check against the built policy registry,
   followed by generated operations/inventory/policy drift checks.
6. A package smoke test that packs the tarball and installs it into an empty
   consumer directory with npm.

CI intentionally does not run Jira, Confluence, or Bitbucket Docker images.
Licensing, certificates, startup time, and resource requirements make those
jobs unreliable and prohibitively expensive on ordinary hosted runners.

Contract tests prove the MCP boundary and mapping, not compatibility with an
Atlassian release. They are labelled `contract-only` in the ledger when no real
product scenario exists.

## Unit coverage gate

The unit suite runs with v8 coverage (`vitest run --coverage`) over
`src/**/*.ts`, excluding generated operation manifests (`src/operations/**`)
and type declarations. The thresholds in `vitest.config.ts`
(`coverage.thresholds`) are the single source of truth for the gate: CI fails
when measured coverage drops below them. Measured baselines are not restated
here — re-run the suite to get current numbers, and raise the thresholds in
`vitest.config.ts` as coverage improves.

Historical blind-spot work covered the HTTP error-status mapping (429/5xx,
structured + redacted details), transport timeout propagation (undici
headers/body timeouts), the TLS verification path (self-signed reject /
verify-off accept / custom CA verify), response decoding edges, multipart
validation, `sanitizeErrorDetails`, and `src/json.ts`. Known residual gaps:
`src/cli.ts`, `src/index.ts`, and `src/server.ts` are exercised by the
stdio/contract suites through child processes and therefore read as uncovered
in-process; `src/service.ts`, `src/errors.ts`, and `src/tools-products.ts`
retain uncovered error and product-registration paths.

## Local real-product E2E

The only accepted first-release baselines are the exact default images in
`compose.yaml`:

| Product    | Tested image                     |
| ---------- | -------------------------------- |
| Jira       | `atlassian/jira-software:11.3.5` |
| Confluence | `atlassian/confluence:10.2.11`   |
| Bitbucket  | `atlassian/bitbucket:10.4.1`     |

Each product runs alone. The primary scenarios are deliberately sequential and
self-cleaning:

- Jira issue: create-metadata → C → R → attachment upload/metadata/download →
  U → R → attachment delete → D → failed R.
- Confluence page: C → R → attachment upload/metadata/download → binary
  replacement/download → U → R → attachment delete → D → failed R.
- Bitbucket PR: Basic-auth fixture project/repository/branches → C → R → diff
  download/raw-file download/archive download → comment → second-user review →
  merge → R → repository delete → project delete.

Every resource name has a unique run ID. Each scenario uses `try/finally` and
records created/cleaned/failed-cleanup resources in the gitignored
`.e2e-state/cleanup-journal.jsonl`. A failed cleanup is a test failure when it
would leave a material project-level fixture behind.

The compose stack also runs `postgres:16-alpine` as the product database. The
first release maintains no compatibility matrix beyond these images. The
server does not refuse to start on other versions, but test conclusions apply
only to the images above.

### First-time preparation

```bash
cp .env.dc.example .env.dc
node scripts/e2e.mjs jira up       # start one product at a time
```

After the volumes are first created, complete the Atlassian setup wizard in
the browser, enter the license, and create an admin account. Then fill the
product URL, admin credentials, and preferred PAT into `.env.dc`. To refresh
timebomb licenses, run:

```bash
pnpm dc:setup jira
```

The Confluence license must still be renewed in the UI; that is an official
product boundary and the tests do not work around it.

### One-time Jira SMTP configuration (mailpit)

Jira E2E notification-delivery verification relies on mailpit as a local SMTP
catcher. `docker compose --profile jira up` brings mailpit up automatically.
Then configure once in the Jira UI (only once; the setting persists in the
Jira home volume):

1. Jira administration → System → Outgoing mail
2. Hostname: `mailpit`, port: `1025`, protocol: `SMTP`
3. No TLS, no authentication
4. Send a test email and confirm mailpit received it (`http://localhost:8025`)

This is a manual owner step, not part of the automated test scripts.

### Jira custom field options fixture (optional)

The Jira E2E metadata sweep needs a custom field with options as a discovery
source for `customfieldoption.get` and `customfields.options.list`. Discovery
only reads `GET /rest/api/2/field` and
`GET /rest/api/2/customFields/{id}/options`; any option-type field with at
least one option qualifies.

The built-in Jira Software `Epic Status` field (options To Do / In Progress /
Done) satisfies this naturally, so **a fresh volume needs no manual setup**
and the `e2e-prepare.mjs` preflight passes directly.

If you prefer not to rely on a product built-in field (for example, in case
Epic Status changes in a future version), create a spare field once in the
Jira UI:

1. Jira administration → Issues → Custom fields
2. Add custom field → "Select List (single choice)"
3. Name: `E2E Options Fixture`, description: `Disposable options source for
E2E`
4. Add 2–3 options (e.g. Alpha / Beta / Gamma)

No screen association is needed — the discovery chain does not go through
screens. The field is used only for E2E discovery (the `e2e-prepare.mjs`
preflight and the `metadata-sweep.e2e.test.ts` beforeAll probe) and is never
deleted or modified by the tests.

### Running a single product

```bash
pnpm e2e:jira
pnpm e2e:confluence
pnpm e2e:bitbucket
```

The commands never start all three images at once. After the compose
healthcheck passes, the orchestrator keeps probing the product's own REST
endpoint for up to 180 seconds so plugins and application services can finish
initializing; "container healthy" therefore does not mean "REST is usable".
Missing instances or credentials fail immediately instead of skipping, so a
green result is usable as evidence.

Stop the current profile afterwards:

```bash
node scripts/e2e.mjs jira down
```

To deliberately delete the product's database and home volumes:

```bash
node scripts/e2e.mjs jira reset
```

`reset` is irreversible and only appropriate for a local environment you have
confirmed is disposable.

### Running all three products in sequence

```bash
pnpm e2e:all
```

This strictly runs Jira `up → prepare → test → down`, then Confluence, then
Bitbucket; it never uses `--profile all`. Each product must still have
completed its first-time wizard and license setup beforehand.

### Second-user automation

Each run first checks for `mcp-e2e-reviewer` and creates it with admin
credentials when absent. The generated credentials are written to
`.e2e-state/<product>/reviewer.env` with mode `0600`, are git-ignored, and
never overwrite your maintained `.env.dc`.

Tests prefer `E2E_REVIEWER_<PRODUCT>_TOKEN`. Not all three products offer a
stable, portable administrator PAT-issuance REST API, so fully automatic PAT
creation cannot be promised safely; without a PAT the run falls back to Basic
auth and records that fact. If Basic auth is disabled in Jira, create a PAT
for the second user in the UI and place it in the environment variable. If
the user exists but neither its password nor a PAT is available locally,
prepare fails explicitly rather than silently using the wrong identity.

### Low-privilege fixture user

`pnpm dc:setup` also creates a least-privilege `mcp-e2e-limited` user per
product for the `tests/e2e/permissions` scenarios, which verify the server's
structured error contract on Atlassian denial paths (they do not test
Atlassian's permission system itself). The fixtures are shared, idempotent,
and deliberately excluded from the cleanup journal:

- Jira: the restricted project `E2EPRIV` on the admin-only "E2E Restricted
  Scheme" permission scheme, plus one fixture issue in it.
- Confluence: the private space `E2EPRIV` (only the admin has any permission)
  plus one fixture page in it.
- Bitbucket: the restricted project `E2EPRIV` with a `restricted` repository
  (the limited user holds REPO_WRITE) and a `hidden` repository (no grant),
  plus a read-only PAT (REPO_READ scope) the limited user issues for itself —
  Bitbucket refuses admin-issued tokens for other users.

Credentials and fixture ids are written to `.e2e-state/<product>/limited.env`
with mode `0600`. If the user already exists but its password is unknown
locally, dc:setup fails explicitly; set `E2E_LIMITED_PASSWORD` once or delete
the user in the product UI and re-run.

### Data and cleanup

- Jira/Confluence use the fixed `MCP` project/space as a container; each
  issue/page gets a random run ID and is deleted within the same test.
- Bitbucket creates a random project and repository per run and deletes the
  repository before the project at scenario end; Bitbucket does not allow
  deleting a project that still contains repositories.
- Every scenario uses `try/finally`; cleanup state is appended to
  `.e2e-state/cleanup-journal.jsonl`.
- After a failure, check the journal first, then handle `cleanup-failed`
  records. Never mistake fixture REST success for MCP operation success.

### Common errors

- `ECONNREFUSED`: the container is not started or not yet healthy.
- `401/403`: the PAT/Basic credentials are unusable, or the account lacks the
  relevant product/project permission.
- `Reviewer exists but its credential is unknown`: set
  `E2E_REVIEWER_PASSWORD` or the corresponding reviewer PAT.
- Bitbucket Git push failures: Git HTTP Basic is unavailable; provide admin
  credentials capable of Git push. Credentials are never written to logs.
- Confluence update returns a version conflict: make sure no other process is
  modifying the test page in the disposable environment at the same time.

## Coverage standard

`tests/e2e/coverage.json` contains one row for every runtime operation ID. Its
allowed statuses are:

- `automated`: exercised through built stdio MCP against the pinned product.
- `contract-only`: built MCP behavior verified with a mock upstream only.
- `manual`: repeatable manual procedure exists.
- `deferred`: useful but not implemented yet; a reason is mandatory.
- `low-value`: exposed operation whose automation cost currently exceeds its
  developer-workflow value; a reason is mandatory.
- `environment-unavailable`: the pinned environment cannot supply a necessary
  dependency or capability; a reason is mandatory.

The ledger accounts for every policy operation; permanently excluded raw
operations are intentionally absent. This is not presented as full live API
coverage: ledger completeness and real-product evidence are separate claims.

Run `pnpm coverage:generate` after intentionally changing the registry or
scenario mappings. CI runs `pnpm coverage:check` and fails on drift.

## What is not tested as API coverage

- REST fixture creation, user bootstrap, emergency cleanup, and Git pushes.
- Startup against versions other than the three pinned images.
- JSM, Assets, Marketplace app APIs, and excluded global/system
  administration, because they are outside the v1 registry.
- LLM reasoning quality, automatic retries, enterprise hooks, or Atlassian
  permission policy. Those are outside this bridge's responsibility.
