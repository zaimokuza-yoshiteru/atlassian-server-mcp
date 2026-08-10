# Exposure policy

`rule/source.md` is the human-maintained policy input. `rule/build-policy.mjs`
validates it and generates `src/exposure-policy.json`; the generated file is
the runtime policy artifact and must not be edited by hand. The generated raw
operation registry comes from the pinned official snapshots under
`rule/spec-cache/` and `scripts/generate-operations.mjs`.

The runtime pipeline is:

```text
official spec cache + source.md
        -> build-policy.mjs
        -> src/exposure-policy.json
        -> POLICY_OPERATIONS
        -> resolveExposure()
        -> discover / generic / typed / download authorization
```

## Tiers

Every policy operation has one intrinsic tier: `read`, `safe`, `risky`, or
`max`. The configured tier exposes all operations at or below that tier.

The generated `src/exposure-policy.json` is the single source of truth for
which operations exist and which tier each has; counts and per-tier
distributions are deliberately not restated here because they change whenever
the policy is regenerated. Inspect the artifact directly, or query a running
server with `atlassian_discover_operations`.

The policy also records permanently excluded operations. They are not in
`POLICY_OPERATIONS`, cannot be restored with FORCE include, and fail closed.

## FORCE precedence

`--force-include-ops` and `--force-exclude-ops` accept validated `*` and `**`
segment globs and can be repeated. Environment variables use the corresponding
`ATLASSIAN_FORCE_INCLUDE_OPERATIONS` and
`ATLASSIAN_FORCE_EXCLUDE_OPERATIONS` names. Exclusion wins over inclusion:

```text
permanent exclusion
  > FORCE_EXCLUDE
  > FORCE_INCLUDE
  > intrinsic tier vs configured tier
  > unknown / unsupported / unconfigured product => denied
```

FORCE include changes exposure only; it never changes an operation's intrinsic
tier or destructive metadata. Resolver decisions expose a reason and, for a
FORCE match, the matched pattern. The resolver is the security boundary for
every externally callable path. MCP annotations and typed-tool registration
are client-facing hints and cannot bypass it.

## Refreshing policy inputs

Normal generation and checks are offline:

```bash
pnpm operations:generate
pnpm operations:check
pnpm policy:generate
pnpm policy:check
pnpm inventory:check
```

To intentionally refresh official snapshots, use the explicit network command
and review the resulting SHA, inventory, diff, manifest, and policy changes:

```bash
node rule/fetch-api-inventory.mjs --refresh --bootstrap
```

A refresh with drift requires `--accept-drift`; same-SHA refreshes are zero
write. Generated operation files, registry, exposure policy, inventory, and
manifest are committed artifacts and must be regenerated rather than edited.
