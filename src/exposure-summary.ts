import { POLICY_OPERATIONS } from "./operations/index.js";
import { matchOperationPattern } from "./permissions.js";
import type { ServerConfig } from "./types.js";

export function formatExposureSummary(config: ServerConfig): string {
  const configured = new Set(Object.keys(config.products));
  const candidates = POLICY_OPERATIONS.filter((operation) => configured.has(operation.product));
  const format = (patterns: readonly string[]) =>
    patterns.length === 0
      ? "none"
      : `[${patterns.map((pattern) => `${pattern}=${candidates.filter((operation) => matchOperationPattern(pattern, operation.operationId)).length}`).join("; ")}]`;
  return `exposure tier=${config.exposureTier}; include=${format(config.forceInclude)}; exclude=${format(config.forceExclude)}`;
}
