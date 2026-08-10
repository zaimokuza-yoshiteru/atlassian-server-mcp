import { createServer, type RequestListener, type Server } from "node:http";
import { connect } from "node:net";
import { type AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { AtlassianHttpClient } from "../src/http.js";
import { VERSION } from "../src/version.js";
import type { RegisteredOperation } from "../src/types.js";

const getOperation: RegisteredOperation = {
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

const baseEnv: NodeJS.ProcessEnv = {
  JIRA_URL: "https://jira.example.test",
  JIRA_TOKEN: "secret-token"
};

let servers: Server[] = [];
let clients: AtlassianHttpClient[] = [];

function listen(server: Server): Promise<string> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

async function startServer(handler: RequestListener): Promise<string> {
  const server = createServer(handler);
  servers.push(server);
  return listen(server);
}

function makeClient(origin: string, extra: Record<string, unknown> = {}): AtlassianHttpClient {
  const client = new AtlassianHttpClient({
    product: "jira",
    baseUrl: new URL(origin),
    token: "secret-token",
    tlsVerify: true,
    ...extra
  });
  clients.push(client);
  return client;
}

beforeEach(() => {
  servers = [];
  clients = [];
});

afterEach(async () => {
  await Promise.all(clients.map((client) => client.close()));
  await Promise.all(
    servers.map((server) => new Promise((resolve) => server.close(resolve as () => void)))
  );
});

describe("proxy configuration", () => {
  it("resolves ATLASSIAN_PROXY before HTTPS_PROXY and stores it on the product config", () => {
    const config = loadConfig([], {
      ...baseEnv,
      ATLASSIAN_PROXY: "http://proxy.corp.test:3128",
      HTTPS_PROXY: "http://other.corp.test:3128"
    });
    expect(config.products.jira?.proxyUrl).toBe("http://proxy.corp.test:3128");
    const fallback = loadConfig([], { ...baseEnv, https_proxy: "http://lower.corp.test:3128" });
    expect(fallback.products.jira?.proxyUrl).toBe("http://lower.corp.test:3128");
  });

  it("honors NO_PROXY entries: wildcard, suffix, exact host and port-restricted", () => {
    const withEnv = (extra: NodeJS.ProcessEnv) =>
      loadConfig([], { ...baseEnv, HTTPS_PROXY: "http://proxy.corp.test:3128", ...extra }).products
        .jira?.proxyUrl;
    expect(withEnv({ NO_PROXY: "*" })).toBeUndefined();
    expect(withEnv({ NO_PROXY: ".example.test" })).toBeUndefined();
    expect(withEnv({ NO_PROXY: "jira.example.test" })).toBeUndefined();
    expect(withEnv({ NO_PROXY: "other.test, jira.example.test:443" })).toBeUndefined();
    expect(withEnv({ NO_PROXY: "jira.example.test:8443" })).toBe("http://proxy.corp.test:3128");
    expect(withEnv({ NO_PROXY: "confluence.example.test" })).toBe("http://proxy.corp.test:3128");
  });

  it("rejects invalid proxy URLs at startup without echoing credentials", () => {
    expect(() => loadConfig([], { ...baseEnv, HTTPS_PROXY: "not a url" })).toThrow(
      /valid absolute URL/
    );
    expect(() => loadConfig([], { ...baseEnv, HTTPS_PROXY: "socks5://proxy:1080" })).toThrow(
      /http or https/
    );
    expect(() => loadConfig([], { ...baseEnv, HTTPS_PROXY: "not a url" })).toThrow(
      /^(?!.*not a url).*$/
    );
  });

  it("stores the ATLASSIAN_USER_AGENT override on the product config", () => {
    const config = loadConfig([], { ...baseEnv, ATLASSIAN_USER_AGENT: "my-waf-agent/2.0" });
    expect(config.products.jira?.userAgent).toBe("my-waf-agent/2.0");
    expect(loadConfig([], baseEnv).products.jira?.userAgent).toBeUndefined();
  });
});

describe("proxy and user-agent over the wire", () => {
  it("routes requests through the configured proxy (CONNECT tunnel)", async () => {
    const target = await startServer((_req, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ version: "10.3.1" }));
    });
    const targetPort = Number(target.split(":").pop());
    const seenByProxy: string[] = [];
    // Minimal CONNECT proxy: undici tunnels every origin through CONNECT.
    const proxyServer = createServer();
    servers.push(proxyServer);
    proxyServer.on("connect", (req, socket) => {
      seenByProxy.push(String(req.url));
      const upstream = connect(targetPort, "127.0.0.1", () => {
        socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        upstream.pipe(socket);
        socket.pipe(upstream);
      });
      upstream.on("error", () => socket.destroy());
    });
    const proxy = await listen(proxyServer);

    const client = makeClient(target, { proxyUrl: proxy });
    const result = await client.execute(getOperation, { query: {} });
    expect(result.status).toBe(200);
    expect(seenByProxy).toEqual([`127.0.0.1:${targetPort}`]);
  });

  it("fails against an unreachable proxy, proving traffic is routed via the proxy", async () => {
    const target = await startServer((_req, res) => res.end("{}"));
    // Grab a port and close it so nothing listens there.
    const dead = await startServer(() => {});
    await new Promise((resolve) => servers[servers.length - 1]!.close(resolve as () => void));

    const client = makeClient(target, { proxyUrl: dead });
    await expect(client.execute(getOperation, { query: {} })).rejects.toThrow(
      new RegExp(dead.split(":").pop()!)
    );
  });

  it("sends the default User-Agent and honors the ATLASSIAN_USER_AGENT override", async () => {
    const agents: (string | undefined)[] = [];
    const target = await startServer((req, res) => {
      agents.push(req.headers["user-agent"]);
      res.setHeader("content-type", "application/json");
      res.end("{}");
    });

    await makeClient(target).execute(getOperation, { query: {} });
    await makeClient(target, { userAgent: "my-waf-agent/2.0" }).execute(getOperation, {
      query: {}
    });
    expect(agents).toEqual([`atlassian-server-mcp/${VERSION}`, "my-waf-agent/2.0"]);
  });
});
