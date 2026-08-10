export const PRODUCTS = ["jira", "confluence", "bitbucket"] as const;
export type Product = (typeof PRODUCTS)[number];

export const EXPOSURE_TIERS = ["read", "safe", "risky", "max"] as const;
export type ExposureTier = (typeof EXPOSURE_TIERS)[number];
export type ExposureReason =
  | "tier-allowed"
  | "tier-denied"
  | "force-included"
  | "force-excluded"
  | "permanently-excluded"
  | "unknown-operation"
  | "unsupported-operation"
  | "product-not-configured";
export type OperationScope =
  "issue" | "content" | "repository" | "project" | "space" | "global" | "unknown";
export type OperationDataKind = "resource" | "metadata" | "capability" | "mutation" | "diagnostic";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type ResponseKind = "json" | "binary";
export type BodyKind = "json" | "multipart";
export type PaginationKind = "jira" | "confluence" | "bitbucket" | "none";
export type ResponseProfile = "compact" | "standard" | "full";

export interface ProductConfig {
  product: Product;
  baseUrl: URL;
  token?: string;
  username?: string;
  password?: string;
  tlsVerify: boolean;
  ca?: string;
  /** Local root under which attachment uploads/downloads are permitted. */
  fileRoot?: string;
  /** Maximum bytes streamed to downloadPath/outputPath (default 100MB). */
  maxDownloadBytes?: number;
  /** Outbound HTTP(S) proxy URL resolved from ATLASSIAN_PROXY/HTTPS_PROXY
   *  after NO_PROXY filtering (undefined = direct connection). */
  proxyUrl?: string;
  /** User-Agent override from ATLASSIAN_USER_AGENT (WAF scenarios). */
  userAgent?: string;
}

export interface ServerConfig {
  products: Partial<Record<Product, ProductConfig>>;
  exposureTier: ExposureTier;
  forceInclude: readonly string[];
  forceExclude: readonly string[];
  maxOutputBytes: number;
  cursorTtlSeconds: number;
  tlsVerify: boolean;
  /** Maximum bytes streamed to downloadPath/outputPath (default 100MB). */
  maxDownloadBytes: number;
}

export interface PaginationSpec {
  kind: PaginationKind;
  requestOffset: string;
  requestLimit: string;
  responseItems: string;
  responseTotal?: string;
  responseNextOffset?: string;
  responseIsLast?: string;
}

export interface RegisteredOperation {
  operationId: string;
  product: Product;
  summary: string;
  /** Previous Chinese description, kept for the Chinese Wiki/API reference.
   *  Never projected into discover/describe output (publicOperation whitelist). */
  summaryZh?: string;
  method: HttpMethod;
  path: string;
  responseKind: ResponseKind;
  pagination?: PaginationSpec;
  versions?: readonly string[];
  tags: readonly string[];
  requestBody?: boolean;
  bodyKind?: BodyKind;
  multipartField?: string;
  unsupportedReason?: string;
  scope: OperationScope;
  dataKind: OperationDataKind;
  destructive: boolean;
  parameters?: readonly OperationParameter[];
  requestBodySchema?: OperationBodySchema;
  /** Explicit Accept header value for this operation. Undefined → default
   *  (application/json or application/octet-stream per responseKind).
   *  Empty string → no Accept header at all. */
  accept?: string;
  /** Stable, product-defined request skeleton. Never contains instance-specific IDs/options. */
  requestBodyTemplate?: unknown;
}

export type ExposurePolicyEntry =
  | { operationId: string; requiredTier: ExposureTier; permanentlyExcluded?: false }
  | { operationId: string; permanentlyExcluded: true; requiredTier?: never };

export type ResolvedOperation = RegisteredOperation & {
  exposed: boolean;
  requiredTier?: ExposureTier;
  forced: boolean;
  exposureReason: ExposureReason;
  matchedPattern?: string;
};

export interface OperationParameter {
  name: string;
  in: "path" | "query";
  required: boolean;
  type?: string;
  format?: string;
  enum?: readonly (string | number | boolean)[];
  itemsType?: string;
}

export interface OperationBodySchema {
  type: "object" | "array" | "string" | "number" | "integer" | "boolean" | "unknown";
  required?: readonly string[];
  properties?: Readonly<Record<string, { type?: string; format?: string; itemsType?: string }>>;
}

export interface CommonResponseOptions {
  cursor?: string;
  pageSize?: number;
  responseProfile?: ResponseProfile;
  fields?: string[];
  maxOutputBytes?: number;
}

export interface ExecuteOperationInput extends CommonResponseOptions {
  operationId: string;
  path?: Record<string, string | number>;
  query?: Record<string, unknown>;
  body?: unknown;
  downloadPath?: string;
  /** Write the raw upstream response body to this absolute path under the file root.
   *  For large responses, use this instead of cursor-based paging. */
  outputPath?: string;
}

export interface CursorPayload {
  version: 1;
  expiresAt: number;
  operationId: string;
  requestHash: string;
  upstreamOffset: number | string;
  localOffset: number;
  mode: "items" | "fields";
}

export interface PageInfo {
  mode: "items" | "fields";
  returned: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface ResponseMeta {
  product: Product;
  operationId: string;
  responseProfile: ResponseProfile;
  responseBytes: number;
  truncated: boolean;
  omittedPaths?: string[];
}

export interface UnifiedResponse {
  data: unknown;
  page: PageInfo;
  meta: ResponseMeta;
}

export interface HttpResult {
  status: number;
  headers: Record<string, string>;
  data: unknown;
}

export interface ProductInfo {
  product: Product;
  baseUrl: string;
  authMode: "token" | "basic";
  tlsVerify: boolean;
  reachable?: boolean;
  version?: string;
  error?: string;
}
