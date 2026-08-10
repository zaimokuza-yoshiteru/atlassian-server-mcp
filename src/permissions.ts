import { EXPOSURE_TIERS, type ExposureTier } from "./types.js";

const exposureRank: Record<ExposureTier, number> = { read: 0, safe: 1, risky: 2, max: 3 };

export function allowsTier(enabled: ExposureTier, required: ExposureTier): boolean {
  return exposureRank[enabled] >= exposureRank[required];
}

export function validateExposureTier(value: string): ExposureTier {
  if ((EXPOSURE_TIERS as readonly string[]).includes(value)) return value as ExposureTier;
  throw new Error(`invalid exposure tier: ${value}; expected read, safe, risky, or max`);
}

export function tierFromArgs(args: readonly string[], envValue?: string): ExposureTier {
  const values: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? "";
    if (arg === "--exposure-tier") {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error("--exposure-tier requires a value");
      values.push(value);
    } else if (arg.startsWith("--exposure-tier=")) {
      values.push(arg.slice("--exposure-tier=".length));
    }
  }
  if (values.length > 1) throw new Error("--exposure-tier may only be specified once");
  return validateExposureTier(values[0] ?? envValue?.trim() ?? "read");
}

export function validateOperationPattern(pattern: string): string {
  if (
    !pattern ||
    pattern
      .split(".")
      .some(
        (segment) =>
          !segment || (segment !== "*" && segment !== "**" && !/^[a-z0-9][a-z0-9-]*$/.test(segment))
      )
  ) {
    throw new Error(`invalid operation pattern: ${pattern || "(empty)"}`);
  }
  return pattern;
}

export function matchOperationPattern(pattern: string, operationId: string): boolean {
  validateOperationPattern(pattern);
  const expected = pattern.split(".");
  const actual = operationId.split(".");
  const visit = (i: number, j: number): boolean => {
    if (i === expected.length) return j === actual.length;
    if (expected[i] === "**") return visit(i + 1, j) || (j < actual.length && visit(i, j + 1));
    return (
      j < actual.length && (expected[i] === "*" || expected[i] === actual[j]) && visit(i + 1, j + 1)
    );
  };
  return visit(0, 0);
}
