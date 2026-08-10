// HTTP transport: the undici client, request building (path/query/headers),
// redirect and error mapping, and response-body sanitization. File transfer
// (uploads, downloads, sandbox) lives in file-transfer.ts.
import { realpath } from "node:fs/promises";
import { dirname } from "node:path";
import { Agent, FormData, ProxyAgent, request, type Dispatcher } from "undici";
import { authorizationHeader } from "./auth.js";
import { AtlassianHttpError } from "./http-error.js";
import {
  buildMultipartBody,
  consumeBinaryResponse,
  isWithinRoot,
  safeFilePath,
  saveBodyToFile
} from "./file-transfer.js";
import { VERSION } from "./version.js";
import type { HttpMethod, HttpResult, RegisteredOperation, ProductConfig } from "./types.js";

// Re-exported so the http.js import surface (service.ts, tests) is unchanged.
export { AtlassianHttpError } from "./http-error.js";

const SENSITIVE_HEADER_PATTERN = /^(authorization|proxy-authorization|cookie|set-cookie)$/i;

function renderPath(template: string, values: Record<string, string | number> = {}): string {
  const used = new Set<string>();
  const rendered = template.replace(/\{([A-Za-z][A-Za-z0-9_-]*)\}/g, (_, key: string) => {
    const value = values[key];
    if (value === undefined || value === null || value === "") {
      throw new Error(`Missing path parameter: ${key}`);
    }
    used.add(key);
    if (key.endsWith("Path")) {
      const segments = String(value).split("/");
      if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
        throw new Error(`${key} contains an unsafe path segment`);
      }
      return segments.map((segment) => encodeURIComponent(segment)).join("/");
    }
    return encodeURIComponent(String(value));
  });

  const extras = Object.keys(values).filter((key) => !used.has(key));
  if (extras.length > 0) {
    throw new Error(`Unknown path parameter(s): ${extras.join(", ")}`);
  }
  return rendered;
}

function appendQuery(url: URL, query: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
    } else if (typeof value === "object") {
      url.searchParams.set(key, JSON.stringify(value));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
}

function headersToRecord(
  headers: Record<string, string | string[] | undefined>
): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || SENSITIVE_HEADER_PATTERN.test(name)) continue;
    output[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
  }
  return output;
}

export class AtlassianHttpClient {
  readonly #config: ProductConfig;
  readonly #agent: Dispatcher;

  constructor(config: ProductConfig) {
    this.#config = config;
    // Corporate proxy: ATLASSIAN_PROXY/HTTPS_PROXY resolved (with NO_PROXY
    // filtering) in config.ts. requestTls carries the target-server TLS
    // settings through the tunnel; proxy credentials in the URL are handled
    // by undici itself.
    this.#agent = config.proxyUrl
      ? new ProxyAgent({
          uri: config.proxyUrl,
          requestTls: {
            rejectUnauthorized: config.tlsVerify,
            ...(config.ca ? { ca: config.ca } : {})
          }
        })
      : new Agent({
          connect: {
            rejectUnauthorized: config.tlsVerify,
            ...(config.ca ? { ca: config.ca } : {})
          }
        });
  }

  get userAgent(): string {
    return this.#config.userAgent ?? `atlassian-server-mcp/${VERSION}`;
  }

  async execute(
    operation: RegisteredOperation,
    input: {
      path?: Record<string, string | number>;
      query?: Record<string, unknown>;
      body?: unknown;
      downloadPath?: string;
      outputPath?: string;
    }
  ): Promise<HttpResult> {
    // Note: baseUrl.pathname is "/" for root URLs (URL coerces the empty
    // string back), so strip trailing slashes here or the join produces a
    // scheme-relative "//rest/..." URL pointing at the wrong host.
    const basePath = this.#config.baseUrl.pathname.replace(/\/+$/, "");
    const url = new URL(
      `${basePath}${renderPath(operation.path, input.path)}`,
      this.#config.baseUrl.origin
    );
    appendQuery(url, input.query ?? {});

    const acceptValue =
      operation.accept !== undefined
        ? operation.accept
        : operation.responseKind === "binary"
          ? "application/octet-stream"
          : "application/json";
    const headers: Record<string, string> = {
      authorization: authorizationHeader(this.#config),
      "user-agent": this.userAgent
    };
    if (acceptValue !== "") headers.accept = acceptValue;
    let body: string | FormData | undefined;
    if (input.body !== undefined) {
      if (!operation.requestBody) {
        throw new Error(`${operation.operationId} does not accept a request body`);
      }
      if (operation.bodyKind === "multipart") {
        headers["x-atlassian-token"] = "no-check";
        body = await buildMultipartBody(operation, this.#config, input.body);
      } else {
        headers["content-type"] = "application/json";
        body = JSON.stringify(input.body);
      }
    }

    const response = await request(url, {
      method: operation.method as HttpMethod,
      headers,
      ...(body ? { body } : {}),
      dispatcher: this.#agent,
      headersTimeout: 30_000,
      bodyTimeout: 60_000
    });
    const safeHeaders = headersToRecord(response.headers);

    if (operation.responseKind === "binary") {
      return consumeBinaryResponse(
        response,
        safeHeaders,
        this.#config,
        operation.operationId,
        url,
        input.downloadPath
      );
    }

    // Redirect guard: explicitly reject 3xx responses BEFORE consuming the body.
    // undici does not follow redirects by default, and a session-expired
    // instance may 302 to a login page. This must run before outputPath
    // so redirect HTML is never saved to disk as a "successful" result.
    if (response.statusCode >= 300 && response.statusCode < 400) {
      await response.body.dump();
      let safeLocation = "";
      try {
        const location = String(response.headers.location ?? "");
        if (location)
          safeLocation = new URL(location, url).origin + new URL(location, url).pathname;
      } catch {
        /* malformed location — omit it */
      }
      throw new AtlassianHttpError(
        operation.product,
        operation.operationId,
        response.statusCode,
        `${operation.operationId} failed with HTTP ${response.statusCode}: upstream returned a redirect` +
          (safeLocation ? ` to ${safeLocation}` : "") +
          ". This usually means the session expired or the instance redirected to a login page; " +
          "this client does not follow redirects. Check credentials and instance state."
      );
    }

    // Large-response outputPath: stream the raw upstream response body to a
    // file under the file root. Runs after 3xx rejection (redirect HTML is
    // never saved).
    // Non-2xx responses read the small error body so the caller gets a
    // structured AtlassianHttpError, matching the normal JSON path.
    if (input.outputPath !== undefined) {
      const target = await safeFilePath(
        this.#config.fileRoot,
        input.outputPath,
        "outputPath",
        true
      );
      const parent = await realpath(dirname(target));
      if (!(await isWithinRoot(this.#config.fileRoot, parent))) {
        await response.body.dump();
        throw new Error("outputPath parent escapes the configured file root");
      }
      if (response.statusCode >= 400) {
        let errorData: unknown;
        try {
          const rawBody = await response.body.text();
          const ct = safeHeaders["content-type"] ?? "";
          if (ct.includes("json") && rawBody.trim().length > 0) {
            try {
              errorData = JSON.parse(rawBody);
            } catch {
              errorData = rawBody;
            }
          } else {
            errorData = rawBody || null;
          }
        } catch {
          /* body read failed — throw without details */
        }
        throw new AtlassianHttpError(
          operation.product,
          operation.operationId,
          response.statusCode,
          `${operation.operationId} failed with HTTP ${response.statusCode}`,
          sanitizeErrorDetails(errorData)
        );
      }
      const bytes = await saveBodyToFile(response, this.#config, operation.operationId, target);
      return {
        status: response.statusCode,
        headers: safeHeaders,
        data: { savedPath: input.outputPath, bytes }
      };
    }

    const contentType = safeHeaders["content-type"] ?? "";
    let data: unknown;
    if (response.statusCode === 204) {
      // Drain the response instead of calling destroy() directly. Undici can
      // emit an asynchronous UND_ERR_ABORTED error from destroy(), which is
      // process-fatal for the stdio MCP child on Node 24. A 204 has no useful
      // payload, but its stream still needs a handled lifecycle.
      await response.body.dump();
      data = null;
    } else {
      // Read as text first — some endpoints (e.g. dashboard item properties
      // PUT) return HTTP 201 with an empty body despite Content-Type: json.
      // Calling .json() on an empty body would throw "Unexpected end of JSON
      // input", so we parse manually and treat empty/whitespace-only as null.
      const rawBody = await response.body.text();
      if (contentType.includes("json") && rawBody.trim().length > 0) {
        try {
          data = JSON.parse(rawBody);
        } catch {
          data = rawBody;
        }
      } else {
        data = rawBody || null;
      }
    }

    if (response.statusCode >= 400) {
      throw new AtlassianHttpError(
        operation.product,
        operation.operationId,
        response.statusCode,
        `${operation.operationId} failed with HTTP ${response.statusCode}`,
        sanitizeErrorDetails(data)
      );
    }

    return { status: response.statusCode, headers: safeHeaders, data };
  }

  async downloadTrustedLink(
    operationId: string,
    link: string,
    allowedPathPrefixes: readonly string[],
    downloadPath: string
  ): Promise<HttpResult> {
    let url: URL;
    try {
      url = new URL(link, this.#config.baseUrl);
    } catch {
      throw new Error(`${operationId} metadata returned an invalid download URL`);
    }
    if (
      url.origin !== this.#config.baseUrl.origin ||
      url.username !== "" ||
      url.password !== "" ||
      url.hash !== ""
    ) {
      throw new Error(`${operationId} refused a cross-origin or credentialed download URL`);
    }
    if (!allowedPathPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
      throw new Error(`${operationId} refused an unexpected attachment download path`);
    }

    const response = await request(url, {
      method: "GET",
      headers: {
        accept: "application/octet-stream",
        authorization: authorizationHeader(this.#config),
        "user-agent": this.userAgent
      },
      dispatcher: this.#agent,
      headersTimeout: 30_000,
      bodyTimeout: 60_000
    });
    return consumeBinaryResponse(
      response,
      headersToRecord(response.headers),
      this.#config,
      operationId,
      url,
      downloadPath
    );
  }

  async close(): Promise<void> {
    await this.#agent.close();
  }
}

export function sanitizeErrorDetails(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(sanitizeErrorDetails);
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (/token|password|authorization|cookie|secret/i.test(key)) {
        output[key] = "[REDACTED]";
      } else {
        output[key] = sanitizeErrorDetails(child);
      }
    }
    return output;
  }
  if (typeof value === "string") {
    return value.slice(0, 4000);
  }
  return value;
}
