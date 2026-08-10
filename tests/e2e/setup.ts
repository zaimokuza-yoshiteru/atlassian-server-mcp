import { existsSync, readFileSync } from "node:fs";

const envFile = new URL("../../.env.dc", import.meta.url);
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const value = line.trim();
    if (!value || value.startsWith("#")) continue;
    const separator = value.indexOf("=");
    if (separator <= 0) continue;
    const key = value.slice(0, separator).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value.slice(separator + 1).trim();
    }
  }
}

if (!process.env.ATLASSIAN_USERNAME && process.env.ATLASSIAN_ADMIN_USERNAME) {
  process.env.ATLASSIAN_USERNAME = process.env.ATLASSIAN_ADMIN_USERNAME;
}
if (!process.env.ATLASSIAN_PASSWORD && process.env.ATLASSIAN_ADMIN_PASSWORD) {
  process.env.ATLASSIAN_PASSWORD = process.env.ATLASSIAN_ADMIN_PASSWORD;
}
