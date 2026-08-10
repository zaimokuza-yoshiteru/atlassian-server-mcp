import { describe, expect, it } from "vitest";
import { distTagForVersion } from "../scripts/lib/dist-tag.mjs";

describe("dist-tag policy", () => {
  it("maps stable versions to latest", () => {
    expect(distTagForVersion("1.0.0")).toBe("latest");
    expect(distTagForVersion("0.1.0")).toBe("latest");
    expect(distTagForVersion("10.20.30")).toBe("latest");
  });

  it("maps rc prereleases to rc", () => {
    expect(distTagForVersion("1.0.0-rc.1")).toBe("rc");
    expect(distTagForVersion("2.3.4-rc.10")).toBe("rc");
  });

  it("fails closed on any other prerelease suffix", () => {
    expect(() => distTagForVersion("1.0.0-alpha.1")).toThrow(/fail closed|unsupported/);
    expect(() => distTagForVersion("1.0.0-beta")).toThrow(/unsupported/);
    expect(() => distTagForVersion("1.0.0-rc")).toThrow(/unsupported/);
    expect(() => distTagForVersion("1.0.0-rc.x")).toThrow(/unsupported/);
    expect(() => distTagForVersion("1.0.0+build.1")).toThrow(/unsupported/);
    expect(() => distTagForVersion("not-a-version")).toThrow(/unsupported/);
  });
});
