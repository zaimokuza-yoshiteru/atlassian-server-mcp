import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Point the cleanup journal at a temp file so the intentional restore-failure
// test (line 46) does not write a false-positive cleanup-failed record into
// the shared .e2e-state/cleanup-journal.jsonl used by real E2E runs.
process.env.E2E_CLEANUP_JOURNAL = join(tmpdir(), "restore-state-test-cleanup.jsonl");

import { withRestoredState } from "./e2e/support/restore-state.js";

describe("withRestoredState", () => {
  it("reads original → runs mutate → restores original in finally", async () => {
    const calls: string[] = [];
    const original = { value: "before" };

    await withRestoredState(
      async () => {
        calls.push("read");
        return original;
      },
      async (saved) => {
        calls.push(`restore:${saved.value}`);
      },
      async () => {
        calls.push("mutate");
      }
    );

    expect(calls).toEqual(["read", "mutate", "restore:before"]);
  });

  it("restores even when mutate throws, then re-throws the mutate error", async () => {
    const calls: string[] = [];

    const promise = withRestoredState(
      async () => {
        calls.push("read");
        return { value: "before" };
      },
      async (saved) => {
        calls.push(`restore:${saved.value}`);
      },
      async () => {
        calls.push("mutate");
        throw new Error("mutate failed");
      }
    );

    await expect(promise).rejects.toThrow("mutate failed");
    expect(calls).toEqual(["read", "mutate", "restore:before"]);
  });

  it("re-throws when restore fails (environment is dirty)", async () => {
    const promise = withRestoredState(
      async () => ({ value: "before" }),
      async () => {
        throw new Error("restore failed");
      },
      async () => {}
    );

    await expect(promise).rejects.toThrow("restore failed");
  });

  it("restore receives the exact value returned by read", async () => {
    const original = { nested: { key: "val" }, arr: [1, 2, 3] };
    let restored: unknown;

    await withRestoredState(
      async () => original,
      async (saved) => {
        restored = saved;
      },
      async () => {}
    );

    expect(restored).toBe(original); // same reference
  });
});
