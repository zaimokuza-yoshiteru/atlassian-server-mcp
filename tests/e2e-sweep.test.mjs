import { describe, expect, it } from "vitest";
import { sweepConfluenceContent } from "../scripts/lib/e2e-sweep.mjs";

function fakeRequest(sequence) {
  const calls = [];
  return {
    calls,
    request: async (path, options) => {
      calls.push({ path, options });
      const next = sequence.shift();
      if (!next) throw new Error("unexpected request");
      if (next instanceof Error) throw next;
      return next;
    }
  };
}

describe("Confluence residual sweeper", () => {
  it.each([
    [
      "current",
      [
        { status: 200, data: { status: "current" } },
        { status: 204 },
        { status: 200, data: { status: "trashed" } },
        { status: 204 },
        { status: 404 }
      ]
    ],
    [
      "trashed",
      [
        { status: 200, data: { status: "trashed" } },
        { status: 200, data: { status: "trashed" } },
        { status: 204 },
        { status: 404 }
      ]
    ],
    ["missing", [{ status: 404 }]]
  ])("cleans %s content and journals only after 404", async (_name, sequence) => {
    const fake = fakeRequest(sequence);
    let cleaned = 0;
    await sweepConfluenceContent({
      id: "42",
      request: fake.request,
      recordCleaned: () => {
        cleaned += 1;
      }
    });
    expect(cleaned).toBe(1);
    expect(
      fake.calls
        .filter((call) => call.options.method === "DELETE")
        .every((call) => !call.path.includes("status=any"))
    ).toBe(true);
  });

  it.each([
    [{ status: 200, data: { status: "current" } }, { status: 409 }],
    [{ status: 200, data: { status: "trashed" } }, { status: 500 }]
  ])("does not journal failed delete/purge", async (...sequence) => {
    const fake = fakeRequest(sequence);
    let cleaned = 0;
    await expect(
      sweepConfluenceContent({
        id: "42",
        request: fake.request,
        recordCleaned: () => {
          cleaned += 1;
        }
      })
    ).rejects.toThrow();
    expect(cleaned).toBe(0);
  });

  it("polls through a delayed trash transition and accepts delete 404", async () => {
    const fake = fakeRequest([
      { status: 200, data: { status: "current" } },
      { status: 404 },
      { status: 200, data: { status: "current" } },
      { status: 200, data: { status: "trashed" } },
      { status: 404 },
      { status: 404 }
    ]);
    let cleaned = 0;
    await sweepConfluenceContent({
      id: "43",
      request: fake.request,
      maxPolls: 3,
      pollDelayMs: 0,
      recordCleaned: () => {
        cleaned += 1;
      }
    });
    expect(cleaned).toBe(1);
  });

  it("accepts purge 404 but requires final confirmation", async () => {
    const fake = fakeRequest([
      { status: 200, data: { status: "trashed" } },
      { status: 200, data: { status: "trashed" } },
      { status: 404 },
      { status: 404 }
    ]);
    let cleaned = 0;
    await sweepConfluenceContent({
      id: "44",
      request: fake.request,
      pollDelayMs: 0,
      recordCleaned: () => {
        cleaned += 1;
      }
    });
    expect(cleaned).toBe(1);
  });
});
