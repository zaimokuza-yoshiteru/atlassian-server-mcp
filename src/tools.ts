// Tool execution wiring: tool definitions, the shared registerDefinedTool
// plumbing, result helpers, and the generic atlassian_* tools. The named
// per-product tools are registered from tools-products.ts.
import type { AnyToolHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import {
  commonResponseShape,
  describeResponseSchema,
  discoverResponseSchema,
  downloadResponseSchema,
  executeResponseSchema,
  pathParametersSchema,
  productSchema,
  queryParametersSchema,
  serverInfoResponseSchema,
  toolResponseSchema
} from "./schemas.js";
import { safeErrorPayload, type AtlassianService } from "./service.js";
import { operationById } from "./operations/index.js";
import { policyRequiredTier } from "./exposure-policy.js";
import {
  registerBitbucketTools,
  registerConfluenceTools,
  registerJiraTools
} from "./tools-products.js";
import type { ExposureTier } from "./types.js";
import type { ExecuteOperationInput, UnifiedResponse } from "./types.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export interface ToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export interface ToolDefinition {
  dependencies: readonly string[];
  registration: "intersection" | "always";
  title: string;
  description: string;
  annotations: ToolAnnotations;
  outputSchema: z.ZodType;
  requiredTier?: ExposureTier;
}

const readOnly: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
};
const mutation = (tier: ExposureTier, destructive = false, idempotent = false): ToolAnnotations => {
  // Keep the tier argument part of the definition contract so descriptions
  // cannot silently drift from the operation policy.
  void tier;
  return {
    readOnlyHint: false,
    destructiveHint: destructive,
    idempotentHint: idempotent,
    openWorldHint: true
  };
};
const defineTool = (
  definition: Omit<ToolDefinition, "outputSchema"> & { outputSchema?: z.ZodType }
): ToolDefinition => ({ outputSchema: toolResponseSchema, ...definition });

export const TOOL_DEFINITIONS: Readonly<Record<string, ToolDefinition>> = Object.freeze({
  atlassian_discover_operations: defineTool({
    dependencies: [],
    registration: "always",
    title: "Discover Atlassian REST operations",
    description: "Discover enabled Jira, Confluence, and Bitbucket REST operations.",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    outputSchema: discoverResponseSchema
  }),
  atlassian_describe_operation: defineTool({
    dependencies: [],
    registration: "always",
    title: "Describe an Atlassian REST operation",
    description:
      "Describe an operation's method, parameters, required tier, request template, and response behavior.",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    outputSchema: describeResponseSchema
  }),
  atlassian_execute_operation: defineTool({
    dependencies: [],
    registration: "always",
    title: "Execute an Atlassian REST operation",
    description:
      "Execute a fixed registered operation after discover/describe. Read metadata before mutations; never guess fields or replay writes after timeout/5xx responses.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true
    },
    outputSchema: executeResponseSchema
  }),
  atlassian_server_info: defineTool({
    dependencies: ["jira.server.info", "confluence.server.info", "bitbucket.server.info"],
    registration: "always",
    title: "Atlassian server connection information",
    description:
      "Check reachability, versions, exposure tier, and safe local configuration without exposing credentials.",
    annotations: readOnly,
    outputSchema: serverInfoResponseSchema
  }),
  jira_download_attachment: defineTool({
    dependencies: ["jira.issue.attachments.metadata"],
    registration: "intersection",
    title: "Download a Jira attachment",
    description:
      "Download a Jira attachment only from trusted metadata to an absolute path below the configured file root.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    },
    outputSchema: downloadResponseSchema
  }),
  jira_search_issues: defineTool({
    dependencies: ["jira.issue.search"],
    registration: "intersection",
    title: "Search Jira issues",
    description: "Search Jira issues with JQL and cursor pagination.",
    annotations: readOnly
  }),
  jira_get_issue: defineTool({
    dependencies: ["jira.issue.get"],
    registration: "intersection",
    title: "Get a Jira issue",
    description: "Get a Jira issue by key or ID with context-safe field projection.",
    annotations: readOnly
  }),
  jira_list_fields: defineTool({
    dependencies: ["jira.fields.list"],
    registration: "intersection",
    requiredTier: "max",
    title: "List Jira fields",
    description:
      "List Jira system and custom field definitions before using customfield IDs. Requires exposure tier max.",
    annotations: readOnly
  }),
  jira_get_create_metadata: defineTool({
    dependencies: ["jira.issue.createmeta.issuetypes.list", "jira.issue.createmeta.issuetypes.get"],
    registration: "intersection",
    title: "Get Jira create metadata",
    description: "Read instance-specific create metadata before creating an issue.",
    annotations: readOnly
  }),
  jira_get_edit_metadata: defineTool({
    dependencies: ["jira.issue.editmeta.list"],
    registration: "intersection",
    title: "Get Jira edit metadata",
    description: "Read fields currently editable on a Jira issue before updating it.",
    annotations: readOnly
  }),
  jira_get_transitions: defineTool({
    dependencies: ["jira.issue.transitions.list"],
    registration: "intersection",
    title: "Get Jira transitions",
    description: "List currently available workflow transitions and field metadata.",
    annotations: readOnly
  }),
  jira_create_issue: defineTool({
    dependencies: ["jira.issue.create"],
    registration: "intersection",
    title: "Create a Jira issue",
    description:
      "Create a Jira issue after reading create metadata. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
    annotations: mutation("safe")
  }),
  jira_update_issue: defineTool({
    dependencies: ["jira.issue.update"],
    registration: "intersection",
    title: "Update a Jira issue",
    description:
      "Update Jira fields after reading edit metadata. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
    annotations: mutation("safe", false, true)
  }),
  jira_add_comment: defineTool({
    dependencies: ["jira.issue.comments.add"],
    registration: "intersection",
    title: "Add a Jira comment",
    description:
      "Add a comment to a Jira issue. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
    annotations: mutation("safe")
  }),
  jira_transition_issue: defineTool({
    dependencies: ["jira.issue.transitions.perform"],
    registration: "intersection",
    title: "Transition a Jira issue",
    description:
      "Perform a workflow transition after reading available transitions. Requires exposure tier risky or an exact FORCE_INCLUDE match.",
    annotations: mutation("risky", true)
  }),
  confluence_download_attachment: defineTool({
    dependencies: ["confluence.content.get"],
    registration: "intersection",
    title: "Download a Confluence attachment",
    description:
      "Download a trusted Confluence attachment to an absolute path below the configured file root.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    },
    outputSchema: downloadResponseSchema
  }),
  confluence_search: defineTool({
    dependencies: ["confluence.search"],
    registration: "intersection",
    title: "Search Confluence",
    description: "Search Confluence using CQL and cursor pagination.",
    annotations: readOnly
  }),
  confluence_get_content: defineTool({
    dependencies: ["confluence.content.get"],
    registration: "intersection",
    title: "Get Confluence content",
    description: "Get a Confluence page, blog post, or comment by content ID.",
    annotations: readOnly
  }),
  confluence_create_content: defineTool({
    dependencies: ["confluence.content.create"],
    registration: "intersection",
    title: "Create Confluence content",
    description:
      "Create Confluence content using the storage representation; pass storageValueFile to load body.storage.value from a file under the file root instead of inline. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
    annotations: mutation("safe")
  }),
  confluence_update_content: defineTool({
    dependencies: ["confluence.content.update"],
    registration: "intersection",
    title: "Update Confluence content",
    description:
      "Update Confluence content with an incremented version; pass storageValueFile to load body.storage.value from a file under the file root instead of inline. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
    annotations: mutation("safe", false, true)
  }),
  confluence_delete_content: defineTool({
    dependencies: ["confluence.content.delete"],
    registration: "intersection",
    title: "Delete Confluence content",
    description:
      "Trash or purge Confluence content. Requires exposure tier risky or an exact FORCE_INCLUDE match.",
    annotations: mutation("risky", true, true)
  }),
  bitbucket_list_repositories: defineTool({
    dependencies: ["bitbucket.repositories.list"],
    registration: "intersection",
    title: "List Bitbucket repositories",
    description: "List repositories in a Bitbucket project.",
    annotations: readOnly
  }),
  bitbucket_list_commits: defineTool({
    dependencies: ["bitbucket.commits.list"],
    registration: "intersection",
    title: "List Bitbucket commits",
    description: "List commits in a Bitbucket repository.",
    annotations: readOnly
  }),
  bitbucket_list_pull_requests: defineTool({
    dependencies: ["bitbucket.pullrequests.list"],
    registration: "intersection",
    title: "List Bitbucket pull requests",
    description: "List pull requests in a Bitbucket repository.",
    annotations: readOnly
  }),
  bitbucket_get_pull_request: defineTool({
    dependencies: ["bitbucket.pullrequests.get"],
    registration: "intersection",
    title: "Get a Bitbucket pull request",
    description: "Get a Bitbucket pull request.",
    annotations: readOnly
  }),
  bitbucket_create_pull_request: defineTool({
    dependencies: ["bitbucket.pullrequests.create"],
    registration: "intersection",
    title: "Create a Bitbucket pull request",
    description:
      "Create a Bitbucket pull request. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
    annotations: mutation("safe")
  }),
  bitbucket_add_pull_request_comment: defineTool({
    dependencies: ["bitbucket.pullrequests.comments.add"],
    registration: "intersection",
    title: "Comment on a Bitbucket pull request",
    description:
      "Add a pull request comment. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
    annotations: mutation("safe")
  }),
  bitbucket_merge_pull_request: defineTool({
    dependencies: ["bitbucket.pullrequests.merge"],
    registration: "intersection",
    requiredTier: "safe",
    title: "Merge a Bitbucket pull request",
    description:
      "Merge a pull request after checking its current version. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
    annotations: mutation("safe", true)
  })
});

for (const [name, definition] of Object.entries(TOOL_DEFINITIONS)) {
  if (definition.requiredTier === undefined) continue;
  const dependency = definition.dependencies[0];
  const operation = dependency ? operationById(dependency) : undefined;
  if (!operation || policyRequiredTier(operation) !== definition.requiredTier) {
    throw new Error(`Tool ${name} requiredTier does not match its dependency policy`);
  }
}

export function result(response: UnifiedResponse): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          operationId: response.meta.operationId,
          returned: response.page.returned,
          hasMore: response.page.hasMore,
          nextCursor: response.page.nextCursor,
          truncated: response.meta.truncated
        })
      }
    ],
    structuredContent: response as unknown as Record<string, unknown>
  };
}

function plainResult(value: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value
  };
}

export function errorResult(error: unknown, service: AtlassianService): ToolResult {
  const payload = safeErrorPayload(error, service.config.maxOutputBytes);
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload,
    isError: true
  };
}

export function registerDefinedTool<InputSchema extends z.ZodType>(
  server: McpServer,
  service: AtlassianService,
  name: string,
  config: Record<string, unknown> & { inputSchema: InputSchema },
  handler: (input: z.infer<InputSchema>) => Promise<ToolResult>
): void {
  const definition = TOOL_DEFINITIONS[name];
  if (!definition) throw new Error(`Missing tool definition: ${name}`);
  // Tool metadata (title/description/annotations/outputSchema) lives only in
  // TOOL_DEFINITIONS. Reject call-site copies instead of silently overriding
  // them, so the two sources cannot drift apart again.
  for (const key of ["title", "description", "annotations", "outputSchema"] as const) {
    if (key in config) {
      throw new Error(
        `Tool ${name} config must not set "${key}"; tool metadata lives in TOOL_DEFINITIONS`
      );
    }
  }
  const enabled = new Set(service.enabledOperations.map((operation) => operation.operationId));
  if (
    definition.registration === "intersection" &&
    !definition.dependencies.some((dependency) => enabled.has(dependency))
  )
    return;
  // The SDK validates incoming args against inputSchema before invoking the
  // callback, so narrowing the opaque args to the zod-inferred input is sound;
  // its StandardSchema conditional types cannot express that inference across
  // a generic boundary, hence the single cast here.
  const callback = ((input: unknown) =>
    handler(input as z.infer<InputSchema>)) as unknown as AnyToolHandler<InputSchema>;
  server.registerTool(
    name,
    {
      ...config,
      title: definition.title,
      description: definition.description,
      annotations: definition.annotations,
      outputSchema: definition.outputSchema
    },
    callback
  );
}

export function registerTools(server: McpServer, service: AtlassianService): void {
  registerDefinedTool(
    server,
    service,
    "atlassian_discover_operations",
    {
      inputSchema: z.object({
        product: productSchema.optional(),
        query: z.string().optional(),
        tier: z.enum(["read", "safe", "risky", "max"]).optional(),
        ...commonResponseShape
      })
    },
    async (input) => {
      try {
        return result(service.discoverOperations(input));
      } catch (error) {
        return errorResult(error, service);
      }
    }
  );

  registerDefinedTool(
    server,
    service,
    "atlassian_describe_operation",
    {
      inputSchema: z.object({
        operationId: z
          .string()
          .min(1)
          .describe("Registered operation ID, for example jira.issue.search")
      })
    },
    async ({ operationId }) => {
      try {
        return plainResult(service.describeOperation(operationId));
      } catch (error) {
        return errorResult(error, service);
      }
    }
  );

  registerDefinedTool(
    server,
    service,
    "atlassian_execute_operation",
    {
      inputSchema: z.object({
        operationId: z
          .string()
          .min(1)
          .describe("Registered operation ID from discover, for example jira.issue.search"),
        path: pathParametersSchema,
        query: queryParametersSchema,
        body: z.unknown().optional(),
        downloadPath: z
          .string()
          .optional()
          .describe(
            "Absolute output path under the configured file root, for example /tmp/attachment.bin"
          ),
        ...commonResponseShape
      })
    },
    async (input) => executeResult(service, input)
  );

  registerDefinedTool(
    server,
    service,
    "atlassian_server_info",
    {
      inputSchema: z.object({})
    },
    async () => {
      try {
        const products = await service.serverInfo();
        return plainResult({
          exposureTier: service.config.exposureTier,
          configuredProducts: service.configuredProducts,
          maxOutputBytes: service.config.maxOutputBytes,
          maxDownloadBytes: service.config.maxDownloadBytes,
          cursorTtlSeconds: service.config.cursorTtlSeconds,
          products
        });
      } catch (error) {
        return errorResult(error, service);
      }
    }
  );

  if (service.isProductConfigured("jira")) registerJiraTools(server, service);
  if (service.isProductConfigured("confluence")) registerConfluenceTools(server, service);
  if (service.isProductConfigured("bitbucket")) registerBitbucketTools(server, service);
}

export async function executeResult(
  service: AtlassianService,
  input: ExecuteOperationInput
): Promise<ToolResult> {
  try {
    return result(await service.execute(input));
  } catch (error) {
    return errorResult(error, service);
  }
}
