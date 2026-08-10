import { createHash } from "node:crypto";

export function getByPath(value: unknown, path: string): unknown {
  if (!path) return value;
  let current = value;
  for (const segment of path.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function setByPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split(".");
  let current = target;
  for (const segment of segments.slice(0, -1)) {
    const child = current[segment];
    if (!child || typeof child !== "object" || Array.isArray(child)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }
  const last = segments.at(-1);
  if (last) current[last] = value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortValue(child)])
    );
  }
  return value;
}

export function hashRequest(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("base64url");
}

export interface JsonLeaf {
  path: string;
  value: unknown;
}

export function flattenJson(value: unknown, basePath = "$"): JsonLeaf[] {
  if (Array.isArray(value)) {
    if (value.length === 0) return [{ path: basePath, value: [] }];
    return value.flatMap((child, index) => flattenJson(child, `${basePath}[${index}]`));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return [{ path: basePath, value: {} }];
    return entries
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([key, child]) => flattenJson(child, `${basePath}.${key}`));
  }
  return [{ path: basePath, value }];
}

export function utf8Bytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

// Strict integer parsing for untrusted strings (env vars, CLI flags, cursor
// offsets): Number.parseInt silently accepts partial garbage like "123abc",
// so require the whole string to be an integer literal. Returns undefined
// for anything else; callers map that to their domain error.
export function parseStrictInteger(value: string): number | undefined {
  if (!/^-?\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

// Single narrowing entry point for dynamic REST payloads: returns the value
// as a record only when it is a non-null, non-array object, so the object
// check always travels with the cast instead of relying on ad-hoc
// `as Record<string, unknown>` assertions.
export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}
