import * as z from "zod/v4";

export const productSchema = z.enum(["jira", "confluence", "bitbucket"]);
export const responseProfileSchema = z.enum(["compact", "standard", "full"]);

export const commonResponseShape = {
  cursor: z.string().min(1).optional().describe("Opaque nextCursor from the previous response"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Requested item count; the server may return fewer"),
  responseProfile: responseProfileSchema
    .optional()
    .describe("compact is the safest default for model context"),
  fields: z
    .array(z.string().min(1))
    .max(200)
    .optional()
    .describe("Dot paths to include explicitly"),
  maxOutputBytes: z
    .number()
    .int()
    .min(1024)
    .optional()
    .describe("Per-call output limit; cannot exceed the server maximum"),
  outputPath: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Write the raw upstream response to this absolute path under the file root; for large responses read the file in chunks instead of paging"
    )
};

export const pathParametersSchema = z
  .record(z.string(), z.union([z.string(), z.number()]))
  .optional();

export const queryParametersSchema = z
  .record(
    z.string(),
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.union([z.string(), z.number(), z.boolean()])),
      z.null()
    ])
  )
  .optional();

const pageSchema = z
  .object({
    mode: z.enum(["items", "fields"]),
    returned: z.number().int().nonnegative(),
    hasMore: z.boolean(),
    nextCursor: z.string().optional()
  })
  .strict();
const metaSchema = z
  .object({
    product: productSchema,
    operationId: z.string(),
    responseProfile: responseProfileSchema,
    responseBytes: z.number().int().nonnegative(),
    truncated: z.boolean(),
    omittedPaths: z.array(z.string()).optional()
  })
  .strict();

export const operationPublicSchema = z
  .object({
    operationId: z.string(),
    product: productSchema,
    summary: z.string(),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
    path: z.string(),
    requiredTier: z.enum(["read", "safe", "risky", "max"]).optional(),
    forced: z.boolean(),
    exposureReason: z.enum([
      "tier-allowed",
      "tier-denied",
      "force-included",
      "force-excluded",
      "permanently-excluded",
      "unknown-operation",
      "unsupported-operation",
      "product-not-configured"
    ]),
    matchedPattern: z.string().optional(),
    scope: z.enum(["issue", "content", "repository", "project", "space", "global", "unknown"]),
    dataKind: z.enum(["resource", "metadata", "capability", "mutation", "diagnostic"]),
    destructive: z.boolean(),
    parameters: z
      .array(
        z
          .object({
            name: z.string(),
            in: z.enum(["path", "query"]),
            required: z.boolean(),
            type: z.string().optional(),
            format: z.string().optional(),
            enum: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
            itemsType: z.string().optional()
          })
          .strict()
      )
      .optional(),
    requestBodySchema: z.unknown().optional(),
    requestBodyTemplate: z.unknown().optional(),
    responseKind: z.enum(["json", "binary"]),
    pagination: z.enum(["jira", "confluence", "bitbucket", "none"]),
    versions: z.array(z.string()),
    tags: z.array(z.string()),
    requestBody: z.boolean(),
    bodyKind: z.enum(["json", "multipart"]).optional()
  })
  .strict();

function envelope<T extends z.ZodType>(data: T) {
  return z.object({ data, page: pageSchema, meta: metaSchema }).strict();
}

export const toolErrorResponseSchema = z
  .object({
    error: z
      .object({
        kind: z.string(),
        product: productSchema.optional(),
        operationId: z.string().optional(),
        status: z.number().int().optional(),
        message: z.string(),
        fieldErrors: z
          .array(
            z
              .object({
                field: z.string().optional(),
                message: z.string()
              })
              .strict()
          )
          .optional(),
        details: z.unknown().optional()
      })
      .strict()
  })
  .strict();

export function withError<T extends z.ZodType>(successSchema: T) {
  return z.union([successSchema, toolErrorResponseSchema]);
}

export const unifiedResponseSchema = envelope(z.unknown());
export const toolResponseSchema = withError(unifiedResponseSchema);

export const discoverSuccessSchema = envelope(
  z.union([
    z.array(operationPublicSchema.partial().strict()),
    z
      .object({ $fragment: z.array(z.object({ path: z.string(), value: z.unknown() }).strict()) })
      .strict()
  ])
);
export const discoverResponseSchema = withError(discoverSuccessSchema);
export const executeSuccessSchema = unifiedResponseSchema;
export const executeResponseSchema = withError(executeSuccessSchema);
export const downloadSuccessSchema = envelope(
  z
    .object({
      fileName: z.string().optional(),
      mediaType: z.string(),
      size: z.number().int().nonnegative(),
      sourceUrl: z.string(),
      savedPath: z.string().optional()
    })
    .strict()
);
export const downloadResponseSchema = withError(downloadSuccessSchema);

export const describeSuccessSchema = operationPublicSchema;
export const describeResponseSchema = withError(describeSuccessSchema);

export const productInfoSchema = z
  .object({
    product: productSchema,
    baseUrl: z.string(),
    authMode: z.enum(["token", "basic"]),
    tlsVerify: z.boolean(),
    reachable: z.boolean().optional(),
    version: z.string().optional(),
    error: z.string().optional()
  })
  .strict();
export const serverInfoSuccessSchema = z
  .object({
    exposureTier: z.enum(["read", "safe", "risky", "max"]),
    configuredProducts: z.array(productSchema),
    maxOutputBytes: z.number().int().positive(),
    maxDownloadBytes: z.number().int().positive(),
    cursorTtlSeconds: z.number().int().positive(),
    products: z.array(productInfoSchema)
  })
  .strict();
export const serverInfoResponseSchema = withError(serverInfoSuccessSchema);
