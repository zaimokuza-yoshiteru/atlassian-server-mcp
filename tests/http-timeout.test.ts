import { describe, expect, it, vi } from "vitest";

vi.mock("undici", async (importOriginal) => {
  const actual = await importOriginal<typeof import("undici")>();
  return { ...actual, request: vi.fn() };
});

import { errors, request } from "undici";
import { AtlassianHttpClient } from "../src/http.js";
import type { RegisteredOperation } from "../src/types.js";

const jsonOperation: RegisteredOperation = {
  operationId: "jira.issue.get",
  product: "jira",
  summary: "Get an issue",
  method: "GET",
  path: "/rest/api/2/issue/ABC-1",
  responseKind: "json",
  tags: ["issue"],
  scope: "global",
  dataKind: "resource",
  destructive: false
};

function client(): AtlassianHttpClient {
  return new AtlassianHttpClient({
    product: "jira",
    baseUrl: new URL("http://127.0.0.1:1"),
    token: "token",
    tlsVerify: false
  });
}

describe("transport timeout propagation", () => {
  it("surfaces an undici headers timeout as a rejection, not a hang", async () => {
    vi.mocked(request).mockRejectedValueOnce(new errors.HeadersTimeoutError());
    const http = client();
    await expect(http.execute(jsonOperation, {})).rejects.toThrow(/timeout/i);
    await http.close();
  });

  it("surfaces an undici body timeout as a rejection, not a hang", async () => {
    vi.mocked(request).mockRejectedValueOnce(new errors.BodyTimeoutError());
    const http = client();
    await expect(http.execute(jsonOperation, {})).rejects.toThrow(/timeout/i);
    await http.close();
  });
});
