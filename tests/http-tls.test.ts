import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type Server } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AtlassianHttpClient } from "../src/http.js";
import type { RegisteredOperation } from "../src/types.js";

const jsonOperation: RegisteredOperation = {
  operationId: "jira.server.info",
  product: "jira",
  summary: "Get server info",
  method: "GET",
  path: "/rest/api/2/serverInfo",
  responseKind: "json",
  tags: ["server"],
  scope: "global",
  dataKind: "resource",
  destructive: false
};

// Self-signed certificate fixtures need openssl and unix-style temp paths.
describe.skipIf(process.platform === "win32")("TLS verification", () => {
  let server: Server;
  let origin: string;
  let workdir: string;
  let certPath: string;

  beforeAll(async () => {
    workdir = await mkdtemp(join(tmpdir(), "atlassian-mcp-tls-"));
    const keyPath = join(workdir, "key.pem");
    certPath = join(workdir, "cert.pem");
    execFileSync("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyPath,
      "-out",
      certPath,
      "-days",
      "1",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost"
    ]);
    server = createServer(
      { key: await readFile(keyPath), cert: await readFile(certPath) },
      (_request, response) => {
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ version: "11.3.5" }));
      }
    );
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port");
    origin = `https://localhost:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await rm(workdir, { recursive: true, force: true });
  });

  function client(overrides: { tlsVerify: boolean; ca?: string }): AtlassianHttpClient {
    return new AtlassianHttpClient({
      product: "jira",
      baseUrl: new URL(origin),
      token: "token",
      tlsVerify: overrides.tlsVerify,
      ...(overrides.ca ? { ca: overrides.ca } : {})
    });
  }

  it("rejects a self-signed certificate when TLS verification is on", async () => {
    const http = client({ tlsVerify: true });
    await expect(http.execute(jsonOperation, {})).rejects.toThrow();
    await http.close();
  });

  it("accepts a self-signed certificate when TLS verification is off", async () => {
    const http = client({ tlsVerify: false });
    const result = await http.execute(jsonOperation, {});
    await http.close();
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ version: "11.3.5" });
  });

  it("verifies successfully against a configured CA bundle", async () => {
    const ca = await readFile(certPath, "utf8");
    const http = client({ tlsVerify: true, ca });
    const result = await http.execute(jsonOperation, {});
    await http.close();
    expect(result.status).toBe(200);
  });
});
