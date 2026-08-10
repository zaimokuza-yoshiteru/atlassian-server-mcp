import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { loadDcEnv, productUrls, request, selectedProducts } from "./dc-env.mjs";
import { sweepConfluenceContent } from "./lib/e2e-sweep.mjs";

loadDcEnv();
const products = selectedProducts(process.argv.slice(2));
if (products.length !== 1) throw new Error("Prepare exactly one product at a time");
const product = products[0];
const username = process.env.E2E_REVIEWER_USERNAME ?? "mcp-e2e-reviewer";
// Confluence validates this field as a real-looking mailbox. Keep a known
// accepted default for the disposable reviewer, while allowing enterprise
// instances to override it with E2E_REVIEWER_EMAIL.
const email = process.env.E2E_REVIEWER_EMAIL ?? "mcp-e2e@163.com";
const statePath = resolve(`.e2e-state/${product}/reviewer.env`);

function readState() {
  if (!existsSync(statePath)) return {};
  return Object.fromEntries(
    readFileSync(statePath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

const state = readState();
const password =
  process.env.E2E_REVIEWER_PASSWORD ??
  state.E2E_REVIEWER_PASSWORD ??
  `Mcp-${randomBytes(18).toString("base64url")}!`;
const token =
  process.env[`E2E_REVIEWER_${product.toUpperCase()}_TOKEN`] ??
  state[`E2E_REVIEWER_${product.toUpperCase()}_TOKEN`] ??
  "";
const baseUrl = productUrls()[product];

// Sweep residual fixtures from previous runs whose cleanup was interrupted.
const JOURNAL = process.env.E2E_CLEANUP_JOURNAL ?? resolve(".e2e-state/cleanup-journal.jsonl");
const ENDPOINTS = {
  "jira:issue": (id) => `/rest/api/2/issue/${id}`,
  "jira:project": (id) => `/rest/api/2/project/${id}`,
  "jira:component": (id) => `/rest/api/2/component/${id}`,
  "jira:filter": (id) => `/rest/api/2/filter/${id}`,
  "jira:attachment": (id) => `/rest/api/2/attachment/${id}`,
  "confluence:content": (id) => `/rest/api/content/${id}`,
  "confluence:space": (id) => `/rest/api/space/${id}`,
  "bitbucket:repo": (id) => `/rest/api/1.0/projects/${id.split("/")[0]}/repos/${id.split("/")[1]}`,
  "bitbucket:project": (id) => `/rest/api/1.0/projects/${id}`
  // version: skipped — Jira DC has no DELETE /rest/api/2/version/{id};
  // versions cascade-delete with their parent project.
};

function recordSweep(product, resource, id, status, cleanupEndpoint, error) {
  appendFileSync(
    JOURNAL,
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      product,
      resource,
      id,
      status,
      runId: "sweeper",
      cleanupEndpoint,
      ...(error ? { error: error instanceof Error ? error.message : String(error) } : {})
    })}\n`,
    { mode: 0o600 }
  );
}

async function sweepResiduals(product, baseUrl) {
  if (!existsSync(JOURNAL)) return;
  // Last status wins per (product, resource, id): a "cleaned" entry is final.
  const latest = new Map();
  for (const line of readFileSync(JOURNAL, "utf8").split("\n").filter(Boolean)) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.product !== product) continue;
    const key = `${entry.product}|${entry.resource}|${entry.id}`;
    latest.set(key, entry);
  }
  const toSweep = [...latest.values()].filter((e) => e.status !== "cleaned");
  if (toSweep.length === 0) return;
  process.stdout.write(`[e2e-prepare] ${product}: sweeping ${toSweep.length} residual(s)\n`);
  // Sort so repos are deleted before their parent projects (project
  // deletion returns 409 while repos still exist — no cascade in Bitbucket).
  const RESOURCE_ORDER = ["repo", "project"];
  toSweep.sort((a, b) => {
    const ai = RESOURCE_ORDER.indexOf(a.resource);
    const bi = RESOURCE_ORDER.indexOf(b.resource);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  let skippedWarned = false;
  for (const entry of toSweep) {
    const endpoint = ENDPOINTS[`${entry.product}:${entry.resource}`];
    if (!endpoint) {
      if (!skippedWarned) {
        process.stdout.write(
          `[e2e-prepare] ${product}: no sweep endpoint for resource "${entry.resource}" — skipped\n`
        );
        skippedWarned = true;
      }
      continue;
    }
    try {
      if (entry.product === "confluence" && entry.resource === "content") {
        await sweepConfluenceContent({
          id: entry.id,
          request: (path, options) =>
            request(baseUrl, path, { ...options, product, forceBasic: true }),
          recordCleaned: () =>
            recordSweep(
              entry.product,
              entry.resource,
              entry.id,
              "cleaned",
              `/rest/api/content/${entry.id}`
            )
        });
        continue;
      }
      const result = await request(baseUrl, endpoint(entry.id), {
        method: "DELETE",
        product,
        forceBasic: true
      });
      if (result.status === 404) {
        /* already gone — treat as cleaned */
      } else if (result.status >= 200 && result.status < 300) {
        /* deleted */
      } else {
        throw new Error(`HTTP ${result.status}: ${result.text.slice(0, 200)}`);
      }
      recordSweep(entry.product, entry.resource, entry.id, "cleaned", endpoint(entry.id));
    } catch (error) {
      recordSweep(
        entry.product,
        entry.resource,
        entry.id,
        "sweep-failed",
        endpoint(entry.id),
        error
      );
      process.stdout.write(
        `[e2e-prepare] WARNING: sweep of ${entry.resource} ${entry.id} failed (${error.message}) — continuing\n`
      );
    }
  }
}

await sweepResiduals(product, baseUrl);

const definitions = {
  jira: {
    lookup: ["/rest/api/2/user", { query: { username } }],
    create: [
      "/rest/api/2/user",
      {
        method: "POST",
        body: { name: username, password, emailAddress: email, displayName: "MCP E2E Reviewer" }
      }
    ],
    exists: [200],
    missing: [404],
    created: [201]
  },
  confluence: {
    lookup: ["/rest/api/user", { query: { username } }],
    create: [
      "/rest/api/admin/user",
      {
        method: "POST",
        body: {
          userName: username,
          fullName: "MCP E2E Reviewer",
          email,
          password,
          notifyViaEmail: false
        }
      }
    ],
    exists: [200],
    missing: [404],
    created: [201]
  },
  bitbucket: {
    lookup: ["/rest/api/1.0/users", { query: { filter: username } }],
    create: [
      "/rest/api/1.0/admin/users",
      {
        method: "POST",
        query: { name: username, password, displayName: "MCP E2E Reviewer", emailAddress: email }
      }
    ],
    exists: [200],
    missing: [],
    created: [204]
  }
};

const definition = definitions[product];
const forceBasic = product === "bitbucket";
const lookup = await request(baseUrl, definition.lookup[0], {
  ...definition.lookup[1],
  product,
  forceBasic
});
const bitbucketExists =
  product === "bitbucket" &&
  (lookup.data?.values ?? []).some((entry) => entry.name === username || entry.slug === username);
const exists =
  product === "bitbucket" ? bitbucketExists : definition.exists.includes(lookup.status);
if (!exists) {
  if (product !== "bitbucket" && !definition.missing.includes(lookup.status)) {
    throw new Error(
      `Reviewer lookup failed with HTTP ${lookup.status}: ${lookup.text.slice(0, 300)}`
    );
  }
  const created = await request(baseUrl, definition.create[0], {
    ...definition.create[1],
    product,
    forceBasic
  });
  if (!definition.created.includes(created.status)) {
    throw new Error(
      `Reviewer creation failed with HTTP ${created.status}: ${created.text.slice(0, 300)}`
    );
  }
  process.stdout.write(`[e2e-prepare] ${product}: created reviewer ${username}\n`);
} else {
  process.stdout.write(`[e2e-prepare] ${product}: reviewer ${username} already exists\n`);
  if (!state.E2E_REVIEWER_PASSWORD && !process.env.E2E_REVIEWER_PASSWORD && !token) {
    throw new Error(
      `Reviewer exists but its credential is unknown. Set E2E_REVIEWER_PASSWORD or E2E_REVIEWER_${product.toUpperCase()}_TOKEN once.`
    );
  }
}

mkdirSync(dirname(statePath), { recursive: true });
writeFileSync(
  statePath,
  [
    `E2E_REVIEWER_USERNAME=${username}`,
    `E2E_REVIEWER_EMAIL=${email}`,
    `E2E_REVIEWER_PASSWORD=${password}`,
    `E2E_REVIEWER_${product.toUpperCase()}_TOKEN=${token}`,
    `E2E_REVIEWER_AUTH_MODE=${token ? "token" : "basic"}`,
    ""
  ].join("\n"),
  { mode: 0o600 }
);
chmodSync(statePath, 0o600);
// C-B: ensure e2e-reviewers group exists for space-permissions.group.* tests.
if (product === "confluence") {
  const groupName = "e2e-reviewers";
  const groupResp = await request(baseUrl, `/rest/api/group/${groupName}`, {
    product,
    forceBasic: true
  });
  if (![200].includes(groupResp.status)) {
    const createResp = await request(baseUrl, "/rest/api/admin/group", {
      method: "POST",
      body: { type: "group", name: groupName },
      product,
      forceBasic: true
    });
    if (![200, 201, 409].includes(createResp.status)) {
      throw new Error(
        `e2e-reviewers group creation failed with HTTP ${createResp.status}: ${createResp.text.slice(0, 300)}`
      );
    }
    process.stdout.write(`[e2e-prepare] ${product}: created group ${groupName}\n`);
  } else {
    process.stdout.write(`[e2e-prepare] ${product}: group ${groupName} already exists\n`);
  }
  // Ensure reviewer is in the group
  const addResp = await request(baseUrl, `/rest/api/user/${username}/group/${groupName}`, {
    method: "PUT",
    product,
    forceBasic: true
  });
  if (![200, 204, 409].includes(addResp.status)) {
    throw new Error(
      `Add reviewer to ${groupName} failed with HTTP ${addResp.status}: ${addResp.text.slice(0, 300)}`
    );
  }
}
// B-0: ensure e2e-reviewers group exists for bitbucket permission-management
// and branch-permissions group restriction tests.
if (product === "bitbucket") {
  const groupName = "e2e-reviewers";
  const groupResp = await request(baseUrl, `/rest/api/1.0/admin/groups`, {
    query: { filter: groupName },
    product,
    forceBasic: true
  });
  const groupExists =
    Array.isArray(groupResp.data?.values) &&
    groupResp.data.values.some((g) => g.name === groupName);
  if (!groupExists) {
    const createResp = await request(baseUrl, `/rest/api/1.0/admin/groups`, {
      method: "POST",
      query: { name: groupName },
      product,
      forceBasic: true
    });
    if (![200, 201].includes(createResp.status)) {
      throw new Error(
        `e2e-reviewers group creation failed with HTTP ${createResp.status}: ${createResp.text.slice(0, 300)}`
      );
    }
    process.stdout.write(`[e2e-prepare] ${product}: created group ${groupName}\n`);
  } else {
    process.stdout.write(`[e2e-prepare] ${product}: group ${groupName} already exists\n`);
  }
  // Ensure reviewer is in the group
  const addResp = await request(baseUrl, `/rest/api/1.0/admin/groups/add-user`, {
    method: "POST",
    body: { context: groupName, itemName: username },
    product,
    forceBasic: true
  });
  if (![200].includes(addResp.status)) {
    throw new Error(
      `Add reviewer to ${groupName} failed with HTTP ${addResp.status}: ${addResp.text.slice(0, 300)}`
    );
  }
}
// Pre-flight: ensure at least one custom field with options exists for
// jira-metadata-sweep (customfieldoption.get / customfields.options.list).
if (product === "jira") {
  const fieldsResp = await request(baseUrl, "/rest/api/2/field", { product, forceBasic: true });
  if (![200].includes(fieldsResp.status)) {
    throw new Error(
      `Custom field lookup failed with HTTP ${fieldsResp.status}: ${fieldsResp.text.slice(0, 300)}`
    );
  }
  // Iterate option-type fields to find one with options > 0.
  const optionFields = (fieldsResp.data ?? []).filter((f) => f.schema?.type === "option");
  if (optionFields.length === 0) {
    throw new Error(
      "No select-list custom field found in this Jira instance. " +
        "Create one via Jira UI (Admin → Issues → Custom fields → Add → Select List). " +
        "See docs/en/test-strategy.md: 'Jira custom field options fixture'."
    );
  }
  let chosenField = null,
    chosenOpts = null;
  for (const f of optionFields) {
    const nid = f.id.replace(/^customfield_/, "");
    const r = await request(baseUrl, `/rest/api/2/customFields/${nid}/options`, {
      product,
      forceBasic: true
    });
    if (![200].includes(r.status)) continue;
    if ((r.data?.total ?? 0) > 0) {
      chosenField = f;
      chosenOpts = r.data;
      break;
    }
  }
  if (!chosenField) {
    process.stdout.write(
      `[e2e-prepare] ${product}: WARNING — no select-list custom field with options found. ` +
        "Create one via Jira UI (Admin → Issues → Custom fields → Add → Select List). " +
        "See docs/en/test-strategy.md: 'Jira custom field options fixture'.\n"
    );
    // Non-fatal: the E2E test's beforeAll discovery will also fail with a
    // helpful message. The pre-flight warning is an early signal.
  } else {
    const firstOptionId = chosenOpts.options?.[0]?.id;
    process.stdout.write(
      `[e2e-prepare] ${product}: custom field ${chosenField.id} (${chosenField.name}) ` +
        `has ${chosenOpts.total} options (first id: ${firstOptionId})\n`
    );
  }

  // Pre-flight: ensure at least two permission schemes exist for
  // jira-project-mutations (permissionscheme.update requires a different scheme).
  const schemesResp = await request(baseUrl, "/rest/api/2/permissionscheme", {
    product,
    forceBasic: true
  });
  if (![200].includes(schemesResp.status)) {
    throw new Error(
      `Permission scheme lookup failed with HTTP ${schemesResp.status}: ${schemesResp.text.slice(0, 300)}`
    );
  }
  const schemes = schemesResp.data?.permissionSchemes ?? schemesResp.data?.values ?? [];
  if (schemes.length < 2) {
    process.stdout.write(
      `[e2e-prepare] ${product}: only ${schemes.length} permission scheme(s) found, creating a second one\n`
    );
    const createResp = await request(baseUrl, "/rest/api/2/permissionscheme", {
      method: "POST",
      body: {
        name: "E2E Second Scheme",
        description: "Created by e2e-prepare for project-mutations permission scheme test"
      },
      product,
      forceBasic: true
    });
    if (![200, 201].includes(createResp.status)) {
      throw new Error(
        `Failed to create second permission scheme (HTTP ${createResp.status}): ${createResp.text.slice(0, 300)}`
      );
    }
    process.stdout.write(
      `[e2e-prepare] ${product}: created second permission scheme (id=${createResp.data?.id})\n`
    );
  } else {
    process.stdout.write(
      `[e2e-prepare] ${product}: ${schemes.length} permission schemes available (ids: ${schemes.map((s) => s.id).join(", ")})\n`
    );
  }
}

if (!token) {
  process.stdout.write(
    `[e2e-prepare] ${product}: PAT issuance is not exposed consistently by the tested product API; ` +
      `stored Basic fallback in ${statePath}. Set E2E_REVIEWER_${product.toUpperCase()}_TOKEN to prefer PAT.\n`
  );
}
