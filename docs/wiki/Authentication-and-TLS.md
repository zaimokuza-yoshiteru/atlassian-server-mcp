# Authentication and TLS

## Credential model

Each configured product needs credentials:

- **Personal Access Token (preferred)**: `JIRA_TOKEN`, `CONFLUENCE_TOKEN`,
  `BITBUCKET_TOKEN` — sent as an HTTP `Bearer` header.
- **Shared Basic fallback**: `ATLASSIAN_USERNAME` + `ATLASSIAN_PASSWORD`,
  used only for products without a token. Both variables must be set
  together.

A non-empty product token always wins over the shared Basic credentials. A
configured URL without either its PAT or the complete Basic pair is a fatal
configuration error. Create PATs in each product's UI under
Profile → Personal Access Tokens.

The server acts **as you**: every request carries your PAT, Atlassian remains
the final authorization boundary, and the server never elevates or combines
permissions. Each developer should run their own instance with their own PAT.

Base URLs must be plain `scheme://host[:port][/path]`. Credentials embedded in
the URL (`https://user:pass@host`) and URLs with query strings or fragments
are rejected at startup — put the PAT in `*_TOKEN` instead.

## TLS verification

Certificate and hostname verification is **enabled by default**. Resolution
order: `--tls-verify` / `--no-tls-verify` > `ATLASSIAN_TLS_VERIFY` > the
secure default (`true`). When a flag and the env var disagree, the flag wins
and a warning is printed.

`ATLASSIAN_TLS_VERIFY` is parsed strictly: unset means the default, `true`
and `false` (case-insensitive, surrounding whitespace allowed) are accepted,
and **any other value aborts startup with an error** — a typo can never
silently disable verification.

Disabling verification (`--no-tls-verify` or `ATLASSIAN_TLS_VERIFY=false`)
is only acceptable for local testing against self-signed endpoints. HTTPS is
still encrypted, but an active network attacker can impersonate the server.
The server prints a warning on stderr whenever verification is off.

## Custom certificate authorities

For corporate CAs, provide a PEM file per product (read only when verification
is enabled):

```bash
export JIRA_CA_FILE=/absolute/path/company-ca.pem
export CONFLUENCE_CA_FILE=/absolute/path/company-ca.pem
export BITBUCKET_CA_FILE=/absolute/path/company-ca.pem
```

## Corporate proxies

Set `ATLASSIAN_PROXY` (or the conventional `HTTPS_PROXY` / `https_proxy`;
`ATLASSIAN_PROXY` wins when both are set):

```bash
export ATLASSIAN_PROXY=http://proxy.corp.internal:3128
export NO_PROXY=atlassian.corp.internal,.internal
```

`NO_PROXY` / `no_proxy` entries support exact hosts, `.suffix` matches,
`host:port`, and `*`. Credentials embedded in the proxy URL
(`http://user:pass@proxy:3128`) are used for proxy authentication only.

## User-Agent

The server identifies itself as `atlassian-server-mcp/<version>`. When a WAF
or gateway requires a specific User-Agent, override it globally:

```bash
export ATLASSIAN_USER_AGENT=my-gateway-agent/1.0
```

## Credential hygiene guarantees

- Credentials, `Authorization`, and `Cookie` headers are redacted from all
  tool errors and logs.
- Startup authentication failures are warnings, and the real error returned by
  a tool call is always sanitized the same way.
- Generated E2E helper credentials (maintainer machines only) are stored with
  mode `0600` and are never written back into configuration files.

---

[中文版](Authentication-and-TLS.zh-CN.md) · English is the authoritative version.
