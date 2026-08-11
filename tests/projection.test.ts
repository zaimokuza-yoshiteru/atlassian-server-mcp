import { describe, expect, it } from "vitest";
import { projectResponse } from "../src/projection.js";

describe("response projection", () => {
  it("omits Jira custom fields from compact responses", () => {
    const response = projectResponse(
      {
        id: "1",
        key: "ABC-1",
        fields: {
          summary: "Example",
          status: { id: "2", name: "Open" },
          customfield_10001: "large enterprise value"
        }
      },
      "jira",
      "compact"
    );

    expect(response.data).toEqual({
      id: "1",
      key: "ABC-1",
      fields: {
        summary: "Example",
        status: { id: "2", name: "Open" }
      }
    });
    expect(response.omittedPaths).toContain("$.fields.customfield_10001");
  });

  it("supports exact field selection", () => {
    const response = projectResponse(
      {
        id: "1",
        fields: {
          summary: "Example",
          customfield_10001: { value: "selected" }
        }
      },
      "jira",
      "compact",
      ["id", "fields.customfield_10001"]
    );
    expect(response.data).toEqual({
      id: "1",
      fields: { customfield_10001: { value: "selected" } }
    });
  });

  it("does not pollute the prototype chain for crafted field paths", () => {
    const data = JSON.parse(
      '{ "id": "1", "__proto__": { "x": 1 }, "constructor": { "prototype": { "y": 2 } } }'
    );
    const response = projectResponse(data, "jira", "compact", [
      "id",
      "__proto__.x",
      "constructor.prototype.y"
    ]);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
    expect(({} as Record<string, unknown>).y).toBeUndefined();
    expect(JSON.parse(JSON.stringify(response.data))).toEqual(
      JSON.parse(
        '{ "id": "1", "__proto__": { "x": 1 }, "constructor": { "prototype": { "y": 2 } } }'
      )
    );
  });
});
