import { describe, expect, it } from "vitest";
import { validateVersion, VERSION } from "../src/version.js";

describe("package version", () => {
  it("accepts release, prerelease, build, and combined semver", () => {
    for (const value of ["1.2.3", "1.2.3-beta.1", "1.2.3+build.7", "1.2.3-beta.1+build.7"]) {
      expect(validateVersion(value)).toBe(value);
    }
  });

  it("rejects malformed versions and exposes the package version", () => {
    for (const value of ["1.2", "v1.2.3", "1.2.3-"])
      expect(() => validateVersion(value)).toThrow(/semantic version/);
    expect(validateVersion(VERSION)).toBe(VERSION);
  });
});
