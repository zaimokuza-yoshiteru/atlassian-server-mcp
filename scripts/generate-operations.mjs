#!/usr/bin/env node
// Regenerates src/operations/{jira,confluence,bitbucket}.ts from the official
// baseline (rule/api-inventory-official.md) matched against the official
// OpenAPI specs. Re-runnable: specs are cached in rule/spec-cache/.
// Edit OVERRIDES / MATCH_ALIASES / permission rules here, not in the output.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSpec } from "./lib/spec-loader.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Overridable so tests can run against a disposable spec-cache copy.
const CACHE = process.env.ATLASSIAN_SPEC_CACHE_DIR ?? path.join(ROOT, "rule", "spec-cache");
const BASELINE = path.join(ROOT, "rule", "api-inventory-official.md");

const CJK_IDEOGRAPH = /[㐀-䶿一-鿿豈-﫿]/;

const REQUEST_BODY_TEMPLATES = {
  "jira.issue.create": {
    fields: {
      project: { key: "<projectKey>" },
      issuetype: { id: "<from jira_get_create_metadata>" },
      summary: "<summary>"
    }
  },
  "jira.issue.update": { fields: { "<field-id-from-jira_get_edit_metadata>": "<value>" } },
  "jira.issue.comments.add": { body: "<comment text>" },
  "confluence.content.create": {
    type: "page",
    title: "<title>",
    space: { key: "<spaceKey>" },
    body: { storage: { value: "<p>Content</p>", representation: "storage" } }
  },
  "confluence.content.update": {
    type: "page",
    title: "<title>",
    version: { number: "<current version + 1>" },
    body: { storage: { value: "<p>Content</p>", representation: "storage" } }
  },
  "bitbucket.project.webhooks.create": {
    name: "<name>",
    url: "https://<callback-url>",
    active: true,
    sslVerificationRequired: true,
    events: ["<event-key>"]
  },
  "bitbucket.webhooks.create": {
    name: "<name>",
    url: "https://<callback-url>",
    active: true,
    sslVerificationRequired: true,
    events: ["<event-key>"]
  }
};
const DESTRUCTIVE_SEGMENTS = new Set([
  "merge",
  "auto-merge",
  "transition",
  "transitions",
  "decline",
  "reopen",
  "archive",
  "purge",
  "bulk",
  "mergeto",
  "move",
  "apply-suggestion",
  "restore"
]);
function staticScope(operation) {
  const pathName = operation.path;
  if (operation.product === "jira") {
    if (/\/issue(?:\/|$)/.test(pathName)) return "issue";
    if (/\/project(?:\/|$)/.test(pathName)) return "project";
    return "global";
  }
  if (operation.product === "confluence") {
    if (/\/content(?:\/|$)/.test(pathName)) return "content";
    if (/\/space(?:\/|$)/.test(pathName)) return "space";
    return "global";
  }
  if (/\/repos(?:\/|$)/.test(pathName)) return "repository";
  if (/\/projects(?:\/|$)/.test(pathName)) return "project";
  return "global";
}
function staticDataKind(operation) {
  if (operation.method !== "GET") return "mutation";
  const text = `${operation.operationId} ${operation.path} ${operation.summary}`;
  if (
    /(?:field|option|schema|createmeta|editmeta|configuration|properties|metadata|status|priority|resolution|issuetype)/i.test(
      text
    )
  )
    return "metadata";
  if (/(?:transition|permission|merge-check|capabilit|available)/i.test(text)) return "capability";
  return "resource";
}
function staticDestructive(operation) {
  if (operation.method === "DELETE") return true;
  if (operation.method === "GET") return false;
  return operation.operationId.split(".").some((segment) => DESTRUCTIVE_SEGMENTS.has(segment));
}
function addStaticMetadata(operation) {
  operation.scope = staticScope(operation);
  operation.dataKind = staticDataKind(operation);
  operation.destructive = staticDestructive(operation);
  if (REQUEST_BODY_TEMPLATES[operation.operationId])
    operation.requestBodyTemplate = REQUEST_BODY_TEMPLATES[operation.operationId];
  return operation;
}

// English summary resolution (F1): the official OpenAPI summary wins; the
// OVERRIDE summary is the fallback and must stay English in OVERRIDES. The
// previous Chinese description is preserved as summaryZh for the Chinese
// Wiki/API reference; it is never projected into discover output (the
// publicOperation whitelist in src/service.ts does not list it).
function localizeSummary(manifest, specEntry) {
  if (!manifest.summaryZh && CJK_IDEOGRAPH.test(manifest.summary)) {
    manifest.summaryZh = manifest.summary;
  }
  const specSummary = specEntry?.op?.summary;
  if (typeof specSummary === "string" && specSummary.trim() && !CJK_IDEOGRAPH.test(specSummary)) {
    manifest.summary = specSummary.trim();
  }
  if (manifest.summaryZh === manifest.summary) delete manifest.summaryZh;
  return manifest;
}

// ---------------------------------------------------------------------------
// Existing operations kept verbatim for backward compatibility (operationId,
// English summary, pagination items, tags, permission). The two attachment
// uploads were re-enabled: unsupportedReason removed, multipart body added.
// ---------------------------------------------------------------------------
const OVERRIDES = [
  {
    operationId: "jira.server.info",
    summary: "Get Jira build, deployment, and version information",
    method: "GET",
    path: "/rest/api/2/serverInfo",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["server", "diagnostics"]
  },
  {
    operationId: "jira.issue.search",
    summary: "Search issues with JQL",
    method: "GET",
    path: "/rest/api/2/search",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "issues",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["issue", "search", "jql"]
  },
  {
    operationId: "jira.issue.get",
    summary: "Get an issue by key or ID",
    method: "GET",
    path: "/rest/api/2/issue/{issueKey}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["issue"]
  },
  {
    operationId: "jira.issue.createmeta.issuetypes.get",
    summary: "Get create fields for a Jira project and issue type",
    method: "GET",
    path: "/rest/api/2/issue/createmeta/{projectIdOrKey}/issuetypes/{issueTypeId}",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "values",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["issue", "metadata", "field"]
  },
  {
    operationId: "jira.issue.create",
    summary: "Create an issue",
    method: "POST",
    path: "/rest/api/2/issue",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["issue", "create"]
  },
  {
    operationId: "jira.issue.update",
    summary: "Update issue fields",
    method: "PUT",
    path: "/rest/api/2/issue/{issueKey}",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["issue", "update"]
  },
  {
    operationId: "jira.issue.delete",
    summary: "Permanently delete an issue",
    method: "DELETE",
    path: "/rest/api/2/issue/{issueKey}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["issue", "delete"]
  },
  {
    operationId: "jira.issue.comments.list",
    summary: "List comments on an issue",
    method: "GET",
    path: "/rest/api/2/issue/{issueKey}/comment",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "comments",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["issue", "comment"]
  },
  {
    operationId: "jira.issue.comments.add",
    summary: "Add a comment to an issue",
    method: "POST",
    path: "/rest/api/2/issue/{issueKey}/comment",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["issue", "comment", "create"]
  },
  {
    operationId: "jira.issue.comments.update",
    summary: "Update an issue comment",
    method: "PUT",
    path: "/rest/api/2/issue/{issueKey}/comment/{commentId}",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["issue", "comment", "update"]
  },
  {
    operationId: "jira.issue.comments.delete",
    summary: "Delete an issue comment",
    method: "DELETE",
    path: "/rest/api/2/issue/{issueKey}/comment/{commentId}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["issue", "comment", "delete"]
  },
  {
    operationId: "jira.issue.transitions.list",
    summary: "List available issue transitions",
    method: "GET",
    path: "/rest/api/2/issue/{issueKey}/transitions",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["issue", "workflow", "transition"]
  },
  {
    operationId: "jira.issue.transitions.perform",
    summary: "Perform an issue workflow transition",
    method: "POST",
    path: "/rest/api/2/issue/{issueKey}/transitions",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["issue", "workflow", "transition"]
  },
  {
    operationId: "jira.issue.watchers.list",
    summary: "List watchers for an issue",
    method: "GET",
    path: "/rest/api/2/issue/{issueKey}/watchers",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["issue", "watcher"]
  },
  {
    operationId: "jira.issue.watchers.add",
    summary: "Add an issue watcher",
    method: "POST",
    path: "/rest/api/2/issue/{issueKey}/watchers",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["issue", "watcher"]
  },
  {
    operationId: "jira.issue.watchers.delete",
    summary: "Remove an issue watcher",
    method: "DELETE",
    path: "/rest/api/2/issue/{issueKey}/watchers",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["issue", "watcher", "delete"]
  },
  {
    operationId: "jira.issue.links.create",
    summary: "Create a link between issues",
    method: "POST",
    path: "/rest/api/2/issueLink",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["issue", "link"]
  },
  {
    operationId: "jira.issue.links.delete",
    summary: "Delete an issue link",
    method: "DELETE",
    path: "/rest/api/2/issueLink/{linkId}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["issue", "link", "delete"]
  },
  {
    operationId: "jira.issue.worklogs.list",
    summary: "List worklogs on an issue",
    method: "GET",
    path: "/rest/api/2/issue/{issueKey}/worklog",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "worklogs",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["issue", "worklog"]
  },
  {
    operationId: "jira.issue.worklogs.add",
    summary: "Add an issue worklog",
    method: "POST",
    path: "/rest/api/2/issue/{issueKey}/worklog",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["issue", "worklog"]
  },
  {
    operationId: "jira.issue.attachments.metadata",
    summary: "Get issue attachment metadata",
    method: "GET",
    path: "/rest/api/2/attachment/{attachmentId}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["issue", "attachment"]
  },
  {
    operationId: "jira.issue.attachments.upload",
    summary: "Upload an issue attachment",
    method: "POST",
    path: "/rest/api/2/issue/{issueKey}/attachments",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["issue", "attachment", "upload"],
    requestBody: true,
    bodyKind: "multipart",
    multipartField: "file"
  },
  {
    operationId: "jira.projects.list",
    summary: "List visible Jira projects",
    method: "GET",
    path: "/rest/api/2/project",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["project"]
  },
  {
    operationId: "jira.projects.get",
    summary: "Get a Jira project",
    method: "GET",
    path: "/rest/api/2/project/{projectKey}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["project"]
  },
  {
    operationId: "jira.projects.create",
    summary: "Create a Jira project",
    method: "POST",
    path: "/rest/api/2/project",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["project", "admin", "create"]
  },
  {
    operationId: "jira.projects.update",
    summary: "Update a Jira project",
    method: "PUT",
    path: "/rest/api/2/project/{projectKey}",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["project", "admin", "update"]
  },
  {
    operationId: "jira.projects.delete",
    summary: "Delete a Jira project",
    method: "DELETE",
    path: "/rest/api/2/project/{projectKey}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["project", "admin", "delete"]
  },
  {
    operationId: "jira.users.get",
    summary: "Get a Jira user",
    method: "GET",
    path: "/rest/api/2/user",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["user"]
  },
  {
    operationId: "jira.users.search",
    summary: "Search Jira users",
    method: "GET",
    path: "/rest/api/2/user/picker",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["user", "search"]
  },
  {
    operationId: "jira.fields.list",
    summary: "List Jira system and custom fields",
    method: "GET",
    path: "/rest/api/2/field",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["field", "metadata"]
  },
  {
    operationId: "jira.agile.boards.list",
    summary: "List Jira Software boards",
    method: "GET",
    path: "/rest/agile/1.0/board",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "values",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["agile", "board"]
  },
  {
    operationId: "jira.agile.boards.sprints.list",
    summary: "List sprints on a board",
    method: "GET",
    path: "/rest/agile/1.0/board/{boardId}/sprint",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "values",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "sprint"]
  },
  {
    operationId: "jira.agile.sprints.issues",
    summary: "List issues in a sprint",
    method: "GET",
    path: "/rest/agile/1.0/sprint/{sprintId}/issue",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "issues",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["agile", "sprint", "issue"]
  },
  {
    operationId: "jira.agile.boards.get",
    summary: "Get a single board",
    method: "GET",
    path: "/rest/agile/1.0/board/{boardId}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["agile", "board"]
  },
  {
    operationId: "jira.agile.boards.backlog.list",
    summary: "Get all issues from the board's backlog",
    method: "GET",
    path: "/rest/agile/1.0/board/{boardId}/backlog",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "issues",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "backlog", "issue"]
  },
  {
    operationId: "jira.agile.boards.configuration.get",
    summary: "Get the board configuration",
    method: "GET",
    path: "/rest/agile/1.0/board/{boardId}/configuration",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "configuration"]
  },
  {
    operationId: "jira.agile.boards.epics.list",
    summary: "Get all epics from the board",
    method: "GET",
    path: "/rest/agile/1.0/board/{boardId}/epic",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "values",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "epic"]
  },
  {
    operationId: "jira.agile.boards.epics.issues.list",
    summary: "Get all issues for a specific epic",
    method: "GET",
    path: "/rest/agile/1.0/board/{boardId}/epic/{epicId}/issue",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "issues",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "epic", "issue"]
  },
  {
    operationId: "jira.agile.boards.epics.none.issues.list",
    summary: "Get all issues without an epic",
    method: "GET",
    path: "/rest/agile/1.0/board/{boardId}/epic/none/issue",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "issues",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "epic", "issue"]
  },
  {
    operationId: "jira.agile.boards.issues.list",
    summary: "Get all issues from a board",
    method: "GET",
    path: "/rest/agile/1.0/board/{boardId}/issue",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "issues",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "issue"]
  },
  {
    operationId: "jira.agile.boards.projects.list",
    summary: "Get all projects associated with the board",
    method: "GET",
    path: "/rest/agile/1.0/board/{boardId}/project",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "values",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "project"]
  },
  {
    operationId: "jira.agile.boards.properties.list",
    summary: "Get all properties keys for a board",
    method: "GET",
    path: "/rest/agile/1.0/board/{boardId}/properties",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "property"]
  },
  {
    operationId: "jira.agile.boards.properties.get",
    summary: "Get a property from a board",
    method: "GET",
    path: "/rest/agile/1.0/board/{boardId}/properties/{propertyKey}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "property"]
  },
  {
    operationId: "jira.agile.boards.settings.refined-velocity.get",
    summary: "Get the value of the refined velocity setting",
    method: "GET",
    path: "/rest/agile/1.0/board/{boardId}/settings/refined-velocity",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "settings"]
  },
  {
    operationId: "jira.agile.boards.sprints.issues.list",
    summary: "Get all issues for a sprint",
    method: "GET",
    path: "/rest/agile/1.0/board/{boardId}/sprint/{sprintId}/issue",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "issues",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "sprint", "issue"]
  },
  {
    operationId: "jira.agile.boards.versions.list",
    summary: "Get all versions from a board",
    method: "GET",
    path: "/rest/agile/1.0/board/{boardId}/version",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "values",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "version"]
  },
  {
    operationId: "jira.agile.epics.get",
    summary: "Get an epic by id or key",
    method: "GET",
    path: "/rest/agile/1.0/epic/{epicIdOrKey}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["agile", "epic"]
  },
  {
    operationId: "jira.agile.epics.issues.list",
    summary: "Get issues for a specific epic",
    method: "GET",
    path: "/rest/agile/1.0/epic/{epicIdOrKey}/issue",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "issues",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["agile", "epic", "issue"]
  },
  {
    operationId: "jira.agile.epics.none.issues.list",
    summary: "Get issues without an epic",
    method: "GET",
    path: "/rest/agile/1.0/epic/none/issue",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "issues",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["agile", "epic", "issue"]
  },
  {
    operationId: "jira.agile.issues.get",
    summary: "Get a single issue with Agile fields",
    method: "GET",
    path: "/rest/agile/1.0/issue/{issueIdOrKey}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["agile", "issue"]
  },
  {
    operationId: "jira.agile.issues.estimation.get",
    summary: "Get the estimation of an issue for a board",
    method: "GET",
    path: "/rest/agile/1.0/issue/{issueIdOrKey}/estimation",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["agile", "issue", "estimation"]
  },
  {
    operationId: "jira.agile.sprints.get",
    summary: "Get sprint by id",
    method: "GET",
    path: "/rest/agile/1.0/sprint/{sprintId}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["agile", "sprint"]
  },
  {
    operationId: "jira.agile.sprints.properties.list",
    summary: "Get all properties keys for a sprint",
    method: "GET",
    path: "/rest/agile/1.0/sprint/{sprintId}/properties",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["agile", "sprint", "property"]
  },
  {
    operationId: "jira.agile.sprints.properties.get",
    summary: "Get a property for a sprint",
    method: "GET",
    path: "/rest/agile/1.0/sprint/{sprintId}/properties/{propertyKey}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["agile", "sprint", "property"]
  },
  {
    operationId: "jira.agile.backlog.issues.move",
    summary: "Update issues to move them to the backlog",
    method: "POST",
    path: "/rest/agile/1.0/backlog/issue",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["agile", "backlog", "issue"]
  },
  {
    operationId: "jira.agile.epics.update",
    summary: "Update an epic's details",
    method: "POST",
    path: "/rest/agile/1.0/epic/{epicIdOrKey}",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["agile", "epic", "update"]
  },
  {
    operationId: "jira.agile.epics.issues.move",
    summary: "Move issues to a specific epic",
    method: "POST",
    path: "/rest/agile/1.0/epic/{epicIdOrKey}/issue",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["agile", "epic", "issue"]
  },
  {
    operationId: "jira.agile.epics.none.issues.move",
    summary: "Remove issues from any epic",
    method: "POST",
    path: "/rest/agile/1.0/epic/none/issue",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["agile", "epic", "issue"]
  },
  {
    operationId: "jira.agile.sprints.create",
    summary: "Create a future sprint",
    method: "POST",
    path: "/rest/agile/1.0/sprint",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["agile", "sprint", "create"]
  },
  {
    operationId: "jira.agile.sprints.update.partial",
    summary: "Partially update a sprint",
    method: "POST",
    path: "/rest/agile/1.0/sprint/{sprintId}",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["agile", "sprint", "update"]
  },
  {
    operationId: "jira.agile.sprints.issues.move",
    summary: "Move issues to a sprint",
    method: "POST",
    path: "/rest/agile/1.0/sprint/{sprintId}/issue",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["agile", "sprint", "issue"]
  },
  {
    operationId: "jira.agile.sprints.swap",
    summary: "Swap the position of two sprints",
    method: "POST",
    path: "/rest/agile/1.0/sprint/{sprintId}/swap",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["agile", "sprint"]
  },
  {
    operationId: "jira.agile.epics.rank",
    summary: "Rank an epic relative to another",
    method: "PUT",
    path: "/rest/agile/1.0/epic/{epicIdOrKey}/rank",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["agile", "epic", "rank"]
  },
  {
    operationId: "jira.agile.issues.estimation.update",
    summary: "Update the estimation of an issue for a board",
    method: "PUT",
    path: "/rest/agile/1.0/issue/{issueIdOrKey}/estimation",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["agile", "issue", "estimation"]
  },
  {
    operationId: "jira.agile.issues.rank",
    summary: "Rank issues before or after a given issue",
    method: "PUT",
    path: "/rest/agile/1.0/issue/rank",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["agile", "issue", "rank"]
  },
  {
    operationId: "jira.agile.sprints.update",
    summary: "Update a sprint fully",
    method: "PUT",
    path: "/rest/agile/1.0/sprint/{sprintId}",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["agile", "sprint", "update"]
  },
  {
    operationId: "jira.agile.boards.create",
    summary: "Create a new board",
    method: "POST",
    path: "/rest/agile/1.0/board",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "create"]
  },
  {
    operationId: "jira.agile.boards.delete",
    summary: "Delete the board",
    method: "DELETE",
    path: "/rest/agile/1.0/board/{boardId}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["agile", "board", "delete"]
  },
  {
    operationId: "jira.agile.sprints.delete",
    summary: "Delete a sprint",
    method: "DELETE",
    path: "/rest/agile/1.0/sprint/{sprintId}",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["agile", "sprint", "delete"]
  },
  {
    operationId: "confluence.server.info",
    summary: "Get Confluence system and version information",
    method: "GET",
    path: "/rest/applinks/1.0/manifest",
    responseKind: "json",
    versions: ["9.2", "10.2"],
    tags: ["server", "diagnostics"]
  },
  {
    operationId: "confluence.content.list",
    summary: "List or CQL-search Confluence content",
    method: "GET",
    path: "/rest/api/content",
    responseKind: "json",
    pagination: {
      kind: "confluence",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "results"
    },
    versions: ["9.2", "10.2"],
    tags: ["content", "search", "cql"]
  },
  {
    operationId: "confluence.content.get",
    summary: "Get Confluence content by ID",
    method: "GET",
    path: "/rest/api/content/{contentId}",
    responseKind: "json",
    versions: ["9.2", "10.2"],
    tags: ["content"]
  },
  {
    operationId: "confluence.content.create",
    summary: "Create a page, blog post, or other content",
    method: "POST",
    path: "/rest/api/content",
    responseKind: "json",
    requestBody: true,
    versions: ["9.2", "10.2"],
    tags: ["content", "create"]
  },
  {
    operationId: "confluence.content.update",
    summary: "Update Confluence content",
    method: "PUT",
    path: "/rest/api/content/{contentId}",
    responseKind: "json",
    requestBody: true,
    versions: ["9.2", "10.2"],
    tags: ["content", "update"]
  },
  {
    operationId: "confluence.content.delete",
    summary: "Move content to trash or purge it",
    method: "DELETE",
    path: "/rest/api/content/{contentId}",
    responseKind: "json",
    versions: ["9.2", "10.2"],
    tags: ["content", "delete"]
  },
  {
    operationId: "confluence.content.children.list",
    summary: "List child content",
    method: "GET",
    path: "/rest/api/content/{contentId}/child",
    responseKind: "json",
    pagination: {
      kind: "confluence",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "results"
    },
    versions: ["9.2", "10.2"],
    tags: ["content", "children"]
  },
  {
    operationId: "confluence.content.comments.list",
    summary: "List comments under content",
    method: "GET",
    path: "/rest/api/content/{contentId}/child/comment",
    responseKind: "json",
    pagination: {
      kind: "confluence",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "results"
    },
    versions: ["9.2", "10.2"],
    tags: ["content", "comment"]
  },
  {
    operationId: "confluence.content.history",
    summary: "Get content history",
    method: "GET",
    path: "/rest/api/content/{contentId}/history",
    responseKind: "json",
    versions: ["9.2", "10.2"],
    tags: ["content", "history"]
  },
  // DC 10.2.11 此端点挂在 /rest/experimental 下，非 /rest/api。
  // 跨版本升级时需复核此路径是否已迁移到 /rest/api。
  {
    operationId: "confluence.content.versions.list",
    summary: "List content versions",
    method: "GET",
    path: "/rest/experimental/content/{id}/version",
    responseKind: "json",
    pagination: {
      kind: "confluence",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "results"
    },
    versions: ["9.2", "10.2"],
    tags: ["content", "version"]
  },
  {
    operationId: "confluence.content.labels.list",
    summary: "List content labels",
    method: "GET",
    path: "/rest/api/content/{contentId}/label",
    responseKind: "json",
    pagination: {
      kind: "confluence",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "results"
    },
    versions: ["9.2", "10.2"],
    tags: ["content", "label"]
  },
  {
    operationId: "confluence.content.labels.add",
    summary: "Add labels to content",
    method: "POST",
    path: "/rest/api/content/{contentId}/label",
    responseKind: "json",
    requestBody: true,
    versions: ["9.2", "10.2"],
    tags: ["content", "label"]
  },
  {
    operationId: "confluence.content.labels.delete",
    summary: "Delete a content label",
    method: "DELETE",
    path: "/rest/api/content/{contentId}/label",
    responseKind: "json",
    versions: ["9.2", "10.2"],
    tags: ["content", "label", "delete"]
  },
  {
    operationId: "confluence.content.restrictions.list",
    summary: "List content restrictions",
    method: "GET",
    path: "/rest/api/content/{contentId}/restriction/byOperation",
    responseKind: "json",
    versions: ["9.2", "10.2"],
    tags: ["content", "permission", "restriction"]
  },
  {
    operationId: "confluence.content.restrictions.update",
    summary: "Update content restrictions",
    method: "PUT",
    path: "/rest/api/content/{contentId}/restriction",
    responseKind: "json",
    requestBody: true,
    versions: ["9.2", "10.2"],
    tags: ["content", "permission", "restriction"]
  },
  {
    operationId: "confluence.spaces.list",
    summary: "List Confluence spaces",
    method: "GET",
    path: "/rest/api/space",
    responseKind: "json",
    pagination: {
      kind: "confluence",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "results"
    },
    versions: ["9.2", "10.2"],
    tags: ["space"]
  },
  {
    operationId: "confluence.spaces.get",
    summary: "Get a Confluence space",
    method: "GET",
    path: "/rest/api/space/{spaceKey}",
    responseKind: "json",
    versions: ["9.2", "10.2"],
    tags: ["space"]
  },
  {
    operationId: "confluence.spaces.create",
    summary: "Create a Confluence space",
    method: "POST",
    path: "/rest/api/space",
    responseKind: "json",
    requestBody: true,
    versions: ["9.2", "10.2"],
    tags: ["space", "admin", "create"]
  },
  {
    operationId: "confluence.spaces.update",
    summary: "Update a Confluence space",
    method: "PUT",
    path: "/rest/api/space/{spaceKey}",
    responseKind: "json",
    requestBody: true,
    versions: ["9.2", "10.2"],
    tags: ["space", "admin", "update"]
  },
  {
    operationId: "confluence.spaces.delete",
    summary: "Delete a Confluence space",
    method: "DELETE",
    path: "/rest/api/space/{spaceKey}",
    responseKind: "json",
    versions: ["9.2", "10.2"],
    tags: ["space", "admin", "delete"]
  },
  {
    operationId: "confluence.search",
    summary: "Search Confluence with CQL",
    method: "GET",
    path: "/rest/api/search",
    responseKind: "json",
    pagination: {
      kind: "confluence",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "results"
    },
    versions: ["9.2", "10.2"],
    tags: ["search", "cql"]
  },
  {
    operationId: "confluence.users.current",
    summary: "Get the current authenticated Confluence user",
    method: "GET",
    path: "/rest/api/user/current",
    responseKind: "json",
    versions: ["9.2", "10.2"],
    tags: ["user"]
  },
  {
    operationId: "confluence.attachments.metadata",
    summary: "List attachment metadata under content",
    method: "GET",
    path: "/rest/api/content/{contentId}/child/attachment",
    responseKind: "json",
    pagination: {
      kind: "confluence",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "results"
    },
    versions: ["9.2", "10.2"],
    tags: ["content", "attachment"]
  },
  {
    operationId: "confluence.attachments.upload",
    summary: "Upload an attachment",
    method: "POST",
    path: "/rest/api/content/{contentId}/child/attachment",
    responseKind: "json",
    versions: ["9.2", "10.2"],
    tags: ["content", "attachment", "upload"],
    requestBody: true,
    bodyKind: "multipart",
    multipartField: "file"
  },
  {
    operationId: "bitbucket.server.info",
    summary: "Get Bitbucket application properties and version",
    method: "GET",
    path: "/rest/api/1.0/application-properties",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["server", "diagnostics"]
  },
  {
    operationId: "bitbucket.projects.list",
    summary: "List Bitbucket projects",
    method: "GET",
    path: "/rest/api/1.0/projects",
    responseKind: "json",
    pagination: {
      kind: "bitbucket",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "values",
      responseNextOffset: "nextPageStart",
      responseIsLast: "isLastPage"
    },
    versions: ["9.4", "10.2", "10.4"],
    tags: ["project"]
  },
  {
    operationId: "bitbucket.projects.get",
    summary: "Get a Bitbucket project",
    method: "GET",
    path: "/rest/api/1.0/projects/{projectKey}",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["project"]
  },
  {
    operationId: "bitbucket.projects.create",
    summary: "Create a Bitbucket project",
    method: "POST",
    path: "/rest/api/1.0/projects",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["project", "admin", "create"]
  },
  {
    operationId: "bitbucket.projects.update",
    summary: "Update a Bitbucket project",
    method: "PUT",
    path: "/rest/api/1.0/projects/{projectKey}",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["project", "admin", "update"]
  },
  {
    operationId: "bitbucket.projects.delete",
    summary: "Delete a Bitbucket project",
    method: "DELETE",
    path: "/rest/api/1.0/projects/{projectKey}",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["project", "admin", "delete"]
  },
  {
    operationId: "bitbucket.repositories.list",
    summary: "List repositories in a project",
    method: "GET",
    path: "/rest/api/1.0/projects/{projectKey}/repos",
    responseKind: "json",
    pagination: {
      kind: "bitbucket",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "values",
      responseNextOffset: "nextPageStart",
      responseIsLast: "isLastPage"
    },
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository"]
  },
  {
    operationId: "bitbucket.repositories.get",
    summary: "Get a repository",
    method: "GET",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository"]
  },
  {
    operationId: "bitbucket.repositories.create",
    summary: "Create a repository",
    method: "POST",
    path: "/rest/api/1.0/projects/{projectKey}/repos",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "admin", "create"]
  },
  {
    operationId: "bitbucket.repositories.update",
    summary: "Update repository settings",
    method: "PUT",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "admin", "update"]
  },
  {
    operationId: "bitbucket.repositories.delete",
    summary: "Delete a repository",
    method: "DELETE",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "admin", "delete"]
  },
  {
    operationId: "bitbucket.branches.list",
    summary: "List repository branches",
    method: "GET",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/branches",
    responseKind: "json",
    pagination: {
      kind: "bitbucket",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "values",
      responseNextOffset: "nextPageStart",
      responseIsLast: "isLastPage"
    },
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "branch"]
  },
  {
    operationId: "bitbucket.branches.create",
    summary: "Create a repository branch",
    method: "POST",
    path: "/rest/branch-utils/1.0/projects/{projectKey}/repos/{repositorySlug}/branches",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "branch", "create"]
  },
  {
    operationId: "bitbucket.branches.delete",
    summary: "Delete a repository branch",
    method: "DELETE",
    path: "/rest/branch-utils/1.0/projects/{projectKey}/repos/{repositorySlug}/branches",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "branch", "delete"]
  },
  {
    operationId: "bitbucket.commits.list",
    summary: "List repository commits",
    method: "GET",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/commits",
    responseKind: "json",
    pagination: {
      kind: "bitbucket",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "values",
      responseNextOffset: "nextPageStart",
      responseIsLast: "isLastPage"
    },
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "commit"]
  },
  {
    operationId: "bitbucket.commits.get",
    summary: "Get a commit",
    method: "GET",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/commits/{commitId}",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "commit"]
  },
  {
    operationId: "bitbucket.files.browse",
    summary: "Browse repository files and directories",
    method: "GET",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/browse/{filePath}",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "file", "browse"]
  },
  {
    operationId: "bitbucket.files.raw",
    summary: "Get file metadata without returning its binary body",
    method: "GET",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/raw/{filePath}",
    responseKind: "binary",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "file", "binary"]
  },
  {
    operationId: "bitbucket.pullrequests.list",
    summary: "List pull requests",
    method: "GET",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests",
    responseKind: "json",
    pagination: {
      kind: "bitbucket",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "values",
      responseNextOffset: "nextPageStart",
      responseIsLast: "isLastPage"
    },
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "pull-request"]
  },
  {
    operationId: "bitbucket.pullrequests.get",
    summary: "Get a pull request",
    method: "GET",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "pull-request"]
  },
  {
    operationId: "bitbucket.pullrequests.create",
    summary: "Create a pull request",
    method: "POST",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "pull-request", "create"]
  },
  {
    operationId: "bitbucket.pullrequests.update",
    summary: "Update a pull request",
    method: "PUT",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "pull-request", "update"]
  },
  {
    operationId: "bitbucket.pullrequests.merge",
    summary: "Merge a pull request",
    method: "POST",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/merge",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "pull-request", "merge"]
  },
  {
    operationId: "bitbucket.pullrequests.decline",
    summary: "Decline a pull request",
    method: "POST",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/decline",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "pull-request", "decline"]
  },
  {
    operationId: "bitbucket.pullrequests.reopen",
    summary: "Reopen a declined pull request",
    method: "POST",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/reopen",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "pull-request", "reopen"]
  },
  {
    operationId: "bitbucket.pullrequests.activities",
    summary: "List pull request activities",
    method: "GET",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/activities",
    responseKind: "json",
    pagination: {
      kind: "bitbucket",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "values",
      responseNextOffset: "nextPageStart",
      responseIsLast: "isLastPage"
    },
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "pull-request", "activity"]
  },
  {
    operationId: "bitbucket.pullrequests.comments.add",
    summary: "Add a pull request comment",
    method: "POST",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "pull-request", "comment"]
  },
  {
    operationId: "bitbucket.pullrequests.comments.update",
    summary: "Update a pull request comment",
    method: "PUT",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId}",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "pull-request", "comment"]
  },
  {
    operationId: "bitbucket.pullrequests.comments.delete",
    summary: "Delete a pull request comment",
    method: "DELETE",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId}",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "pull-request", "comment", "delete"]
  },
  {
    operationId: "bitbucket.pullrequests.approve",
    summary: "Approve a pull request",
    method: "POST",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/approve",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "pull-request", "review"]
  },
  {
    operationId: "bitbucket.pullrequests.unapprove",
    summary: "Withdraw pull request approval",
    method: "DELETE",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/approve",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "pull-request", "review"]
  },
  {
    operationId: "bitbucket.pullrequests.diff",
    summary: "Get pull request diff metadata without inlining binary data",
    method: "GET",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}.diff",
    responseKind: "binary",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "pull-request", "diff", "binary"],
    accept: "text/plain"
  },
  {
    operationId: "bitbucket.builds.statuses.list",
    summary: "List build statuses for a commit",
    method: "GET",
    path: "/rest/build-status/1.0/commits/{commitId}",
    responseKind: "json",
    pagination: {
      kind: "bitbucket",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "values",
      responseNextOffset: "nextPageStart",
      responseIsLast: "isLastPage"
    },
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "commit", "build-status"]
  },
  {
    operationId: "bitbucket.builds.statuses.create",
    summary: "Create or update a build status",
    method: "POST",
    path: "/rest/build-status/1.0/commits/{commitId}",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "commit", "build-status"]
  },
  {
    operationId: "bitbucket.webhooks.list",
    summary: "List repository webhooks",
    method: "GET",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/webhooks",
    responseKind: "json",
    pagination: {
      kind: "bitbucket",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "values",
      responseNextOffset: "nextPageStart",
      responseIsLast: "isLastPage"
    },
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "webhook", "admin"]
  },
  {
    operationId: "bitbucket.webhooks.create",
    summary: "Create a repository webhook",
    method: "POST",
    path: "/rest/api/1.0/projects/{projectKey}/repos/{repositorySlug}/webhooks",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository", "webhook", "admin"]
  },
  {
    operationId: "bitbucket.permissions.users",
    summary: "List users with project permissions",
    method: "GET",
    path: "/rest/api/1.0/projects/{projectKey}/permissions/users",
    responseKind: "json",
    pagination: {
      kind: "bitbucket",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "values",
      responseNextOffset: "nextPageStart",
      responseIsLast: "isLastPage"
    },
    versions: ["9.4", "10.2", "10.4"],
    tags: ["project", "permission", "user", "admin"]
  },
  {
    operationId: "bitbucket.users.list",
    summary: "List Bitbucket users",
    method: "GET",
    path: "/rest/api/1.0/users",
    responseKind: "json",
    pagination: {
      kind: "bitbucket",
      requestOffset: "start",
      requestLimit: "limit",
      responseItems: "values",
      responseNextOffset: "nextPageStart",
      responseIsLast: "isLastPage"
    },
    versions: ["9.4", "10.2", "10.4"],
    tags: ["user", "admin"]
  },
  // multipartField fix: Bitbucket browse endpoint expects field name "content" (not "file").
  // Sending as "file" causes 400 "Parameter 'content' cannot be null" (DC 10.4.1).
  {
    operationId: "bitbucket.repository.projects.repos.browse.update",
    summary: "Edit file",
    summaryZh: "编辑文件",
    method: "PUT",
    path: "/rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/browse/{path}",
    responseKind: "json",
    requestBody: true,
    bodyKind: "multipart",
    multipartField: "content",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository"]
  },
  // responseKind fix: WADL only produces text/plain; Accept=json returns 406.
  {
    operationId: "bitbucket.repository.projects.repos.patch.list",
    summary: "Get patch content at a revision",
    summaryZh: "获取指定版本的 patch 内容",
    method: "GET",
    path: "/rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/patch",
    responseKind: "binary",
    accept: "text/plain",
    parameters: [
      { name: "projectKey", in: "path", required: true, type: "string" },
      { name: "until", in: "query", required: false, type: "string" },
      { name: "allAncestors", in: "query", required: false, type: "string" },
      { name: "repositorySlug", in: "path", required: true, type: "string" },
      { name: "since", in: "query", required: false, type: "string" }
    ],
    versions: ["9.4", "10.2", "10.4"],
    tags: ["repository"]
  },
  // requestBody fix: spec omits requestBody for this endpoint
  {
    operationId: "jira.dashboard.items.properties.update",
    summary: "Set a property on a dashboard item",
    summaryZh: "设置仪表盘项属性",
    method: "PUT",
    path: "/rest/api/2/dashboard/{dashboardId}/items/{itemId}/properties/{propertyKey}",
    responseKind: "json",
    requestBody: true,
    requestBodySchema: { type: "string" },
    versions: ["10.3", "11.3"],
    tags: ["dashboard", "item", "property", "update"]
  },
  // Pagination fix: spec lists issueTypeIds (a field-level property) before values
  {
    operationId: "jira.custom-fields.customfields.list",
    summary: "Get custom fields with pagination",
    summaryZh: "分页获取自定义字段",
    method: "GET",
    path: "/rest/api/2/customFields",
    responseKind: "json",
    pagination: {
      kind: "jira",
      requestOffset: "startAt",
      requestLimit: "maxResults",
      responseItems: "values",
      responseTotal: "total"
    },
    versions: ["10.3", "11.3"],
    tags: ["customfields", "custom", "fields"]
  },
  // Permission override: safe → admin (abuse surface, no SMTP in test env)
  {
    operationId: "jira.issue.notify",
    summary: "Send notification to recipients",
    method: "POST",
    path: "/rest/api/2/issue/{issueIdOrKey}/notify",
    responseKind: "json",
    requestBody: true,
    versions: ["10.3", "11.3"],
    tags: ["issue"]
  },
  // customFieldId 只接受数字（customfield_ 前缀形式返回 404）
  {
    operationId: "jira.custom-fields.customfields.options.list",
    summary:
      "Get options for a custom field (page-based pagination; customFieldId must be numeric)",
    summaryZh: "获取自定义字段的选项列表（页码制分页，customFieldId 只接受数字）",
    method: "GET",
    path: "/rest/api/2/customFields/{customFieldId}/options",
    responseKind: "json",
    parameters: [
      { name: "customFieldId", in: "path", required: true, type: "string" },
      { name: "maxResults", in: "query", required: false, type: "number" },
      { name: "page", in: "query", required: false, type: "number" },
      { name: "query", in: "query", required: false, type: "string" },
      { name: "sortByOptionName", in: "query", required: false, type: "boolean" },
      { name: "useAllContexts", in: "query", required: false, type: "boolean" },
      { name: "issueTypeIds", in: "query", required: false, type: "array" },
      { name: "projectIds", in: "query", required: false, type: "array" }
    ],
    versions: ["10.3", "11.3"],
    tags: ["customfields", "custom", "fields", "options"]
  },
  // Avatar multipartField overrides: Jira requires the multipart form field name to
  // be "avatar", not the auto-detected "file". Also drop the Accept header (empty
  // string) because Jira DC 11.3 rejects application/json Accept on these endpoints.
  {
    operationId: "jira.project.avatar.temporary.create",
    summary: "Store temporary avatar using multipart",
    summaryZh: "通过 multipart 存储临时头像",
    method: "POST",
    path: "/rest/api/2/project/{projectIdOrKey}/avatar/temporary",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["project"],
    requestBody: true,
    bodyKind: "multipart",
    multipartField: "avatar",
    accept: ""
  },
  {
    operationId: "jira.issue-type.issuetype.avatar.temporary.create",
    summary: "Create temporary avatar using multipart for issue type",
    summaryZh: "通过 multipart 上传为 Issue 类型创建临时头像",
    method: "POST",
    path: "/rest/api/2/issuetype/{id}/avatar/temporary",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["issuetype", "issue", "type"],
    requestBody: true,
    bodyKind: "multipart",
    multipartField: "avatar",
    accept: ""
  },
  {
    operationId: "jira.universal-avatar.universal-avatar.type.owner.temp.create",
    summary: "Create temporary avatar using multipart upload",
    summaryZh: "通过 multipart 上传创建临时头像",
    method: "POST",
    path: "/rest/api/2/universal_avatar/type/{type}/owner/{owningObjectId}/temp",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["universal-avatar", "universal", "avatar"],
    requestBody: true,
    bodyKind: "multipart",
    multipartField: "avatar",
    accept: ""
  },
  {
    operationId: "jira.user.avatar.temporary.create",
    summary: "Store temporary avatar using multipart",
    summaryZh: "通过 multipart 存储临时头像",
    method: "POST",
    path: "/rest/api/2/user/avatar/temporary",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["user"],
    requestBody: true,
    bodyKind: "multipart",
    multipartField: "avatar",
    accept: ""
  },
  // Accept override: Jira DC POST /rest/api/2/issue/archive rejects
  // application/json with 406. Drop the Accept header so the product
  // picks its own content type (204 No Content, no response body).
  // DC body format is a bare array of issue keys, NOT Cloud's
  // {issueIdsOrKeys: [...]} object — documented here so describe_operation
  // surfaces the DC/Cloud difference to LLM consumers.
  {
    operationId: "jira.issue.archive",
    summary: "Archive issues in bulk",
    summaryZh: "批量归档 Issue",
    method: "POST",
    path: "/rest/api/2/issue/archive",
    responseKind: "json",
    requestBody: true,
    requestBodySchema: { type: "array" },
    versions: ["10.3", "11.3"],
    tags: ["issue"],
    accept: ""
  },
  // B-0: access-tokens create↔update 互换。
  // 官方 v1004 authentication 分组页正文：PUT 无 tokenId = 创建（服务器生成 ID），
  // POST with tokenId = 修改（body 必填 permissions）。
  // 原注册表中 projects.create（POST with tokenId）和 projects.update（PUT 无 tokenId）语义颠倒，
  // repo 级同理。以下 4 条 override 将 operationId 和 summary 互换。
  // users 级 access-tokens（5 个 op）有意排除：给任意用户签发个人令牌属高危，
  // Source policy only marks the project-facing operation set.
  // /rest/access-tokens/latest/projects 路径，这些 op 运行时被
  // Exposure policy filtering is performed from exposure-policy.json.
  // 勿为其加 override 或 e2e 覆盖。
  {
    operationId: "bitbucket.access-tokens.projects.create",
    summary: "Create project HTTP token",
    summaryZh: "创建项目 HTTP 访问令牌",
    method: "PUT",
    path: "/rest/access-tokens/latest/projects/{projectKey}",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["authentication"],
    requestBody: true
  },
  {
    operationId: "bitbucket.access-tokens.projects.update",
    summary: "Update HTTP token",
    summaryZh: "更新 HTTP 访问令牌",
    method: "POST",
    path: "/rest/access-tokens/latest/projects/{projectKey}/{tokenId}",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["authentication"],
    requestBody: true
  },
  {
    operationId: "bitbucket.access-tokens.projects.repos.create",
    summary: "Create repository HTTP token",
    summaryZh: "创建仓库 HTTP 访问令牌",
    method: "PUT",
    path: "/rest/access-tokens/latest/projects/{projectKey}/repos/{repositorySlug}",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["authentication"],
    requestBody: true
  },
  {
    operationId: "bitbucket.access-tokens.projects.repos.update",
    summary: "Update HTTP token",
    summaryZh: "更新 HTTP 访问令牌",
    method: "POST",
    path: "/rest/access-tokens/latest/projects/{projectKey}/repos/{repositorySlug}/{tokenId}",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["authentication"],
    requestBody: true
  },
  // B-A: avatar-png.list is a binary GET (image/png). Without an explicit
  // Accept header the MCP server sends application/json → Bitbucket 406.
  {
    operationId: "bitbucket.project.avatar-png.list",
    summary: "Get avatar for project",
    summaryZh: "获取项目头像",
    method: "GET",
    path: "/rest/api/latest/projects/{projectKey}/avatar.png",
    responseKind: "binary",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["project"],
    accept: "image/png"
  },
  // B-C: .patch endpoint returns text/plain; Accept: application/json → 406.
  // Same fix as repository.patch.list (line 128).
  {
    operationId: "bitbucket.pull-requests.projects.repos.pull-requests.get",
    summary: "Stream pull request as patch",
    summaryZh: "流式获取拉取请求 patch",
    method: "GET",
    path: "/rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}.patch",
    responseKind: "binary",
    accept: "text/plain",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["pull-requests", "pull", "requests"]
  },
  // B-C: apply-suggestion body field is "message" on DC 10.4.1, not "commitMessage"
  // as the OpenAPI spec advertises. Passing commitMessage → "'message' cannot be null".
  {
    operationId:
      "bitbucket.pull-requests.projects.repos.pull-requests.comments.apply-suggestion.create",
    summary: "Apply pull request suggestion",
    summaryZh: "应用拉取请求建议",
    method: "POST",
    path: "/rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments/{commentId}/apply-suggestion",
    responseKind: "json",
    requestBody: true,
    requestBodySchema: {
      type: "object",
      required: ["commentVersion", "pullRequestVersion", "suggestionIndex"],
      properties: {
        commentVersion: { type: "integer", format: "int32" },
        message: { type: "string" },
        pullRequestVersion: { type: "integer", format: "int32" },
        suggestionIndex: { type: "integer", format: "int32" }
      }
    },
    versions: ["9.4", "10.2", "10.4"],
    tags: ["pull-requests", "pull", "requests"]
  },
  // F1 English-summary fallbacks: the official specs ship no summary for these
  // endpoints (verified against rule/api-inventory-*.json), so the OVERRIDE
  // summary is the final one. summaryZh keeps the previous Chinese description.
  {
    operationId: "jira.search.error.lookup.list",
    summary: "Get search error messages for the current user or context",
    summaryZh: "查询当前用户/上下文的搜索错误信息（官方文档未提供 summary，按响应描述翻译）",
    method: "GET",
    path: "/rest/api/2/search/error/lookup",
    responseKind: "json",
    versions: ["10.3", "11.3"],
    tags: ["search"]
  },
  {
    operationId: "confluence.attachments.content.child.extractedtext.list",
    summary: "Get the extracted text of an attachment",
    summaryZh: "获取附件的提取文本",
    method: "GET",
    path: "/rest/api/content/{id}/child/attachment/{attachmentId}/extractedtext",
    responseKind: "json",
    versions: ["9.2", "10.2"],
    tags: ["attachments"]
  },
  {
    operationId: "confluence.content-property.create.id",
    summary: "Create a content property with a specific key",
    summaryZh: "按指定键创建内容属性",
    method: "POST",
    path: "/rest/api/content/{id}/property/{key}",
    responseKind: "json",
    requestBody: true,
    versions: ["9.2", "10.2"],
    tags: ["content-property", "content", "property"]
  },
  {
    operationId: "bitbucket.authconfig.list",
    summary: "Get the certificate currently used to sign SAML authentication requests",
    summaryZh: "获取当前用于签名 SAML 认证请求的证书",
    method: "GET",
    path: "/rest/authconfig/latest/saml/certificate",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["saml-certificate-configuration", "saml", "certificate", "configuration"]
  },
  {
    operationId: "bitbucket.authconfig.reset",
    summary: "Generate a new certificate for signing SAML authentication requests",
    summaryZh: "生成新的 SAML 认证请求签名证书",
    method: "POST",
    path: "/rest/authconfig/latest/saml/certificate/reset",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["saml-certificate-configuration", "saml", "certificate", "configuration"]
  },
  {
    operationId: "bitbucket.zdu.state.get",
    summary: "Get the cluster state and responding nodes",
    summaryZh: "获取集群状态及响应节点信息",
    method: "GET",
    path: "/rest/zdu/state",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["intro"]
  },
  {
    operationId: "bitbucket.zdu.nodes.get",
    summary: "Get information about a specific node",
    summaryZh: "获取指定节点的信息",
    method: "GET",
    path: "/rest/zdu/nodes/{nodeId}",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["intro"]
  },
  {
    operationId: "bitbucket.zdu.cluster.get",
    summary: "Get an overview of the cluster, including its state and nodes",
    summaryZh: "获取集群概览（状态与节点组成）",
    method: "GET",
    path: "/rest/zdu/cluster",
    responseKind: "json",
    versions: ["9.4", "10.2", "10.4"],
    tags: ["intro"]
  },
  {
    operationId: "bitbucket.zdu.start",
    summary: "Start a ZDU upgrade, allowing the cluster to run mixed versions",
    summaryZh: "开始 ZDU 升级（允许集群异构升级）",
    method: "POST",
    path: "/rest/zdu/start",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["intro"]
  },
  {
    operationId: "bitbucket.zdu.cancel",
    summary: "Cancel the ZDU upgrade",
    summaryZh: "取消 ZDU 升级",
    method: "POST",
    path: "/rest/zdu/cancel",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["intro"]
  },
  {
    operationId: "bitbucket.zdu.approve",
    summary: "Approve and finish the ZDU upgrade",
    summaryZh: "批准并完成 ZDU 升级",
    method: "POST",
    path: "/rest/zdu/approve",
    responseKind: "json",
    requestBody: true,
    versions: ["9.4", "10.2", "10.4"],
    tags: ["intro"]
  }
];

// Runtime exposure and exclusions belong to src/exposure-policy.json. Keeping
// generation lossless avoids a second, stale classification source.
const EXCLUDE_OPERATIONS = new Set();

// Baseline rows that are intentionally absent from the OpenAPI specs
// (verified: /rest/zdu/** only appears on the Bitbucket intro page).
const KNOWN_SPEC_MISSING = new Set([
  "GET /rest/zdu/state",
  "GET /rest/zdu/nodes/{}",
  "GET /rest/zdu/cluster",
  "POST /rest/zdu/start",
  "POST /rest/zdu/cancel",
  "POST /rest/zdu/approve"
]);

// Special-case spec lookups: baseline key -> spec path override (normalized).
const MATCH_ALIASES = new Map([]);

// GET endpoints whose spec advertises paging params but whose response has no
// top-level items envelope (verified against official docs/actual behavior):
// - user/search returns a bare array of users (spec wrongly says UserBean)
// - restriction byOperation endpoints nest paged lists under restrictions.{user,group}
// - space property GET returns a single JsonSpaceProperty (start/limit are spec artifacts)
const PAGINATION_SKIP = new Set([
  "GET /rest/api/2/user/search",
  "GET /rest/api/content/{}/restriction/byOperation/{}",
  "GET /rest/api/content/{}/restriction/relevantViewRestrictions",
  "GET /rest/api/space/{}/property/{}"
]);

const VERSIONS_CONST = {
  jira: "jiraVersions",
  confluence: "confluenceVersions",
  bitbucket: "bitbucketVersions"
};
const PAGE_FACTORY = { jira: "jiraPage", confluence: "confluencePage", bitbucket: "bitbucketPage" };
const PAGE_DEFAULT_ITEMS = { jira: "values", confluence: "results", bitbucket: "values" };

// ---------------------------------------------------------------------------
// 2. Baseline parsing
// ---------------------------------------------------------------------------
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sectionSlug(product, section) {
  if (product === "confluence") {
    const m = section.match(/api-group-([a-z0-9-]+)/);
    if (m) return m[1];
  }
  const paren =
    section.match(/\(([^)]*[A-Za-z][^)]*)\)/) || section.match(/（([^）]*[A-Za-z][^）]*)）/);
  let latin;
  if (paren) latin = paren[1].split(/[,，]/)[0];
  else {
    const m = section.match(/[A-Za-z][A-Za-z0-9 ./&-]*/);
    latin = m ? m[0] : section;
  }
  return slugify(latin.trim());
}

function parseBaseline() {
  const doc = fs.readFileSync(BASELINE, "utf8");
  const rows = [];
  let product = null;
  let section = null;
  for (const line of doc.split("\n")) {
    const part = line.match(/^# 第([一二三])部分：/);
    if (part) {
      product = { 一: "jira", 二: "confluence", 三: "bitbucket" }[part[1]];
      section = null;
      continue;
    }
    const sec = line.match(/^## (.+)$/);
    if (sec) {
      section = sec[1].trim();
      continue;
    }
    if (!product || !section || section.startsWith("抓取失败")) continue;
    const row = line.match(/^\| (GET|POST|PUT|DELETE|PATCH) \| (\S+) \| ([^|]*?) \|/);
    if (!row) continue;
    const summary = row[3].trim();
    const marker = summary.match(/\[(deprecated|experimental)\]/)?.[1] ?? null;
    rows.push({
      product,
      section,
      sectionSlug: sectionSlug(product, section),
      method: row[1],
      path: row[2],
      summary: summary.replace(/\s*\[(deprecated|experimental)\]\s*/g, "").trim(),
      excluded: marker
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 3. Path normalization + spec index
// ---------------------------------------------------------------------------
function normalizePath(product, p) {
  let out = p;
  if (product === "jira" || product === "bitbucket")
    out = out.startsWith("/rest") ? out : "/rest" + out;
  if (product === "bitbucket") {
    // version aliases: /rest/<prefix>/{latest,1.0}/ are equivalent
    out = out.replace(/^(\/rest\/[^/]+\/)(?:latest|1\.0)(\/|$)/, "$1latest$2");
  }
  return out.replace(/\{[^}]*\}/g, "{}");
}

const HTTP_METHODS = ["get", "post", "put", "delete", "patch"];

function buildSpecIndex(product, spec) {
  const index = new Map();
  for (const [specPath, item] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op) continue;
      const params = [...(item.parameters ?? []), ...(op.parameters ?? [])];
      index.set(`${method.toUpperCase()} ${normalizePath(product, specPath)}`, {
        specPath,
        method,
        op,
        params
      });
    }
  }
  return index;
}

// ---------------------------------------------------------------------------
// 4. Schema helpers
// ---------------------------------------------------------------------------
function resolveSchema(spec, schema, depth = 0) {
  if (!schema || depth > 6) return schema ?? {};
  if (schema.$ref) {
    const name = schema.$ref.replace(/^#\/components\/schemas\//, "");
    return resolveSchema(spec, spec.components?.schemas?.[name], depth + 1);
  }
  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const merged = { type: "object", properties: {} };
    for (const part of schema.allOf) {
      const resolved = resolveSchema(spec, part, depth + 1);
      if (resolved?.properties) Object.assign(merged.properties, resolved.properties);
      if (resolved?.type && resolved.type !== "object") merged.type = resolved.type;
    }
    return merged;
  }
  return schema;
}

function successContent(op) {
  const responses = op.responses ?? {};
  const key = responses["200"] ? "200" : Object.keys(responses).find((k) => /^2\d\d$/.test(k));
  return key ? (responses[key]?.content ?? {}) : {};
}

function successJsonSchema(op) {
  const content = successContent(op);
  const mediaType = Object.keys(content).find(
    (ct) => ct === "application/json" || ct.startsWith("application/json;")
  );
  return mediaType ? content[mediaType]?.schema : undefined;
}

function schemaSummary(spec, schema) {
  const resolved = resolveSchema(spec, schema);
  if (!resolved || typeof resolved !== "object") return {};
  const summary = {};
  if (typeof resolved.type === "string") summary.type = resolved.type;
  if (typeof resolved.format === "string") summary.format = resolved.format;
  const item = resolveSchema(spec, resolved.items);
  if (item?.type) summary.itemsType = item.type;
  return summary;
}

function parameterMetadata(spec, params, path) {
  const pathNames = [...(path ?? "").matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  let pathIndex = 0;
  return params
    .filter((param) => param.in === "path" || param.in === "query")
    .map((param) => {
      const shape = schemaSummary(spec, param.schema);
      const output = {
        // The URL template is the executable contract. Some Atlassian specs
        // name the reusable parameter issueIdOrKey while the path uses
        // {issueKey}; expose the template name so generic execution is
        // discoverable and does not require guessing.
        name: param.in === "path" ? (pathNames[pathIndex++] ?? param.name) : param.name,
        in: param.in,
        required: Boolean(param.required || param.in === "path"),
        ...shape
      };
      if (Array.isArray(param.schema?.enum)) output.enum = param.schema.enum;
      return output;
    });
}

function requestBodyMetadata(spec, op) {
  const content = op?.requestBody?.content ?? {};
  const mediaType = Object.keys(content).find(
    (type) => type === "application/json" || type.startsWith("application/json;") || type === "*/*"
  );
  if (!mediaType) return undefined;
  const resolved = resolveSchema(spec, content[mediaType]?.schema);
  const summary = schemaSummary(spec, resolved);
  const output = { type: summary.type ?? "unknown" };
  if (Array.isArray(resolved?.required)) output.required = resolved.required;
  if (resolved?.properties && typeof resolved.properties === "object") {
    output.properties = Object.fromEntries(
      Object.entries(resolved.properties).map(([name, child]) => [name, schemaSummary(spec, child)])
    );
  }
  return output;
}

function decorateManifest(manifest, specEntry, spec) {
  const params = specEntry?.params ?? [];
  const output = { ...manifest };
  const parameters = parameterMetadata(spec, params, specEntry?.manifest?.path ?? manifest.path);
  if (!Object.prototype.hasOwnProperty.call(output, "parameters") && parameters.length > 0)
    output.parameters = parameters;
  const requestBodySchema = requestBodyMetadata(spec, specEntry?.op);
  if (!Object.prototype.hasOwnProperty.call(output, "requestBodySchema") && requestBodySchema)
    output.requestBodySchema = requestBodySchema;
  return output;
}

function arrayPropertyName(spec, schema) {
  const resolved = resolveSchema(spec, schema);
  if (!resolved || resolved.type === "array" || !resolved.properties) return null;
  for (const [name, prop] of Object.entries(resolved.properties)) {
    const propResolved = resolveSchema(spec, prop);
    if (propResolved?.type === "array") return name;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 5. operationId generation
// ---------------------------------------------------------------------------
const ACTION_WORDS = new Set([
  "apply",
  "approve",
  "archive",
  "assign",
  "block",
  "bulk",
  "cancel",
  "copy",
  "decline",
  "demote",
  "disable",
  "dismiss",
  "enable",
  "execute",
  "export",
  "grant",
  "import",
  "link",
  "mark",
  "merge",
  "migrate",
  "move",
  "notify",
  "pin",
  "preview",
  "promote",
  "publish",
  "reciprocal",
  "refresh",
  "reindex",
  "rename",
  "reopen",
  "resend",
  "reset",
  "restart",
  "restore",
  "resync",
  "revert",
  "revoke",
  "rotate",
  "run",
  "search",
  "start",
  "stop",
  "subscribe",
  "suspend",
  "sync",
  "transfer",
  "unarchive",
  "unapprove",
  "unblock",
  "unlink",
  "unpin",
  "unpublish",
  "unsubscribe",
  "unsuspend",
  "unwatch",
  "validate",
  "vote",
  "watch"
]);
const SINGLETON_WORDS = new Set([
  "application-properties",
  "capabilities",
  "cluster",
  "configuration",
  "count",
  "current",
  "history",
  "info",
  "license",
  "manifest",
  "myself",
  "properties",
  "serverInfo",
  "settings",
  "state",
  "status",
  "summary",
  "types"
]);

function makeOperationId(row, usedIds) {
  const { product, method } = row;
  const group = row.sectionSlug;
  let segs = row.path.split("/").filter(Boolean);
  if (segs[0] === "rest") segs.shift();
  let prefixTag = null;
  if (product === "jira")
    segs.splice(0, 2); // api, 2
  else if (product === "confluence")
    segs.splice(0, 1); // api
  else {
    prefixTag = segs.shift(); // api | branch-utils | zdu | ...
    if (/^(latest|\d+\.\d+)$/.test(segs[0] ?? "")) segs.shift();
    if (prefixTag === "api") prefixTag = null;
  }
  const isParam = (s) => s !== undefined && s.startsWith("{");
  const endsParam = isParam(segs[segs.length - 1]);
  const groupWords = new Set(group.split("-"));
  const matchesGroup = (s) =>
    groupWords.has(s) || groupWords.has(s.replace(/s$/, "")) || groupWords.has(`${s}s`);
  let names = segs.filter((s) => !isParam(s) && !matchesGroup(s)).map(slugify);
  let verb;
  if (method === "GET") {
    verb = endsParam || SINGLETON_WORDS.has(names[names.length - 1]) ? "get" : "list";
  } else if (method === "DELETE") {
    verb = "delete";
  } else if (names.length > 0 && ACTION_WORDS.has(names[names.length - 1])) {
    verb = names.pop();
  } else {
    verb = method === "POST" ? "create" : "update";
  }
  const head = prefixTag ?? group;
  const parts = [product, head, ...names, verb].filter(Boolean);
  let id = parts.join(".");
  if (usedIds.has(id)) {
    // disambiguate with trailing path-parameter names, then a numeric suffix
    const paramNames = segs.filter(isParam).map((s) => slugify(s.slice(1, -1)));
    for (const extra of paramNames) {
      const candidate = [...parts, extra].join(".");
      if (!usedIds.has(candidate)) return { id: candidate, disambiguated: true };
    }
    let n = 2;
    while (usedIds.has(`${id}-${n}`)) n++;
    return { id: `${id}-${n}`, disambiguated: true };
  }
  return { id, disambiguated: false };
}

// ---------------------------------------------------------------------------
// 6. Manifest construction
// ---------------------------------------------------------------------------
function buildManifest(row, specEntry, spec, product, usedIds, report) {
  const { id, disambiguated } = makeOperationId(row, usedIds);
  usedIds.add(id);
  if (disambiguated) report.disambiguatedIds.push(`${id}  <-  ${row.method} ${row.path}`);

  const op = specEntry?.op ?? null;
  const params = specEntry?.params ?? [];

  const manifest = {
    operationId: id,
    product,
    summary: row.summary,
    method: row.method,
    path: row.path,
    responseKind: "json"
  };

  Object.assign(manifest, decorateManifest(manifest, specEntry, spec));

  // Pagination (GET only)
  if (row.method === "GET") {
    const rowKey = `${row.method} ${normalizePath(row.product, row.path)}`;
    const queryNames = params.filter((p) => p.in === "query").map((p) => p.name);
    const hasJiraPage = queryNames.includes("startAt") && queryNames.includes("maxResults");
    const hasOffsetPage = queryNames.includes("start") && queryNames.includes("limit");
    if (PAGINATION_SKIP.has(rowKey)) {
      report.paginationSkipped.push(
        `${row.method} ${row.path}  (no top-level items envelope, see script PAGINATION_SKIP)`
      );
    } else if (hasJiraPage || hasOffsetPage) {
      const schema = successJsonSchema(op ?? {});
      const resolved = resolveSchema(spec, schema);
      if (resolved?.type === "array") {
        report.paginationSkipped.push(
          `${row.method} ${row.path}  (top-level array response, no envelope)`
        );
      } else {
        const items = arrayPropertyName(spec, schema);
        if (items) {
          manifest.pagination = { factory: PAGE_FACTORY[product], items };
        } else {
          manifest.pagination = {
            factory: PAGE_FACTORY[product],
            items: PAGE_DEFAULT_ITEMS[product]
          };
          report.paginationDoubtful.push(
            `${id}  (${row.method} ${row.path}, fallback items="${PAGE_DEFAULT_ITEMS[product]}")`
          );
        }
      }
    }
  }

  // Request body
  if (row.method !== "GET") {
    const content = op?.requestBody?.content ?? null;
    if (content) {
      manifest.requestBody = true;
      if (content["multipart/form-data"]) {
        manifest.bodyKind = "multipart";
        const schema = resolveSchema(spec, content["multipart/form-data"].schema);
        const binaryProp = Object.entries(schema?.properties ?? {}).find(
          ([, prop]) => resolveSchema(spec, prop)?.format === "binary"
        );
        manifest.multipartField = binaryProp?.[0] ?? "file";
      }
    } else if (!specEntry && ["POST", "PUT", "PATCH"].includes(row.method)) {
      manifest.requestBody = true; // spec missing: infer from method
    }
  }

  // Binary responses
  const contentTypes = Object.keys(successContent(op ?? {}));
  const binaryByContent = contentTypes.some(
    (ct) => ct === "application/octet-stream" || ct === "application/zip" || ct.startsWith("image/")
  );
  const binaryByPath =
    /(\/raw\/|\.diff$|\/download(\/|$)|attachment\/content\/|\/attachments\/\{[^}]*\}$|\/universal_avatar\/view\/|\/secure\/attachment\/|\/archive$)/.test(
      row.path
    ) && row.method === "GET";
  if (binaryByContent || binaryByPath) {
    manifest.responseKind = "binary";
    report.binaryOps.push(
      `${id}  (${row.method} ${row.path}; ${binaryByContent ? `content-type: ${contentTypes.join(",")}` : "path heuristic"})`
    );
  }

  // Tags: spec tags + baseline section keywords
  const tags = new Set();
  for (const t of op?.tags ?? []) {
    const slug = slugify(t);
    if (slug) tags.add(slug);
  }
  for (const word of row.sectionSlug.split("-")) if (word) tags.add(word);
  manifest.tags = [...tags];

  return manifest;
}

// ---------------------------------------------------------------------------
// 7. Rendering
// ---------------------------------------------------------------------------
function renderPagination(pg) {
  // pg: either { factory, items } (generated) or a full PaginationSpec (override)
  if (pg.factory) {
    const def =
      PAGE_DEFAULT_ITEMS[
        pg.factory === "jiraPage"
          ? "jira"
          : pg.factory === "confluencePage"
            ? "confluence"
            : "bitbucket"
      ];
    const factoryDefault = pg.factory === "jiraPage" ? "issues" : def;
    return pg.items === factoryDefault
      ? `${pg.factory}()`
      : `${pg.factory}(${JSON.stringify(pg.items)})`;
  }
  const defaults = { jira: "issues", confluence: "results", bitbucket: "values" };
  const factory = PAGE_FACTORY[pg.kind];
  const expected = {
    jira: { requestOffset: "startAt", requestLimit: "maxResults", responseTotal: "total" },
    confluence: { requestOffset: "start", requestLimit: "limit" },
    bitbucket: {
      requestOffset: "start",
      requestLimit: "limit",
      responseNextOffset: "nextPageStart",
      responseIsLast: "isLastPage"
    }
  }[pg.kind];
  const matches =
    Object.entries(expected).every(([k, v]) => pg[k] === v) &&
    Object.keys(pg).every((k) => k === "kind" || k === "responseItems" || k in expected);
  if (matches) {
    return pg.responseItems === defaults[pg.kind]
      ? `${factory}()`
      : `${factory}(${JSON.stringify(pg.responseItems)})`;
  }
  return JSON.stringify(pg);
}

function renderManifest(m, product) {
  const lines = ["  {"];
  const push = (key, value) => lines.push(`    ${key}: ${value},`);
  push("operationId", JSON.stringify(m.operationId));
  push("product", JSON.stringify(m.product ?? product));
  push("summary", JSON.stringify(m.summary));
  if (m.summaryZh) push("summaryZh", JSON.stringify(m.summaryZh));
  push("method", JSON.stringify(m.method));
  push("path", JSON.stringify(m.path));
  push("responseKind", JSON.stringify(m.responseKind));
  if (m.accept !== undefined) push("accept", JSON.stringify(m.accept));
  if (m.parameters) push("parameters", JSON.stringify(m.parameters));
  if (m.requestBodySchema) push("requestBodySchema", JSON.stringify(m.requestBodySchema));
  if (m.pagination) push("pagination", renderPagination(m.pagination));
  if (m.requestBody) push("requestBody", "true");
  if (m.bodyKind) push("bodyKind", JSON.stringify(m.bodyKind));
  if (m.multipartField) push("multipartField", JSON.stringify(m.multipartField));
  push("versions", VERSIONS_CONST[product]);
  push("tags", `[${(m.tags ?? []).map((t) => JSON.stringify(t)).join(", ")}]`);
  if (m.unsupportedReason) push("unsupportedReason", JSON.stringify(m.unsupportedReason));
  if (m.scope) push("scope", JSON.stringify(m.scope));
  if (m.dataKind) push("dataKind", JSON.stringify(m.dataKind));
  if (m.destructive !== undefined) push("destructive", JSON.stringify(m.destructive));
  if (m.requestBodyTemplate) push("requestBodyTemplate", JSON.stringify(m.requestBodyTemplate));
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, "");
  lines.push("  }");
  return lines.join("\n");
}

function renderProductFile(product, manifests, extraOps) {
  const factories = new Set();
  for (const m of [...manifests, ...extraOps]) {
    if (m.pagination) factories.add(m.pagination.factory ?? PAGE_FACTORY[m.pagination.kind]);
  }
  const imports = [...factories].sort();
  imports.push(VERSIONS_CONST[product]);
  const body = manifests.map((m) => renderManifest(m, product)).join(",\n");
  const extras = extraOps.map((m) => renderManifest(m, product)).join(",\n");
  return `// Generated by scripts/generate-operations.mjs. Edit overrides in the script, not here.
import type { RegisteredOperation } from "../types.js";
import { ${imports.join(", ")} } from "./helpers.js";

export const ${product}Operations: readonly RegisteredOperation[] = [
${body}${
    extraOps.length > 0
      ? `,
  // Operations outside the official baseline, kept for backward compatibility
${extras}`
      : ""
  }
];
`;
}

function renderRegistry(manifests) {
  const operations = manifests
    .map(({ operationId, product, method, path, summary, summaryZh }) => ({
      operationId,
      product,
      method,
      path,
      summary,
      ...(summaryZh ? { summaryZh } : {})
    }))
    .sort((a, b) => a.operationId.localeCompare(b.operationId));
  return `${JSON.stringify({ schemaVersion: 1, operations }, null, 2)}\n`;
}

function generatedArtifacts(byProduct, extraOps) {
  const files = {};
  for (const product of ["jira", "confluence", "bitbucket"]) {
    files[path.join(ROOT, "src", "operations", `${product}.ts`)] = renderProductFile(
      product,
      byProduct[product],
      extraOps[product]
    );
  }
  files[path.join(ROOT, "src", "operations", "registry.json")] = renderRegistry(
    Object.values(byProduct).flat().concat(Object.values(extraOps).flat())
  );
  return files;
}

function checkGeneratedArtifacts(files) {
  const mismatches = [];
  for (const [file, content] of Object.entries(files)) {
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content)
      mismatches.push(path.relative(ROOT, file));
  }
  return mismatches;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  const specs = {};
  const specIndexes = {};
  for (const product of ["jira", "confluence", "bitbucket"]) {
    specs[product] = await loadSpec(product, { cacheDir: CACHE, offline: true });
    specIndexes[product] = buildSpecIndex(product, specs[product]);
  }

  const rows = parseBaseline();
  const overrides = new Map();
  const overrideIds = new Set();
  for (const o of OVERRIDES) {
    const product = o.operationId.split(".")[0];
    const key = `${o.method} ${normalizePath(product, o.path)}`;
    if (overrides.has(key)) throw new Error(`duplicate OVERRIDE method/path key: ${key}`);
    if (overrideIds.has(o.operationId))
      throw new Error(`duplicate OVERRIDE operationId: ${o.operationId}`);
    overrides.set(key, o);
    overrideIds.add(o.operationId);
  }

  const report = {
    unmatched: [],
    knownMissing: [],
    paginationDoubtful: [],
    paginationSkipped: [],
    disambiguatedIds: [],
    binaryOps: [],
    excluded: [],
    excludedProject: []
  };
  const usedIds = new Set(overrideIds);
  const consumedOverrides = new Set();
  const byProduct = { jira: [], confluence: [], bitbucket: [] };
  const stats = {};

  for (const row of rows) {
    stats[row.product] ??= { baseline: 0, excluded: 0, generated: 0, excludedProject: 0 };
    stats[row.product].baseline++;
    if (row.excluded) {
      stats[row.product].excluded++;
      report.excluded.push(`${row.product}  ${row.method} ${row.path}  [${row.excluded}]`);
      continue;
    }
    const key = `${row.method} ${normalizePath(row.product, row.path)}`;
    const override = overrides.get(key);
    const specKey = MATCH_ALIASES.get(key) ?? key;
    const specEntry = specIndexes[row.product].get(specKey);
    let manifest;
    if (override) {
      consumedOverrides.add(key);
      manifest = { ...override, product: row.product };
      usedIds.add(override.operationId);
    } else {
      const baseCandidate = makeOperationId(row, new Set()).id;
      if (overrideIds.has(baseCandidate)) {
        const resolvedCandidate = makeOperationId(row, overrideIds);
        if (!resolvedCandidate.disambiguated || !row.path.includes("{"))
          throw new Error(
            `OVERRIDE operationId conflicts with generated operationId: ${baseCandidate} (${row.method} ${row.path})`
          );
      }
      if (!specEntry) {
        if (KNOWN_SPEC_MISSING.has(key)) report.knownMissing.push(`${row.product}  ${key}`);
        else report.unmatched.push(`${row.product}  ${key}  (${row.section})`);
      }
      manifest = buildManifest(row, specEntry, specs[row.product], row.product, usedIds, report);
    }
    manifest = addStaticMetadata(
      localizeSummary(decorateManifest(manifest, specEntry, specs[row.product]), specEntry)
    );
    // Project-level exclusion check
    if (EXCLUDE_OPERATIONS.has(manifest.operationId)) {
      report.excludedProject.push(
        `${manifest.product}  ${manifest.method}  ${manifest.path}  ${manifest.operationId}`
      );
      stats[row.product].excludedProject = (stats[row.product].excludedProject ?? 0) + 1;
      continue;
    }
    byProduct[row.product].push(manifest);
    stats[row.product].generated++;
  }

  // Baseline-outside overrides -> EXTRA_OPS
  const extraOps = { jira: [], confluence: [], bitbucket: [] };
  for (const [key, o] of overrides) {
    if (consumedOverrides.has(key)) continue;
    const product = o.operationId.split(".")[0];
    if (!EXCLUDE_OPERATIONS.has(o.operationId)) {
      extraOps[product].push(addStaticMetadata({ ...o, product }));
    }
  }

  if (report.unmatched.length > 0)
    throw new Error(`unmatched baseline rows: ${report.unmatched.length}`);
  const generated = Object.values(byProduct).flat().concat(Object.values(extraOps).flat());
  const generatedIds = new Set();
  const generatedTuples = new Set();
  for (const operation of generated) {
    const tuple = `${operation.product}|${operation.method}|${operation.path}`;
    if (generatedIds.has(operation.operationId))
      throw new Error(`duplicate generated operationId: ${operation.operationId}`);
    if (generatedTuples.has(tuple))
      throw new Error(`duplicate generated canonical method/path: ${tuple}`);
    generatedIds.add(operation.operationId);
    generatedTuples.add(tuple);
  }
  const nonEnglishSummaries = generated.filter((operation) =>
    CJK_IDEOGRAPH.test(operation.summary)
  );
  if (nonEnglishSummaries.length > 0)
    throw new Error(
      `summaries must be English (translate in OVERRIDES as fallback): ${nonEnglishSummaries
        .map((operation) => operation.operationId)
        .slice(0, 10)
        .join(", ")}`
    );
  const overrideGeneratedCollisions = generated.filter(
    (operation) =>
      overrideIds.has(operation.operationId) &&
      ![...overrides.values()].some(
        (override) =>
          override.operationId === operation.operationId &&
          override.method === operation.method &&
          normalizePath(override.product ?? override.operationId.split(".")[0], override.path) ===
            normalizePath(operation.product, operation.path)
      )
  );
  if (overrideGeneratedCollisions.length)
    throw new Error(
      `OVERRIDE operationId conflicts with generated operationId: ${overrideGeneratedCollisions.map((operation) => operation.operationId).join(", ")}`
    );
  const files = generatedArtifacts(byProduct, extraOps);
  const mismatches = checkGeneratedArtifacts(files);
  if (process.argv.includes("--check")) {
    if (mismatches.length > 0)
      throw new Error(`generated artifacts are stale: ${mismatches.join(", ")}`);
    console.log(`OK: generated artifacts are deterministic (${generated.length} operations).`);
    return;
  }
  for (const [file, content] of Object.entries(files)) fs.writeFileSync(file, content);

  // Report
  const lines = [];
  lines.push("# generate-operations 审查报告", "");
  lines.push("## 统计", "");
  lines.push(
    "| 产品 | 基准行数 | 排除(deprecated/experimental) | 项目级删除 | 生成 op 数 | 基准外保留 |",
    "|---|---|---|---|---|---|"
  );
  for (const p of ["jira", "confluence", "bitbucket"]) {
    const ep = stats[p].excludedProject ?? 0;
    lines.push(
      `| ${p} | ${stats[p].baseline} | ${stats[p].excluded} | ${ep} | ${stats[p].generated} | ${extraOps[p].length} |`
    );
  }
  const total = Object.values(stats).reduce(
    (a, s) => ({
      baseline: a.baseline + s.baseline,
      excluded: a.excluded + s.excluded,
      generated: a.generated + s.generated
    }),
    { baseline: 0, excluded: 0, generated: 0 }
  );
  lines.push(
    `| 合计 | ${total.baseline} | ${total.excluded} | ${total.generated} | ${Object.values(extraOps).flat().length} |`,
    ""
  );
  lines.push(
    `summaryZh（保留的中文描述）: ${generated.filter((operation) => operation.summaryZh).length} 个 op`,
    ""
  );
  lines.push("## 未匹配 spec 的基准行（需处理）", "");
  lines.push(
    report.unmatched.length === 0 ? "（无）" : report.unmatched.map((s) => `- ${s}`).join("\n")
  );
  lines.push("", "## 已知 spec 缺失（官方 spec 未收录，按默认规则生成）", "");
  lines.push(
    report.knownMissing.length === 0
      ? "（无）"
      : report.knownMissing.map((s) => `- ${s}`).join("\n")
  );
  lines.push("", "## operationId 冲突自动消解", "");
  lines.push(
    report.disambiguatedIds.length === 0
      ? "（无）"
      : report.disambiguatedIds.map((s) => `- ${s}`).join("\n")
  );
  lines.push("", "## 分页 items 存疑（schema 无法确定，使用产品缺省）", "");
  lines.push(
    report.paginationDoubtful.length === 0
      ? "（无）"
      : report.paginationDoubtful.map((s) => `- ${s}`).join("\n")
  );
  lines.push("", "## 分页跳过（顶层数组响应，无分页信封）", "");
  lines.push(
    report.paginationSkipped.length === 0
      ? "（无）"
      : report.paginationSkipped.map((s) => `- ${s}`).join("\n")
  );
  lines.push("", "## binary 判定", "");
  lines.push(report.binaryOps.map((s) => `- ${s}`).join("\n") || "（无）");
  lines.push("", "## 基准外保留 op（EXTRA_OPS）", "");
  for (const p of ["jira", "confluence", "bitbucket"])
    for (const o of extraOps[p]) lines.push(`- ${o.operationId}  (${o.method} ${o.path})`);
  lines.push("", "## 排除的 deprecated/experimental 行", "");
  lines.push(report.excluded.map((s) => `- ${s}`).join("\n") || "（无）");
  lines.push("", "## 项目级删除 operation（安全/风险/价值评估）", "");
  lines.push(
    report.excludedProject.length === 0
      ? "（无）"
      : report.excludedProject.map((s) => `- ${s}`).join("\n")
  );
  const reportText = lines.join("\n") + "\n";

  // stdout summary
  console.log(reportText);
  if (report.unmatched.length > 0) {
    console.error(`FAIL: unmatched=${report.unmatched.length}`);
    process.exit(1);
  }
  console.log(`OK: baseline fully generated (${generated.length} operations).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { renderProductFile, renderRegistry, generatedArtifacts, checkGeneratedArtifacts };
