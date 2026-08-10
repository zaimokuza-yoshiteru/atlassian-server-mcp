import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Product } from "../../../src/types.js";

const execFileAsync = promisify(execFile);

function baseUrl(product: Product): string {
  const value = process.env[`${product.toUpperCase()}_URL`];
  if (!value) throw new Error(`${product.toUpperCase()}_URL is not configured`);
  return value;
}

function authorization(): string {
  const username = process.env.ATLASSIAN_ADMIN_USERNAME || process.env.ATLASSIAN_USERNAME;
  const password = process.env.ATLASSIAN_ADMIN_PASSWORD || process.env.ATLASSIAN_PASSWORD;
  if (!username || !password) throw new Error("Admin credentials are required for fixtures");
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

export async function fixtureRequest(
  product: Product,
  path: string,
  options: { method?: string; body?: unknown; query?: Record<string, string> } = {}
): Promise<{ status: number; data: any; text: string }> {
  const url = new URL(path, baseUrl(product));
  for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      // Fixture/bootstrap calls intentionally use the real admin user's Basic
      // identity. Bitbucket project/repository Bearer tokens are scoped to an
      // existing resource and cannot create the disposable parent project.
      authorization: authorization(),
      accept: "application/json",
      ...(options.body === undefined ? {} : { "content-type": "application/json" })
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }
  return { status: response.status, data, text };
}

export async function ensureFixture(
  result: Promise<{ status: number; text: string }>,
  allowed: number[]
): Promise<void> {
  const response = await result;
  if (!allowed.includes(response.status)) {
    throw new Error(
      `Fixture request failed with HTTP ${response.status}: ${response.text.slice(0, 500)}`
    );
  }
}

export async function pushBitbucketBranches(
  projectKey: string,
  repositorySlug: string,
  runId: string
): Promise<void> {
  const username = process.env.ATLASSIAN_ADMIN_USERNAME || process.env.ATLASSIAN_USERNAME;
  const password = process.env.ATLASSIAN_ADMIN_PASSWORD || process.env.ATLASSIAN_PASSWORD;
  if (!username || !password) throw new Error("Bitbucket Git fixture requires Basic credentials");
  const url = new URL(baseUrl("bitbucket"));
  url.username = username;
  url.password = password;
  url.pathname = `${url.pathname.replace(/\/$/, "")}/scm/${projectKey.toLowerCase()}/${repositorySlug}.git`;
  const directory = await mkdtemp(join(tmpdir(), "atlassian-mcp-e2e-"));
  const git = async (...args: string[]) =>
    execFileAsync("git", args, {
      cwd: directory,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }
    });
  try {
    await git("init", "-q", "-b", "main");
    await git("config", "user.name", "MCP E2E");
    await git("config", "user.email", "mcp-e2e@163.com");
    await writeFile(join(directory, "README.md"), `# MCP E2E ${runId}\n`);
    await writeFile(join(directory, "CONTRIBUTING.md"), `# Contributing\n\nE2E test ${runId}\n`);
    await git("add", "README.md", "CONTRIBUTING.md");
    await git("commit", "-q", "-m", "base");
    await git("remote", "add", "origin", url.toString());
    await git("push", "-q", "-u", "origin", "main");
    await git("checkout", "-q", "-b", `feature/${runId}`);
    await writeFile(join(directory, "change.txt"), `${runId}\n`);
    await git("add", "change.txt");
    await git("commit", "-q", "-m", `change ${runId}`);
    await git("push", "-q", "origin", `feature/${runId}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export function containsValue(value: unknown, expected: string): boolean {
  return JSON.stringify(value).includes(expected);
}

/** Read a field from either a normal response object or the server's stable
 * field-fragment projection used for non-paginated standard responses. */
export function projectedValue(value: unknown, path: string): unknown {
  if (value && typeof value === "object" && "$fragment" in value) {
    const fragments = (value as { $fragment?: unknown }).$fragment;
    if (Array.isArray(fragments)) {
      const fragment = fragments.find(
        (candidate) =>
          candidate &&
          typeof candidate === "object" &&
          (candidate as { path?: unknown }).path === `$.${path}`
      );
      return fragment && typeof fragment === "object"
        ? (fragment as { value?: unknown }).value
        : undefined;
    }
  }
  if (value && typeof value === "object" && path in value) {
    return (value as Record<string, unknown>)[path];
  }
  return undefined;
}

export function projectedValues(value: unknown, field: string): unknown[] {
  if (value && typeof value === "object" && "$fragment" in value) {
    const fragments = (value as { $fragment?: unknown }).$fragment;
    if (Array.isArray(fragments)) {
      return fragments.flatMap((fragment) => {
        if (!fragment || typeof fragment !== "object") return [];
        const path = (fragment as { path?: unknown }).path;
        return typeof path === "string" && (path === `$.${field}` || path.endsWith(`.${field}`))
          ? [(fragment as { value?: unknown }).value]
          : [];
      });
    }
  }
  const found: unknown[] = [];
  const visit = (current: unknown): void => {
    if (Array.isArray(current)) {
      for (const child of current) visit(child);
      return;
    }
    if (!current || typeof current !== "object") return;
    for (const [key, child] of Object.entries(current)) {
      if (key === field) found.push(child);
      else visit(child);
    }
  };
  visit(value);
  return found;
}

export function reviewerCredentials(product: Product): {
  token?: string;
  username?: string;
  password?: string;
} {
  const state = Object.fromEntries(
    readFileSync(resolveState(product), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
  const token = state[`E2E_REVIEWER_${product.toUpperCase()}_TOKEN`];
  return token
    ? { token, username: state.E2E_REVIEWER_USERNAME }
    : { username: state.E2E_REVIEWER_USERNAME, password: state.E2E_REVIEWER_PASSWORD };
}

export function adminBasicCredentials(): { username: string; password: string } {
  const username = process.env.ATLASSIAN_ADMIN_USERNAME || process.env.ATLASSIAN_USERNAME;
  const password = process.env.ATLASSIAN_ADMIN_PASSWORD || process.env.ATLASSIAN_PASSWORD;
  if (!username || !password) throw new Error("Admin Basic credentials are not configured");
  return { username, password };
}

// ── User group fixture (Bitbucket permissions / branch restrictions / reviewer-groups) ──

/**
 * Ensure a Bitbucket user group exists. Follows GET-before-create: if the
 * group already exists the create step is skipped.
 *
 * @remarks 未验证 — 由首个消费者批次 B6（权限与访问控制）负责验证。
 */
export async function ensureGroup(groupName: string): Promise<void> {
  const lookup = await fixtureRequest("bitbucket", "/rest/api/1.0/admin/groups", {
    query: { filter: groupName }
  });
  const exists =
    Array.isArray(lookup.data?.values) && lookup.data.values.some((g: any) => g.name === groupName);
  if (exists) return;

  await ensureFixture(
    fixtureRequest("bitbucket", "/rest/api/1.0/admin/groups", {
      method: "POST",
      body: { name: groupName }
    }),
    [201]
  );
}

/**
 * Add a user to a Bitbucket group. Idempotent — 409 (already a member) is
 * treated as success.
 *
 * @remarks 未验证 — 由首个消费者批次 B6（权限与访问控制）负责验证。
 */
export async function addUserToGroup(groupName: string, username: string): Promise<void> {
  await ensureFixture(
    fixtureRequest("bitbucket", "/rest/api/1.0/admin/groups/add-user", {
      method: "POST",
      body: { context: groupName, itemName: username }
    }),
    [200, 409]
  );
}

// ── Jira dashboard fixture (registry has no dashboard creation operation) ──

/**
 * Resolve a dashboard id + item id for item-properties operations.
 *
 * Jira DC REST API (as of 11.3.5) exposes no dashboard creation endpoint
 * (POST /rest/api/2/dashboard → 405) and no gadget listing endpoint
 * (GET …/items → 404). See the official reference:
 * https://docs.atlassian.com/software/jira/docs/api/REST/latest/#api/2/dashboard
 *
 * This resolver queries GET /rest/api/2/dashboard for the first available
 * dashboard. The itemId is the de facto convention for the system dashboard's
 * introduction gadget, which is the only gadget present after first setup.
 */
export async function resolveDashboard(): Promise<{ id: string; itemId: string }> {
  const response = await fixtureRequest("jira", "/rest/api/2/dashboard");
  if (![200].includes(response.status)) {
    throw new Error(
      `Dashboard list failed with HTTP ${response.status}: ${response.text.slice(0, 500)}`
    );
  }
  const dashboards = response.data?.dashboards;
  if (!Array.isArray(dashboards) || dashboards.length === 0) {
    throw new Error("No dashboards found in this Jira instance");
  }
  return { id: String(dashboards[0].id), itemId: "10000" };
}

// ── One-time user fixture (Confluence password operations) ──

/**
 * Create a disposable user with a random name for password-change testing.
 * Returns the username and password. Caller MUST delete the user in cleanup
 * via {@link deleteDisposableUser}.
 *
 * @remarks 未验证 — 由首个消费者批次 C3（附件收尾、订阅与用户）负责验证。
 */
export async function createDisposableUser(
  product: Product,
  runId: string
): Promise<{ username: string; password: string }> {
  const username = `e2e-pw-${runId}`;
  const password = `Temp-${runId}-${Math.random().toString(36).slice(2, 8)}!`;

  if (product === "confluence") {
    await ensureFixture(
      fixtureRequest("confluence", "/rest/api/admin/user", {
        method: "POST",
        body: {
          userName: username,
          fullName: `E2E Password Test ${runId}`,
          email: `e2e-pw-${runId}@example.com`,
          password,
          notifyViaEmail: false
        }
      }),
      [201]
    );
  } else {
    await ensureFixture(
      fixtureRequest(product, "/rest/api/2/user", {
        method: "POST",
        body: {
          name: username,
          password,
          emailAddress: `e2e-pw-${runId}@example.com`,
          displayName: `E2E Password Test ${runId}`
        }
      }),
      [201]
    );
  }
  return { username, password };
}

/**
 * Delete a disposable user created by {@link createDisposableUser}.
 */
export async function deleteDisposableUser(product: Product, username: string): Promise<void> {
  if (product === "confluence") {
    // DC 10.2.11: DELETE uses path param {username}, returns 202 (async long task).
    // Query-param form (?name=) returns 405.
    await ensureFixture(
      fixtureRequest("confluence", `/rest/api/admin/user/${encodeURIComponent(username)}`, {
        method: "DELETE"
      }),
      [200, 202, 204, 404]
    );
  } else {
    await ensureFixture(
      fixtureRequest(product, `/rest/api/2/user?username=${encodeURIComponent(username)}`, {
        method: "DELETE"
      }),
      [200, 204, 404]
    );
  }
}

function resolveState(product: Product): string {
  return join(process.cwd(), ".e2e-state", product, "reviewer.env");
}

// ── B7 low-privilege fixtures (created by scripts/dc-setup.mjs) ──

/**
 * Read the dc-setup low-privilege fixture state for a product. Fails
 * explicitly with setup instructions when the fixtures have never been
 * created, instead of silently using the wrong identity.
 */
export function limitedFixture(product: Product): Record<string, string> {
  const path = join(process.cwd(), ".e2e-state", product, "limited.env");
  if (!existsSync(path)) {
    throw new Error(
      `Low-privilege fixtures for ${product} are missing (${path}). Run \`pnpm dc:setup ${product}\` first.`
    );
  }
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}
