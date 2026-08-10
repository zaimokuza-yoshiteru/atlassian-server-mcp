// Product tool registration: the named jira_*, confluence_*, and
// bitbucket_* tools. Execution wiring (registerDefinedTool, result helpers,
// the generic atlassian_* tools) lives in tools.ts.
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { commonResponseShape, toolResponseSchema } from "./schemas.js";
import { MAX_STORAGE_VALUE_BYTES, readSandboxedTextFile } from "./file-transfer.js";
import { asRecord } from "./json.js";
import type { AtlassianService } from "./service.js";
import type { ExecuteOperationInput, ProductConfig } from "./types.js";
import { errorResult, executeResult, registerDefinedTool, result } from "./tools.js";

// storageValueFile: read Confluence storage-format XHTML from the file-root
// sandbox and inject it as body.storage.value (representation fixed to
// "storage"). Mutually exclusive with an inline body.storage.value so a
// request can never mix two content sources.
export async function resolveConfluenceStorageBody(
  config: ProductConfig | undefined,
  content: Record<string, unknown>,
  storageValueFile: string | undefined,
  toolName: string
): Promise<Record<string, unknown>> {
  if (storageValueFile === undefined) return content;
  const body = asRecord(content.body);
  const storage = asRecord(body?.storage);
  if (storage?.value !== undefined) {
    throw new Error(
      `${toolName}: storageValueFile is mutually exclusive with an inline content.body.storage.value; provide exactly one content source`
    );
  }
  const value = await readSandboxedTextFile(
    config,
    storageValueFile,
    "storageValueFile",
    MAX_STORAGE_VALUE_BYTES
  );
  return {
    ...content,
    body: {
      ...(body ?? {}),
      storage: { ...(storage ?? {}), value, representation: "storage" }
    }
  };
}

const storageValueFileSchema = z
  .string()
  .min(1)
  .optional()
  .describe(
    "Absolute path under the configured file root to a file containing Confluence storage-format XHTML. The file content becomes body.storage.value (representation is fixed to 'storage'). Mutually exclusive with an inline body.storage.value in content; maximum 10 MiB."
  );

function metadataResponseProfile(
  requested: ExecuteOperationInput["responseProfile"]
): "standard" | "full" {
  return requested === "full" ? "full" : "standard";
}

export function registerJiraTools(server: McpServer, service: AtlassianService): void {
  registerDefinedTool(
    server,
    service,
    "jira_download_attachment",
    {
      description:
        "Download a Jira attachment to an absolute path under JIRA_FILE_ROOT or ATLASSIAN_FILE_ROOT. The server follows only the same-origin attachment URL returned by Jira metadata and refuses arbitrary paths or hosts.",
      inputSchema: z.object({
        attachmentId: z.string().min(1).describe("Jira attachment ID, for example 123456"),
        downloadPath: z
          .string()
          .min(1)
          .describe(
            "Absolute output path under the configured file root, for example /tmp/attachment.bin"
          )
      }),
      outputSchema: toolResponseSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async ({ attachmentId, downloadPath }) => {
      try {
        return result(await service.downloadAttachment("jira", attachmentId, downloadPath));
      } catch (error) {
        return errorResult(error, service);
      }
    }
  );

  registerDefinedTool(
    server,
    service,
    "jira_search_issues",
    {
      description:
        "Search Jira issues with JQL. Defaults to compact output and omits custom fields; use fields or another responseProfile when needed.",
      inputSchema: z.object({
        jql: z
          .string()
          .min(1)
          .describe("JQL expression, for example project = PROJ ORDER BY created DESC"),
        expand: z.string().optional(),
        ...commonResponseShape
      }),
      outputSchema: toolResponseSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async ({ jql, expand, ...options }) =>
      executeResult(service, {
        operationId: "jira.issue.search",
        query: { jql, ...(expand ? { expand } : {}) },
        ...options
      })
  );

  registerDefinedTool(
    server,
    service,
    "jira_get_issue",
    {
      description: "Get a Jira issue by key or ID with context-safe field projection.",
      inputSchema: z.object({
        issueKey: z.string().min(1).describe("Jira issue key, for example PROJ-123"),
        expand: z.string().optional(),
        ...commonResponseShape
      }),
      outputSchema: toolResponseSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async ({ issueKey, expand, ...options }) =>
      executeResult(service, {
        operationId: "jira.issue.get",
        path: { issueKey },
        query: { ...(expand ? { expand } : {}) },
        ...options
      })
  );

  registerDefinedTool(
    server,
    service,
    "jira_list_fields",
    {
      description:
        "List Jira system and custom field definitions. Use this read-only metadata tool to map customfield_* IDs to names and schemas; issue responses remain compact by default.",
      inputSchema: z.object({ ...commonResponseShape }),
      outputSchema: toolResponseSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async (options) =>
      executeResult(service, {
        operationId: "jira.fields.list",
        ...options
      })
  );

  registerDefinedTool(
    server,
    service,
    "jira_get_create_metadata",
    {
      description:
        "Read instance-specific Jira create metadata before creating an issue. Without issueTypeId it lists project issue types; with issueTypeId it returns fields, required flags, schemas, and allowed values. compact is automatically upgraded to standard so customfield_* metadata is retained.",
      inputSchema: z.object({
        projectIdOrKey: z.string().min(1).describe("Jira project key or ID, for example PROJ"),
        issueTypeId: z.string().min(1).optional().describe("Jira issue type ID, for example 10001"),
        ...commonResponseShape
      }),
      outputSchema: toolResponseSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async ({ projectIdOrKey, issueTypeId, responseProfile, ...options }) =>
      executeResult(service, {
        operationId: issueTypeId
          ? "jira.issue.createmeta.issuetypes.get"
          : "jira.issue.createmeta.issuetypes.list",
        path: { projectIdOrKey, ...(issueTypeId ? { issueTypeId } : {}) },
        ...options,
        responseProfile: metadataResponseProfile(responseProfile)
      })
  );

  registerDefinedTool(
    server,
    service,
    "jira_get_edit_metadata",
    {
      description:
        "Read the fields currently editable on a Jira issue, including instance-specific custom fields, required flags, schemas, and allowed values. compact is automatically upgraded to standard.",
      inputSchema: z.object({
        issueKey: z.string().min(1).describe("Jira issue key, for example PROJ-123"),
        ...commonResponseShape
      }),
      outputSchema: toolResponseSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async ({ issueKey, responseProfile, ...options }) =>
      executeResult(service, {
        operationId: "jira.issue.editmeta.list",
        path: { issueIdOrKey: issueKey },
        ...options,
        responseProfile: metadataResponseProfile(responseProfile)
      })
  );

  registerDefinedTool(
    server,
    service,
    "jira_get_transitions",
    {
      description: "List workflow transitions currently available for a Jira issue.",
      inputSchema: z.object({
        issueKey: z.string().min(1).describe("Jira issue key, for example PROJ-123"),
        ...commonResponseShape
      }),
      outputSchema: toolResponseSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async ({ issueKey, responseProfile, ...options }) =>
      executeResult(service, {
        operationId: "jira.issue.transitions.list",
        path: { issueKey },
        ...options,
        responseProfile: metadataResponseProfile(responseProfile)
      })
  );

  registerDefinedTool(
    server,
    service,
    "jira_create_issue",
    {
      description:
        "Create a Jira issue. First call jira_get_create_metadata for the target project and issue type; do not guess customfield IDs, required fields, or allowed values. Field validation failures are returned in error.fieldErrors. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
      inputSchema: z.object({
        fields: z.record(z.string(), z.unknown())
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false
      }
    },
    async ({ fields }) =>
      executeResult(service, {
        operationId: "jira.issue.create",
        body: { fields },
        responseProfile: "standard"
      })
  );

  registerDefinedTool(
    server,
    service,
    "jira_update_issue",
    {
      description:
        "Update Jira issue fields. First call jira_get_edit_metadata for the issue; do not guess editable custom fields or allowed values. Field validation failures are returned in error.fieldErrors. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
      inputSchema: z.object({
        issueKey: z.string().min(1).describe("Jira issue key, for example PROJ-123"),
        fields: z.record(z.string(), z.unknown()),
        update: z.record(z.string(), z.unknown()).optional()
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true
      }
    },
    async ({ issueKey, fields, update }) =>
      executeResult(service, {
        operationId: "jira.issue.update",
        path: { issueKey },
        body: { fields, ...(update ? { update } : {}) },
        responseProfile: "standard"
      })
  );

  registerDefinedTool(
    server,
    service,
    "jira_add_comment",
    {
      description:
        "Add a comment to a Jira issue. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
      inputSchema: z.object({
        issueKey: z.string().min(1).describe("Jira issue key, for example PROJ-123"),
        body: z.string().min(1).describe("Comment text to add to the issue")
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false
      }
    },
    async ({ issueKey, body }) =>
      executeResult(service, {
        operationId: "jira.issue.comments.add",
        path: { issueKey },
        body: { body },
        responseProfile: "standard"
      })
  );

  registerDefinedTool(
    server,
    service,
    "jira_transition_issue",
    {
      description:
        "Perform a Jira workflow transition. First call jira_get_transitions and use only a currently available transition and its field metadata. Requires exposure tier risky or an exact FORCE_INCLUDE match.",
      inputSchema: z.object({
        issueKey: z.string().min(1).describe("Jira issue key, for example PROJ-123"),
        transitionId: z.string().min(1).describe("Available transition ID, for example 31"),
        fields: z.record(z.string(), z.unknown()).optional()
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false
      }
    },
    async ({ issueKey, transitionId, fields }) =>
      executeResult(service, {
        operationId: "jira.issue.transitions.perform",
        path: { issueKey },
        body: {
          transition: { id: transitionId },
          ...(fields ? { fields } : {})
        },
        responseProfile: "standard"
      })
  );
}

export function registerConfluenceTools(server: McpServer, service: AtlassianService): void {
  registerDefinedTool(
    server,
    service,
    "confluence_download_attachment",
    {
      description:
        "Download a Confluence attachment to an absolute path under CONFLUENCE_FILE_ROOT or ATLASSIAN_FILE_ROOT. The server follows only the same-origin /download/attachments link returned by Confluence metadata.",
      inputSchema: z.object({
        attachmentId: z.string().min(1).describe("Confluence attachment ID, for example 123456"),
        downloadPath: z
          .string()
          .min(1)
          .describe(
            "Absolute output path under the configured file root, for example /tmp/attachment.bin"
          )
      }),
      outputSchema: toolResponseSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async ({ attachmentId, downloadPath }) => {
      try {
        return result(await service.downloadAttachment("confluence", attachmentId, downloadPath));
      } catch (error) {
        return errorResult(error, service);
      }
    }
  );

  registerDefinedTool(
    server,
    service,
    "confluence_search",
    {
      description: "Search Confluence using CQL with unified cursor pagination.",
      inputSchema: z.object({
        cql: z
          .string()
          .min(1)
          .describe(
            "Confluence CQL expression, for example type = page ORDER BY lastmodified DESC"
          ),
        expand: z.string().optional(),
        ...commonResponseShape
      }),
      outputSchema: toolResponseSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async ({ cql, expand, ...options }) =>
      executeResult(service, {
        operationId: "confluence.search",
        query: { cql, ...(expand ? { expand } : {}) },
        ...options
      })
  );

  registerDefinedTool(
    server,
    service,
    "confluence_get_content",
    {
      description: "Get a Confluence page, blog post, or comment by content ID.",
      inputSchema: z.object({
        contentId: z.string().min(1).describe("Confluence content ID, for example 123456"),
        expand: z.string().optional(),
        ...commonResponseShape
      }),
      outputSchema: toolResponseSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async ({ contentId, expand, ...options }) =>
      executeResult(service, {
        operationId: "confluence.content.get",
        path: { contentId },
        query: { ...(expand ? { expand } : {}) },
        ...options
      })
  );

  registerDefinedTool(
    server,
    service,
    "confluence_create_content",
    {
      description:
        "Create Confluence content using the stable REST storage representation: {type:'page', title, space:{key}, body:{storage:{value:'<p>...</p>', representation:'storage'}}}. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
      inputSchema: z.object({
        content: z.record(z.string(), z.unknown()),
        storageValueFile: storageValueFileSchema
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false
      }
    },
    async ({ content, storageValueFile }) => {
      try {
        const body = await resolveConfluenceStorageBody(
          service.config.products.confluence,
          content,
          storageValueFile,
          "confluence_create_content"
        );
        return result(
          await service.execute({
            operationId: "confluence.content.create",
            body,
            responseProfile: "standard"
          })
        );
      } catch (error) {
        return errorResult(error, service);
      }
    }
  );

  registerDefinedTool(
    server,
    service,
    "confluence_update_content",
    {
      description:
        "Update Confluence content using the stable REST storage representation and an incremented version.number. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
      inputSchema: z.object({
        contentId: z.string().min(1).describe("Confluence content ID, for example 123456"),
        content: z.record(z.string(), z.unknown()),
        storageValueFile: storageValueFileSchema
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true
      }
    },
    async ({ contentId, content, storageValueFile }) => {
      try {
        const body = await resolveConfluenceStorageBody(
          service.config.products.confluence,
          content,
          storageValueFile,
          "confluence_update_content"
        );
        return result(
          await service.execute({
            operationId: "confluence.content.update",
            path: { contentId },
            body,
            responseProfile: "standard"
          })
        );
      } catch (error) {
        return errorResult(error, service);
      }
    }
  );

  registerDefinedTool(
    server,
    service,
    "confluence_delete_content",
    {
      description:
        "Trash or purge Confluence content. Requires exposure tier risky or an exact FORCE_INCLUDE match.",
      inputSchema: z.object({
        contentId: z.string().min(1).describe("Confluence content ID, for example 123456")
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true
      }
    },
    async ({ contentId }) =>
      executeResult(service, {
        operationId: "confluence.content.delete",
        path: { contentId },
        responseProfile: "standard"
      })
  );
}

export function registerBitbucketTools(server: McpServer, service: AtlassianService): void {
  const repositoryPath = {
    projectKey: z.string().min(1).describe("Bitbucket project key, for example PROJ"),
    repositorySlug: z.string().min(1).describe("Bitbucket repository slug, for example backend")
  };

  registerDefinedTool(
    server,
    service,
    "bitbucket_list_repositories",
    {
      description: "List repositories in a Bitbucket project.",
      inputSchema: z.object({
        projectKey: z.string().min(1).describe("Bitbucket project key, for example PROJ"),
        ...commonResponseShape
      }),
      outputSchema: toolResponseSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async ({ projectKey, ...options }) =>
      executeResult(service, {
        operationId: "bitbucket.repositories.list",
        path: { projectKey },
        ...options
      })
  );

  registerDefinedTool(
    server,
    service,
    "bitbucket_list_commits",
    {
      description: "List commits in a Bitbucket repository.",
      inputSchema: z.object({
        ...repositoryPath,
        until: z.string().optional(),
        since: z.string().optional(),
        ...commonResponseShape
      }),
      outputSchema: toolResponseSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async ({ projectKey, repositorySlug, until, since, ...options }) =>
      executeResult(service, {
        operationId: "bitbucket.commits.list",
        path: { projectKey, repositorySlug },
        query: { ...(until ? { until } : {}), ...(since ? { since } : {}) },
        ...options
      })
  );

  registerDefinedTool(
    server,
    service,
    "bitbucket_list_pull_requests",
    {
      description: "List pull requests in a Bitbucket repository.",
      inputSchema: z.object({
        ...repositoryPath,
        state: z.enum(["OPEN", "DECLINED", "MERGED", "ALL"]).optional(),
        ...commonResponseShape
      }),
      outputSchema: toolResponseSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async ({ projectKey, repositorySlug, state, ...options }) =>
      executeResult(service, {
        operationId: "bitbucket.pullrequests.list",
        path: { projectKey, repositorySlug },
        query: { ...(state ? { state } : {}) },
        ...options
      })
  );

  registerDefinedTool(
    server,
    service,
    "bitbucket_get_pull_request",
    {
      description: "Get a Bitbucket pull request.",
      inputSchema: z.object({
        ...repositoryPath,
        pullRequestId: z
          .number()
          .int()
          .positive()
          .describe("Bitbucket pull request ID, for example 123"),
        ...commonResponseShape
      }),
      outputSchema: toolResponseSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async ({ projectKey, repositorySlug, pullRequestId, ...options }) =>
      executeResult(service, {
        operationId: "bitbucket.pullrequests.get",
        path: { projectKey, repositorySlug, pullRequestId },
        ...options
      })
  );

  registerDefinedTool(
    server,
    service,
    "bitbucket_create_pull_request",
    {
      description:
        "Create a Bitbucket pull request. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
      inputSchema: z.object({
        ...repositoryPath,
        pullRequest: z.record(z.string(), z.unknown())
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false
      }
    },
    async ({ projectKey, repositorySlug, pullRequest }) =>
      executeResult(service, {
        operationId: "bitbucket.pullrequests.create",
        path: { projectKey, repositorySlug },
        body: pullRequest,
        responseProfile: "standard"
      })
  );

  registerDefinedTool(
    server,
    service,
    "bitbucket_add_pull_request_comment",
    {
      description:
        "Add a Bitbucket pull request comment. Requires exposure tier safe or an exact FORCE_INCLUDE match.",
      inputSchema: z.object({
        ...repositoryPath,
        pullRequestId: z
          .number()
          .int()
          .positive()
          .describe("Bitbucket pull request ID, for example 123"),
        text: z.string().min(1).describe("Comment text to add to the pull request")
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false
      }
    },
    async ({ projectKey, repositorySlug, pullRequestId, text }) =>
      executeResult(service, {
        operationId: "bitbucket.pullrequests.comments.add",
        path: { projectKey, repositorySlug, pullRequestId },
        body: { text },
        responseProfile: "standard"
      })
  );

  registerDefinedTool(
    server,
    service,
    "bitbucket_merge_pull_request",
    {
      description:
        "Merge a Bitbucket pull request. Requires exposure tier risky or an exact FORCE_INCLUDE match.",
      inputSchema: z.object({
        ...repositoryPath,
        pullRequestId: z
          .number()
          .int()
          .positive()
          .describe("Bitbucket pull request ID, for example 123"),
        version: z
          .number()
          .int()
          .nonnegative()
          .describe("Current pull request version, for example 2"),
        message: z.string().optional()
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false
      }
    },
    async ({ projectKey, repositorySlug, pullRequestId, version, message }) =>
      executeResult(service, {
        operationId: "bitbucket.pullrequests.merge",
        path: { projectKey, repositorySlug, pullRequestId },
        query: { version },
        body: message ? { message } : {},
        responseProfile: "standard"
      })
  );
}
