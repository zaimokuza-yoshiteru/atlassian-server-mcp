import { describe, expect, it } from "vitest";
import { authorizationHeader, authMode } from "../src/auth.js";
import { loadConfig } from "../src/config.js";

const baseEnv: NodeJS.ProcessEnv = {
  JIRA_URL: "https://jira.example.test",
  CONFLUENCE_URL: "https://confluence.example.test",
  BITBUCKET_URL: "https://bitbucket.example.test",
  JIRA_TOKEN: "jira-token",
  CONFLUENCE_TOKEN: "confluence-token",
  BITBUCKET_TOKEN: "bitbucket-token"
};

describe("configuration and authentication", () => {
  it("uses product tokens before shared basic credentials", () => {
    const config = loadConfig([], {
      ...baseEnv,
      ATLASSIAN_USERNAME: "shared-user",
      ATLASSIAN_PASSWORD: "shared-password"
    });

    expect(config.products.jira!.username).toBeUndefined();
    expect(authMode(config.products.jira!)).toBe("token");
    expect(authorizationHeader(config.products.jira!)).toBe("Bearer jira-token");
  });

  it("falls back to shared basic credentials per product", () => {
    const config = loadConfig([], {
      ...baseEnv,
      CONFLUENCE_TOKEN: "",
      ATLASSIAN_USERNAME: "shared-user",
      ATLASSIAN_PASSWORD: "shared-password"
    });

    expect(authMode(config.products.confluence!)).toBe("basic");
    expect(authorizationHeader(config.products.confluence!)).toBe(
      `Basic ${Buffer.from("shared-user:shared-password").toString("base64")}`
    );
  });

  it("rejects a product with neither a token nor complete shared credentials", () => {
    expect(() =>
      loadConfig([], {
        ...baseEnv,
        BITBUCKET_TOKEN: "",
        ATLASSIAN_USERNAME: "shared-user"
      })
    ).toThrow(/bitbucket requires BITBUCKET_TOKEN/);
  });

  it("verifies TLS by default and lets flags and env override", () => {
    expect(loadConfig([], baseEnv).tlsVerify).toBe(true);
    expect(loadConfig([], { ...baseEnv, ATLASSIAN_TLS_VERIFY: "false" }).tlsVerify).toBe(false);
    expect(
      loadConfig(["--no-tls-verify"], {
        ...baseEnv,
        ATLASSIAN_TLS_VERIFY: "true"
      }).tlsVerify
    ).toBe(false);
    expect(
      loadConfig(["--tls-verify"], {
        ...baseEnv,
        ATLASSIAN_TLS_VERIFY: "false"
      }).tlsVerify
    ).toBe(true);
  });

  it("parses ATLASSIAN_TLS_VERIFY strictly, fail-closed", () => {
    // Unset defaults to verification on.
    expect(loadConfig([], baseEnv).tlsVerify).toBe(true);
    // Case-insensitive, surrounding whitespace allowed.
    expect(loadConfig([], { ...baseEnv, ATLASSIAN_TLS_VERIFY: "true" }).tlsVerify).toBe(true);
    expect(loadConfig([], { ...baseEnv, ATLASSIAN_TLS_VERIFY: "false" }).tlsVerify).toBe(false);
    expect(loadConfig([], { ...baseEnv, ATLASSIAN_TLS_VERIFY: "TRUE" }).tlsVerify).toBe(true);
    expect(loadConfig([], { ...baseEnv, ATLASSIAN_TLS_VERIFY: " false " }).tlsVerify).toBe(false);
  });

  it("rejects invalid ATLASSIAN_TLS_VERIFY values instead of failing open", () => {
    for (const value of ["tru", "flase", "0", "1", ""]) {
      expect(() => loadConfig([], { ...baseEnv, ATLASSIAN_TLS_VERIFY: value })).toThrow(
        /ATLASSIAN_TLS_VERIFY must be "true" or "false"/
      );
    }
    // The error names the offending value and the legal values.
    expect(() => loadConfig([], { ...baseEnv, ATLASSIAN_TLS_VERIFY: "tru" })).toThrow(
      /received "tru"/
    );
  });

  it("parses output and cursor CLI limits", () => {
    const config = loadConfig(["--max-output-bytes", "8192", "--cursor-ttl-seconds=30"], baseEnv);
    expect(config.maxOutputBytes).toBe(8192);
    expect(config.cursorTtlSeconds).toBe(30);
  });

  it("rejects non-integer and out-of-range numeric limits instead of parsing prefixes", () => {
    for (const value of ["123abc", "12.5", "", "0", "-5", "99999999999999999999"]) {
      expect(() => loadConfig([], { ...baseEnv, ATLASSIAN_MAX_OUTPUT_BYTES: value })).toThrow(
        /max output bytes must be an integer >= 1024/
      );
    }
  });

  it("uses a shared file root with optional per-product overrides", () => {
    const config = loadConfig([], {
      ...baseEnv,
      ATLASSIAN_FILE_ROOT: "/tmp/atlassian-files",
      JIRA_FILE_ROOT: "/tmp/jira-files",
      CONFLUENCE_FILE_ROOT: ""
    });

    expect(config.products.jira!.fileRoot).toBe("/tmp/jira-files");
    expect(config.products.confluence!.fileRoot).toBe("/tmp/atlassian-files");
    expect(config.products.bitbucket!.fileRoot).toBe("/tmp/atlassian-files");
  });

  it("enables only products with configured URLs", () => {
    const config = loadConfig([], {
      JIRA_URL: "https://jira.example.test",
      JIRA_TOKEN: "jira-token"
    });

    expect(Object.keys(config.products)).toEqual(["jira"]);
    expect(config.products.confluence).toBeUndefined();
  });

  it("requires at least one configured product", () => {
    expect(() => loadConfig([], {})).toThrow(/at least one/i);
  });

  it("rejects product settings without that product URL", () => {
    expect(() =>
      loadConfig([], {
        JIRA_URL: "https://jira.example.test",
        JIRA_TOKEN: "jira-token",
        BITBUCKET_TOKEN: "orphan-token"
      })
    ).toThrow(/BITBUCKET_URL is required/);
  });

  it("parses exposure tier and FORCE lists, with CLI overriding env", () => {
    const config = loadConfig(
      [
        "--exposure-tier",
        "safe",
        "--force-include-ops=jira.issue.*",
        "--force-include-ops",
        "confluence.content.get"
      ],
      {
        ...baseEnv,
        ATLASSIAN_EXPOSURE_TIER: "max",
        ATLASSIAN_FORCE_INCLUDE_OPERATIONS: "jira.other.*",
        ATLASSIAN_FORCE_EXCLUDE_OPERATIONS: "jira.issue.delete,jira.issue.delete"
      }
    );
    expect(config.exposureTier).toBe("safe");
    expect(config.forceInclude).toEqual(["jira.issue.*", "confluence.content.get"]);
    expect(config.forceExclude).toEqual(["jira.issue.delete"]);
  });

  it("rejects malformed exposure values and comma-containing CLI patterns", () => {
    expect(() => loadConfig(["--exposure-tier=admin"], baseEnv)).toThrow(/invalid exposure tier/);
    expect(() => loadConfig(["--force-include-ops", "jira.issue.*,confluence.*"], baseEnv)).toThrow(
      /without commas/
    );
  });

  it("rejects misspelled FORCE environment variables", () => {
    expect(() =>
      loadConfig([], { ...baseEnv, ATLASSIAN_FORCE_INCLUDE_OPREATIONS: "jira.issue.*" })
    ).toThrow(/ATLASSIAN_FORCE_INCLUDE_OPERATIONS/);
    expect(() =>
      loadConfig([], { ...baseEnv, ATLASSIAN_FORCE_EXCLUDE_OPREATIONS: "jira.issue.*" })
    ).toThrow(/ATLASSIAN_FORCE_EXCLUDE_OPERATIONS/);
  });
});

describe("base URL validation", () => {
  it("rejects credentials embedded in the URL without echoing them", () => {
    expect(() =>
      loadConfig([], {
        ...baseEnv,
        JIRA_URL: "https://alice-ci:s3cret-pat@jira.example.test"
      })
    ).toThrow(/JIRA_URL must not embed credentials/);
    try {
      loadConfig([], {
        ...baseEnv,
        JIRA_URL: "https://alice-ci:s3cret-pat@jira.example.test"
      });
      expect.unreachable("expected loadConfig to throw");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("JIRA_TOKEN");
      expect(message).not.toContain("alice-ci");
      expect(message).not.toContain("s3cret-pat");
    }
  });

  it("rejects a URL with only a username (no password)", () => {
    expect(() =>
      loadConfig([], {
        ...baseEnv,
        CONFLUENCE_URL: "https://alice-ci@confluence.example.test"
      })
    ).toThrow(/CONFLUENCE_URL must not embed credentials/);
  });

  it("rejects a URL with a query string", () => {
    expect(() =>
      loadConfig([], {
        ...baseEnv,
        BITBUCKET_URL: "https://bitbucket.example.test?x=1"
      })
    ).toThrow(/BITBUCKET_URL must be a plain base URL/);
  });

  it("rejects a URL with a fragment", () => {
    expect(() =>
      loadConfig([], {
        ...baseEnv,
        JIRA_URL: "https://jira.example.test#section"
      })
    ).toThrow(/JIRA_URL must be a plain base URL/);
  });

  it("accepts a Data Center base URL with a path", () => {
    const config = loadConfig([], {
      ...baseEnv,
      JIRA_URL: "https://jira.example.test/jira/"
    });
    expect(config.products.jira!.baseUrl.toString()).toBe("https://jira.example.test/jira");
  });
});
