import { describe, expect, it } from "vitest";
import { jiraOperations } from "../src/operations/jira.js";
import { confluenceOperations } from "../src/operations/confluence.js";
import { bitbucketOperations } from "../src/operations/bitbucket.js";
import { RAW_OPERATIONS } from "../src/operations/index.js";
import { readFileSync } from "node:fs";

const all = [...jiraOperations, ...confluenceOperations, ...bitbucketOperations];

describe("generated operation metadata", () => {
  it("materializes request body templates in generated operations", () => {
    const ids = new Set(
      all
        .filter((operation) => operation.requestBodyTemplate)
        .map((operation) => operation.operationId)
    );
    expect(ids).toEqual(
      new Set([
        "jira.issue.create",
        "jira.issue.update",
        "jira.issue.comments.add",
        "confluence.content.create",
        "confluence.content.update",
        "bitbucket.project.webhooks.create",
        "bitbucket.webhooks.create"
      ])
    );
  });

  it("matches the frozen v1 metadata fixture except for the 20 intentional destructive changes", () => {
    const fixture = JSON.parse(
      readFileSync("tests/fixtures/operation-metadata-v1.json", "utf8")
    ) as Array<Record<string, unknown>>;
    expect(fixture).toHaveLength(471);
    const generated = new Map(
      RAW_OPERATIONS.map((operation) => [operation.operationId, operation])
    );
    const expectedDestructiveDiff = new Set([
      "jira.issue.archive",
      "jira.issue.bulk",
      "jira.issue.restore",
      "jira.issue.subtask.move",
      "jira.project.archive",
      "jira.project.restore",
      "jira.version.move",
      "confluence.attachments.content.child.move",
      "confluence.space.archive",
      "confluence.space.restore",
      "bitbucket.pullrequests.decline",
      "bitbucket.pullrequests.merge",
      "bitbucket.pullrequests.reopen",
      "jira.issue.subtask.move.list",
      "jira.issue.transitions.list",
      "bitbucket.project.settings.auto-merge.list",
      "bitbucket.pull-requests.projects.repos.pull-requests.auto-merge.list",
      "bitbucket.pull-requests.projects.repos.pull-requests.merge.list",
      "bitbucket.repository.projects.repos.archive.list",
      "bitbucket.repository.projects.repos.settings.auto-merge.list"
    ]);
    const differences = new Set<string>();
    for (const row of fixture) {
      const actual = generated.get(row.operationId as string)!;
      expect(actual.scope).toBe(row.scope);
      expect(actual.dataKind).toBe(row.dataKind);
      expect(actual.requestBodyTemplate).toEqual(row.requestBodyTemplate);
      if (actual.destructive !== row.destructive) differences.add(row.operationId as string);
    }
    expect(differences).toEqual(expectedDestructiveDiff);
  });

  it("has complete static metadata for all raw operations and method invariants", () => {
    expect(RAW_OPERATIONS).toHaveLength(1120);
    for (const operation of RAW_OPERATIONS) {
      expect(["issue", "content", "repository", "project", "space", "global", "unknown"]).toContain(
        operation.scope
      );
      expect(["resource", "metadata", "capability", "mutation", "diagnostic"]).toContain(
        operation.dataKind
      );
      expect(typeof operation.destructive).toBe("boolean");
      if (operation.method === "GET") expect(operation.destructive).toBe(false);
      if (operation.method === "DELETE") expect(operation.destructive).toBe(true);
    }
  });

  it("keeps apply-suggestion body compatibility", () => {
    const operation = RAW_OPERATIONS.find((item) => item.operationId.includes("apply-suggestion"))!;
    expect(operation.requestBodySchema?.required).toEqual([
      "commentVersion",
      "pullRequestVersion",
      "suggestionIndex"
    ]);
    expect(operation.requestBodySchema?.properties?.message).toBeDefined();
    expect(operation.requestBodySchema?.properties?.commitMessage).toBeUndefined();
  });
});
