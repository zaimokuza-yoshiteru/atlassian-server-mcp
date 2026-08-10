import { getByPath, setByPath } from "./json.js";
import type { Product, ResponseProfile } from "./types.js";

const COMPACT_KEYS = new Set([
  "id",
  "key",
  "name",
  "title",
  "summary",
  "description",
  "self",
  "url",
  "webUrl",
  "displayName",
  "username",
  "slug",
  "type",
  "status",
  "state",
  "version",
  "created",
  "updated",
  "author",
  "creator",
  "reporter",
  "assignee",
  "project",
  "space",
  "repository",
  "fromRef",
  "toRef",
  "open",
  "closed",
  "locked",
  "isLastPage",
  "nextPageStart",
  "total",
  "size",
  "limit",
  "start",
  "startAt",
  "maxResults"
]);

export interface ProjectionResult {
  data: unknown;
  omittedPaths: string[];
}

export function projectResponse(
  data: unknown,
  product: Product,
  profile: ResponseProfile,
  fields?: readonly string[]
): ProjectionResult {
  if (fields && fields.length > 0) {
    return selectFields(data, fields);
  }
  if (profile === "full") return { data, omittedPaths: [] };
  const omittedPaths: string[] = [];
  const projected = walk(data, "$", product, profile, omittedPaths);
  return { data: projected, omittedPaths: omittedPaths.slice(0, 100) };
}

function selectFields(data: unknown, fields: readonly string[]): ProjectionResult {
  if (Array.isArray(data)) {
    return {
      data: data.map((item) => selectFields(item, fields).data),
      omittedPaths: []
    };
  }
  if (!data || typeof data !== "object") return { data, omittedPaths: [] };
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = getByPath(data, field);
    if (value !== undefined) setByPath(result, field, value);
  }
  return { data: result, omittedPaths: [] };
}

function walk(
  value: unknown,
  path: string,
  product: Product,
  profile: ResponseProfile,
  omitted: string[]
): unknown {
  if (Array.isArray(value)) {
    return value.map((child, index) => walk(child, `${path}[${index}]`, product, profile, omitted));
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && profile !== "full" && value.length > 4000) {
      omitted.push(path);
      return `${value.slice(0, 4000)}…[truncated]`;
    }
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (product === "jira" && key.startsWith("customfield_") && profile === "compact") {
      omitted.push(childPath);
      continue;
    }
    if (profile === "compact" && !COMPACT_KEYS.has(key)) {
      if (key === "fields" && child && typeof child === "object") {
        output[key] = walk(child, childPath, product, profile, omitted);
      } else {
        omitted.push(childPath);
      }
      continue;
    }
    output[key] = walk(child, childPath, product, profile, omitted);
  }
  return output;
}
