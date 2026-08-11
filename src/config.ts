import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PRODUCTS, type Product, type ProductConfig, type ServerConfig } from "./types.js";
import { tierFromArgs, validateExposureTier, validateOperationPattern } from "./permissions.js";
import { validatePatterns } from "./exposure-policy.js";
import { parseStrictInteger, stripTrailingSlashes } from "./json.js";
import { POLICY_OPERATIONS } from "./operations/index.js";

const DEFAULT_MAX_OUTPUT_BYTES = 65_536;
const DEFAULT_CURSOR_TTL_SECONDS = 900;
const DEFAULT_MAX_DOWNLOAD_BYTES = 104_857_600; // 100 MB

// Fail-closed TLS verification parsing: anything other than an explicit
// "true"/"false" (case-insensitive, surrounding whitespace allowed) is a
// startup error rather than silently disabling verification.
function parseTlsVerify(value: string | undefined): boolean {
  if (value === undefined) {
    return true;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  throw new Error(
    `ATLASSIAN_TLS_VERIFY must be "true" or "false" (case-insensitive); received "${value}"`
  );
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  minimum: number
): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = parseStrictInteger(value);
  if (parsed === undefined || parsed < minimum) {
    throw new Error(`${name} must be an integer >= ${minimum}`);
  }
  return parsed;
}

function argumentValue(args: readonly string[], name: string): string | undefined {
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) {
    const value = args[exactIndex + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${name} requires a value`);
    }
    return value;
  }
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline?.slice(prefix.length);
}

export function parseStringList(value: string | undefined): string[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ];
}

const VALUE_OPTIONS = new Set([
  "--exposure-tier",
  "--max-output-bytes",
  "--max-download-bytes",
  "--cursor-ttl-seconds"
]);
const FORCE_OPTIONS = new Set(["--force-include-ops", "--force-exclude-ops"]);
const BOOLEAN_OPTIONS = new Set([
  "--tls-verify",
  "--no-tls-verify",
  "--skip-startup-check",
  "--help"
]);

export function validateCliOptions(args: readonly string[]): void {
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? "";
    if (!arg.startsWith("--")) throw new Error(`positional argument is not allowed: ${arg}`);
    if (
      arg === "--allow-safe-mutations" ||
      arg === "--allow-risky-mutations" ||
      arg === "--allow-admin-operations"
    ) {
      const tier = arg.includes("safe") ? "safe" : arg.includes("risky") ? "risky" : "max";
      throw new Error(`${arg} was removed; use --exposure-tier=${tier}`);
    }
    const inline = arg.includes("=");
    const name = inline ? arg.slice(0, arg.indexOf("=")) : arg;
    if (BOOLEAN_OPTIONS.has(name)) {
      if (inline) throw new Error(`${name} does not accept a value`);
      if (name === "--tls-verify" && args.includes("--no-tls-verify"))
        throw new Error("--tls-verify and --no-tls-verify cannot be used together");
      continue;
    }
    if (!VALUE_OPTIONS.has(name) && !FORCE_OPTIONS.has(name))
      throw new Error(`unknown option: ${arg}`);
    const value = inline ? arg.slice(name.length + 1) : args[++i];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
    if (VALUE_OPTIONS.has(name)) {
      if (seen.has(name)) throw new Error(`${name} may only be specified once`);
      seen.add(name);
      if (name === "--exposure-tier") validateExposureTier(value);
    } else {
      if (value.includes(",")) throw new Error(`${name} accepts one pattern without commas`);
      validateOperationPattern(value);
    }
  }
}

function listFromArgs(args: readonly string[], name: string): string[] | undefined {
  const values: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? "";
    if (arg === name) {
      const value = args[++i];
      if (!value || value.startsWith("--") || value.includes(","))
        throw new Error(`${name} requires one non-empty pattern without commas`);
      values.push(validateOperationPattern(value));
    } else if (arg.startsWith(`${name}=`)) {
      const value = arg.slice(name.length + 1);
      if (!value || value.includes(","))
        throw new Error(`${name} requires one non-empty pattern without commas`);
      values.push(validateOperationPattern(value));
    }
  }
  return values.length ? [...new Set(values)] : undefined;
}

function normalizeBaseUrl(value: string, envName: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${envName} must be a valid absolute URL`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${envName} must use http or https`);
  }
  // Credentials embedded in the URL would leak into tool output (the full
  // baseUrl is returned by atlassian_server_info). Never echo the userinfo.
  if (url.username !== "" || url.password !== "") {
    throw new Error(
      `${envName} must not embed credentials (found userinfo before '@'). Put the PAT in ${envName.replace(/_URL$/, "_TOKEN")} instead.`
    );
  }
  if (url.search !== "" || url.hash !== "") {
    throw new Error(
      `${envName} must be a plain base URL of the form scheme://host[:port][/path]; query strings and fragments are not allowed`
    );
  }
  url.pathname = stripTrailingSlashes(url.pathname);
  return url;
}

function productEnvPrefix(product: Product): string {
  return product.toUpperCase();
}

// curl-style NO_PROXY matching: "*" matches everything; an entry with a
// leading dot matches the suffix; a bare domain matches the domain itself
// and its subdomains; an optional :port restricts the match to that port.
function noProxyMatch(noProxy: string | undefined, url: URL): boolean {
  if (!noProxy) return false;
  const host = url.hostname.toLowerCase();
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  for (const raw of noProxy.split(",")) {
    const entry = raw.trim().toLowerCase();
    if (!entry) continue;
    if (entry === "*") return true;
    const colon = entry.lastIndexOf(":");
    const entryHost = colon > 0 ? entry.slice(0, colon) : entry;
    const entryPort = colon > 0 ? entry.slice(colon + 1) : "";
    if (entryPort && entryPort !== port) continue;
    if (entryHost.startsWith(".")) {
      if (host.endsWith(entryHost) || host === entryHost.slice(1)) return true;
    } else if (host === entryHost || host.endsWith(`.${entryHost}`)) {
      return true;
    }
  }
  return false;
}

// Outbound proxy resolution for one product base URL. Precedence:
// ATLASSIAN_PROXY > HTTPS_PROXY > https_proxy; NO_PROXY/no_proxy bypasses.
// Proxy credentials embedded in the URL (user:pass@host) are passed through
// to the proxy agent without being echoed anywhere.
function resolveProxyUrl(env: NodeJS.ProcessEnv, baseUrl: URL): string | undefined {
  const raw = env.ATLASSIAN_PROXY?.trim() || env.HTTPS_PROXY?.trim() || env.https_proxy?.trim();
  if (!raw) return undefined;
  let proxy: URL;
  try {
    proxy = new URL(raw);
  } catch {
    throw new Error("proxy URL (ATLASSIAN_PROXY or HTTPS_PROXY) must be a valid absolute URL");
  }
  if (proxy.protocol !== "http:" && proxy.protocol !== "https:") {
    throw new Error("proxy URL (ATLASSIAN_PROXY or HTTPS_PROXY) must use http or https");
  }
  if (noProxyMatch(env.NO_PROXY?.trim() || env.no_proxy?.trim(), baseUrl)) return undefined;
  return raw;
}

function loadProduct(
  product: Product,
  env: NodeJS.ProcessEnv,
  tlsVerify: boolean
): ProductConfig | undefined {
  const prefix = productEnvPrefix(product);
  const urlName = `${prefix}_URL`;
  const rawUrl = env[urlName];
  if (!rawUrl) {
    const productSettings = ["TOKEN", "CA_FILE", "FILE_ROOT"]
      .map((suffix) => `${prefix}_${suffix}`)
      .filter((name) => env[name]?.trim());
    if (productSettings.length > 0) {
      throw new Error(`${urlName} is required when ${productSettings.join(", ")} is set`);
    }
    return undefined;
  }

  const token = env[`${prefix}_TOKEN`]?.trim();
  const username = env.ATLASSIAN_USERNAME?.trim();
  const password = env.ATLASSIAN_PASSWORD;

  if (!token && (!username || !password)) {
    throw new Error(
      `${product} requires ${prefix}_TOKEN or both ATLASSIAN_USERNAME and ATLASSIAN_PASSWORD`
    );
  }

  const caFile = env[`${prefix}_CA_FILE`]?.trim();
  const ca = caFile && tlsVerify ? readFileSync(caFile, "utf8") : undefined;
  const fileRootValue = env[`${prefix}_FILE_ROOT`]?.trim() || env.ATLASSIAN_FILE_ROOT?.trim();
  const config: ProductConfig = {
    product,
    baseUrl: normalizeBaseUrl(rawUrl, urlName),
    tlsVerify
  };
  if (token) config.token = token;
  if (!token && username) config.username = username;
  if (!token && password) config.password = password;
  if (ca) config.ca = ca;
  if (fileRootValue) config.fileRoot = resolve(fileRootValue);
  return config;
}

export function loadConfig(
  args: readonly string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env
): ServerConfig {
  validateCliOptions(args);
  const tlsVerify = args.includes("--tls-verify")
    ? true
    : args.includes("--no-tls-verify")
      ? false
      : parseTlsVerify(env.ATLASSIAN_TLS_VERIFY);
  const maxOutputBytes = parseInteger(
    argumentValue(args, "--max-output-bytes") ?? env.ATLASSIAN_MAX_OUTPUT_BYTES,
    DEFAULT_MAX_OUTPUT_BYTES,
    "max output bytes",
    1024
  );
  const cursorTtlSeconds = parseInteger(
    argumentValue(args, "--cursor-ttl-seconds") ?? env.ATLASSIAN_CURSOR_TTL_SECONDS,
    DEFAULT_CURSOR_TTL_SECONDS,
    "cursor TTL",
    1
  );
  const maxDownloadBytes = parseInteger(
    argumentValue(args, "--max-download-bytes") ?? env.ATLASSIAN_MAX_DOWNLOAD_BYTES,
    DEFAULT_MAX_DOWNLOAD_BYTES,
    "max download bytes",
    1024 * 1024 // 1 MB minimum
  );
  const forceInclude =
    listFromArgs(args, "--force-include-ops") ??
    parseStringList(env.ATLASSIAN_FORCE_INCLUDE_OPERATIONS).map(validateOperationPattern);
  const forceExclude =
    listFromArgs(args, "--force-exclude-ops") ??
    parseStringList(env.ATLASSIAN_FORCE_EXCLUDE_OPERATIONS).map(validateOperationPattern);
  for (const [name, value] of [
    ["ATLASSIAN_FORCE_INCLUDE_OPREATIONS", env.ATLASSIAN_FORCE_INCLUDE_OPREATIONS],
    ["ATLASSIAN_FORCE_EXCLUDE_OPREATIONS", env.ATLASSIAN_FORCE_EXCLUDE_OPREATIONS]
  ] as const) {
    if (value?.trim())
      throw new Error(`${name} is misspelled; use ${name.replace("OPREATIONS", "OPERATIONS")}`);
  }
  const exposureTier = tierFromArgs(args, env.ATLASSIAN_EXPOSURE_TIER);

  const products: Partial<Record<Product, ProductConfig>> = {};
  for (const product of PRODUCTS) {
    const config = loadProduct(product, env, tlsVerify);
    if (config) products[product] = config;
  }
  if (Object.keys(products).length === 0) {
    throw new Error("Configure at least one of JIRA_URL, CONFLUENCE_URL, or BITBUCKET_URL");
  }
  const configuredProducts = new Set(Object.keys(products));
  const candidates = POLICY_OPERATIONS.filter((operation) =>
    configuredProducts.has(operation.product)
  ).map((operation) => operation.operationId);
  validatePatterns(forceInclude, candidates);
  validatePatterns(forceExclude, candidates);

  // Wire the shared limit into every product config so http.ts can read it
  // without plumbing a separate parameter through every call site.
  const userAgent = env.ATLASSIAN_USER_AGENT?.trim();
  for (const config of Object.values(products)) {
    config.maxDownloadBytes = maxDownloadBytes;
    const proxyUrl = resolveProxyUrl(env, config.baseUrl);
    if (proxyUrl) config.proxyUrl = proxyUrl;
    if (userAgent) config.userAgent = userAgent;
  }

  return {
    products,
    exposureTier,
    forceInclude,
    forceExclude,
    maxOutputBytes,
    cursorTtlSeconds,
    tlsVerify,
    maxDownloadBytes
  };
}
