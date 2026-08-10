import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PRODUCTS = ["jira", "confluence", "bitbucket"];

export const SPEC_SOURCES = Object.freeze({
  jira: { url: "https://developer.atlassian.com/server/jira/platform/rest/v11003/", html: true },
  confluence: { url: "https://developer.atlassian.com/server/confluence/rest/v10214/", html: true },
  bitbucket: {
    url: "https://dac-static.atlassian.com/server/bitbucket/10.4.swagger.v3.json",
    html: false
  }
});

export function extractEmbeddedSpec(html) {
  const marker = '"schema":{"openapi"';
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) throw new Error("embedded OpenAPI marker not found");
  const start = markerIndex + marker.indexOf("{");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return html.slice(start, index + 1);
  }
  throw new Error("unbalanced braces while extracting embedded spec");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])])
    );
  return value;
}
export function canonicalizeSpec(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

export function validateSpec(product, spec) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec))
    throw new Error(`${product} spec root must be an object`);
  if (typeof spec.openapi !== "string" || !spec.openapi)
    throw new Error(`${product} spec missing openapi`);
  if (!spec.info || typeof spec.info !== "object") throw new Error(`${product} spec missing info`);
  if (typeof spec.info.title !== "string" || !spec.info.title)
    throw new Error(`${product} spec missing info.title`);
  if (typeof spec.info.version !== "string" || !spec.info.version)
    throw new Error(`${product} spec missing info.version`);
  if (!spec.paths || typeof spec.paths !== "object" || Array.isArray(spec.paths))
    throw new Error(`${product} spec missing paths object`);
  return spec;
}

export async function loadSpec(product, options = {}) {
  const source = SPEC_SOURCES[product];
  if (!source) throw new Error(`unknown product: ${product}`);
  // ATLASSIAN_SPEC_CACHE_DIR lets tests point every consumer at a disposable
  // copy; the committed canonical snapshots under rule/spec-cache/ are the
  // default and must stay untouched by test runs.
  const cacheDir =
    options.cacheDir ??
    process.env.ATLASSIAN_SPEC_CACHE_DIR ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../rule/spec-cache");
  const cacheFile = path.join(cacheDir, `${product}.json`);
  if (fs.existsSync(cacheFile) && (!options.refresh || options.offline))
    return validateSpec(product, JSON.parse(fs.readFileSync(cacheFile, "utf8")));
  if (options.refresh !== true)
    throw new Error(
      `spec cache missing for ${product}: ${cacheFile}; explicit --refresh is required for network access`
    );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  try {
    const response = await fetch(source.url, { signal: controller.signal });
    if (!response.ok) throw new Error(`fetch ${source.url}: HTTP ${response.status}`);
    const body = await response.text();
    const jsonText = source.html ? extractEmbeddedSpec(body) : body;
    return validateSpec(product, JSON.parse(jsonText));
  } finally {
    clearTimeout(timeout);
  }
}
