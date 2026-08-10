// Error handling: sanitize upstream HTTP errors and internal failures into
// bounded, credential-free payloads safe to return to MCP clients.
import { AtlassianHttpError } from "./http.js";
import { asRecord } from "./json.js";

export function safeErrorMessage(error: unknown): string {
  if (error instanceof AtlassianHttpError) {
    return `${error.message}`;
  }
  if (error instanceof Error) return error.message.slice(0, 1000);
  return "Unknown error";
}

export function safeErrorPayload(error: unknown, maxBytes = 16_384): Record<string, unknown> {
  if (!(error instanceof AtlassianHttpError)) {
    return {
      error: {
        kind: "mcp_error",
        message: safeErrorMessage(error)
      }
    };
  }

  const byteLimit = Math.max(512, Math.min(maxBytes, 16_384));
  const budget = { remaining: byteLimit };
  const details =
    error.status >= 500
      ? { omitted: "Upstream server error details were suppressed" }
      : limitErrorDetails(error.details, budget);
  const fieldErrors = extractFieldErrors(details);
  const payload: Record<string, unknown> = {
    error: {
      kind: "atlassian_http_error",
      product: error.product,
      operationId: error.operationId,
      status: error.status,
      message: safeErrorMessage(error),
      ...(fieldErrors.length > 0 ? { fieldErrors } : {}),
      ...(details !== undefined ? { details } : {})
    }
  };
  if (Buffer.byteLength(JSON.stringify(payload), "utf8") <= byteLimit) return payload;
  const compact = payload.error as Record<string, unknown>;
  compact.details = { truncated: true };
  if (Array.isArray(compact.fieldErrors)) {
    compact.fieldErrors = compact.fieldErrors.slice(0, 5).map((item) => {
      const entry = item as { field?: string; message: string };
      return { ...entry, message: entry.message.slice(0, 300) };
    });
  }
  if (Buffer.byteLength(JSON.stringify(payload), "utf8") > byteLimit) {
    delete compact.fieldErrors;
  }
  return payload;
}

function limitErrorDetails(value: unknown, budget: { remaining: number }, depth = 0): unknown {
  if (value === undefined) return undefined;
  if (budget.remaining <= 0) return "[TRUNCATED]";
  if (depth >= 6) return "[MAX_DEPTH]";
  if (typeof value === "string") {
    const output = value.slice(0, Math.min(2_000, budget.remaining));
    budget.remaining -= output.length;
    return output;
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    budget.remaining -= 16;
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => limitErrorDetails(item, budget, depth + 1));
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value).slice(0, 50)) {
      if (budget.remaining <= 0) break;
      budget.remaining -= key.length;
      output[key] = /token|password|authorization|cookie|secret/i.test(key)
        ? "[REDACTED]"
        : limitErrorDetails(child, budget, depth + 1);
    }
    return output;
  }
  return String(value).slice(0, 200);
}

function extractFieldErrors(details: unknown): Array<{ field?: string; message: string }> {
  const object = asRecord(details);
  if (!object) return [];
  const output: Array<{ field?: string; message: string }> = [];
  const namedErrors = asRecord(object.errors);
  if (namedErrors) {
    for (const [field, message] of Object.entries(namedErrors)) {
      if (typeof message === "string") output.push({ field, message });
    }
  }
  if (Array.isArray(object.errors)) {
    for (const entry of object.errors.slice(0, 20)) {
      const item = asRecord(entry);
      if (!item) continue;
      if (typeof item.message !== "string") continue;
      output.push({
        ...(typeof item.context === "string" ? { field: item.context } : {}),
        message: item.message
      });
    }
  }
  if (Array.isArray(object.errorMessages)) {
    for (const message of object.errorMessages.slice(0, 20)) {
      if (typeof message === "string") output.push({ message });
    }
  }
  return output;
}
