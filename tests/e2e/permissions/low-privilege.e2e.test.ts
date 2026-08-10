import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { StdioMcpClient, requireToolSuccess, type McpToolResult } from "../support/mcp-client.js";
import { limitedFixture } from "../support/rest-fixture.js";

// ── B7 low-privilege role tests ──
// These scenarios do NOT test Atlassian's permission system itself; they
// verify the server's structured error contract (kind / product /
// operationId / status / message, secrets redacted) on low-privilege denial
// paths, per docs/en/tool-contracts.md. Fixtures (least-privilege user,
// restricted project/space/repositories, read-only PAT) are shared and
// created by scripts/dc-setup.mjs into .e2e-state/<product>/limited.env.

interface ErrorPayload {
  kind?: unknown;
  product?: unknown;
  operationId?: unknown;
  status?: unknown;
  message?: unknown;
}

function expectErrorContract(
  result: McpToolResult,
  operationId: string,
  product: string,
  statuses: number[]
): void {
  expect(result.isError, JSON.stringify(result)).toBe(true);
  const error = (result.structuredContent as { error?: ErrorPayload } | undefined)?.error;
  expect(error, JSON.stringify(result)).toBeTruthy();
  expect(error?.kind, JSON.stringify(result)).toBe("atlassian_http_error");
  expect(error?.product, JSON.stringify(result)).toBe(product);
  expect(error?.operationId, JSON.stringify(result)).toBe(operationId);
  expect(typeof error?.status, JSON.stringify(result)).toBe("number");
  expect(statuses, JSON.stringify(result)).toContain(error?.status);
  expect(typeof error?.message, JSON.stringify(result)).toBe("string");
  // Redaction: the denial payload must never echo the fixture credentials.
  const serialized = JSON.stringify(result);
  expect(serialized).not.toContain("Mcp-");
}

const jiraActive = process.env.E2E_PRODUCT === "jira" ? describe : describe.skip;
const confluenceActive = process.env.E2E_PRODUCT === "confluence" ? describe : describe.skip;
const bitbucketActive = process.env.E2E_PRODUCT === "bitbucket" ? describe : describe.skip;

jiraActive("jira-permissions", () => {
  let client: StdioMcpClient;
  let fixture: Record<string, string>;

  beforeAll(async () => {
    fixture = limitedFixture("jira");
    // Tier max so the denial comes from Atlassian, never from local policy.
    client = await StdioMcpClient.start("jira", ["--exposure-tier=max"], {
      username: fixture.E2E_LIMITED_USERNAME,
      password: fixture.E2E_LIMITED_PASSWORD
    });
  }, 60_000);

  afterAll(async () => {
    if (client) await client.close();
  });

  it("user without project permission gets a structured error reading its issue", async () => {
    const denied = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "jira.issue.get",
        path: { issueKey: fixture.E2E_LIMITED_ISSUE_KEY },
        responseProfile: "standard"
      },
      { expectError: true }
    );
    // Jira hides issues the user cannot browse behind 404; 401/403 are also
    // valid denial shapes per the contract.
    expectErrorContract(denied, "jira.issue.get", "jira", [401, 403, 404]);
  });

  it("cross-project write is denied with a structured error", async () => {
    // Update on an issue the user cannot see. Jira answers 403 here (issue
    // create in a non-browseable project instead fails field validation with
    // 400, which is a validation contract, not a denial contract).
    const denied = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "jira.issue.update",
        path: { issueKey: fixture.E2E_LIMITED_ISSUE_KEY },
        body: { fields: { summary: "must be denied" } }
      },
      { expectError: true }
    );
    expectErrorContract(denied, "jira.issue.update", "jira", [401, 403, 404]);
  });
});

confluenceActive("confluence-permissions", () => {
  let client: StdioMcpClient;
  let fixture: Record<string, string>;

  beforeAll(async () => {
    fixture = limitedFixture("confluence");
    client = await StdioMcpClient.start("confluence", ["--exposure-tier=max"], {
      username: fixture.E2E_LIMITED_USERNAME,
      password: fixture.E2E_LIMITED_PASSWORD
    });
  }, 60_000);

  afterAll(async () => {
    if (client) await client.close();
  });

  it("user without space permission gets a structured error reading its page", async () => {
    const denied = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "confluence.content.get",
        path: { contentId: fixture.E2E_LIMITED_PAGE_ID },
        responseProfile: "standard"
      },
      { expectError: true }
    );
    expectErrorContract(denied, "confluence.content.get", "confluence", [401, 403, 404]);
  });

  it("cross-space write is denied with a structured error", async () => {
    const denied = await client.callTool(
      "atlassian_execute_operation",
      {
        operationId: "confluence.content.create",
        body: {
          type: "page",
          title: "must be denied",
          space: { key: fixture.E2E_LIMITED_SPACE_KEY },
          body: { storage: { value: "<p>denied</p>", representation: "storage" } }
        }
      },
      { expectError: true }
    );
    expectErrorContract(denied, "confluence.content.create", "confluence", [401, 403, 404]);
  });
});

bitbucketActive("bitbucket-permissions", () => {
  let patClient: StdioMcpClient;
  let basicClient: StdioMcpClient;
  let fixture: Record<string, string>;

  beforeAll(async () => {
    fixture = limitedFixture("bitbucket");
    // Read-only PAT (REPO_READ scope) for a user that holds REPO_WRITE on
    // the "restricted" repo — the write denial below is purely scope-driven.
    patClient = await StdioMcpClient.start("bitbucket", ["--exposure-tier=max"], {
      token: fixture.E2E_LIMITED_BITBUCKET_TOKEN,
      username: fixture.E2E_LIMITED_USERNAME
    });
    basicClient = await StdioMcpClient.start("bitbucket", ["--exposure-tier=max"], {
      username: fixture.E2E_LIMITED_USERNAME,
      password: fixture.E2E_LIMITED_PASSWORD
    });
  }, 60_000);

  afterAll(async () => {
    if (patClient) await patClient.close();
    if (basicClient) await basicClient.close();
  });

  it("read-only PAT calling a write operation gets a structured 401/403 error", async () => {
    const denied = await patClient.callTool(
      "atlassian_execute_operation",
      {
        // Tag creation requires REPO_WRITE; the REPO_READ-scoped PAT is
        // rejected with 401 before the (empty) repository is even consulted.
        operationId: "bitbucket.repository.projects.repos.tags.create",
        path: {
          projectKey: fixture.E2E_LIMITED_PROJECT_KEY,
          repositorySlug: fixture.E2E_LIMITED_REPO_SLUG
        },
        body: { name: "v0.0.0-denied", startPoint: "refs/heads/master" }
      },
      { expectError: true }
    );
    expectErrorContract(
      denied,
      "bitbucket.repository.projects.repos.tags.create",
      "bitbucket",
      [401, 403]
    );
  });

  it("read-only PAT still reads within its scope (identity and token work)", async () => {
    const read = requireToolSuccess(
      await patClient.callTool("atlassian_execute_operation", {
        operationId: "bitbucket.repositories.get",
        path: {
          projectKey: fixture.E2E_LIMITED_PROJECT_KEY,
          repositorySlug: fixture.E2E_LIMITED_REPO_SLUG
        },
        responseProfile: "standard"
      })
    );
    expect(JSON.stringify(read.data)).toContain(fixture.E2E_LIMITED_REPO_SLUG);
  });

  it("cross-repository read without any grant gets a structured error", async () => {
    const denied = await basicClient.callTool(
      "atlassian_execute_operation",
      {
        operationId: "bitbucket.repositories.get",
        path: {
          projectKey: fixture.E2E_LIMITED_PROJECT_KEY,
          repositorySlug: fixture.E2E_LIMITED_HIDDEN_REPO_SLUG
        },
        responseProfile: "standard"
      },
      { expectError: true }
    );
    // Bitbucket hides repositories the user cannot see behind 404.
    expectErrorContract(denied, "bitbucket.repositories.get", "bitbucket", [401, 403, 404]);
  });
});
