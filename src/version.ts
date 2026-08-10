import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
) as { version?: unknown };

export function validateVersion(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value)
  ) {
    throw new Error("package.json version must be a semantic version");
  }
  return value;
}

export const VERSION = validateVersion(packageJson.version);
