import policy from "./exposure-policy.json" with { type: "json" };
import { allowsTier, matchOperationPattern, validateOperationPattern } from "./permissions.js";
import type { ExposureReason, ExposureTier, RegisteredOperation, Product } from "./types.js";
export type { ExposureReason } from "./types.js";

export interface ExposureResolution {
  exposed: boolean;
  requiredTier?: ExposureTier;
  forced: boolean;
  reason: ExposureReason;
  matchedPattern?: string;
}

const tiers = policy.tiers as Record<string, ExposureTier>;
const excluded = new Set(policy.excluded as string[]);

export function policyRequiredTier(operation: RegisteredOperation): ExposureTier {
  if ("requiredTier" in operation && typeof operation.requiredTier === "string")
    return operation.requiredTier as ExposureTier;
  const configured = tiers[operation.operationId];
  if (!configured) throw new Error(`Operation is not in exposure policy: ${operation.operationId}`);
  return configured;
}

export function resolveExposure(
  operation: RegisteredOperation | undefined,
  options: {
    tier?: ExposureTier;
    forceInclude?: readonly string[];
    forceExclude?: readonly string[];
    configuredProducts?: ReadonlySet<Product>;
  } = {}
): ExposureResolution {
  if (!operation) return { exposed: false, forced: false, reason: "unknown-operation" };
  if (operation.unsupportedReason)
    return { exposed: false, forced: false, reason: "unsupported-operation" };
  if (
    !Object.prototype.hasOwnProperty.call(tiers, operation.operationId) &&
    !excluded.has(operation.operationId)
  ) {
    return { exposed: false, forced: false, reason: "unknown-operation" };
  }
  if (options.configuredProducts && !options.configuredProducts.has(operation.product)) {
    return { exposed: false, forced: false, reason: "product-not-configured" };
  }
  if (excluded.has(operation.operationId))
    return { exposed: false, forced: false, reason: "permanently-excluded" };
  const requiredTier = policyRequiredTier(operation);
  const forceExclude = (options.forceExclude ?? []).find((pattern) =>
    matchOperationPattern(pattern, operation.operationId)
  );
  if (forceExclude)
    return {
      exposed: false,
      requiredTier,
      forced: false,
      reason: "force-excluded",
      matchedPattern: forceExclude
    };
  const forceInclude = (options.forceInclude ?? []).find((pattern) =>
    matchOperationPattern(pattern, operation.operationId)
  );
  if (forceInclude)
    return {
      exposed: true,
      requiredTier,
      forced: true,
      reason: "force-included",
      matchedPattern: forceInclude
    };
  const tier = options.tier ?? "read";
  return {
    exposed: allowsTier(tier, requiredTier),
    requiredTier,
    forced: false,
    reason: allowsTier(tier, requiredTier) ? "tier-allowed" : "tier-denied"
  };
}

export function validatePatterns(patterns: readonly string[], candidates: readonly string[]): void {
  for (const pattern of patterns) {
    validateOperationPattern(pattern);
    if (!candidates.some((operationId) => matchOperationPattern(pattern, operationId))) {
      throw new Error(`operation pattern matches no configured operation: ${pattern}`);
    }
  }
}

export const POLICY_OPERATIONS = Object.freeze(Object.keys(tiers));
