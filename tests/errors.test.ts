import { describe, expect, it } from "vitest";
import { AtlassianHttpError } from "../src/http.js";
import { safeErrorPayload } from "../src/service.js";

describe("tool-safe Atlassian errors", () => {
  it("preserves and normalizes Jira field validation details", () => {
    const payload = safeErrorPayload(
      new AtlassianHttpError(
        "jira",
        "jira.issue.create",
        400,
        "jira.issue.create failed with HTTP 400",
        {
          errorMessages: ["Validation failed"],
          errors: { summary: "Field is required" },
          token: "must-not-leak"
        }
      )
    );

    expect(payload).toEqual({
      error: expect.objectContaining({
        product: "jira",
        operationId: "jira.issue.create",
        status: 400,
        fieldErrors: [
          { field: "summary", message: "Field is required" },
          { message: "Validation failed" }
        ],
        details: expect.objectContaining({ token: "[REDACTED]" })
      })
    });
  });

  it("suppresses upstream 5xx implementation details", () => {
    const payload = safeErrorPayload(
      new AtlassianHttpError(
        "confluence",
        "confluence.content.create",
        500,
        "confluence.content.create failed with HTTP 500",
        "java.lang.RuntimeException: internal stack"
      )
    );

    expect(JSON.stringify(payload)).not.toContain("RuntimeException");
  });
});
