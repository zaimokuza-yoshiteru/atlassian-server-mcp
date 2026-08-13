import { CursorCodec } from "./cursor.js";
import { authMode } from "./auth.js";
import { AtlassianHttpClient } from "./http.js";
import { safeErrorMessage } from "./errors.js";
import { asRecord, parseStrictInteger, stripTrailingSlashes } from "./json.js";
import { operationById, POLICY_OPERATIONS } from "./operations/index.js";
import { ResponsePaginator, type ResponseOperationDescriptor } from "./pagination.js";
import { resolveExposure } from "./exposure-policy.js";
import { PRODUCTS } from "./types.js";
import type {
  CommonResponseOptions,
  ExecuteOperationInput,
  RegisteredOperation,
  Product,
  ProductInfo,
  ServerConfig,
  UnifiedResponse
} from "./types.js";

export interface DiscoverOperationsInput extends CommonResponseOptions {
  product?: Product;
  query?: string;
  tier?: "read" | "safe" | "risky" | "max";
}

interface ResolvedPolicyOperation {
  operation: RegisteredOperation;
  resolution: ReturnType<typeof resolveExposure>;
}

export class AtlassianService {
  readonly #config: ServerConfig;
  readonly #clients: Partial<Record<Product, AtlassianHttpClient>>;
  readonly #paginator: ResponsePaginator;

  constructor(config: ServerConfig) {
    this.#config = config;
    this.#clients = {};
    for (const product of PRODUCTS) {
      const productConfig = config.products[product];
      if (productConfig) this.#clients[product] = new AtlassianHttpClient(productConfig);
    }
    this.#paginator = new ResponsePaginator(new CursorCodec(config.cursorTtlSeconds));
  }

  get config(): ServerConfig {
    return this.#config;
  }

  get configuredProducts(): Product[] {
    return PRODUCTS.filter((product) => Boolean(this.#config.products[product]));
  }

  get enabledOperations(): readonly RegisteredOperation[] {
    return this.#resolvedPolicyOperations()
      .filter(({ resolution }) => resolution.exposed)
      .map(({ operation }) => operation);
  }

  isProductConfigured(product: Product): boolean {
    return Boolean(this.#config.products[product]);
  }

  discoverOperations(input: DiscoverOperationsInput = {}): UnifiedResponse {
    const query = input.query?.trim().toLowerCase();
    const filtered = this.#resolvedPolicyOperations()
      .filter(({ operation, resolution }) => {
        if (!resolution.exposed) return false;
        if (input.product && operation.product !== input.product) return false;
        if (input.tier && resolution.requiredTier !== input.tier) {
          return false;
        }
        if (!query) return true;
        return [operation.operationId, operation.summary, ...operation.tags].some((value) =>
          value.toLowerCase().includes(query)
        );
      })
      .map(({ operation, resolution }) => publicOperation(operation, resolution));

    const operation: ResponseOperationDescriptor = {
      operationId: "atlassian.discover.operations",
      product: input.product ?? this.configuredProducts[0]!,
      pagination: {
        kind: "jira",
        requestOffset: "startAt",
        requestLimit: "maxResults",
        responseItems: "items",
        responseTotal: "total"
      }
    };
    const pageSize = clampPageSize(input.pageSize);
    const identity = {
      product: input.product,
      query,
      tier: input.tier,
      pageSize,
      responseProfile: input.responseProfile ?? "standard",
      fields: input.fields,
      maxOutputBytes: input.maxOutputBytes
    };
    const state = this.#paginator.requestState(operation, identity, input.cursor);
    const offset = numericOffset(state.upstreamOffset);
    const page = filtered.slice(offset, offset + pageSize);
    return this.#paginator.paginate({
      operation,
      rawData: { items: page, total: filtered.length },
      responseOptions: {
        ...input,
        responseProfile: input.responseProfile ?? "standard"
      },
      requestIdentity: identity,
      upstreamOffset: offset,
      upstreamLimit: pageSize,
      maxOutputBytes: this.#config.maxOutputBytes,
      ...(state.cursorPayload ? { cursorPayload: state.cursorPayload } : {})
    });
  }

  describeOperation(operationId: string): Record<string, unknown> {
    const operation = operationById(operationId);
    if (!operation || operation.unsupportedReason) {
      throw new Error(`Unknown or unsupported operation: ${operationId}`);
    }
    this.#assertProductConfigured(operation.product);
    this.#assertAllowed(operation);
    return publicOperation(
      operation,
      resolveExposure(operation, {
        tier: this.#config.exposureTier,
        forceInclude: this.#config.forceInclude,
        forceExclude: this.#config.forceExclude,
        configuredProducts: new Set(this.configuredProducts)
      })
    );
  }

  async execute(input: ExecuteOperationInput): Promise<UnifiedResponse> {
    const operation = operationById(input.operationId);
    if (!operation) {
      throw new Error(`Unknown operation: ${input.operationId}`);
    }
    if (operation.unsupportedReason) {
      throw new Error(`${operation.operationId} is unsupported: ${operation.unsupportedReason}`);
    }
    this.#assertProductConfigured(operation.product);
    this.#assertAllowed(operation);
    if (input.cursor && operation.method !== "GET") {
      throw new Error("Cursors are only supported for read operations");
    }
    if (operation.method === "GET" && input.body !== undefined) {
      throw new Error("GET operations do not accept a request body");
    }
    if (input.downloadPath !== undefined && operation.responseKind !== "binary") {
      throw new Error(
        `${operation.operationId} is not a binary operation; downloadPath is only supported for binary downloads`
      );
    }
    // outputPath guards.
    if (input.outputPath !== undefined) {
      if (operation.responseKind === "binary") {
        throw new Error(
          `${operation.operationId} is a binary operation; use downloadPath instead of outputPath`
        );
      }
      if (!this.#config.products[operation.product]?.fileRoot) {
        throw new Error(
          `${operation.operationId} outputPath requires ATLASSIAN_FILE_ROOT (or a product FILE_ROOT) to be configured`
        );
      }
    }
    if (operation.bodyKind === "multipart" && input.body === undefined) {
      throw new Error(
        `${operation.operationId} requires a multipart body: { files: string[], fields?: Record<string, string> }`
      );
    }

    const pageSize = clampPageSize(input.pageSize);
    const cleanQuery = { ...(input.query ?? {}) };
    if (operation.pagination) {
      delete cleanQuery[operation.pagination.requestOffset];
      delete cleanQuery[operation.pagination.requestLimit];
    }
    const identity = {
      operationId: input.operationId,
      path: input.path,
      query: cleanQuery,
      body: input.body,
      pageSize,
      responseProfile: input.responseProfile ?? "compact",
      fields: input.fields,
      maxOutputBytes: input.maxOutputBytes
    };
    const state = this.#paginator.requestState(operation, identity, input.cursor);
    const query = { ...cleanQuery };
    if (operation.pagination) {
      query[operation.pagination.requestOffset] = state.upstreamOffset;
      query[operation.pagination.requestLimit] = pageSize;
    }

    // Large-response outputPath: skip pagination and projection; stream the
    // raw upstream body to a file under the file root. Cursor/pageSize are
    // ignored and the response carries no nextCursor.
    if (input.outputPath !== undefined) {
      const client = this.#clients[operation.product];
      if (!client) throw new Error(`Product ${operation.product} is not configured`);
      const result = await client.execute(operation, {
        ...(input.path ? { path: input.path } : {}),
        query: cleanQuery,
        ...(input.body !== undefined ? { body: input.body } : {}),
        outputPath: input.outputPath
      });
      const data = result.data as { savedPath: string; bytes: number };
      return {
        data: {
          savedPath: data.savedPath,
          bytes: data.bytes,
          note: "Full response written to file; read it in chunks."
        },
        page: { mode: "fields", returned: 1, hasMore: false },
        meta: {
          product: operation.product,
          operationId: operation.operationId,
          responseProfile: input.responseProfile ?? "compact",
          responseBytes: data.bytes,
          truncated: false
        }
      };
    }

    const client = this.#clients[operation.product];
    if (!client) throw new Error(`Product ${operation.product} is not configured`);
    const result = await client.execute(operation, {
      ...(input.path ? { path: input.path } : {}),
      query,
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.downloadPath !== undefined ? { downloadPath: input.downloadPath } : {})
    });
    const response = this.#paginator.paginate({
      operation,
      rawData: result.data,
      responseOptions: input,
      requestIdentity: identity,
      upstreamOffset: state.upstreamOffset,
      upstreamLimit: pageSize,
      maxOutputBytes: this.#config.maxOutputBytes,
      ...(state.cursorPayload ? { cursorPayload: state.cursorPayload } : {})
    });

    if (operation.method !== "GET" && response.page.hasMore) {
      response.page = {
        mode: response.page.mode,
        returned: response.page.returned,
        hasMore: false
      };
      response.meta.truncated = true;
    }
    return response;
  }

  async downloadAttachment(
    product: "jira" | "confluence",
    attachmentId: string,
    downloadPath: string
  ): Promise<UnifiedResponse> {
    this.#assertProductConfigured(product);
    const client = this.#clients[product];
    const config = this.#config.products[product];
    if (!client || !config) throw new Error(`Product ${product} is not configured`);

    const metadataOperationId =
      product === "jira" ? "jira.issue.attachments.metadata" : "confluence.content.get";
    const metadataOperation = operationById(metadataOperationId);
    if (!metadataOperation) throw new Error(`Missing ${product} attachment metadata operation`);
    this.#assertAllowed(metadataOperation);
    const metadata = await client.execute(metadataOperation, {
      path: product === "jira" ? { attachmentId } : { contentId: attachmentId },
      query: product === "confluence" ? { expand: "_links" } : {}
    });
    const link = attachmentDownloadLink(product, metadata.data);
    if (!link) {
      throw new Error(`${product} attachment metadata did not include a download link`);
    }

    const basePath = stripTrailingSlashes(config.baseUrl.pathname);
    const allowedPathPrefixes =
      product === "jira"
        ? [`${basePath}/secure/attachment/`, `${basePath}/rest/api/2/attachment/content/`]
        : [`${basePath}/download/attachments/`, "/download/attachments/"];
    const operationId = `${product}.attachment.download`;
    const result = await client.downloadTrustedLink(
      operationId,
      link,
      allowedPathPrefixes,
      downloadPath
    );
    const responseBytes = Buffer.byteLength(JSON.stringify(result.data), "utf8");
    return {
      data: result.data,
      page: { mode: "fields", returned: 1, hasMore: false },
      meta: {
        product,
        operationId,
        responseProfile: "standard",
        responseBytes,
        truncated: false
      }
    };
  }

  async serverInfo(): Promise<ProductInfo[]> {
    const products = await this.#serverInfo(true);
    if (products.length > 0 && products.every((product) => product.reachable === undefined)) {
      throw new Error("No configured product is probeable under the current exposure policy");
    }
    return products;
  }

  async probeConfiguredProducts(): Promise<ProductInfo[]> {
    return this.#serverInfo(false);
  }

  async #serverInfo(enforcePolicy: boolean): Promise<ProductInfo[]> {
    return Promise.all(
      this.configuredProducts.map(async (product) => {
        const config = this.#config.products[product];
        if (!config) throw new Error(`Product ${product} is not configured`);
        try {
          const operationId =
            product === "jira"
              ? "jira.server.info"
              : product === "bitbucket"
                ? "bitbucket.server.info"
                : "confluence.server.info";
          const operation = operationById(operationId);
          if (!operation) throw new Error("Missing server information operation");
          if (enforcePolicy) {
            try {
              this.#assertAllowed(operation);
            } catch (error) {
              return {
                product,
                baseUrl: config.baseUrl.toString(),
                authMode: authMode(config),
                tlsVerify: config.tlsVerify,
                error: `Probe blocked by exposure policy: ${safeErrorMessage(error)}`
              };
            }
          }
          const client = this.#clients[product];
          if (!client) throw new Error(`Product ${product} is not configured`);
          const result = await client.execute(operation, {
            query: {}
          });
          const version = extractVersion(result.data);
          return {
            product,
            baseUrl: config.baseUrl.toString(),
            authMode: authMode(config),
            tlsVerify: config.tlsVerify,
            reachable: true,
            ...(version ? { version } : {})
          };
        } catch (error) {
          return {
            product,
            baseUrl: config.baseUrl.toString(),
            authMode: authMode(config),
            tlsVerify: config.tlsVerify,
            reachable: false,
            error: safeErrorMessage(error)
          };
        }
      })
    );
  }

  async assertConnected(): Promise<ProductInfo[]> {
    const info = await this.serverInfo();
    const failures = info.filter((product) => !product.reachable);
    if (failures.length > 0) {
      throw new Error(
        `Atlassian startup check failed: ${failures
          .map((failure) => `${failure.product}: ${failure.error}`)
          .join("; ")}`
      );
    }
    return info;
  }

  async close(): Promise<void> {
    await Promise.all(Object.values(this.#clients).map((client) => client.close()));
  }

  #assertAllowed(operation: RegisteredOperation): void {
    const resolution = resolveExposure(operation, {
      tier: this.#config.exposureTier,
      forceInclude: this.#config.forceInclude,
      forceExclude: this.#config.forceExclude,
      configuredProducts: new Set(this.configuredProducts)
    });
    if (resolution.exposed) return;
    const details =
      resolution.reason === "tier-denied"
        ? `requires ${resolution.requiredTier} tier; server is running with ${this.#config.exposureTier}`
        : resolution.reason === "force-excluded"
          ? `excluded by FORCE_EXCLUDE_OPERATIONS (${resolution.matchedPattern})`
          : resolution.reason === "permanently-excluded"
            ? "not in exposure policy and cannot be restored by FORCE_INCLUDE_OPERATIONS"
            : resolution.reason === "product-not-configured"
              ? `product ${operation.product} is not configured`
              : resolution.reason;
    throw new Error(`${operation.operationId} ${details}`);
  }

  #resolvedPolicyOperations(): readonly ResolvedPolicyOperation[] {
    const configuredProducts = new Set(this.configuredProducts);
    const options = {
      tier: this.#config.exposureTier,
      forceInclude: this.#config.forceInclude,
      forceExclude: this.#config.forceExclude,
      configuredProducts
    };
    return POLICY_OPERATIONS.map((operation) => ({
      operation,
      resolution: resolveExposure(operation, options)
    }));
  }

  #assertProductConfigured(product: Product): void {
    if (!this.isProductConfigured(product)) {
      throw new Error(`Product ${product} is not configured`);
    }
  }
}

function attachmentDownloadLink(product: "jira" | "confluence", data: unknown): string | undefined {
  const object = asRecord(data);
  if (!object) return undefined;
  if (product === "jira") {
    return typeof object.content === "string" ? object.content : undefined;
  }
  const links = asRecord(object._links);
  if (!links) return undefined;
  return typeof links.download === "string" ? links.download : undefined;
}

function publicOperation(
  operation: RegisteredOperation,
  resolution = resolveExposure(operation)
): Record<string, unknown> {
  return {
    operationId: operation.operationId,
    product: operation.product,
    summary: operation.summary,
    method: operation.method,
    path: operation.path,
    requiredTier: resolution.requiredTier,
    forced: resolution.forced,
    exposureReason: resolution.reason,
    ...(resolution.matchedPattern ? { matchedPattern: resolution.matchedPattern } : {}),
    scope: operation.scope,
    dataKind: operation.dataKind,
    destructive: operation.destructive,
    ...(operation.parameters ? { parameters: operation.parameters } : {}),
    ...(operation.requestBodySchema ? { requestBodySchema: operation.requestBodySchema } : {}),
    ...(operation.requestBodyTemplate
      ? { requestBodyTemplate: operation.requestBodyTemplate }
      : {}),
    responseKind: operation.responseKind,
    pagination: operation.pagination?.kind ?? "none",
    versions: operation.versions ?? [],
    tags: operation.tags,
    requestBody: operation.requestBody ?? false,
    ...(operation.bodyKind ? { bodyKind: operation.bodyKind } : {})
  };
}

function clampPageSize(value: number | undefined): number {
  return Math.min(100, Math.max(1, value ?? 25));
}

function numericOffset(value: number | string): number {
  const parsed = typeof value === "number" ? value : parseStrictInteger(value);
  if (parsed === undefined || !Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("Invalid cursor offset");
  }
  return parsed;
}

function extractVersion(data: unknown): string | undefined {
  const object = asRecord(data);
  if (!object) return undefined;
  for (const key of ["version", "buildVersion", "displayVersion"]) {
    if (typeof object[key] === "string") return object[key];
  }
  return undefined;
}

export const TESTED_VERSION_LINES: Record<Product, readonly string[]> = {
  jira: ["10.3", "11.3"],
  confluence: ["9.2", "10.2"],
  bitbucket: ["9.4", "10.2", "10.4"]
};

export function isTestedVersion(product: Product, version: string): boolean {
  return TESTED_VERSION_LINES[product].some(
    (line) => version === line || version.startsWith(`${line}.`)
  );
}

// safeErrorPayload/safeErrorMessage live in errors.ts (error handling split);
// re-exported here to keep the service.js import surface unchanged.
export { safeErrorMessage, safeErrorPayload } from "./errors.js";
