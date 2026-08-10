import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { formatDoctorReport, runDoctor, type DoctorReport } from "../src/doctor.js";
import type { ProductInfo, ServerConfig } from "../src/types.js";

const baseEnv: NodeJS.ProcessEnv = {
  JIRA_URL: "https://jira.example.test",
  JIRA_TOKEN: "secret-token"
};

function reachable(
  overrides: Partial<ProductInfo> = {}
): (config: ServerConfig) => Promise<ProductInfo[]> {
  return async (config) =>
    Object.keys(config.products).map((product) => ({
      product: product as ProductInfo["product"],
      baseUrl: `https://${product}.example.test`,
      authMode: "token" as const,
      tlsVerify: true,
      reachable: true,
      version: product === "jira" ? "10.3.1" : product === "confluence" ? "9.2.4" : "9.4.0",
      ...overrides
    }));
}

function failing(error: string): () => Promise<ProductInfo[]> {
  return async () => [
    {
      product: "jira",
      baseUrl: "https://jira.example.test",
      authMode: "token",
      tlsVerify: true,
      reachable: false,
      error
    }
  ];
}

function check(report: DoctorReport, name: string) {
  const found = report.checks.find((entry) => entry.name === name);
  expect(found, `missing doctor check row: ${name}`).toBeDefined();
  return found!;
}

let tempDirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "doctor-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe("doctor", () => {
  it("reports a structured FAIL (not a stack trace) when nothing is configured", async () => {
    const report = await runDoctor({ env: {} });
    expect(report.ok).toBe(false);
    expect(report.checks).toHaveLength(1);
    expect(check(report, "config").status).toBe("FAIL");
    expect(check(report, "config").suggestion).toMatch(/JIRA_URL/);
    const output = formatDoctorReport(report);
    expect(output).toContain("[FAIL] config");
    expect(output).not.toMatch(/at \w+ \(/);
  });

  it("passes when products are reachable on baseline versions and the file root is writable", async () => {
    const root = await tempDir();
    const report = await runDoctor({
      env: { ...baseEnv, ATLASSIAN_FILE_ROOT: root },
      probe: reachable()
    });
    expect(report.ok).toBe(true);
    expect(check(report, "config").status).toBe("PASS");
    expect(check(report, "jira.reachability").status).toBe("PASS");
    expect(check(report, "jira.version").status).toBe("PASS");
    expect(check(report, "jira.tls").status).toBe("PASS");
    expect(report.checks.find((entry) => entry.name.startsWith("files.root"))?.status).toBe("PASS");
  });

  it("fails with a PAT hint when the probe returns 401", async () => {
    const report = await runDoctor({
      env: baseEnv,
      probe: failing("jira.server.info failed with HTTP 401")
    });
    expect(report.ok).toBe(false);
    const row = check(report, "jira.reachability");
    expect(row.status).toBe("FAIL");
    expect(row.suggestion).toMatch(/JIRA_TOKEN/);
    expect(check(report, "jira.tls").status).toBe("FAIL");
  });

  it("fails with a CA hint on certificate errors", async () => {
    const report = await runDoctor({
      env: baseEnv,
      probe: failing("unable to verify the first certificate")
    });
    expect(report.ok).toBe(false);
    expect(check(report, "jira.reachability").suggestion).toMatch(/JIRA_CA_FILE/);
  });

  it("fails with a connectivity hint on network errors", async () => {
    const report = await runDoctor({
      env: baseEnv,
      probe: failing("connect ECONNREFUSED 10.0.0.1")
    });
    expect(report.ok).toBe(false);
    expect(check(report, "jira.reachability").suggestion).toMatch(/reachable from this machine/);
  });

  it("warns (without blocking) when the version is outside the tested baseline", async () => {
    const report = await runDoctor({ env: baseEnv, probe: reachable({ version: "8.20.11" }) });
    expect(report.ok).toBe(true);
    const row = check(report, "jira.version");
    expect(row.status).toBe("WARN");
    expect(row.message).toMatch(/10\.3, 11\.3/);
  });

  it("warns (without blocking) when TLS verification is disabled", async () => {
    const report = await runDoctor({
      env: { ...baseEnv, ATLASSIAN_TLS_VERIFY: "false" },
      probe: reachable({ tlsVerify: false })
    });
    expect(report.ok).toBe(true);
    expect(check(report, "jira.tls").status).toBe("WARN");
  });

  it("warns when ATLASSIAN_FILE_ROOT is not configured", async () => {
    const report = await runDoctor({ env: baseEnv, probe: reachable() });
    expect(report.ok).toBe(true);
    expect(check(report, "files.root").status).toBe("WARN");
  });

  it("fails when the file root does not exist", async () => {
    const report = await runDoctor({
      env: { ...baseEnv, ATLASSIAN_FILE_ROOT: join(await tempDir(), "missing") },
      probe: reachable()
    });
    expect(report.ok).toBe(false);
    const row = report.checks.find((entry) => entry.name.startsWith("files.root"))!;
    expect(row.status).toBe("FAIL");
    expect(row.suggestion).toMatch(/mkdir -p/);
  });

  it("fails early with a structured row when the CA file is unreadable", async () => {
    const report = await runDoctor({
      env: { ...baseEnv, JIRA_CA_FILE: join(await tempDir(), "no-such-ca.pem") },
      probe: reachable()
    });
    expect(report.ok).toBe(false);
    const ca = check(report, "ca.jira");
    expect(ca.status).toBe("FAIL");
    expect(ca.suggestion).toMatch(/chmod/);
    // loadConfig reads the CA file too, so configuration also fails fast.
    expect(check(report, "config").status).toBe("FAIL");
  });

  it("warns when a CA file is set but TLS verification is disabled", async () => {
    const report = await runDoctor({
      env: { ...baseEnv, ATLASSIAN_TLS_VERIFY: "false", JIRA_CA_FILE: "/does/not/matter.pem" },
      probe: reachable({ tlsVerify: false })
    });
    const ca = check(report, "ca.jira");
    expect(ca.status).toBe("WARN");
    expect(report.ok).toBe(true);
  });
});
