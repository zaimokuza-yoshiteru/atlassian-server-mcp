// Product tool registration: the named jira_*, confluence_*, and
// bitbucket_* tools. Execution wiring (registerDefinedTool, result helpers,
// the generic atlassian_* tools) lives in tools.ts. Tool metadata
// (title/description/annotations/outputSchema) is owned by TOOL_DEFINITIONS
// in tools.ts; call sites here only supply the inputSchema.
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { commonResponseShape } from "./schemas.js";
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
      inputSchema: z.object({
        attachmentId: z.string().min(1).describe("Jira attachment ID, for example 123456"),
        downloadPath: z
          .string()
          .min(1)
          .describe(
            "Absolute output path under the configured file root, for example /tmp/attachment.bin"
          )
      })
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
      inputSchema: z.object({
        jql: z
          .string()
          .min(1)
          .describe("JQL expression, for example project = PROJ ORDER BY created DESC"),
        expand: z.string().optional(),
        ...commonResponseShape
      })
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
      inputSchema: z.object({
        issueKey: z.string().min(1).describe("Jira issue key, for example PROJ-123"),
        expand: z.string().optional(),
        ...commonResponseShape
      })
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
      inputSchema: z.object({ ...commonResponseShape })
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
      inputSchema: z.object({
        projectIdOrKey: z.string().min(1).describe("Jira project key or ID, for example PROJ"),
        issueTypeId: z.string().min(1).optional().describe("Jira issue type ID, for example 10001"),
        ...commonResponseShape
      })
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
      inputSchema: z.object({
        issueKey: z.string().min(1).describe("Jira issue key, for example PROJ-123"),
        ...commonResponseShape
      })
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
      inputSchema: z.object({
        issueKey: z.string().min(1).describe("Jira issue key, for example PROJ-123"),
        ...commonResponseShape
      })
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
      inputSchema: z.object({
        fields: z.record(z.string(), z.unknown())
      })
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
      inputSchema: z.object({
        issueKey: z.string().min(1).describe("Jira issue key, for example PROJ-123"),
        fields: z.record(z.string(), z.unknown()),
        update: z.record(z.string(), z.unknown()).optional()
      })
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
      inputSchema: z.object({
        issueKey: z.string().min(1).describe("Jira issue key, for example PROJ-123"),
        body: z.string().min(1).describe("Comment text to add to the issue")
      })
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
      inputSchema: z.object({
        issueKey: z.string().min(1).describe("Jira issue key, for example PROJ-123"),
        transitionId: z.string().min(1).describe("Available transition ID, for example 31"),
        fields: z.record(z.string(), z.unknown()).optional()
      })
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
      inputSchema: z.object({
        attachmentId: z.string().min(1).describe("Confluence attachment ID, for example 123456"),
        downloadPath: z
          .string()
          .min(1)
          .describe(
            "Absolute output path under the configured file root, for example /tmp/attachment.bin"
          )
      })
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
      inputSchema: z.object({
        cql: z
          .string()
          .min(1)
          .describe(
            "Confluence CQL expression, for example type = page ORDER BY lastmodified DESC"
          ),
        expand: z.string().optional(),
        ...commonResponseShape
      })
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
      inputSchema: z.object({
        contentId: z.string().min(1).describe("Confluence content ID, for example 123456"),
        expand: z.string().optional(),
        ...commonResponseShape
      })
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
      inputSchema: z.object({
        content: z.record(z.string(), z.unknown()),
        storageValueFile: storageValueFileSchema
      })
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
      inputSchema: z.object({
        contentId: z.string().min(1).describe("Confluence content ID, for example 123456"),
        content: z.record(z.string(), z.unknown()),
        storageValueFile: storageValueFileSchema
      })
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
      inputSchema: z.object({
        contentId: z.string().min(1).describe("Confluence content ID, for example 123456")
      })
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
      inputSchema: z.object({
        projectKey: z.string().min(1).describe("Bitbucket project key, for example PROJ"),
        ...commonResponseShape
      })
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
      inputSchema: z.object({
        ...repositoryPath,
        until: z.string().optional(),
        since: z.string().optional(),
        ...commonResponseShape
      })
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
      inputSchema: z.object({
        ...repositoryPath,
        state: z.enum(["OPEN", "DECLINED", "MERGED", "ALL"]).optional(),
        ...commonResponseShape
      })
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
      inputSchema: z.object({
        ...repositoryPath,
        pullRequestId: z
          .number()
          .int()
          .positive()
          .describe("Bitbucket pull request ID, for example 123"),
        ...commonResponseShape
      })
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
      inputSchema: z.object({
        ...repositoryPath,
        pullRequest: z.record(z.string(), z.unknown())
      })
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
      inputSchema: z.object({
        ...repositoryPath,
        pullRequestId: z
          .number()
          .int()
          .positive()
          .describe("Bitbucket pull request ID, for example 123"),
        text: z.string().min(1).describe("Comment text to add to the pull request")
      })
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
      })
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
