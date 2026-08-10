import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Product } from "../../../src/types.js";

const RPC_TIMEOUT_MS = Number(process.env.E2E_RPC_TIMEOUT_MS) || 60_000;

interface RpcMessage {
  id?: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface McpToolResult {
  isError?: boolean;
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
}

export interface McpCredentials {
  token?: string;
  username?: string;
  password?: string;
}

export class StdioMcpClient {
  private readonly product: Product;
  private readonly child: ChildProcessWithoutNullStreams;
  initializeResult: Record<string, unknown> = {};
  private readonly waiting = new Map<
    number,
    {
      resolve: (message: RpcMessage) => void;
      reject: (error: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();
  private nextId = 1;
  private stdout = "";
  private stderr = "";

  private constructor(product: Product, child: ChildProcessWithoutNullStreams) {
    this.product = product;
    this.child = child;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => this.consume(chunk));
    child.stderr.on("data", (chunk: string) => {
      this.stderr += chunk;
    });
    child.once("exit", (code, signal) => {
      const error = new Error(
        `MCP process exited (${code ?? signal ?? "unknown"}): ${this.stderr.slice(-2000)}`
      );
      for (const pending of this.waiting.values()) {
        clearTimeout(pending.timer);
        pending.reject(error);
      }
      this.waiting.clear();
    });
  }

  static async start(
    product: Product,
    extraArgs: string[] = [],
    credentials?: McpCredentials
  ): Promise<StdioMcpClient> {
    const prefix = product.toUpperCase();
    const url = process.env[`${prefix}_URL`];
    // Passing credentials is an explicit identity selection. Do not silently
    // reintroduce the product token when a Basic admin/reviewer was requested.
    const token = credentials ? credentials.token : process.env[`${prefix}_TOKEN`];
    const username = credentials ? credentials.username : process.env.ATLASSIAN_USERNAME;
    const password = credentials ? credentials.password : process.env.ATLASSIAN_PASSWORD;
    if (!url || (!token && !(username && password))) {
      throw new Error(
        `Configure ${prefix}_URL and ${prefix}_TOKEN, or shared Basic credentials, in .env.dc`
      );
    }

    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      NODE_ENV: "test",
      [`${prefix}_URL`]: url,
      ...(token ? { [`${prefix}_TOKEN`]: token } : {}),
      ...(username ? { ATLASSIAN_USERNAME: username } : {}),
      ...(password ? { ATLASSIAN_PASSWORD: password } : {}),
      ...(process.env.ATLASSIAN_TLS_VERIFY
        ? { ATLASSIAN_TLS_VERIFY: process.env.ATLASSIAN_TLS_VERIFY }
        : {}),
      ...(process.env.ATLASSIAN_FILE_ROOT
        ? { ATLASSIAN_FILE_ROOT: process.env.ATLASSIAN_FILE_ROOT }
        : {})
    };
    const child = spawn(process.execPath, ["dist/cli.js", "--skip-startup-check", ...extraArgs], {
      cwd: process.cwd(),
      env,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const client = new StdioMcpClient(product, child);
    client.initializeResult = (await client.request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "local-e2e", version: "1.0.0" }
    })) as Record<string, unknown>;
    client.notify("notifications/initialized", {});
    return client;
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
    opts?: { expectError?: boolean }
  ): Promise<McpToolResult> {
    const result = (await this.request("tools/call", { name, arguments: args })) as McpToolResult;
    // A2: extract operationId from the server's structuredContent (available on
    // every tool result, including named tools). Fall back to args.operationId
    // when the response has no meta (e.g. an error path for the generic tool).
    const structuredMeta = (
      result.structuredContent as { meta?: { operationId?: unknown } } | undefined
    )?.meta;
    const structuredOpId =
      typeof structuredMeta?.operationId === "string" ? structuredMeta.operationId : null;
    const operationId =
      structuredOpId ?? (typeof args.operationId === "string" ? args.operationId : null);
    const stateDir = resolve(`.e2e-state/${this.product}`);
    mkdirSync(stateDir, { recursive: true });
    appendFileSync(
      resolve(stateDir, "invoked-ops.jsonl"),
      `${JSON.stringify({
        toolName: name,
        operationId,
        isError: result.isError === true,
        expectError: !!opts?.expectError,
        ts: new Date().toISOString()
      })}\n`
    );
    return result;
  }

  async listTools(): Promise<{ tools: Array<Record<string, unknown>> }> {
    return (await this.request("tools/list", {})) as { tools: Array<Record<string, unknown>> };
  }

  async close(): Promise<void> {
    if (this.child.exitCode !== null) return;
    // Cancel all pending timers so nothing fires after we return. We do NOT
    // reject the promises here — close() is called from afterAll after all
    // requests have already settled, so the map is normally empty. Rejecting
    // a settled promise (or a still-in-flight one whose caller has moved on)
    // would produce an unhandled rejection in vitest. The child exit handler
    // already covers the unexpected-crash case.
    for (const pending of this.waiting.values()) clearTimeout(pending.timer);
    this.waiting.clear();
    this.child.kill("SIGTERM");
    await Promise.race([
      new Promise<void>((resolve) => this.child.once("exit", () => resolve())),
      new Promise<void>((resolve) => setTimeout(resolve, 2_000))
    ]);
    if (this.child.exitCode === null) this.child.kill("SIGKILL");
  }

  private notify(method: string, params: unknown): void {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  private request(method: string, params: unknown): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiting.delete(id);
        reject(
          new Error(`Timed out waiting for MCP ${method}. stderr: ${this.stderr.slice(-2000)}`)
        );
      }, RPC_TIMEOUT_MS);
      this.waiting.set(id, {
        timer,
        reject,
        resolve: (message) => {
          if (message.error) reject(new Error(`${message.error.code}: ${message.error.message}`));
          else resolve(message.result);
        }
      });
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  private consume(chunk: string): void {
    this.stdout += chunk;
    let newline = this.stdout.indexOf("\n");
    while (newline >= 0) {
      const line = this.stdout.slice(0, newline).trim();
      this.stdout = this.stdout.slice(newline + 1);
      if (line) {
        let message: RpcMessage;
        try {
          message = JSON.parse(line) as RpcMessage;
        } catch {
          // A non-JSON line is a protocol violation. Reject every pending
          // request instead of throwing inside the 'data' event handler,
          // which would crash the test process.
          const err = new Error(`Non-JSON stdout from MCP server: ${line.slice(0, 500)}`);
          for (const [_id, pending] of this.waiting) {
            clearTimeout(pending.timer);
            pending.reject(err);
          }
          this.waiting.clear();
          newline = this.stdout.indexOf("\n");
          continue;
        }
        if (typeof message.id === "number") {
          const pending = this.waiting.get(message.id);
          if (pending) {
            clearTimeout(pending.timer);
            this.waiting.delete(message.id);
            pending.resolve(message);
          }
        }
      }
      newline = this.stdout.indexOf("\n");
    }
  }
}

export function requireToolSuccess(result: McpToolResult): Record<string, unknown> {
  if (result.isError) {
    throw new Error(
      `MCP tool failed: ${JSON.stringify(result.structuredContent ?? result.content)}`
    );
  }
  if (!result.structuredContent) throw new Error("MCP tool returned no structuredContent");
  return result.structuredContent;
}
