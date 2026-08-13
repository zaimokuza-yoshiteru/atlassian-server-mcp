import { createHash } from "node:crypto";

// Prototype-safe path reader, mirroring setByPath below: path segments can
// come from MCP client-supplied field projections (selectFields in
// projection.ts), so segments like `constructor` or `__proto__` must not
// resolve through the prototype chain. Own properties only — which still
// lets JSON.parse'd payloads with a legitimate own `__proto__` key read
// through.
export function getByPath(value: unknown, path: string): unknown {
  if (!path) return value;
  let current = value;
  for (const segment of path.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    if (!Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

// Prototype-safe path setter. Path segments come from MCP client-supplied
// field projections (see selectFields in projection.ts), so `__proto__` /
// `constructor` / `prototype` segments must never resolve through the
// prototype chain or trigger the __proto__ setter — that would turn a
// crafted `fields` argument into Object.prototype pollution (CodeQL
// js/prototype-polluting-assignment). Reads go through hasOwnProperty and
// writes through defineProperty, which keeps legitimate fields with those
// names working as plain own properties.
export function setByPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split(".");
  let current = target;
  for (const segment of segments.slice(0, -1)) {
    const child = Object.prototype.hasOwnProperty.call(current, segment)
      ? current[segment]
      : undefined;
    if (!child || typeof child !== "object" || Array.isArray(child)) {
      const created: Record<string, unknown> = {};
      defineOwn(current, segment, created);
      current = created;
    } else {
      current = child as Record<string, unknown>;
    }
  }
  const last = segments.at(-1);
  if (last) defineOwn(current, last, value);
}

function defineOwn(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
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

// Single-pass trailing-slash trim for URL pathnames. Deliberately not the
// regex /\/+$/: CodeQL js/polynomial-redos flags it as quadratic on
// pathological input (a long run of slashes followed by a non-slash), and
// the scan is trivial to write by hand.
export function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end--;
  return value.slice(0, end);
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
