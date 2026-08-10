import { describe, expect, it } from "vitest";
import { allowsTier, tierFromArgs } from "../src/permissions.js";

describe("exposure tiers", () => {
  it("is read-only by default", () => {
    expect(tierFromArgs([])).toBe("read");
    expect(allowsTier("read", "safe")).toBe(false);
  });

  it("uses cumulative permission tiers", () => {
    expect(tierFromArgs(["--exposure-tier=safe"])).toBe("safe");
    expect(tierFromArgs(["--exposure-tier", "risky"])).toBe("risky");
    expect(tierFromArgs(["--exposure-tier=max"])).toBe("max");
    expect(allowsTier("max", "read")).toBe(true);
    expect(allowsTier("max", "safe")).toBe(true);
    expect(allowsTier("max", "risky")).toBe(true);
    expect(allowsTier("risky", "max")).toBe(false);
  });
});
