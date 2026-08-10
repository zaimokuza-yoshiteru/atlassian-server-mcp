// `atlassian-server-mcp doctor`: pre-flight diagnostics. Each check prints
// PASS/WARN/FAIL plus an actionable fix hint; any FAIL exits non-zero, WARN
// never blocks. Probe and version-baseline logic is reused from service.ts —
// this module only adds reporting around it.
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { loadConfig } from "./config.js";
import { safeErrorMessage } from "./errors.js";
import { AtlassianService, isTestedVersion, TESTED_VERSION_LINES } from "./service.js";
import { PRODUCTS } from "./types.js";
import type { Product, ProductInfo, ServerConfig } from "./types.js";

export type DoctorStatus = "PASS" | "WARN" | "FAIL";

export interface DoctorCheck {
  name: string;
  status: DoctorStatus;
  message: string;
  /** Actionable fix hint shown for WARN/FAIL rows. */
  suggestion?: string;
}

export interface DoctorReport {
  checks: DoctorCheck[];
  /** true when no check failed (WARN does not block). */
  ok: boolean;
}

export interface DoctorOptions {
  args?: readonly string[];
  env?: NodeJS.ProcessEnv;
  /** Injectable for tests: replaces the live serverInfo probe. */
  probe?: (config: ServerConfig) => Promise<ProductInfo[]>;
}

async function defaultProbe(config: ServerConfig): Promise<ProductInfo[]> {
  const service = new AtlassianService(config);
  try {
    return await service.probeConfiguredProducts();
  } finally {
    await service.close();
  }
}

function tlsVerifyEnabled(args: readonly string[], env: NodeJS.ProcessEnv): boolean {
  if (args.includes("--no-tls-verify")) return false;
  if (args.includes("--tls-verify")) return true;
  return env.ATLASSIAN_TLS_VERIFY?.trim().toLowerCase() !== "false";
}

function probeFailureSuggestion(info: ProductInfo): string {
  const error = info.error ?? "";
  if (/\b401\b/.test(error)) {
    return `Authentication failed (401). Regenerate the PAT and update ${info.product.toUpperCase()}_TOKEN.`;
  }
  if (/\b403\b/.test(error)) {
    return "Permission denied (403). The token is valid but lacks permission to read serverInfo; grant the user the required product access.";
  }
  if (/certificate|self-signed|UNABLE_TO_VERIFY|TLS|SSL/i.test(error)) {
    return `TLS verification failed. Set ${info.product.toUpperCase()}_CA_FILE to the instance CA certificate, or (insecure) ATLASSIAN_TLS_VERIFY=false.`;
  }
  return `Check that ${info.baseUrl} is reachable from this machine (VPN, firewall, proxy) and that the URL is correct.`;
}

async function checkCaFiles(
  checks: DoctorCheck[],
  env: NodeJS.ProcessEnv,
  tlsEnabled: boolean
): Promise<void> {
  for (const product of PRODUCTS) {
    const envName = `${product.toUpperCase()}_CA_FILE`;
    const caFile = env[envName]?.trim();
    if (!caFile) continue;
    if (!tlsEnabled) {
      checks.push({
        name: `ca.${product}`,
        status: "WARN",
        message: `${envName} is set but TLS verification is disabled; the CA file is ignored.`,
        suggestion:
          "Re-enable TLS verification (--tls-verify or ATLASSIAN_TLS_VERIFY=true) to use the CA file."
      });
      continue;
    }
    try {
      await access(caFile, constants.R_OK);
      checks.push({
        name: `ca.${product}`,
        status: "PASS",
        message: `${envName} is readable (${caFile}).`
      });
    } catch {
      checks.push({
        name: `ca.${product}`,
        status: "FAIL",
        message: `${envName} (${caFile}) is not readable.`,
        suggestion:
          "Fix the file path or permissions (chmod 644), or unset the variable if the instance uses a public CA."
      });
    }
  }
}

async function checkFileRoots(checks: DoctorCheck[], config: ServerConfig): Promise<void> {
  const roots = new Map<string, Product[]>();
  for (const product of PRODUCTS) {
    const fileRoot = config.products[product]?.fileRoot;
    if (!fileRoot) continue;
    const list = roots.get(fileRoot) ?? [];
    list.push(product);
    roots.set(fileRoot, list);
  }
  if (roots.size === 0) {
    checks.push({
      name: "files.root",
      status: "WARN",
      message:
        "ATLASSIAN_FILE_ROOT is not configured; upload, downloadPath/outputPath, and storageValueFile features are unavailable.",
      suggestion:
        "Set ATLASSIAN_FILE_ROOT (or a per-product FILE_ROOT) to a writable directory to enable file transfer features."
    });
    return;
  }
  for (const [root, products] of roots) {
    const label = `files.root (${products.join(", ")})`;
    try {
      const info = await stat(root);
      if (!info.isDirectory()) {
        checks.push({
          name: label,
          status: "FAIL",
          message: `${root} exists but is not a directory.`,
          suggestion: "Point ATLASSIAN_FILE_ROOT at a directory."
        });
        continue;
      }
      await access(root, constants.W_OK);
      checks.push({ name: label, status: "PASS", message: `${root} exists and is writable.` });
    } catch {
      checks.push({
        name: label,
        status: "FAIL",
        message: `${root} does not exist or is not writable.`,
        suggestion: `Create it (mkdir -p ${root}) and grant write permission to this user.`
      });
    }
  }
}

export async function runDoctor(options: DoctorOptions = {}): Promise<DoctorReport> {
  const args = options.args ?? [];
  const env = options.env ?? process.env;
  const checks: DoctorCheck[] = [];

  // CA readability is checked from the environment first: an unreadable CA
  // file would otherwise surface as a raw loadConfig error instead of a
  // structured FAIL row.
  const tlsEnabled = tlsVerifyEnabled(args, env);
  await checkCaFiles(checks, env, tlsEnabled);

  let config: ServerConfig;
  try {
    config = loadConfig(args, env);
  } catch (error) {
    checks.push({
      name: "config",
      status: "FAIL",
      message: safeErrorMessage(error),
      suggestion:
        "Fix the configuration error above. At minimum set one of JIRA_URL, CONFLUENCE_URL, BITBUCKET_URL plus its TOKEN (see README)."
    });
    return { checks, ok: false };
  }
  checks.push({
    name: "config",
    status: "PASS",
    message: `configuration loaded for: ${PRODUCTS.filter((product) => config.products[product]).join(", ")}`
  });

  let products: ProductInfo[];
  try {
    products = await (options.probe ?? defaultProbe)(config);
  } catch (error) {
    checks.push({
      name: "probe",
      status: "FAIL",
      message: `probe failed unexpectedly: ${safeErrorMessage(error)}`,
      suggestion:
        "Re-run with --skip-startup-check off and check the server logs; this indicates a client-side bug or sandbox issue."
    });
    return { checks, ok: false };
  }

  for (const info of products) {
    const prefix = info.product;
    if (info.reachable) {
      checks.push({
        name: `${prefix}.reachability`,
        status: "PASS",
        message: `${info.baseUrl} is reachable and the credentials were accepted (serverInfo).`
      });
    } else {
      checks.push({
        name: `${prefix}.reachability`,
        status: "FAIL",
        message: `${info.baseUrl} probe failed: ${info.error ?? "unknown error"}`,
        suggestion: probeFailureSuggestion(info)
      });
    }

    if (info.reachable && info.version) {
      if (isTestedVersion(info.product, info.version)) {
        checks.push({
          name: `${prefix}.version`,
          status: "PASS",
          message: `${info.product} ${info.version} is inside the OpenAPI generation and test baseline.`
        });
      } else {
        checks.push({
          name: `${prefix}.version`,
          status: "WARN",
          message: `${info.product} ${info.version} is outside the tested baseline (${TESTED_VERSION_LINES[info.product].join(", ")}).`,
          suggestion:
            "Operations are generated and tested against the baseline versions; verify critical workflows on this version before relying on them."
        });
      }
    }

    if (!info.reachable) {
      checks.push({
        name: `${prefix}.tls`,
        status: "FAIL",
        message: `TLS connectivity to ${info.baseUrl} could not be verified because the product is unreachable.`,
        suggestion:
          "Fix the reachability failure above first; if the error mentions certificates, set the CA file."
      });
    } else if (info.tlsVerify) {
      checks.push({
        name: `${prefix}.tls`,
        status: "PASS",
        message: `TLS connection to ${info.baseUrl} established with certificate verification enabled.`
      });
    } else {
      checks.push({
        name: `${prefix}.tls`,
        status: "WARN",
        message: `TLS certificate and hostname verification is disabled for ${info.product}.`,
        suggestion:
          "Enable verification (default) or configure the CA file; running with verification disabled is insecure."
      });
    }
  }

  await checkFileRoots(checks, config);

  return { checks, ok: checks.every((check) => check.status !== "FAIL") };
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = report.checks.map((check) => {
    const row = `[${check.status}] ${check.name}: ${check.message}`;
    return check.suggestion && check.status !== "PASS" ? `${row}\n  -> ${check.suggestion}` : row;
  });
  lines.push(report.ok ? "doctor: OK (no failures)" : "doctor: FAILED (see FAIL rows above)");
  return `${lines.join("\n")}\n`;
}
