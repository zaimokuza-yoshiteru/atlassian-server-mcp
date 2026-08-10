// Waits for the local Data Center containers to become ready and re-applies
// the Atlassian timebomb test licenses (they expire after 3 hours, so run
// this before every local real-product E2E session).
//
// License keys are the public 10-user Data Center evaluation keys from
// https://developer.atlassian.com/platform/marketplace/timebomb-licenses-for-testing-server-apps/
//
// The first-time setup wizard (accept terms, paste license, create the admin
// account) must still be done once per volume in the browser — see README.

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { applyLicense, loadDcEnv, productUrls, request, selectedProducts } from "./dc-env.mjs";

loadDcEnv();

const READY_TIMEOUT_MS = 10 * 60 * 1000;
const READY_INTERVAL_MS = 5_000;

async function waitReady(product, baseUrl) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  process.stdout.write(`[dc-setup] waiting for ${product} at ${baseUrl} ...\n`);
  for (;;) {
    try {
      const response = await fetch(`${baseUrl}/status`);
      if (response.ok) {
        process.stdout.write(`[dc-setup] ${product} is ready\n`);
        return;
      }
    } catch {
      // container not listening yet
    }
    if (Date.now() > deadline) {
      throw new Error(
        `${product} did not become ready within 10 minutes at ${baseUrl}.\n` +
          "Hint: check `docker compose ps` and container logs; first boot of " +
          "a Data Center image can take several minutes."
      );
    }
    await new Promise((resolve) => setTimeout(resolve, READY_INTERVAL_MS));
  }
}

// ── Jira Agile shared fixtures ──
// Creates a persistent scrum test-bed for the agile E2E scenario: a project,
// a JQL filter, a scrum board on that filter, one epic and one backlog issue.
// Unlike per-run scenario fixtures these are shared and deliberately NOT
// recorded in the cleanup journal — the sweeper must not delete them.
// Ids are written to .e2e-state/jira/agile.env; re-runs reuse them when the
// board still exists, so the fixture is idempotent.

const AGILE_STATE = resolve(".e2e-state/jira/agile.env");
const AGILE_PROJECT_KEY = "E2EAGILE";

function readEnvFile(path) {
  if (!existsSync(path)) return {};
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

async function ensureAgileFixtures(baseUrl) {
  const state = readEnvFile(AGILE_STATE);
  if (state.E2E_AGILE_BOARD_ID) {
    const board = await request(baseUrl, `/rest/agile/1.0/board/${state.E2E_AGILE_BOARD_ID}`, {
      product: "jira"
    });
    if (board.status === 200) {
      process.stdout.write(
        `[dc-setup] jira: agile fixtures already present (board ${state.E2E_AGILE_BOARD_ID})\n`
      );
      return;
    }
    process.stdout.write("[dc-setup] jira: stored agile board is gone — recreating fixtures\n");
  }

  const lead = process.env.ATLASSIAN_ADMIN_USERNAME || process.env.ATLASSIAN_USERNAME;
  if (!lead) {
    throw new Error("Agile fixture setup needs ATLASSIAN_ADMIN_USERNAME (project lead) in .env.dc");
  }

  // Project (400 = key already exists — reuse it). projectTemplateKey is
  // required: a bare REST-created project gets a minimal issue-type scheme
  // (Task/Sub-task only), so Epic and Story creation would fail. The scrum
  // template assigns the full software scheme.
  const project = await request(baseUrl, "/rest/api/2/project", {
    method: "POST",
    product: "jira",
    body: {
      key: AGILE_PROJECT_KEY,
      name: "E2E Agile Fixture",
      projectTypeKey: "software",
      projectTemplateKey: "com.pyxis.greenhopper.jira:gh-scrum-template",
      lead
    }
  });
  if (![201, 400].includes(project.status)) {
    throw new Error(
      `Agile fixture project creation failed (HTTP ${project.status}): ${project.text.slice(0, 300)}`
    );
  }
  // A reused project must carry the full software issue-type scheme.
  const projectCheck = await request(baseUrl, `/rest/api/2/project/${AGILE_PROJECT_KEY}`, {
    product: "jira"
  });
  const issueTypeNames = (projectCheck.data?.issueTypes ?? []).map((t) => t.name);
  if (!issueTypeNames.includes("Epic") || !issueTypeNames.includes("Story")) {
    throw new Error(
      `Agile fixture project ${AGILE_PROJECT_KEY} exists but lacks Epic/Story issue types ` +
        `(has: ${issueTypeNames.join(", ") || "none"}). It was created without the scrum ` +
        "template; delete it in the Jira UI (or DELETE /rest/api/2/project/" +
        `${AGILE_PROJECT_KEY} as admin) and re-run dc:setup.`
    );
  }

  // JQL filter backing the scrum board.
  const filter = await request(baseUrl, "/rest/api/2/filter", {
    method: "POST",
    product: "jira",
    body: {
      name: "E2E Agile Fixture Filter",
      jql: `project = ${AGILE_PROJECT_KEY} ORDER BY Rank ASC`,
      favourite: false
    }
  });
  const filterId = filter.data?.id;
  if (!filterId) {
    // Note: GET /rest/api/2/filter/search does not exist on the 11.3.5
    // baseline (404), so a name collision from a previous half-failed run
    // cannot be resolved automatically.
    throw new Error(
      `Agile fixture filter creation failed (HTTP ${filter.status}): ${filter.text.slice(0, 300)}\n` +
        'Hint: a leftover filter named "E2E Agile Fixture Filter" from a half-failed ' +
        "run blocks re-creation and filter/search is unavailable on this baseline — " +
        "delete it (DELETE /rest/api/2/filter/{id} as admin) and re-run."
    );
  }

  // Scrum board on that filter.
  const board = await request(baseUrl, "/rest/agile/1.0/board", {
    method: "POST",
    product: "jira",
    body: { name: "E2E Agile Fixture Board", type: "scrum", filterId }
  });
  const boardId = board.data?.id;
  if (!boardId) {
    throw new Error(
      `Agile fixture board creation failed (HTTP ${board.status}): ${board.text.slice(0, 300)}\n` +
        "Hint: agile fixtures require Jira Software with the jira-software license applied."
    );
  }

  // Epic. The "Epic Name" custom field id varies by instance, so create with
  // summary only first and retry with the discovered field on a 400.
  const epicBody = (extraFields) => ({
    fields: {
      project: { key: AGILE_PROJECT_KEY },
      summary: "E2E Agile Fixture Epic",
      issuetype: { name: "Epic" },
      ...extraFields
    }
  });
  let epic = await request(baseUrl, "/rest/api/2/issue", {
    method: "POST",
    product: "jira",
    body: epicBody({})
  });
  if (epic.status === 400) {
    const fields = await request(baseUrl, "/rest/api/2/field", { product: "jira" });
    const epicNameField = (fields.data ?? []).find((field) => field.name === "Epic Name");
    if (epicNameField) {
      epic = await request(baseUrl, "/rest/api/2/issue", {
        method: "POST",
        product: "jira",
        body: epicBody({ [epicNameField.id]: "E2E Agile Fixture Epic" })
      });
    }
  }
  const epicKey = epic.data?.key;
  if (!epicKey) {
    throw new Error(
      `Agile fixture epic creation failed (HTTP ${epic.status}): ${epic.text.slice(0, 300)}`
    );
  }

  // Backlog issue (new scrum-board issues start in the backlog).
  const story = await request(baseUrl, "/rest/api/2/issue", {
    method: "POST",
    product: "jira",
    body: {
      fields: {
        project: { key: AGILE_PROJECT_KEY },
        summary: "E2E Agile Fixture backlog issue",
        issuetype: { name: "Story" }
      }
    }
  });
  const storyKey = story.data?.key;
  if (!storyKey) {
    throw new Error(
      `Agile fixture backlog issue creation failed (HTTP ${story.status}): ${story.text.slice(0, 300)}`
    );
  }

  mkdirSync(dirname(AGILE_STATE), { recursive: true });
  writeFileSync(
    AGILE_STATE,
    [
      `E2E_AGILE_PROJECT_KEY=${AGILE_PROJECT_KEY}`,
      `E2E_AGILE_FILTER_ID=${filterId}`,
      `E2E_AGILE_BOARD_ID=${boardId}`,
      `E2E_AGILE_EPIC_KEY=${epicKey}`,
      `E2E_AGILE_BACKLOG_ISSUE_KEY=${storyKey}`,
      ""
    ].join("\n"),
    { mode: 0o600 }
  );
  process.stdout.write(
    `[dc-setup] jira: agile fixtures ready (board ${boardId}, epic ${epicKey}, backlog ${storyKey})\n`
  );
}

// ── Low-privilege fixture users ──
// A least-privilege user per product plus a restricted container (Jira
// project, Confluence space, Bitbucket repository) the user cannot access.
// The tests/e2e/permissions scenarios use these to verify the server's
// structured error contract on Atlassian 401/403/404 denial paths, so the
// fixtures deliberately grant the limited user as little as possible:
// product access only, plus (Bitbucket) one read-only PAT and a single
// REPO_WRITE grant so the PAT denial is purely scope-driven.
// Credentials and fixture ids are written to
// .e2e-state/<product>/limited.env (mode 0600) and reused on re-runs — like
// the agile fixtures they are shared and deliberately NOT recorded in the
// cleanup journal, so the sweeper must not delete them.

const LIMITED_USERNAME = process.env.E2E_LIMITED_USERNAME ?? "mcp-e2e-limited";
const LIMITED_EMAIL = process.env.E2E_LIMITED_EMAIL ?? "mcp-e2e-limited@163.com";
const LIMITED_PROJECT_KEY = "E2EPRIV";
const LIMITED_BITBUCKET_REPO = "restricted";
const LIMITED_BITBUCKET_HIDDEN_REPO = "hidden";
const LIMITED_PAT_NAME = "mcp-e2e-readonly";

function limitedStatePath(product) {
  return resolve(`.e2e-state/${product}/limited.env`);
}

function writeLimitedState(product, entries) {
  const path = limitedStatePath(product);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, entries.map(([key, value]) => `${key}=${value}`).join("\n") + "\n", {
    mode: 0o600
  });
}

function limitedPassword(state) {
  return (
    process.env.E2E_LIMITED_PASSWORD ??
    state.E2E_LIMITED_PASSWORD ??
    `Mcp-${randomBytes(18).toString("base64url")}!`
  );
}

function assertKnownCredential(state) {
  if (!state.E2E_LIMITED_PASSWORD && !process.env.E2E_LIMITED_PASSWORD) {
    throw new Error(
      `Limited user ${LIMITED_USERNAME} already exists but its credential is unknown. ` +
        "Set E2E_LIMITED_PASSWORD once (the password the user was created with), or delete the user in the product UI and re-run."
    );
  }
}

async function ensureJiraLimitedFixtures(baseUrl) {
  const state = readEnvFile(limitedStatePath("jira"));
  const password = limitedPassword(state);

  // User. Product access comes from Jira's default group assignment; the
  // restricted project below is what the user must NOT be able to see.
  const lookup = await request(baseUrl, "/rest/api/2/user", {
    product: "jira",
    forceBasic: true,
    query: { username: LIMITED_USERNAME }
  });
  if (lookup.status === 404) {
    const created = await request(baseUrl, "/rest/api/2/user", {
      method: "POST",
      product: "jira",
      forceBasic: true,
      body: {
        name: LIMITED_USERNAME,
        password,
        emailAddress: LIMITED_EMAIL,
        displayName: "MCP E2E Limited"
      }
    });
    if (created.status !== 201) {
      throw new Error(
        `Jira limited user creation failed (HTTP ${created.status}): ${created.text.slice(0, 300)}`
      );
    }
    process.stdout.write(`[dc-setup] jira: created limited user ${LIMITED_USERNAME}\n`);
  } else if (lookup.status === 200) {
    assertKnownCredential(state);
    process.stdout.write(`[dc-setup] jira: limited user ${LIMITED_USERNAME} already exists\n`);
  } else {
    throw new Error(
      `Jira limited user lookup failed (HTTP ${lookup.status}): ${lookup.text.slice(0, 300)}`
    );
  }

  // Restricted permission scheme: only jira-administrators can browse,
  // create, and be assigned in a project that uses it. A completely
  // grant-less scheme locks even admins out (createmeta then rejects every
  // field with "cannot be set", and the default assignee is invalid).
  const schemes = await request(baseUrl, "/rest/api/2/permissionscheme", {
    product: "jira",
    forceBasic: true
  });
  let scheme = (schemes.data?.permissionSchemes ?? []).find(
    (entry) => entry.name === "E2E Restricted Scheme"
  );
  if (!scheme) {
    const created = await request(baseUrl, "/rest/api/2/permissionscheme", {
      method: "POST",
      product: "jira",
      forceBasic: true,
      body: {
        name: "E2E Restricted Scheme",
        description: "Admin-only scheme for the low-privilege E2E fixtures"
      }
    });
    if (![200, 201].includes(created.status) || !created.data?.id) {
      throw new Error(
        `Jira restricted scheme creation failed (HTTP ${created.status}): ${created.text.slice(0, 300)}`
      );
    }
    scheme = created.data;
  }
  // Idempotent grants: re-POSTing an existing grant fails with 400, so list
  // first and add only the missing permissions.
  const grants = await request(baseUrl, `/rest/api/2/permissionscheme/${scheme.id}/permission`, {
    product: "jira",
    forceBasic: true
  });
  const granted = new Set(
    (grants.data?.permissions ?? [])
      .filter((g) => g.holder?.type === "group" && g.holder?.parameter === "jira-administrators")
      .map((g) => g.permission)
  );
  for (const permission of ["BROWSE_PROJECTS", "CREATE_ISSUES", "ASSIGNABLE_USER"]) {
    if (granted.has(permission)) continue;
    const grant = await request(baseUrl, `/rest/api/2/permissionscheme/${scheme.id}/permission`, {
      method: "POST",
      product: "jira",
      forceBasic: true,
      body: {
        holder: { type: "group", parameter: "jira-administrators" },
        permission
      }
    });
    if (![200, 201].includes(grant.status)) {
      throw new Error(
        `Jira restricted scheme grant ${permission} failed (HTTP ${grant.status}): ${grant.text.slice(0, 300)}`
      );
    }
  }

  // Restricted project on that scheme.
  const project = await request(baseUrl, `/rest/api/2/project/${LIMITED_PROJECT_KEY}`, {
    product: "jira",
    forceBasic: true
  });
  if (project.status === 404) {
    const lead = process.env.ATLASSIAN_ADMIN_USERNAME || process.env.ATLASSIAN_USERNAME;
    if (!lead) {
      throw new Error("Jira restricted project needs ATLASSIAN_ADMIN_USERNAME (lead) in .env.dc");
    }
    const created = await request(baseUrl, "/rest/api/2/project", {
      method: "POST",
      product: "jira",
      forceBasic: true,
      body: {
        key: LIMITED_PROJECT_KEY,
        name: "E2E Restricted Fixture",
        projectTypeKey: "software",
        lead,
        permissionScheme: Number(scheme.id)
      }
    });
    if (![200, 201].includes(created.status)) {
      throw new Error(
        `Jira restricted project creation failed (HTTP ${created.status}): ${created.text.slice(0, 300)}`
      );
    }
  } else if (project.status !== 200) {
    throw new Error(
      `Jira restricted project lookup failed (HTTP ${project.status}): ${project.text.slice(0, 300)}`
    );
  }

  // One issue as the read-denial target (created by admin, who bypasses the
  // grant-less scheme).
  let issueKey = state.E2E_LIMITED_ISSUE_KEY;
  if (issueKey) {
    const issue = await request(baseUrl, `/rest/api/2/issue/${issueKey}`, {
      product: "jira",
      forceBasic: true
    });
    if (issue.status !== 200) issueKey = "";
  }
  if (!issueKey) {
    const created = await request(baseUrl, "/rest/api/2/issue", {
      method: "POST",
      product: "jira",
      forceBasic: true,
      body: {
        fields: {
          project: { key: LIMITED_PROJECT_KEY },
          summary: "E2E restricted fixture issue",
          issuetype: { name: "Task" }
        }
      }
    });
    issueKey = created.data?.key;
    if (!issueKey) {
      throw new Error(
        `Jira restricted issue creation failed (HTTP ${created.status}): ${created.text.slice(0, 300)}`
      );
    }
  }

  writeLimitedState("jira", [
    ["E2E_LIMITED_USERNAME", LIMITED_USERNAME],
    ["E2E_LIMITED_PASSWORD", password],
    ["E2E_LIMITED_PROJECT_KEY", LIMITED_PROJECT_KEY],
    ["E2E_LIMITED_ISSUE_KEY", issueKey]
  ]);
  process.stdout.write(
    `[dc-setup] jira: low-privilege fixtures ready (user ${LIMITED_USERNAME}, project ${LIMITED_PROJECT_KEY}, issue ${issueKey})\n`
  );
}

async function ensureConfluenceLimitedFixtures(baseUrl) {
  const state = readEnvFile(limitedStatePath("confluence"));
  const password = limitedPassword(state);

  // User. Confluence admin-created users land in confluence-users, which has
  // default space permissions — the private space below is what the user
  // must NOT be able to see.
  const lookup = await request(baseUrl, "/rest/api/user", {
    product: "confluence",
    forceBasic: true,
    query: { username: LIMITED_USERNAME }
  });
  if (lookup.status === 404) {
    const created = await request(baseUrl, "/rest/api/admin/user", {
      method: "POST",
      product: "confluence",
      forceBasic: true,
      body: {
        userName: LIMITED_USERNAME,
        fullName: "MCP E2E Limited",
        email: LIMITED_EMAIL,
        password,
        notifyViaEmail: false
      }
    });
    if (created.status !== 201) {
      throw new Error(
        `Confluence limited user creation failed (HTTP ${created.status}): ${created.text.slice(0, 300)}`
      );
    }
    process.stdout.write(`[dc-setup] confluence: created limited user ${LIMITED_USERNAME}\n`);
  } else if (lookup.status === 200) {
    assertKnownCredential(state);
    process.stdout.write(
      `[dc-setup] confluence: limited user ${LIMITED_USERNAME} already exists\n`
    );
  } else {
    throw new Error(
      `Confluence limited user lookup failed (HTTP ${lookup.status}): ${lookup.text.slice(0, 300)}`
    );
  }

  // Private space: only the creating admin has any permission in it.
  const space = await request(baseUrl, `/rest/api/space/${LIMITED_PROJECT_KEY}`, {
    product: "confluence",
    forceBasic: true
  });
  if (space.status === 404) {
    const created = await request(baseUrl, "/rest/api/space/_private", {
      method: "POST",
      product: "confluence",
      forceBasic: true,
      body: { key: LIMITED_PROJECT_KEY, name: "E2E Restricted Fixture" }
    });
    if (![200, 201].includes(created.status)) {
      throw new Error(
        `Confluence restricted space creation failed (HTTP ${created.status}): ${created.text.slice(0, 300)}`
      );
    }
  } else if (space.status !== 200) {
    throw new Error(
      `Confluence restricted space lookup failed (HTTP ${space.status}): ${space.text.slice(0, 300)}`
    );
  }

  // One page as the read-denial target.
  let pageId = state.E2E_LIMITED_PAGE_ID;
  if (pageId) {
    const page = await request(baseUrl, `/rest/api/content/${pageId}`, {
      product: "confluence",
      forceBasic: true
    });
    if (page.status !== 200) pageId = "";
  }
  if (!pageId) {
    const created = await request(baseUrl, "/rest/api/content", {
      method: "POST",
      product: "confluence",
      forceBasic: true,
      body: {
        type: "page",
        title: "E2E Restricted Fixture Page",
        space: { key: LIMITED_PROJECT_KEY },
        body: { storage: { value: "<p>restricted</p>", representation: "storage" } }
      }
    });
    pageId = created.data?.id;
    if (!pageId) {
      throw new Error(
        `Confluence restricted page creation failed (HTTP ${created.status}): ${created.text.slice(0, 300)}`
      );
    }
  }

  writeLimitedState("confluence", [
    ["E2E_LIMITED_USERNAME", LIMITED_USERNAME],
    ["E2E_LIMITED_PASSWORD", password],
    ["E2E_LIMITED_SPACE_KEY", LIMITED_PROJECT_KEY],
    ["E2E_LIMITED_PAGE_ID", String(pageId)]
  ]);
  process.stdout.write(
    `[dc-setup] confluence: low-privilege fixtures ready (user ${LIMITED_USERNAME}, space ${LIMITED_PROJECT_KEY}, page ${pageId})\n`
  );
}

async function ensureBitbucketLimitedFixtures(baseUrl) {
  const state = readEnvFile(limitedStatePath("bitbucket"));
  const password = limitedPassword(state);

  // User. Bitbucket users have no implicit project/repository permissions.
  const lookup = await request(baseUrl, "/rest/api/1.0/users", {
    product: "bitbucket",
    forceBasic: true,
    query: { filter: LIMITED_USERNAME }
  });
  const exists = (lookup.data?.values ?? []).some(
    (entry) => entry.name === LIMITED_USERNAME || entry.slug === LIMITED_USERNAME
  );
  if (!exists) {
    const created = await request(baseUrl, "/rest/api/1.0/admin/users", {
      method: "POST",
      product: "bitbucket",
      forceBasic: true,
      query: {
        name: LIMITED_USERNAME,
        password,
        displayName: "MCP E2E Limited",
        emailAddress: LIMITED_EMAIL
      }
    });
    if (![200, 204].includes(created.status)) {
      throw new Error(
        `Bitbucket limited user creation failed (HTTP ${created.status}): ${created.text.slice(0, 300)}`
      );
    }
    process.stdout.write(`[dc-setup] bitbucket: created limited user ${LIMITED_USERNAME}\n`);
  } else {
    assertKnownCredential(state);
    process.stdout.write(`[dc-setup] bitbucket: limited user ${LIMITED_USERNAME} already exists\n`);
  }

  // Restricted project with two repositories: "restricted" (the limited user
  // gets REPO_WRITE so the read-only PAT denial is purely scope-driven) and
  // "hidden" (no grant at all — the cross-repository denial target).
  const project = await request(baseUrl, `/rest/api/1.0/projects/${LIMITED_PROJECT_KEY}`, {
    product: "bitbucket",
    forceBasic: true
  });
  if (project.status === 404) {
    const created = await request(baseUrl, "/rest/api/1.0/projects", {
      method: "POST",
      product: "bitbucket",
      forceBasic: true,
      body: { key: LIMITED_PROJECT_KEY, name: "E2E Restricted Fixture" }
    });
    if (![200, 201].includes(created.status)) {
      throw new Error(
        `Bitbucket restricted project creation failed (HTTP ${created.status}): ${created.text.slice(0, 300)}`
      );
    }
  } else if (project.status !== 200) {
    throw new Error(
      `Bitbucket restricted project lookup failed (HTTP ${project.status}): ${project.text.slice(0, 300)}`
    );
  }
  for (const slug of [LIMITED_BITBUCKET_REPO, LIMITED_BITBUCKET_HIDDEN_REPO]) {
    const repo = await request(
      baseUrl,
      `/rest/api/1.0/projects/${LIMITED_PROJECT_KEY}/repos/${slug}`,
      { product: "bitbucket", forceBasic: true }
    );
    if (repo.status === 404) {
      const created = await request(
        baseUrl,
        `/rest/api/1.0/projects/${LIMITED_PROJECT_KEY}/repos`,
        {
          method: "POST",
          product: "bitbucket",
          forceBasic: true,
          body: { name: slug, scmId: "git", forkable: false }
        }
      );
      if (![200, 201].includes(created.status)) {
        throw new Error(
          `Bitbucket restricted repo ${slug} creation failed (HTTP ${created.status}): ${created.text.slice(0, 300)}`
        );
      }
    } else if (repo.status !== 200) {
      throw new Error(
        `Bitbucket restricted repo ${slug} lookup failed (HTTP ${repo.status}): ${repo.text.slice(0, 300)}`
      );
    }
  }
  const grant = await request(
    baseUrl,
    `/rest/api/1.0/projects/${LIMITED_PROJECT_KEY}/repos/${LIMITED_BITBUCKET_REPO}/permissions/users`,
    {
      method: "PUT",
      product: "bitbucket",
      forceBasic: true,
      query: { name: LIMITED_USERNAME, permission: "REPO_WRITE" }
    }
  );
  if (![200, 204].includes(grant.status)) {
    throw new Error(
      `Bitbucket limited user REPO_WRITE grant failed (HTTP ${grant.status}): ${grant.text.slice(0, 300)}`
    );
  }

  // Read-only PAT for the limited user. Bitbucket refuses to issue a token
  // on behalf of another user (401 even for admins), so the token lifecycle
  // is authenticated as the limited user itself. Re-issued on every run:
  // list and delete any previous token with the same name, then create a
  // fresh one.
  const limitedAuth = `Basic ${Buffer.from(`${LIMITED_USERNAME}:${password}`).toString("base64")}`;
  const requestAsLimited = async (path, { method = "GET", body } = {}) => {
    const response = await fetch(new URL(path, baseUrl), {
      method,
      headers: {
        authorization: limitedAuth,
        accept: "application/json",
        ...(body !== undefined ? { "content-type": "application/json" } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = undefined;
    }
    return { status: response.status, data, text };
  };
  const tokens = await requestAsLimited(`/rest/access-tokens/latest/users/${LIMITED_USERNAME}`);
  if (tokens.status !== 200) {
    throw new Error(
      `Bitbucket limited user token listing failed (HTTP ${tokens.status}): ${tokens.text.slice(0, 300)}`
    );
  }
  for (const token of tokens.data?.values ?? []) {
    if (token.name === LIMITED_PAT_NAME) {
      await requestAsLimited(`/rest/access-tokens/latest/users/${LIMITED_USERNAME}/${token.id}`, {
        method: "DELETE"
      });
    }
  }
  const pat = await requestAsLimited(`/rest/access-tokens/latest/users/${LIMITED_USERNAME}`, {
    method: "PUT",
    body: { name: LIMITED_PAT_NAME, permissions: ["REPO_READ"] }
  });
  if (!pat.data?.token) {
    throw new Error(
      `Bitbucket limited user PAT issuance failed (HTTP ${pat.status}): ${pat.text.slice(0, 300)}`
    );
  }

  writeLimitedState("bitbucket", [
    ["E2E_LIMITED_USERNAME", LIMITED_USERNAME],
    ["E2E_LIMITED_PASSWORD", password],
    ["E2E_LIMITED_BITBUCKET_TOKEN", pat.data.token],
    ["E2E_LIMITED_PROJECT_KEY", LIMITED_PROJECT_KEY],
    ["E2E_LIMITED_REPO_SLUG", LIMITED_BITBUCKET_REPO],
    ["E2E_LIMITED_HIDDEN_REPO_SLUG", LIMITED_BITBUCKET_HIDDEN_REPO]
  ]);
  process.stdout.write(
    `[dc-setup] bitbucket: low-privilege fixtures ready (user ${LIMITED_USERNAME}, project ${LIMITED_PROJECT_KEY}, read-only PAT re-issued)\n`
  );
}

const urls = productUrls();
const products = selectedProducts(process.argv.slice(2));

try {
  for (const product of products) {
    await waitReady(product, urls[product]);
  }
  for (const product of products) {
    if (product === "confluence") continue;
    await applyLicense(product);
  }
  if (products.includes("jira")) {
    await ensureAgileFixtures(urls.jira);
    await ensureJiraLimitedFixtures(urls.jira);
  }
  if (products.includes("confluence")) {
    await ensureConfluenceLimitedFixtures(urls.confluence);
  }
  if (products.includes("bitbucket")) {
    await ensureBitbucketLimitedFixtures(urls.bitbucket);
  }
} catch (error) {
  process.stderr.write(`[dc-setup] ERROR: ${error?.message ?? error}\n`);
  process.exit(1);
}

// Confluence has no supported public REST endpoint for updating the host
// license, so refreshing it stays a manual step (non-blocking).
if (products.includes("confluence")) {
  process.stdout.write(
    "[dc-setup] confluence: no public license REST endpoint — if the license " +
      "has expired, refresh it manually:\n" +
      `  ${urls.confluence} -> gear icon -> General Configuration -> ` +
      "License Details -> paste the Confluence Data Center timebomb key from\n" +
      "  https://developer.atlassian.com/platform/marketplace/timebomb-licenses-for-testing-server-apps/\n"
  );
}

process.stdout.write("[dc-setup] done\n");
