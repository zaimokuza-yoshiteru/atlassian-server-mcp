#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { loadConfig, validateCliOptions } from "./config.js";
import { formatDoctorReport, runDoctor } from "./doctor.js";
import { createAtlassianMcpServer } from "./server.js";
import { AtlassianService, isTestedVersion } from "./service.js";
import { formatExposureSummary } from "./exposure-summary.js";

const HELP = `atlassian-server-mcp

Unified stdio MCP server for Jira, Confluence, and Bitbucket Data Center.

Usage:
  atlassian-server-mcp [options]        Start the MCP server on stdio
  atlassian-server-mcp doctor [options] Run pre-flight diagnostics and exit

Options:
  --exposure-tier <tier>       read (default), safe, risky, or max
  --force-include-ops <glob>   Force-expose a matching operation (repeatable)
  --force-exclude-ops <glob>   Force-hide a matching operation (repeatable)
  --tls-verify                 Enable TLS certificate and hostname verification
                               (default; overrides ATLASSIAN_TLS_VERIFY=false)
  --no-tls-verify              Disable TLS certificate and hostname verification
                               (insecure; overrides ATLASSIAN_TLS_VERIFY=true)
  --max-output-bytes <bytes>   Maximum serialized tool result size (default 65536)
  --max-download-bytes <bytes> Maximum bytes streamed to downloadPath/outputPath
                               (default 104857600, min 1048576)
  --cursor-ttl-seconds <secs>  Cursor lifetime (default 900)
  --skip-startup-check         Start without probing configured products
  --help                       Show this help

Large responses: pass outputPath to atlassian_execute_operation or any read
tool to stream the raw upstream body to a file under ATLASSIAN_FILE_ROOT.
Pagination is skipped, and the result includes savedPath/bytes so you can
read the file in chunks.

The doctor subcommand checks configuration, CA files, product reachability,
credentials, version baseline, TLS, and ATLASSIAN_FILE_ROOT. It prints
PASS/WARN/FAIL rows with fix hints and exits non-zero if any check FAILs.
`;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const doctorMode = argv[0] === "doctor";
  const args = doctorMode ? argv.slice(1) : argv;
  validateCliOptions(args);
  if (args.includes("--help")) {
    process.stdout.write(HELP);
    return;
  }

  if (doctorMode) {
    const report = await runDoctor({ args, env: process.env });
    process.stdout.write(formatDoctorReport(report));
    if (!report.ok) process.exitCode = 1;
    return;
  }

  const config = loadConfig(args, process.env);
  // Warn when an explicit TLS flag contradicts the env setting; the flag wins.
  const tlsFlag = args.includes("--tls-verify")
    ? true
    : args.includes("--no-tls-verify")
      ? false
      : undefined;
  const tlsEnv = process.env.ATLASSIAN_TLS_VERIFY?.trim().toLowerCase();
  if (
    tlsFlag !== undefined &&
    (tlsEnv === "true" || tlsEnv === "false") &&
    tlsFlag !== (tlsEnv === "true")
  ) {
    console.error(
      `[atlassian-server-mcp] WARNING: ${tlsFlag ? "--tls-verify" : "--no-tls-verify"} overrides ATLASSIAN_TLS_VERIFY=${tlsEnv}.`
    );
  }
  console.error(`[atlassian-server-mcp] ${formatExposureSummary(config)}`);
  if (!config.tlsVerify) {
    console.error(
      "[atlassian-server-mcp] WARNING: TLS certificate and hostname verification is disabled. HTTPS traffic is encrypted but peer identity is not verified."
    );
  }

  const service = new AtlassianService(config);
  try {
    if (!args.includes("--skip-startup-check")) {
      const products = await service.probeConfiguredProducts();
      for (const product of products) {
        if (!product.reachable) {
          console.error(
            `[atlassian-server-mcp] WARNING: ${product.product} is not reachable: ${product.error ?? "unknown error"}. The MCP server will continue to start.`
          );
        } else if (product.version && !isTestedVersion(product.product, product.version)) {
          console.error(
            `[atlassian-server-mcp] WARNING: ${product.product} ${product.version} is outside the OpenAPI generation and test baseline. The MCP server will continue to start.`
          );
        }
      }
    }
    serveStdio(() => createAtlassianMcpServer(service));
  } catch (error) {
    await service.close();
    throw error;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown fatal error";
  console.error(`[atlassian-server-mcp] ${message}`);
  process.exitCode = 1;
});
