import type { ProductConfig } from "./types.js";

export function authorizationHeader(config: ProductConfig): string {
  if (config.token) {
    return `Bearer ${config.token}`;
  }

  if (config.username && config.password) {
    const encoded = Buffer.from(`${config.username}:${config.password}`, "utf8").toString("base64");
    return `Basic ${encoded}`;
  }

  throw new Error(`No credentials configured for ${config.product}`);
}

export function authMode(config: ProductConfig): "token" | "basic" {
  return config.token ? "token" : "basic";
}
