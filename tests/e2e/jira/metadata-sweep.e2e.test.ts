import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recordCleanup } from "../support/cleanup-journal.js";
import { StdioMcpClient, requireToolSuccess } from "../support/mcp-client.js";
import {
  containsValue,
  fixtureRequest,
  projectedValue,
  projectedValues
} from "../support/rest-fixture.js";

const active = process.env.E2E_PRODUCT === "jira" ? describe : describe.skip;

// ── jira-metadata-sweep (17 ops) ──
//
// A disposable custom select field is created in beforeAll so customfields.list
// has a known name for precise assertion.  Separately, a real custom field with
// options is discovered for customfieldoption.get and customfields.options.list.
// Jira DC REST does not support creating options for custom fields, so we
// discover an existing field's option IDs rather than creating our own.

active("jira-metadata-sweep", () => {
  const runId = randomUUID().slice(0, 8);
  const fieldName = `MCP E2E customfield ${runId}`;
  let client: StdioMcpClient;
  let fieldId: string;

  // Discovered option source — a real custom field with options.
  // customFieldId only accepts numeric IDs (customfield_ prefix returns 404).
  let discoveredFieldNumericId: string;
  let discoveredOptionId: string;

  beforeAll(async () => {
    client = await StdioMcpClient.start("jira", ["--exposure-tier=max"]);

    // ── Create a disposable custom select field for customfields.list ──
    const createdField = await fixtureRequest("jira", "/rest/api/2/field", {
      method: "POST",
      body: {
        name: fieldName,
        description: "Disposable E2E custom field for metadata sweep",
        type: "com.atlassian.jira.plugin.system.customfieldtypes:select"
      }
    });
    if (![200, 201].includes(createdField.status)) {
      throw new Error(
        `Custom field creation failed with HTTP ${createdField.status}: ${createdField.text.slice(0, 500)}`
      );
    }
    fieldId = String(createdField.data?.id);
    if (!fieldId) throw new Error("Custom field creation returned no id");
    recordCleanup("jira", "custom-field", fieldId, "created");

    // ── Discover a real custom field with options ──
    {
      const fieldsResp = await fixtureRequest("jira", "/rest/api/2/field");
      if (![200].includes(fieldsResp.status)) {
        throw new Error(`Field list failed: HTTP ${fieldsResp.status}`);
      }
      const optionFields = (fieldsResp.data ?? []).filter((f: any) => f.schema?.type === "option");
      if (optionFields.length === 0) {
        throw new Error(
          "No select-list custom field found in this Jira instance. " +
            "See docs/en/test-strategy.md: 'Jira custom field options fixture'."
        );
      }
      // Iterate to find the first field with options > 0.
      let chosen: any = null,
        chosenOpts: any = null;
      for (const f of optionFields) {
        const nid = f.id.replace(/^customfield_/, "");
        const r = await fixtureRequest("jira", `/rest/api/2/customFields/${nid}/options`);
        if (![200].includes(r.status)) continue;
        if ((r.data?.total ?? 0) > 0) {
          chosen = f;
          chosenOpts = r.data;
          break;
        }
      }
      if (!chosen) {
        throw new Error(
          "No select-list custom field with options found in this Jira instance. " +
            "See docs/en/test-strategy.md: 'Jira custom field options fixture'."
        );
      }
      discoveredFieldNumericId = chosen.id.replace(/^customfield_/, "");
      discoveredOptionId = String(chosenOpts.options[0].id);
    }
  }, 60_000);

  afterAll(async () => {
    // Custom fields are deleted via the bulk endpoint
    // DELETE /rest/api/2/customFields?ids={id} (Jira 11.3+).
    if (fieldId) {
      try {
        const deleted = await fixtureRequest("jira", "/rest/api/2/customFields", {
          method: "DELETE",
          query: { ids: fieldId }
        });
        if ([200, 204].includes(deleted.status)) {
          recordCleanup("jira", "custom-field", fieldId, "cleaned");
        } else {
          throw new Error(`Custom field bulk delete returned HTTP ${deleted.status}`);
        }
      } catch (error) {
        recordCleanup("jira", "custom-field", fieldId, "cleanup-failed", { error: error });
        throw error;
      }
    }
    if (client) await client.close();
  });

  // ── it 1: priority metadata (3 ops) ──

  it("scans priority metadata", async () => {
    // list
    const list = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.priority.list"
      })
    );
    const priorityIds = projectedValues(list.data, "id") as string[];
    expect(priorityIds.length, JSON.stringify(list)).toBeGreaterThan(0);

    // get — id from list, never hardcoded
    const get = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.priority.get",
        path: { id: priorityIds[0]! }
      })
    );
    expect(typeof projectedValue(get.data, "id"), JSON.stringify(get)).toBe("string");
    expect(typeof projectedValue(get.data, "name"), JSON.stringify(get)).toBe("string");

    // page.list — paginated variant. Compact profile with mode "items"
    // returns the data as a direct array, not wrapped in { values: [...] }.
    const page = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.priority.page.list"
      })
    );
    expect(Array.isArray(page.data) && page.data.length > 0, JSON.stringify(page)).toBe(true);
  });

  // ── it 2: status metadata (4 ops) ──

  it("scans status metadata", async () => {
    // status.list
    const statusList = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.status.list"
      })
    );
    const statusIds = projectedValues(statusList.data, "id") as string[];
    expect(statusIds.length, JSON.stringify(statusList)).toBeGreaterThan(0);

    // status.get — idOrName from list
    const statusGet = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.status.get",
        path: { idOrName: statusIds[0]! }
      })
    );
    expect(typeof projectedValue(statusGet.data, "id"), JSON.stringify(statusGet)).toBe("string");
    expect(typeof projectedValue(statusGet.data, "name"), JSON.stringify(statusGet)).toBe("string");

    // statuscategory.list
    const catList = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.status-category.statuscategory.list"
      })
    );
    const catIds = projectedValues(catList.data, "id") as string[];
    expect(catIds.length, JSON.stringify(catList)).toBeGreaterThan(0);

    // statuscategory.get — idOrKey from list
    const catGet = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.status-category.statuscategory.get",
        path: { idOrKey: catIds[0]! }
      })
    );
    const catGetId = projectedValue(catGet.data, "id");
    expect(catGetId !== undefined, JSON.stringify(catGet)).toBe(true);
  });

  // ── it 3: resolution metadata (2 ops) ──

  it("scans resolution metadata", async () => {
    const list = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.resolution.list"
      })
    );
    const ids = projectedValues(list.data, "id") as string[];
    expect(ids.length, JSON.stringify(list)).toBeGreaterThan(0);

    const get = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.resolution.get",
        path: { id: ids[0]! }
      })
    );
    expect(typeof projectedValue(get.data, "id"), JSON.stringify(get)).toBe("string");
    expect(typeof projectedValue(get.data, "name"), JSON.stringify(get)).toBe("string");
  });

  // ── it 4: issue type metadata (3 ops) ──

  it("scans issue type metadata", async () => {
    const list = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue-type.issuetype.list"
      })
    );
    const ids = projectedValues(list.data, "id") as string[];
    expect(ids.length, JSON.stringify(list)).toBeGreaterThan(0);

    // get — id from list
    const get = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.issue-type.issuetype.get",
        path: { id: ids[0]! }
      })
    );
    expect(typeof projectedValue(get.data, "id"), JSON.stringify(get)).toBe("string");
    expect(typeof projectedValue(get.data, "name"), JSON.stringify(get)).toBe("string");
  });

  // ── it 5: field & attachment metadata (3 ops) ──
  // Depends on the custom field created in beforeAll.

  it("scans field and attachment metadata", async () => {
    // fields.list
    const fields = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.fields.list"
      })
    );
    const fieldIds = projectedValues(fields.data, "id") as string[];
    expect(fieldIds.length, JSON.stringify(fields)).toBeGreaterThan(0);

    // customfields.list — must contain the field we created, match by name.
    const cf = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.custom-fields.customfields.list",
        responseProfile: "standard"
      })
    );
    expect(containsValue(cf.data, fieldName), JSON.stringify(cf.data).slice(0, 500)).toBe(true);

    // attachment.meta.list — vanilla instance has attachments enabled by default
    const meta = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.attachment.meta.list",
        responseProfile: "standard"
      })
    );
    expect(projectedValue(meta.data, "enabled"), JSON.stringify(meta)).toBe(true);
  });

  // ── it 6: customfieldoption.get (1 op) ──
  // Uses the option ID discovered in beforeAll (from a real custom field with
  // options), not a hardcoded value.

  it("reads custom field option", async () => {
    // Use standard profile: compact omits $.value in omittedPaths.
    const opt = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.custom-field-option.customfieldoption.get",
        path: { id: discoveredOptionId },
        responseProfile: "standard"
      })
    );
    // A custom field option must have an id and a value.
    const optId = projectedValue(opt.data, "id");
    // Jira returns the id as a number; the operation accepts a string path param.
    expect(String(optId), JSON.stringify(opt)).toBe(discoveredOptionId);
    expect(typeof projectedValue(opt.data, "value"), JSON.stringify(opt)).toBe("string");
  });

  // ── it 7: customfields.options.list (1 op) ──
  // Numeric ID only — customfield_ prefix returns 404. Page-based pagination
  // (not jiraPage), so no cursor/nextCursor in the response.

  it("lists custom field options", async () => {
    const opts = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.custom-fields.customfields.options.list",
        path: { customFieldId: discoveredFieldNumericId },
        responseProfile: "standard"
      })
    );
    const total = projectedValue(opts.data, "total");
    expect(typeof total, JSON.stringify(opts)).toBe("number");
    expect(total as number, JSON.stringify(opts)).toBeGreaterThanOrEqual(1);
    const optIds = projectedValues(opts.data, "id");
    expect(optIds.length, JSON.stringify(opts)).toBeGreaterThan(0);
    // Cross-validation: options.list must include the same option ID that
    // customfieldoption.get resolved in it 6.
    expect(optIds.map(String), JSON.stringify(opts)).toContain(discoveredOptionId);
  });

  // C2: jira.server.info (1 op) — GET /rest/api/2/serverInfo
  it("reports server info", async () => {
    const info = requireToolSuccess(
      await client.callTool("atlassian_execute_operation", {
        operationId: "jira.server.info",
        responseProfile: "standard"
      })
    );
    const version = projectedValue(info.data, "version");
    expect(typeof version, JSON.stringify(info)).toBe("string");
    expect(String(version).length, JSON.stringify(info)).toBeGreaterThan(0);
    expect(projectedValue(info.data, "serverTitle"), JSON.stringify(info)).toBeTruthy();
  });
});
