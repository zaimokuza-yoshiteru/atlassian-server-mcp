# Exposure Tiers

The exposure tier decides which registry operations an LLM agent
can discover and execute. It is an **agent exposure boundary, not an
authorization boundary** — see [Security Model](Security-Model.md).

## The four tiers

Tiers are cumulative: each tier includes everything below it.

| Tier             | What it adds                                                                 |
| ---------------- | ---------------------------------------------------------------------------- |
| `read` (default) | GETs and other side-effect-free queries                                      |
| `safe`           | Ordinary creates, updates, and comments                                      |
| `risky`          | Deletes, workflow transitions, merges, and similar high-impact state changes |
| `max`            | All remaining policy operations                                              |

Per-tier operation counts are not restated here because they change whenever
the policy is regenerated from official specs. The generated
`src/exposure-policy.json` is the single source of truth; at runtime,
`atlassian_discover_operations` lists exactly what the current configuration
may call.

The policy also permanently excludes global/system administration operations
(clustering, indexing, migration, upgrade, licensing, global schemes, security
bootstrap, and similar). Excluded operations are not in the runtime policy at
all: they cannot be restored with any flag and fail closed.

## Choosing a tier

```bash
npx @zaimokuza/atlassian-server-mcp                              # read (default)
npx @zaimokuza/atlassian-server-mcp --exposure-tier=safe
npx @zaimokuza/atlassian-server-mcp --exposure-tier=risky
npx @zaimokuza/atlassian-server-mcp --exposure-tier=max
```

or `ATLASSIAN_EXPOSURE_TIER=safe` in the environment.

Guidance:

- **`read`** for Q&A, reporting, and triage assistants.
- **`safe`** when the agent should file or update issues, pages, and pull
  requests under supervision.
- **`risky`** only when deletes, transitions, and merges are intended.
- **`max`** for administrator-assist scenarios; everything not permanently
  excluded becomes callable.

## Fine-tuning with FORCE patterns

`--force-include-ops` and `--force-exclude-ops` accept repeatable segment
globs (`*` within a segment, `**` across segments) over operation IDs:

```bash
# Read-only, but allow creating Jira issues:
npx @zaimokuza/atlassian-server-mcp --force-include-ops=jira.issue.create

# Safe tier, but hide all Jira project operations:
npx @zaimokuza/atlassian-server-mcp --exposure-tier=safe --force-exclude-ops=jira.project.*
```

Environment equivalents: `ATLASSIAN_FORCE_INCLUDE_OPERATIONS`,
`ATLASSIAN_FORCE_EXCLUDE_OPERATIONS` (comma-separated). Note the spelling —
the misspelled variants `..._OPREATIONS` are rejected with an error.

Precedence, strongest first:

```text
permanent exclusion
  > FORCE_EXCLUDE
  > FORCE_INCLUDE
  > intrinsic tier vs configured tier
  > unknown / unsupported / unconfigured product => denied
```

FORCE include changes exposure only; it never changes an operation's
intrinsic tier or destructive metadata, and it cannot resurrect excluded or
unknown operations.

## What enforcement looks like

- Discovery (`atlassian_discover_operations`) only lists operations the
  current configuration may call.
- Executing a hidden, excluded, or unknown operation returns a structured
  error (fail closed) — never a pass-through.
- The resolver decision is the single authorization point shared by generic
  execute, typed tools, downloads, and server info.

For the policy source of truth and refresh workflow, see the project document
[`docs/en/exposure-policy.md`](../../en/exposure-policy.md).

---

[中文版](../zh-CN/Exposure-Tiers.md) · English is the authoritative version.
